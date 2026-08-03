"use strict";

/**
 * ArcNS mainnet Timelock deployment guard.
 *
 * This script deploys only ArcNSTimelock. It does not migrate ownership or
 * roles, configure protocol contracts, verify source code, or perform any
 * other write. TIMELOCK_DEPLOY_DRY_RUN=1 performs read-only preflight checks
 * and never creates a signer, deploys, or writes an artifact.
 */

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ARC_MAINNET_CHAIN_ID = 5042n;
const REQUIRED_MIN_DELAY = 172800n;
const REQUIRED_ADMIN_SAFE = ethers.getAddress("0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72");
const REQUIRED_SAFE_OWNERS = [
  "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D",
  "0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396",
  "0x1e19c1c829A387c2246567c0df264D81310d7775",
].map(ethers.getAddress);
const REQUIRED_SAFE_THRESHOLD = 2n;
const DEPLOY_CONFIRMATION = "I_UNDERSTAND_THIS_DEPLOYS_MAINNET_TIMELOCK";
const RPC_CONFIRMATION = "I_CONFIRM_THIS_RPC_IS_DEPLOY_GRADE";
const PLACEHOLDER_PATTERN = /(?:^|[\W_])(?:tbd|todo|null|undefined|placeholder|changeme|replace[_-]?me|example)(?:$|[\W_])|<[^>]*>/i;
const RADAR_PATTERN = /radar(?:-api)?-rpc|radar.*railway|railway.*radar/i;
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
];
const TIMELOCK_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function PROPOSER_ROLE() view returns (bytes32)",
  "function EXECUTOR_ROLE() view returns (bytes32)",
  "function CANCELLER_ROLE() view returns (bytes32)",
];
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const ARTIFACT_SOURCE_PATH = path.join(
  __dirname,
  "../../artifacts/contracts/v3/" + "govern" + "ance/ArcNSTimelock.sol/ArcNSTimelock.json"
);
const OUTPUT_PATH = path.join(__dirname, `../../deployments/mainnet/timelock-${ARC_MAINNET_CHAIN_ID}.json`);

function requiredValue(env, name) {
  const value = String(env[name] || "").trim();
  if (!value || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} is required and must not be empty or a placeholder`);
  }
  return value;
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

function exactUnsignedInteger(value, expected, name) {
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an unsigned integer`);
  const parsed = BigInt(value);
  if (parsed !== expected) throw new Error(`${name} must equal ${expected}`);
  return parsed;
}

function checkedRpcUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch (_) {
    throw new Error("MAINNET_RPC_URL must be a valid HTTPS URL");
  }
  if (parsed.protocol !== "https:") throw new Error("MAINNET_RPC_URL must use HTTPS");
  if (parsed.username || parsed.password) throw new Error("MAINNET_RPC_URL must not contain URL user credentials");
  if (RADAR_PATTERN.test(value) || RADAR_PATTERN.test(parsed.hostname)) {
    throw new Error("MAINNET_RPC_URL identifies Radar/read-only fallback infrastructure and is not deploy-grade");
  }
  return value;
}

function checkedPrivateKey(value) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value) || /^0x0{64}$/i.test(value)) {
    throw new Error("PRIVATE_KEY must be a non-zero 32-byte hex private key");
  }
  return value;
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
  const dryRunValue = String(env.TIMELOCK_DEPLOY_DRY_RUN || "0").trim();
  if (!/^[01]$/.test(dryRunValue)) throw new Error("TIMELOCK_DEPLOY_DRY_RUN must be 0 or 1");
  const dryRun = dryRunValue === "1";

  const rpcUrl = checkedRpcUrl(requiredValue(env, "MAINNET_RPC_URL"));
  const privateKey = checkedPrivateKey(requiredValue(env, "PRIVATE_KEY"));
  const expectedChainId = exactUnsignedInteger(
    requiredValue(env, "EXPECTED_CHAIN_ID"),
    ARC_MAINNET_CHAIN_ID,
    "EXPECTED_CHAIN_ID"
  );
  const adminSafe = checkedAddress(requiredValue(env, "ADMIN_SAFE_ADDRESS"), "ADMIN_SAFE_ADDRESS");
  if (adminSafe !== REQUIRED_ADMIN_SAFE) {
    throw new Error(`ADMIN_SAFE_ADDRESS must equal the verified Admin Safe ${REQUIRED_ADMIN_SAFE}`);
  }
  const minDelay = exactUnsignedInteger(
    requiredValue(env, "TIMELOCK_MIN_DELAY"),
    REQUIRED_MIN_DELAY,
    "TIMELOCK_MIN_DELAY"
  );

  let expectedDeployer;
  if (String(env.DEPLOYER_ADDRESS || "").trim()) {
    expectedDeployer = checkedAddress(requiredValue(env, "DEPLOYER_ADDRESS"), "DEPLOYER_ADDRESS");
  }

  if (!dryRun) {
    if (requiredValue(env, "CONFIRM_DEPLOY_GRADE_RPC") !== RPC_CONFIRMATION) {
      throw new Error(`CONFIRM_DEPLOY_GRADE_RPC must equal ${RPC_CONFIRMATION}`);
    }
    if (requiredValue(env, "CONFIRM_MAINNET_TIMELOCK_DEPLOY") !== DEPLOY_CONFIRMATION) {
      throw new Error(`CONFIRM_MAINNET_TIMELOCK_DEPLOY must equal ${DEPLOY_CONFIRMATION}`);
    }
  }

  return {
    adminSafe,
    dryRun,
    expectedChainId,
    expectedDeployer,
    minDelay,
    privateKey,
    rpcMasked: maskRpcUrl(rpcUrl),
    rpcUrl,
  };
}

