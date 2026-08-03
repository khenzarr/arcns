"use strict";

const { ethers } = require("ethers");

const TIMELOCK_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
];
const REQUIRED_ENV = [
  "TIMELOCK_RPC_URL",
  "EXPECTED_CHAIN_ID",
  "TIMELOCK_ADDRESS",
  "EXPECTED_MIN_DELAY",
  "EXPECTED_ADMIN_SAFE",
];
const PLACEHOLDER_PATTERN = /(?:^|[\W_])(?:tbd|todo|null|undefined|placeholder|changeme|replace[_-]?me)(?:$|[\W_])|<[^>]*>/i;
const ROLE_HASHES = {
  PROPOSER_ROLE: ethers.id("PROPOSER_ROLE"),
  EXECUTOR_ROLE: ethers.id("EXECUTOR_ROLE"),
  CANCELLER_ROLE: ethers.id("CANCELLER_ROLE"),
  // OpenZeppelin Contracts v5.6.1 uses DEFAULT_ADMIN_ROLE for Timelock administration.
  TIMELOCK_ADMIN_ROLE: ethers.ZeroHash,
};

function requiredValue(env, name) {
  const value = String(env[name] || "").trim();
  if (!value || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} is required and must not be empty or a placeholder`);
  }
  return value;
}

function nonNegativeInteger(value, name) {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be a non-negative integer`);
  return BigInt(value);
}

function positiveInteger(value, name) {
  const parsed = nonNegativeInteger(value, name);
  if (parsed < 1n) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function checkedAddress(value, name) {
  try {
    const address = ethers.getAddress(value);
    if (address === ethers.ZeroAddress) throw new Error("zero address");
    return address;
  } catch (_) {
    throw new Error(`${name} must be a valid non-zero address`);
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

  const rpcUrl = requiredValue(env, "TIMELOCK_RPC_URL");
  let parsedRpc;
  try {
    parsedRpc = new URL(rpcUrl);
  } catch (_) {
    throw new Error("TIMELOCK_RPC_URL must be a valid HTTP(S) URL");
  }
  if (!/^https?:$/.test(parsedRpc.protocol)) {
    throw new Error("TIMELOCK_RPC_URL must use HTTP or HTTPS");
  }

  const allowValue = String(env.ALLOW_DEPLOYER_TIMELOCK_ADMIN || "0").trim();
  if (!/^[01]$/.test(allowValue)) {
    throw new Error("ALLOW_DEPLOYER_TIMELOCK_ADMIN must be 0 or 1");
  }

  const timelockAddress = checkedAddress(requiredValue(env, "TIMELOCK_ADDRESS"), "TIMELOCK_ADDRESS");
  const adminSafe = checkedAddress(requiredValue(env, "EXPECTED_ADMIN_SAFE"), "EXPECTED_ADMIN_SAFE");
  if (timelockAddress === adminSafe) {
    throw new Error("TIMELOCK_ADDRESS must not equal EXPECTED_ADMIN_SAFE");
  }

  let deployer;
  if (String(env.DEPLOYER_ADDRESS || "").trim()) {
    const rawDeployer = requiredValue(env, "DEPLOYER_ADDRESS");
    deployer = checkedAddress(rawDeployer, "DEPLOYER_ADDRESS");
    if (deployer === timelockAddress) throw new Error("DEPLOYER_ADDRESS must not equal TIMELOCK_ADDRESS");
  }

  return {
    rpcUrl,
    expectedChainId: positiveInteger(requiredValue(env, "EXPECTED_CHAIN_ID"), "EXPECTED_CHAIN_ID"),
    timelockAddress,
    expectedMinDelay: nonNegativeInteger(requiredValue(env, "EXPECTED_MIN_DELAY"), "EXPECTED_MIN_DELAY"),
    adminSafe,
    deployer,
    allowDeployerTimelockAdmin: allowValue === "1",
  };
}

async function main() {
  const config = loadConfig();
  console.log(`RPC: ${maskRpcUrl(config.rpcUrl)}`);
  console.log("Timelock admin role model: OpenZeppelin v5 DEFAULT_ADMIN_ROLE (bytes32(0)); no TIMELOCK_ADMIN_ROLE() getter.");

  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.expectedChainId, { batchMaxCount: 1 });
  const network = await provider.getNetwork();
  if (network.chainId !== config.expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${config.expectedChainId}, received ${network.chainId}`);
  }

  const code = await provider.getCode(config.timelockAddress);
  if (code === "0x") throw new Error("TIMELOCK_ADDRESS has no bytecode");

  const timelock = new ethers.Contract(config.timelockAddress, TIMELOCK_ABI, provider);
  const [minDelay, proposerRole, executorRole, cancellerRole] = await Promise.all([
    timelock.getMinDelay(),
    timelock.PROPOSER_ROLE(),
    timelock.EXECUTOR_ROLE(),
    timelock.CANCELLER_ROLE(),
  ]);

  if (minDelay !== config.expectedMinDelay) {
    throw new Error(`Minimum delay mismatch: expected ${config.expectedMinDelay}, received ${minDelay}`);
  }
  for (const [name, actual] of Object.entries({ PROPOSER_ROLE: proposerRole, EXECUTOR_ROLE: executorRole, CANCELLER_ROLE: cancellerRole })) {
    if (actual !== ROLE_HASHES[name]) throw new Error(`${name} hash mismatch`);
  }

  const [safeIsProposer, safeIsExecutor, safeIsCanceller, timelockIsAdmin, safeIsAdmin] = await Promise.all([
    timelock.hasRole(proposerRole, config.adminSafe),
    timelock.hasRole(executorRole, config.adminSafe),
    timelock.hasRole(cancellerRole, config.adminSafe),
    timelock.hasRole(ROLE_HASHES.TIMELOCK_ADMIN_ROLE, config.timelockAddress),
    timelock.hasRole(ROLE_HASHES.TIMELOCK_ADMIN_ROLE, config.adminSafe),
  ]);
  if (!safeIsProposer) throw new Error("EXPECTED_ADMIN_SAFE does not hold PROPOSER_ROLE");
  if (!safeIsExecutor) throw new Error("EXPECTED_ADMIN_SAFE does not hold EXECUTOR_ROLE");
  if (!safeIsCanceller) throw new Error("EXPECTED_ADMIN_SAFE does not hold CANCELLER_ROLE");
  if (!timelockIsAdmin) throw new Error("Timelock is not self-administered through DEFAULT_ADMIN_ROLE");
  if (safeIsAdmin) throw new Error("EXPECTED_ADMIN_SAFE unexpectedly retains Timelock DEFAULT_ADMIN_ROLE bypass authority");

  if (config.deployer) {
    const deployerIsAdmin = await timelock.hasRole(ROLE_HASHES.TIMELOCK_ADMIN_ROLE, config.deployer);
    if (deployerIsAdmin && !config.allowDeployerTimelockAdmin) {
      throw new Error("DEPLOYER_ADDRESS retains Timelock DEFAULT_ADMIN_ROLE; set ALLOW_DEPLOYER_TIMELOCK_ADMIN=1 only for an explicitly reviewed exception");
    }
  }

  console.log(`PASS: Timelock ${config.timelockAddress} has bytecode, delay ${minDelay}, expected Safe roles, self-administration, and chain ID ${network.chainId} (read-only).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`FAIL: ${error.message.replace(/https?:\/\/[^\s)]+/gi, "<masked-rpc-url>")}`);
    process.exit(1);
  });
}

module.exports = { loadConfig, main, maskRpcUrl, ROLE_HASHES };