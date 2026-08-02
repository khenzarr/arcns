"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const FINAL_SNAPSHOT_MANIFEST_PATH = path.resolve(
  __dirname,
  "../../snapshots/arc-testnet-v3-early-adopters/manifest.json",
);

const EXPECTED_FINAL_SNAPSHOT = Object.freeze({
  campaignId: "ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1",
  campaignIdBytes32: "0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3",
  snapshotBlock: 54933646,
  snapshotBlockHash: "0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d",
  merkleRoot: "0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e",
  eligibleWalletCount: 849,
});

function assertExact(field, actual, expected) {
  if (actual !== expected) {
    throw new Error(`Final snapshot manifest mismatch for ${field}: expected ${expected}, received ${actual}`);
  }
}

function assertBytes32(field, value) {
  if (typeof value !== "string" || !ethers.isHexString(value, 32)) {
    throw new Error(`Final snapshot manifest ${field} must be a bytes32 hex string`);
  }
}

function validateFinalSnapshotManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Final snapshot manifest must be a JSON object");
  }

  assertBytes32("campaignIdBytes32", manifest.campaignIdBytes32);
  assertBytes32("snapshotBlockHash", manifest.snapshotBlockHash);
  assertBytes32("merkleRoot", manifest.merkleRoot);
  if (!Number.isSafeInteger(manifest.snapshotBlock) || manifest.snapshotBlock <= 0) {
    throw new Error("Final snapshot manifest snapshotBlock must be a positive safe integer");
  }
  if (!Number.isSafeInteger(manifest.eligibleWalletCount) || manifest.eligibleWalletCount <= 0) {
    throw new Error("Final snapshot manifest eligibleWalletCount must be a positive safe integer");
  }

  for (const [field, expected] of Object.entries(EXPECTED_FINAL_SNAPSHOT)) {
    assertExact(field, manifest[field], expected);
  }

  const derivedCampaignId = ethers.id(manifest.campaignId);
  assertExact("campaignIdBytes32 derived from campaignId", derivedCampaignId, manifest.campaignIdBytes32);

  return Object.freeze({ ...EXPECTED_FINAL_SNAPSHOT });
}

function loadFinalSnapshotManifest(manifestPath = FINAL_SNAPSHOT_MANIFEST_PATH) {
  let raw;
  try {
    raw = fs.readFileSync(manifestPath, "utf8");
  } catch (error) {
    throw new Error(`Final snapshot manifest is required and could not be read at ${manifestPath}: ${error.message}`);
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Final snapshot manifest is malformed JSON at ${manifestPath}: ${error.message}`);
  }

  return validateFinalSnapshotManifest(manifest);
}

function validateFinalSnapshotEnv(env, snapshot) {
  const checks = [
    ["EARLY_ADOPTER_CAMPAIGN_ID", "campaignId", String],
    ["EARLY_ADOPTER_CAMPAIGN_ID_BYTES32", "campaignIdBytes32", String],
    ["EARLY_ADOPTER_SNAPSHOT_BLOCK", "snapshotBlock", Number],
    ["EARLY_ADOPTER_SNAPSHOT_BLOCK_HASH", "snapshotBlockHash", String],
    ["EARLY_ADOPTER_MERKLE_ROOT", "merkleRoot", String],
    ["EARLY_ADOPTER_ELIGIBLE_WALLET_COUNT", "eligibleWalletCount", Number],
  ];

  for (const [envName, field, convert] of checks) {
    if (env[envName] === undefined || env[envName] === "") continue;
    const actual = convert(env[envName]);
    if (actual !== snapshot[field]) {
      throw new Error(`${envName} contradicts the finalized snapshot manifest: expected ${snapshot[field]}, received ${env[envName]}`);
    }
  }

  return snapshot;
}

function loadAndValidateFinalSnapshot(env = process.env, manifestPath = FINAL_SNAPSHOT_MANIFEST_PATH) {
  return validateFinalSnapshotEnv(env, loadFinalSnapshotManifest(manifestPath));
}

module.exports = {
  EXPECTED_FINAL_SNAPSHOT,
  FINAL_SNAPSHOT_MANIFEST_PATH,
  loadAndValidateFinalSnapshot,
  loadFinalSnapshotManifest,
  validateFinalSnapshotEnv,
  validateFinalSnapshotManifest,
};