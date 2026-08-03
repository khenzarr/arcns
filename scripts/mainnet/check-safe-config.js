"use strict";

const { ethers } = require("ethers");

const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
];
const REQUIRED_ENV = [
  "SAFE_RPC_URL",
  "EXPECTED_CHAIN_ID",
  "ADMIN_SAFE_ADDRESS",
  "EXPECTED_SAFE_OWNERS",
  "EXPECTED_SAFE_THRESHOLD",
];
const PLACEHOLDER_PATTERN = /^(?:tbd|todo|null|undefined|placeholder|changeme|replace_me|<.*>)$/i;

function requiredValue(env, name) {
  const value = String(env[name] || "").trim();
  if (!value || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} is required and must not be empty or a placeholder`);
  }
  return value;
}

function positiveInteger(value, name) {
  if (!/^\d+$/.test(value) || BigInt(value) < 1n) {
    throw new Error(`${name} must be a positive integer`);
  }
  return BigInt(value);
}

function checkedAddress(value, name) {
  try {
    return ethers.getAddress(value);
  } catch (_) {
    throw new Error(`${name} must be a valid address`);
  }
}

function maskRpcUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}/***`;
  } catch (_) {
    return "<masked-invalid-url>";
  }
}

function loadConfig(env = process.env) {
  for (const name of REQUIRED_ENV) requiredValue(env, name);

  const rpcUrl = requiredValue(env, "SAFE_RPC_URL");
  let parsedRpc;
  try {
    parsedRpc = new URL(rpcUrl);
  } catch (_) {
    throw new Error("SAFE_RPC_URL must be a valid HTTP(S) URL");
  }
  if (!/^https?:$/.test(parsedRpc.protocol)) {
    throw new Error("SAFE_RPC_URL must use HTTP or HTTPS");
  }

  const ownerEntries = requiredValue(env, "EXPECTED_SAFE_OWNERS").split(",").map((owner) => owner.trim());
  if (ownerEntries.some((owner) => !owner || PLACEHOLDER_PATTERN.test(owner))) {
    throw new Error("EXPECTED_SAFE_OWNERS must not contain empty or placeholder entries");
  }
  const owners = ownerEntries
    .map((owner, index) => checkedAddress(owner, `EXPECTED_SAFE_OWNERS entry ${index + 1}`));

  const normalizedOwners = owners.map((owner) => owner.toLowerCase());
  if (new Set(normalizedOwners).size !== owners.length) {
    throw new Error("EXPECTED_SAFE_OWNERS must not contain duplicates");
  }

  const threshold = positiveInteger(requiredValue(env, "EXPECTED_SAFE_THRESHOLD"), "EXPECTED_SAFE_THRESHOLD");
  if (threshold > BigInt(owners.length)) {
    throw new Error("EXPECTED_SAFE_THRESHOLD must not exceed the expected owner count");
  }

  const safeAddress = checkedAddress(requiredValue(env, "ADMIN_SAFE_ADDRESS"), "ADMIN_SAFE_ADDRESS");
  if (normalizedOwners.includes(safeAddress.toLowerCase())) {
    throw new Error("ADMIN_SAFE_ADDRESS must not equal any expected owner address");
  }

  return {
    rpcUrl,
    expectedChainId: positiveInteger(requiredValue(env, "EXPECTED_CHAIN_ID"), "EXPECTED_CHAIN_ID"),
    safeAddress,
    owners,
    threshold,
  };
}

async function main() {
  const config = loadConfig();
  console.log(`RPC: ${maskRpcUrl(config.rpcUrl)}`);

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const network = await provider.getNetwork();
  if (network.chainId !== config.expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${config.expectedChainId}, received ${network.chainId}`);
  }

  const code = await provider.getCode(config.safeAddress);
  if (code === "0x") throw new Error("ADMIN_SAFE_ADDRESS has no bytecode");

  const safe = new ethers.Contract(config.safeAddress, SAFE_ABI, provider);
  const [actualOwners, actualThreshold] = await Promise.all([safe.getOwners(), safe.getThreshold()]);
  const expectedSet = new Set(config.owners.map((owner) => owner.toLowerCase()));
  const actualNormalized = actualOwners.map((owner) => checkedAddress(owner, "Safe owner").toLowerCase());
  const actualSet = new Set(actualNormalized);

  if (actualSet.size !== actualOwners.length) throw new Error("Safe returned duplicate owners");
  if (actualSet.size !== expectedSet.size || [...expectedSet].some((owner) => !actualSet.has(owner))) {
    throw new Error("Safe owner set does not exactly match EXPECTED_SAFE_OWNERS");
  }
  if (actualThreshold !== config.threshold) {
    throw new Error(`Safe threshold mismatch: expected ${config.threshold}, received ${actualThreshold}`);
  }
  if (actualNormalized.includes(config.safeAddress.toLowerCase())) {
    throw new Error("Safe address must not equal an owner address");
  }

  console.log(`PASS: Safe ${config.safeAddress} has bytecode, exact expected owners, threshold ${actualThreshold}, and chain ID ${network.chainId} (read-only).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`FAIL: ${error.message.replace(/https?:\/\/[^\s)]+/gi, "<masked-rpc-url>")}`);
    process.exit(1);
  });
}

module.exports = { loadConfig, main, maskRpcUrl };