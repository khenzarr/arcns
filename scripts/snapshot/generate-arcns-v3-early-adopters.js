"use strict";

/**
 * Reproducible, read-only snapshot preparation for active v3 .arc/.circle names.
 *
 * This script intentionally requires a finalized block and explicit source
 * contracts. It never fabricates a root, guesses historical ownership, or
 * submits a transaction. The default output is a manifest-only refusal when
 * the required indexer/RPC inputs are unavailable.
 *
 * A production implementation should supply a deterministic event/indexer
 * export at --input. The input is a JSON array of records:
 * { tld, label, owner, expires, registrar, controller, tokenId }
 */

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const SOURCE_CHAIN_ID = 5042002;
const CAMPAIGN_ID = process.env.ARCNS_CAMPAIGN_ID || "arcns-v3-early-adopters-1";
const LEAF_ENCODING = "keccak256(abi.encode(campaignId, account))";
const DEFAULT_EXCLUSIONS = new Set(
  (process.env.ARCNS_SNAPSHOT_EXCLUSIONS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function fail(message) {
  throw new Error(`[snapshot-not-ready] ${message}`);
}

function normalizeAddress(value) {
  try {
    return ethers.getAddress(String(value)).toLowerCase();
  } catch {
    fail(`invalid address: ${value}`);
  }
}

const ZERO_ADDRESS = normalizeAddress(ethers.ZeroAddress);
const REGISTRAR_FIELDS = ["registrar", "registrarAddress", "sourceRegistrar", "tldRegistrar"];
const VERSION_FIELDS = ["version", "protocolVersion", "registrarVersion", "sourceVersion", "source"];

function registrarFor(record) {
  const field = REGISTRAR_FIELDS.find((candidate) => record[candidate] !== undefined && record[candidate] !== null && record[candidate] !== "");
  if (!field) fail(`record ${record.name || record.label || "<unnamed>"} is missing registrar provenance (${REGISTRAR_FIELDS.join(", ")})`);
  return normalizeAddress(record[field]);
}

function assertV3Provenance(record) {
  for (const field of VERSION_FIELDS) {
    if (record[field] === undefined || record[field] === null || record[field] === "") continue;
    const marker = String(record[field]).trim().toLowerCase();
    if (/(^|[^a-z0-9])(legacy|v?1|v?2)([^a-z0-9]|$)/.test(marker)) {
      fail(`record ${record.name || record.label || "<unnamed>"} has non-v3 provenance in ${field}: ${record[field]}`);
    }
  }
}

function readInput(inputPath) {
  if (!inputPath) fail("a real finalized input export is required; no snapshot data was fabricated");
  if (!fs.existsSync(inputPath)) fail(`input export does not exist: ${inputPath}`);
  const records = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  if (!Array.isArray(records)) fail("input export must be a JSON array");
  return records;
}

function sortRecords(records, snapshotTimestamp, registrars) {
  return records
    .filter((record) => record.tld === "arc" || record.tld === "circle")
    .map((record) => {
      // Zero-owner rows are valid export data for burned/empty records and are
      // excluded by policy; malformed non-zero values still fail loudly.
      const rawOwner = String(record.owner || "");
      if (/^0x0{40}$/i.test(rawOwner)) return null;
      const owner = normalizeAddress(rawOwner);
      assertV3Provenance(record);
      const expectedRegistrar = registrars[record.tld];
      const actualRegistrar = registrarFor(record);
      if (actualRegistrar !== expectedRegistrar) {
        fail(`record ${record.name || record.label || "<unnamed>"} registrar ${actualRegistrar} does not match supplied .${record.tld} registrar ${expectedRegistrar}`);
      }
      return { ...record, owner, registrar: actualRegistrar };
    })
    .filter(Boolean)
    .filter((record) => record.owner !== ZERO_ADDRESS)
    .filter((record) => !DEFAULT_EXCLUSIONS.has(record.owner))
    .filter((record) => Number(record.expires) > snapshotTimestamp && record.active !== false && record.burned !== true)
    .sort((a, b) => `${a.owner}:${a.tld}:${a.label}`.localeCompare(`${b.owner}:${b.tld}:${b.label}`));
}

function uniqueWallets(records) {
  return [...new Set(records.map((record) => record.owner))].sort();
}

function gitCommit() {
  try { return require("child_process").execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
  catch { return "unknown"; }
}

function main() {
  const snapshotBlock = arg("--snapshot-block") || process.env.ARCNS_SNAPSHOT_BLOCK;
  const snapshotBlockHash = arg("--snapshot-block-hash") || process.env.ARCNS_SNAPSHOT_BLOCK_HASH;
  const inputPath = arg("--input") || process.env.ARCNS_SNAPSHOT_INPUT;
  const arcRegistrar = arg("--arc-registrar") || process.env.ARCNS_ARC_REGISTRAR;
  const circleRegistrar = arg("--circle-registrar") || process.env.ARCNS_CIRCLE_REGISTRAR;
  const snapshotTimestamp = Number(arg("--snapshot-timestamp") || process.env.ARCNS_SNAPSHOT_TIMESTAMP);
  if (!snapshotBlock || !snapshotBlockHash) fail("finalized --snapshot-block and --snapshot-block-hash are required");
  if (!arcRegistrar || !circleRegistrar) fail(".arc and .circle registrar addresses are required");
  if (!Number.isSafeInteger(snapshotTimestamp) || snapshotTimestamp <= 0) fail("finalized --snapshot-timestamp is required");

  const registrars = {
    arc: normalizeAddress(arcRegistrar),
    circle: normalizeAddress(circleRegistrar),
  };
  if (registrars.arc === ZERO_ADDRESS || registrars.circle === ZERO_ADDRESS) fail("registrar addresses must be non-zero");

  const records = sortRecords(readInput(inputPath), snapshotTimestamp, registrars);
  const wallets = uniqueWallets(records);
  const outDir = path.resolve(arg("--out") || "snapshots/arc-testnet-v3-early-adopters");
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = {
    campaignId: CAMPAIGN_ID,
    sourceChainId: SOURCE_CHAIN_ID,
    snapshotBlock: Number(snapshotBlock),
    snapshotBlockHash,
    snapshotTimestamp,
    sourceArcRegistrar: registrars.arc,
    sourceCircleRegistrar: registrars.circle,
    eligibleWalletCount: wallets.length,
    eligibleActiveNameCount: records.length,
    merkleRoot: null,
    leafEncoding: LEAF_ENCODING,
    generatorVersion: "1.0.0",
    gitCommit: gitCommit(),
    generatedAt: new Date().toISOString(),
    exclusionPolicy: "active v3 .arc/.circle only; expired/zero-owner/burned/protocol addresses excluded; smart-contract wallets allowed",
    status: "prepared-input-only; root must be generated and reviewed before launch",
  };
  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "eligible-addresses.json"), JSON.stringify(wallets, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "eligible-addresses.csv"), "address\n" + wallets.join("\n") + (wallets.length ? "\n" : ""));
  fs.writeFileSync(path.join(outDir, "merkle-proofs.json"), JSON.stringify({ status: "not-generated", reason: "root/proofs require reviewed finalized input" }, null, 2) + "\n");
  console.log(`Wrote reviewed-input snapshot preparation to ${outDir}; merkleRoot remains unset.`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exit(1); }
}

module.exports = { normalizeAddress, sortRecords, uniqueWallets };