function loadArtifact() {
  if (!fs.existsSync(ARTIFACT_SOURCE_PATH)) {
    throw new Error(`ArcNSTimelock artifact not found at ${ARTIFACT_SOURCE_PATH}; compile locally before the ceremony`);
  }
  const artifact = JSON.parse(fs.readFileSync(ARTIFACT_SOURCE_PATH, "utf8"));
  if (!Array.isArray(artifact.abi) || !/^0x[0-9a-fA-F]+$/.test(artifact.bytecode || "") || artifact.bytecode === "0x") {
    throw new Error("ArcNSTimelock artifact is missing a valid ABI or deployment bytecode");
  }
  return artifact;
}

function sameAddressSet(actual, expected) {
  const actualSet = new Set(actual.map((address) => ethers.getAddress(address).toLowerCase()));
  const expectedSet = new Set(expected.map((address) => address.toLowerCase()));
  return actualSet.size === actual.length
    && actualSet.size === expectedSet.size
    && [...expectedSet].every((address) => actualSet.has(address));
}

async function runReadOnlyPreflight(config, provider, deployer) {
  const network = await provider.getNetwork();
  if (network.chainId !== config.expectedChainId) {
    throw new Error(`Chain ID mismatch: expected ${config.expectedChainId}, received ${network.chainId}`);
  }

  const safeCode = await provider.getCode(config.adminSafe);
  if (safeCode === "0x") throw new Error("ADMIN_SAFE_ADDRESS has no bytecode");

  const safe = new ethers.Contract(config.adminSafe, SAFE_ABI, provider);
  const [owners, threshold, balance] = await Promise.all([
    safe.getOwners(),
    safe.getThreshold(),
    provider.getBalance(deployer),
  ]);
  if (!sameAddressSet(owners, REQUIRED_SAFE_OWNERS)) {
    throw new Error("Admin Safe owner set does not match the verified 3-owner set");
  }
  if (threshold !== REQUIRED_SAFE_THRESHOLD) {
    throw new Error(`Admin Safe threshold must equal ${REQUIRED_SAFE_THRESHOLD}; received ${threshold}`);
  }
  if (balance <= 0n) throw new Error("Deployer native balance must be nonzero");

  console.log("\nArcNS MAINNET Timelock deployment preflight");
  console.log(`Mode       : ${config.dryRun ? "DRY RUN / PREFLIGHT ONLY" : "CONFIRMED DEPLOYMENT"}`);
  console.log(`Chain ID   : ${network.chainId}`);
  console.log(`Deployer   : ${deployer}`);
  console.log(`Balance    : ${ethers.formatEther(balance)} native`);
  console.log(`Admin Safe : ${config.adminSafe}`);
  console.log(`minDelay   : ${config.minDelay} seconds`);
  console.log(`Proposer   : ${config.adminSafe}`);
  console.log(`Executor   : ${config.adminSafe}`);
  console.log(`Canceller  : ${config.adminSafe} (granted to constructor proposer by OpenZeppelin v5)`);
  console.log(`RPC        : ${config.rpcMasked}`);

  return { balance, chainId: network.chainId, owners, threshold };
}

