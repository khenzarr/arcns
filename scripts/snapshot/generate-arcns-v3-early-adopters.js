"use strict";

/** Deterministic, read-only final snapshot generator for active v3 names. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ethers } = require("ethers");

const SOURCE_CHAIN_ID = 5042002;
const DEFAULT_CAMPAIGN_ID = "ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1";
const LEAF_ENCODING = "keccak256(abi.encode(campaignId, account))";
const ZERO_ADDRESS = ethers.ZeroAddress.toLowerCase();
const REGISTRAR_FIELDS = ["registrar", "registrarAddress", "sourceRegistrar", "tldRegistrar"];
const VERSION_FIELDS = ["version", "protocolVersion", "registrarVersion", "sourceVersion", "source"];

function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
function hasArg(name) { return process.argv.includes(name); }
function fail(message) { throw new Error(`[snapshot-not-ready] ${message}`); }
function printHelp() {
  console.log(`ArcNS v3 early-adopter snapshot generator (read-only)

Required:
  --input <file> --exclusions <file>
  --snapshot-block <number> --snapshot-block-hash <hash> --snapshot-timestamp <seconds>
  --arc-registrar <address> --circle-registrar <address> --registry <address>
  --arc-controller <address> --circle-controller <address> --rpc-id <identifier>
Optional:
  --campaign-id <text|bytes32> (default: ${DEFAULT_CAMPAIGN_ID})
  --subgraph-url <url> --indexer-start-block <number> --finality <description>
  --generator-command <command>
  --out <directory> --dry-run --help`);
}

function normalizeAddress(value) {
  try { return ethers.getAddress(String(value)).toLowerCase(); }
  catch { fail(`invalid address: ${value}`); }
}
function normalizeBytes32(value, label) {
  if (!ethers.isHexString(value, 32)) fail(`${label} must be a 32-byte hex value`);
  return value.toLowerCase();
}
function campaignBytes32(value) { return ethers.isHexString(value, 32) ? value.toLowerCase() : ethers.id(value).toLowerCase(); }
function registrarFor(record) {
  const field = REGISTRAR_FIELDS.find((key) => record[key] !== undefined && record[key] !== null && record[key] !== "");
  if (!field) fail(`record ${record.name || record.label || "<unnamed>"} is missing registrar provenance (${REGISTRAR_FIELDS.join(", ")})`);
  return normalizeAddress(record[field]);
}
function assertV3Provenance(record) {
  for (const field of VERSION_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === "") continue;
    if (/(^|[^a-z0-9])(legacy|v?1|v?2)([^a-z0-9]|$)/.test(String(record[field]).trim().toLowerCase())) {
      fail(`record ${record.name || record.label || "<unnamed>"} has non-v3 provenance in ${field}: ${record[field]}`);
    }
  }
}
function readJson(file, description) {
  if (!file) fail(`${description} is required`);
  if (!fs.existsSync(file)) fail(`${description} does not exist: ${file}`);
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { fail(`${description} is not valid JSON: ${error.message}`); }
}
function readInput(file) {
  const rows = readJson(file, "a real fixed-block input export");
  if (!Array.isArray(rows)) fail("input export must be a JSON array");
  return rows;
}
function readExclusions(file) {
  const value = readJson(file, "a reviewed exclusion list");
  const rows = Array.isArray(value) ? value : value.exclusions;
  if (!Array.isArray(rows)) fail("exclusion file must be an array or contain an exclusions array");
  const seen = new Set();
  return rows.map((row) => {
    const item = typeof row === "string" ? { address: row, reason: "explicitly excluded" } : row;
    if (!item || !item.address || !item.reason) fail("every exclusion requires address and reason");
    const address = normalizeAddress(item.address);
    if (address === ZERO_ADDRESS) fail("zero address must not appear in the protocol exclusion list");
    if (seen.has(address)) fail(`duplicate exclusion address: ${address}`);
    seen.add(address);
    return { address, reason: String(item.reason), ...(item.role ? { role: String(item.role) } : {}) };
  }).sort((a, b) => a.address.localeCompare(b.address));
}

function classifyRecords(records, snapshotTimestamp, registrars, exclusions = []) {
  const excludedOwners = new Set(exclusions.map((row) => normalizeAddress(typeof row === "string" ? row : row.address)));
  const eligible = [];
  const excluded = { wrongTld: 0, expired: 0, burned: 0, zeroOwner: 0, protocolInternal: 0 };
  for (const record of records) {
    if (record.tld !== "arc" && record.tld !== "circle") { excluded.wrongTld += 1; continue; }
    assertV3Provenance(record);
    const actualRegistrar = registrarFor(record);
    if (actualRegistrar !== registrars[record.tld]) {
      fail(`record ${record.name || record.label || "<unnamed>"} registrar ${actualRegistrar} does not match supplied .${record.tld} registrar ${registrars[record.tld]}`);
    }
    const rawOwner = String(record.owner || "");
    if (/^0x0{40}$/i.test(rawOwner)) { excluded.zeroOwner += 1; continue; }
    const owner = normalizeAddress(rawOwner);
    if (record.burned === true || record.active === false) { excluded.burned += 1; continue; }
    const expires = Number(record.expires);
    if (!Number.isSafeInteger(expires) || expires <= 0) fail(`record ${record.name || record.label || "<unnamed>"} has invalid expires value`);
    if (expires <= snapshotTimestamp) { excluded.expired += 1; continue; }
    if (excludedOwners.has(owner)) { excluded.protocolInternal += 1; continue; }
    eligible.push({ ...record, owner, registrar: actualRegistrar, expires });
  }
  eligible.sort((a, b) => `${a.owner}:${a.tld}:${a.label || a.name || ""}`.localeCompare(`${b.owner}:${b.tld}:${b.label || b.name || ""}`));
  return { eligible, excluded };
}
function sortRecords(records, timestamp, registrars, exclusions = []) { return classifyRecords(records, timestamp, registrars, exclusions).eligible; }
function uniqueWallets(records) { return [...new Set(records.map((row) => normalizeAddress(row.owner)))].sort((a, b) => a.localeCompare(b)); }
function leafFor(campaignId, account) {
  return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "address"], [campaignId, normalizeAddress(account)])).toLowerCase();
}
function hashPair(a, b) {
  const [left, right] = [a.toLowerCase(), b.toLowerCase()].sort();
  return ethers.keccak256(ethers.concat([left, right])).toLowerCase();
}
function buildMerkleTree(wallets, campaignId) {
  if (!wallets.length) fail("cannot generate a final Merkle root for zero eligible wallets");
  const leaves = wallets.map((account) => leafFor(campaignId, account));
  const levels = [leaves];
  while (levels.at(-1).length > 1) {
    const current = levels.at(-1), next = [];
    for (let i = 0; i < current.length; i += 2) next.push(i + 1 < current.length ? hashPair(current[i], current[i + 1]) : current[i]);
    levels.push(next);
  }
  const entries = wallets.map((account, index) => {
    const proof = []; let position = index;
    for (let level = 0; level < levels.length - 1; level += 1) {
      const sibling = position % 2 ? position - 1 : position + 1;
      if (sibling < levels[level].length) proof.push(levels[level][sibling]);
      position = Math.floor(position / 2);
    }
    return { account, leaf: leaves[index], proof };
  });
  return { root: levels.at(-1)[0], entries };
}
function verifyProof(leaf, proof, root) { return proof.reduce(hashPair, leaf).toLowerCase() === root.toLowerCase(); }
function gitCommit() { try { return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch { return "unknown"; } }
function required(name, envName) { const value = arg(name) || (envName && process.env[envName]); if (!value) fail(`${name} is required`); return value; }

function main() {
  if (hasArg("--help") || hasArg("-h")) return printHelp();
  const snapshotBlock = Number(required("--snapshot-block", "ARCNS_SNAPSHOT_BLOCK"));
  const snapshotTimestamp = Number(required("--snapshot-timestamp", "ARCNS_SNAPSHOT_TIMESTAMP"));
  if (!Number.isSafeInteger(snapshotBlock) || snapshotBlock <= 0) fail("--snapshot-block must be a positive safe integer");
  if (!Number.isSafeInteger(snapshotTimestamp) || snapshotTimestamp <= 0) fail("--snapshot-timestamp must be a positive Unix timestamp");
  const snapshotBlockHash = normalizeBytes32(required("--snapshot-block-hash", "ARCNS_SNAPSHOT_BLOCK_HASH"), "snapshot block hash");
  const registrars = { arc: normalizeAddress(required("--arc-registrar", "ARCNS_ARC_REGISTRAR")), circle: normalizeAddress(required("--circle-registrar", "ARCNS_CIRCLE_REGISTRAR")) };
  const sourceRegistryAddress = normalizeAddress(required("--registry"));
  const controllers = { arc: normalizeAddress(required("--arc-controller")), circle: normalizeAddress(required("--circle-controller")) };
  const rpcId = required("--rpc-id");
  const indexerStartBlockValue = arg("--indexer-start-block");
  const indexerStartBlock = indexerStartBlockValue === undefined ? null : Number(indexerStartBlockValue);
  if (indexerStartBlock !== null && (!Number.isSafeInteger(indexerStartBlock) || indexerStartBlock <= 0 || indexerStartBlock > snapshotBlock)) {
    fail("--indexer-start-block must be a positive safe integer no later than --snapshot-block");
  }
  const campaignId = arg("--campaign-id") || DEFAULT_CAMPAIGN_ID;
  const campaignIdBytes32 = campaignBytes32(campaignId);
  const exclusions = readExclusions(required("--exclusions"));
  const { eligible: records, excluded } = classifyRecords(readInput(required("--input", "ARCNS_SNAPSHOT_INPUT")), snapshotTimestamp, registrars, exclusions);
  const wallets = uniqueWallets(records);
  const tree = buildMerkleTree(wallets, campaignIdBytes32);
  const activeArcNameCount = records.filter((row) => row.tld === "arc").length;
  const activeCircleNameCount = records.filter((row) => row.tld === "circle").length;
  const duplicateWalletReductions = records.length - wallets.length;
  const exclusionPolicy = "Active v3 .arc/.circle names only; expired, burned/inactive, zero-owner, wrong-TLD, and reviewed protocol/admin/internal addresses excluded. Smart-contract wallets are otherwise allowed.";
  const manifest = {
    campaignId, campaignIdBytes32, sourceChainId: SOURCE_CHAIN_ID, snapshotBlock, snapshotBlockHash, snapshotTimestamp,
    snapshotTimestampISO: new Date(snapshotTimestamp * 1000).toISOString(), finalityAssumption: arg("--finality") || "RPC finalized tag",
    sourceRpcEndpointIdentifier: rpcId, subgraphEndpoint: arg("--subgraph-url") || null, indexerStartBlock, sourceRegistryAddress,
    sourceArcRegistrarAddress: registrars.arc, sourceCircleRegistrarAddress: registrars.circle, sourceControllerAddresses: controllers,
    eligibleWalletCount: wallets.length, eligibleActiveNameCount: records.length, activeArcNameCount, activeCircleNameCount,
    excludedCounts: { ...excluded, duplicateWalletReductions }, merkleRoot: tree.root, leafEncoding: LEAF_ENCODING,
    generatorScriptPath: "scripts/snapshot/generate-arcns-v3-early-adopters.js", generatorVersion: "2.0.0", gitCommit: gitCommit(),
    generatedAt: new Date().toISOString(), generatorCommand: arg("--generator-command") || process.argv.map(JSON.stringify).join(" "),
    exclusionPolicy, deterministicSortingRule: "lowercase addresses ascending; leaves retain order; each pair bytes32-sorted before hashing; unpaired nodes promoted",
  };
  const summary = { merkleRoot: tree.root, eligibleWalletCount: wallets.length, eligibleActiveNameCount: records.length, activeArcNameCount, activeCircleNameCount, excludedCounts: manifest.excludedCounts };
  if (hasArg("--dry-run")) { console.log(JSON.stringify(summary, null, 2)); return summary; }
  const out = path.resolve(arg("--out") || "snapshots/arc-testnet-v3-early-adopters");
  fs.mkdirSync(out, { recursive: true });
  const proofs = { campaignId, campaignIdBytes32, merkleRoot: tree.root, leafEncoding: LEAF_ENCODING, proofs: Object.fromEntries(tree.entries.map((x) => [x.account, { leaf: x.leaf, proof: x.proof }])) };
  fs.writeFileSync(path.join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(out, "eligible-addresses.json"), `${JSON.stringify(wallets, null, 2)}\n`);
  fs.writeFileSync(path.join(out, "eligible-addresses.csv"), `address\n${wallets.join("\n")}\n`);
  fs.writeFileSync(path.join(out, "merkle-proofs.json"), `${JSON.stringify(proofs, null, 2)}\n`);
  fs.writeFileSync(path.join(out, "exclusions.json"), `${JSON.stringify({ policy: exclusionPolicy, exclusions, excludedCounts: manifest.excludedCounts }, null, 2)}\n`);
  console.log(JSON.stringify({ outputDirectory: out, ...summary }, null, 2));
  return summary;
}

if (require.main === module) { try { main(); } catch (error) { console.error(error.message); process.exit(1); } }
module.exports = { DEFAULT_CAMPAIGN_ID, LEAF_ENCODING, normalizeAddress, campaignBytes32, classifyRecords, sortRecords, uniqueWallets, leafFor, buildMerkleTree, verifyProof };