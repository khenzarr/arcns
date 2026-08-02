"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { loadAndValidateFinalSnapshot } = require("./final-snapshot");
const { leafFor, verifyProof } = require("./generate-discount-proof-artifact");

const ARTIFACT_PATH = path.resolve(__dirname, "../../frontend/public/discount-proofs/arcns-v3-early-adopter-2026.json");

function main() {
  const snapshot = loadAndValidateFinalSnapshot();
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_PATH, "utf8"));
  const exact = ["campaignId", "campaignIdBytes32", "snapshotBlock", "snapshotBlockHash", "merkleRoot", "eligibleWalletCount"];
  for (const field of exact) {
    const actual = typeof artifact[field] === "string" ? artifact[field].toLowerCase() : artifact[field];
    const expected = typeof snapshot[field] === "string" ? snapshot[field].toLowerCase() : snapshot[field];
    if (actual !== expected) throw new Error(`${field} mismatch`);
  }
  if (artifact.version !== 1 || typeof artifact.proofFormat !== "string" || typeof artifact.proofs !== "object") throw new Error("Malformed artifact metadata");
  const entries = Object.entries(artifact.proofs);
  if (entries.length !== snapshot.eligibleWalletCount) throw new Error("Artifact proof count mismatch");
  const seen = new Set();
  for (const [account, proof] of entries) {
    if (!/^0x[0-9a-f]{40}$/.test(account) || account !== account.toLowerCase()) throw new Error(`Invalid proof address ${account}`);
    if (seen.has(account)) throw new Error(`Duplicate address ${account}`);
    seen.add(account);
    if (!Array.isArray(proof) || !proof.every((value) => typeof value === "string" && ethers.isHexString(value, 32) && value === value.toLowerCase())) throw new Error(`Invalid proof values for ${account}`);
    const leaf = leafFor(snapshot.campaignIdBytes32, account);
    if (!verifyProof(leaf, proof, snapshot.merkleRoot)) throw new Error(`Invalid Merkle proof for ${account}`);
  }
  console.log(`PASS: validated ${entries.length} proofs against finalized root ${snapshot.merkleRoot}`);
}

if (require.main === module) { try { main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exit(1); } }