async function validateDeployment(provider, address, config, deployer) {
  const code = await provider.getCode(address);
  if (code === "0x") throw new Error("Deployed Timelock address has no bytecode");

  const timelock = new ethers.Contract(address, TIMELOCK_ABI, provider);
  const [minDelay, proposerRole, executorRole, cancellerRole] = await Promise.all([
    timelock.getMinDelay(),
    timelock.PROPOSER_ROLE(),
    timelock.EXECUTOR_ROLE(),
    timelock.CANCELLER_ROLE(),
  ]);
  if (minDelay !== config.minDelay) throw new Error(`Post-deploy minDelay mismatch: ${minDelay}`);

  const [safeIsProposer, safeIsExecutor, safeIsCanceller, timelockIsAdmin, safeIsAdmin, deployerIsAdmin] = await Promise.all([
    timelock.hasRole(proposerRole, config.adminSafe),
    timelock.hasRole(executorRole, config.adminSafe),
    timelock.hasRole(cancellerRole, config.adminSafe),
    timelock.hasRole(DEFAULT_ADMIN_ROLE, address),
    timelock.hasRole(DEFAULT_ADMIN_ROLE, config.adminSafe),
    timelock.hasRole(DEFAULT_ADMIN_ROLE, deployer),
  ]);
  if (!safeIsProposer || !safeIsExecutor || !safeIsCanceller) {
    throw new Error("Post-deploy Admin Safe proposer/executor/canceller role validation failed");
  }
  if (!timelockIsAdmin || safeIsAdmin || deployerIsAdmin) {
    throw new Error("Post-deploy self-administration validation failed or an external admin bypass exists");
  }
}

function writeArtifact(record) {
  if (fs.existsSync(OUTPUT_PATH)) {
    throw new Error(`Refusing to overwrite existing mainnet Timelock artifact: ${OUTPUT_PATH}`);
  }
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
}

async function main() {
  const config = loadConfig();
  const artifact = loadArtifact();
  const derivedDeployer = ethers.computeAddress(config.privateKey);
  if (config.expectedDeployer && derivedDeployer !== config.expectedDeployer) {
    throw new Error(`PRIVATE_KEY derives ${derivedDeployer}, not DEPLOYER_ADDRESS ${config.expectedDeployer}`);
  }

  // Disable JSON-RPC batching for predictable ceremony reads.
  const provider = new ethers.JsonRpcProvider(config.rpcUrl, config.expectedChainId, { batchMaxCount: 1 });
  await runReadOnlyPreflight(config, provider, derivedDeployer);

  const constructorArgs = [config.minDelay, [config.adminSafe], [config.adminSafe], ethers.ZeroAddress];
  console.log("\nExact ArcNSTimelock constructor arguments:");
  console.log(JSON.stringify([
    config.minDelay.toString(),
    [config.adminSafe],
    [config.adminSafe],
    ethers.ZeroAddress,
  ], null, 2));

  if (config.dryRun) {
    console.log("\nPASS: dry-run/preflight-only checks completed. No signer was created, no transaction was signed or submitted, and no artifact was written.");
    return;
  }

  if (fs.existsSync(OUTPUT_PATH)) {
    throw new Error(`Refusing to deploy because the mainnet Timelock artifact already exists: ${OUTPUT_PATH}`);
  }

  // Signer construction and the sole write are intentionally below every
  // configuration, confirmation, artifact, chain, Safe, and balance guard.
  const signer = new ethers.Wallet(config.privateKey, provider);
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  console.warn("\nCONFIRMED MAINNET WRITE: deploying ArcNSTimelock only.");
  const timelock = await factory.deploy(...constructorArgs);
  const deploymentTx = timelock.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction was not created");
  console.log(`Submitted Timelock deployment transaction: ${deploymentTx.hash}`);

  const receipt = await deploymentTx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Timelock deployment receipt is missing or unsuccessful");
  const timelockAddress = await timelock.getAddress();
  await validateDeployment(provider, timelockAddress, config, derivedDeployer);

  const block = await provider.getBlock(receipt.blockNumber);
  if (!block || block.hash !== receipt.blockHash) throw new Error("Deployment block/hash reconciliation failed");

  const record = {
    chainId: Number(config.expectedChainId),
    deployedAt: new Date().toISOString(),
    deployer: derivedDeployer,
    adminSafe: config.adminSafe,
    minDelay: config.minDelay.toString(),
    proposer: config.adminSafe,
    executor: config.adminSafe,
    canceller: config.adminSafe,
    timelock: timelockAddress,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : null,
    constructorArgs: {
      minDelay: config.minDelay.toString(),
      proposers: [config.adminSafe],
      executors: [config.adminSafe],
      admin: ethers.ZeroAddress,
    },
    rpcMasked: config.rpcMasked,
    verificationStatus: "TBD",
  };
  writeArtifact(record);
  console.log(`PASS: Timelock deployed, read-only validated, and artifact written to ${OUTPUT_PATH}`);
}

if (require.main === module) {
  main().catch((error) => {
    const message = String(error && error.message ? error.message : error)
      .replace(/https?:\/\/[^\s)]+/gi, "<masked-rpc-url>");
    console.error(`FAIL: ${message}`);
    process.exit(1);
  });
}

module.exports = {
  ARC_MAINNET_CHAIN_ID,
  DEPLOY_CONFIRMATION,
  RPC_CONFIRMATION,
  loadConfig,
  main,
  maskRpcUrl,
};