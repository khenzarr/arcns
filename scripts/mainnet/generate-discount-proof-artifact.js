"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { loadAndValidateFinalSnapshot } = require("./final-snapshot");

const SNAPSHOT_DIR = path.resolve(__dirname, "../../snapshots/arc-testnet-v3-early-adopters");
const MANIFEST_PATH = path.join(SNAPSHOT_DIR, "manifest.json");
const ADDRESSES_PATH = path.join(SNAPSHOT_DIR, "eligible-addresses.json");
const PROOFS_PATH = path.join(SNAPSHOT_DIR, "merkle-proofs.json");
const OUTPUT_PATH = path.resolve(__dirname, "../../frontend/public/discount-proofs/arcns-v3-early-adopter-2026.json");
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function bytes32(value, field) {
  if (typeof value !== "string" || !ethers.isHexString(value, 32)) throw new Error(`${field} must be bytes32`);
  return value.toLowerCase();
}

function address(value, field) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error(`${field} must be an address`);
  const normalized = value.toLowerCase();
  if (value !== normalized) throw new Error(`${field} must be lowercase-normalized`);
  return normalized;
}

function leafFor(campaignIdBytes32, account) {
  return ethers.keccak256(abiCoder.encode(["bytes32", "address"], [campaignIdBytes32, account])).toLowerCase();
}

function hashPair(left, right) {
  const ordered = [left.toLowerCase(), right.toLowerCase()].sort();
  return ethers.keccak256(ethers.concat(ordered)).toLowerCase();
}

function verifyProof(leaf, proof, root) {
  return proof.reduce(hashPair, leaf).toLowerCase() === root.toLowerCase();
}

function loadJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

function validateSource() {
  const snapshot = loadAndValidateFinalSnapshot();
  const manifest = loadJson(MANIFEST_PATH);
  const addresses = loadJson(ADDRESSES_PATH).map((value, i) => address(value, `eligible-addresses[${i}]`));
  const source = loadJson(PROOFS_PATH);
  if (addresses.length !== snapshot.eligibleWalletCount) throw new Error("Eligible address count does not match finalized count");
  if (new Set(addresses).size !== addresses.length) throw new Error("Duplicate eligible address");
  if (source.campaignId !== snapshot.campaignId || source.campaignIdBytes32.toLowerCase() !== snapshot.campaignIdBytes32 || source.merkleRoot.toLowerCase() !== snapshot.merkleRoot) throw new Error("Proof source metadata does not match finalized snapshot");
  const keys = Object.keys(source.proofs || {});
  if (keys.length !== snapshot.eligibleWalletCount) throw new Error("Proof count does not match finalized count");
  const proofKeys = new Set(keys);
  const proofs = {};
  for (const account of addresses) {
    if (!proofKeys.has(account)) throw new Error(`Missing proof for ${account}`);
    const entry = source.proofs[account];
    if (!Array.isArray(entry.proof) || !entry.proof.every((value) => ethers.isHexString(value, 32))) throw new Error(`Invalid proof for ${account}`);
    const proof = entry.proof.map((value) => value.toLowerCase());
    const leaf = leafFor(snapshot.campaignIdBytes32, account);
    if (bytes32(entry.leaf, `${account}.leaf`) !== leaf) throw new Error(`Leaf mismatch for ${account}`);
    if (!verifyProof(leaf, proof, snapshot.merkleRoot)) throw new Error(`Merkle proof mismatch for ${account}`);
    proofs[account] = proof;
  }
  if (keys.some((key) => !proofKeys.has(key.toLowerCase()) || key !== key.toLowerCase())) throw new Error("Proof keys must be lowercase and canonical");
  return { snapshot, manifest, proofs };
}

function main() {
  const { snapshot, manifest, proofs } = validateSource();
  const artifact = {
    version: 1,
    campaignId: snapshot.campaignId,
    campaignIdBytes32: snapshot.campaignIdBytes32,
    snapshotBlock: snapshot.snapshotBlock,
    snapshotBlockHash: snapshot.snapshotBlockHash,
    merkleRoot: snapshot.merkleRoot,
    eligibleWalletCount: snapshot.eligibleWalletCount,
    generatedFromManifestCommit: manifest.gitCommit || "unknown",
    proofFormat: "proofs[address] is a bytes32[] for keccak256(abi.encode(bytes32 campaignId, address account)); sorted-pair Merkle hashing",
    proofs,
  };
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Generated ${OUTPUT_PATH}`);
  console.log(`PASS: ${Object.keys(proofs).length} proofs verified against ${snapshot.merkleRoot}`);
}

if (require.main === module) { try { main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exit(1); } }

module.exports = { hashPair, leafFor, verifyProof };