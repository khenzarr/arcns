"use strict";

/**
 * Read-only Arc mainnet RPC capability assessment.
 *
 * This script creates no signer, submits no transaction, calls no contract
 * write method, and writes no files. A PASS is capability evidence only; it
 * is never sufficient by itself to approve an endpoint for deployment use.
 */

const { ethers } = require("ethers");
const { createRpcProvider, loadRpcConfig, sanitizeRpcError } = require("./lib/rpc-provider");

const ARC_MAINNET_CHAIN_ID = 5042n;
const MAX_BLOCK_AGE_SECONDS = 300;
const BLOCK_OBSERVATIONS = 3;
const BLOCK_OBSERVATION_DELAY_MS = 1000;
const CHECK_PACING_DELAY_MS = 500;
const RECENT_LOG_BLOCK_RANGE = 10;
const PLACEHOLDER_PATTERN = /(?:^|[\W_])(?:tbd|todo|null|undefined|placeholder|changeme|replace[_-]?me|example|your[_-]?)(?:$|[\W_])|<[^>]*>/i;
const RADAR_PATTERN = /radar(?:-api)?-rpc|radar.*railway|railway.*radar/i;
const SAFE_ABI = [
  "function getOwners() view returns (address[])",
  "function getThreshold() view returns (uint256)",
];

function requiredValue(env, name) {
  const value = String(env[name] || "").trim();
  if (!value || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} is required and must not be empty or a placeholder`);
  }
  return value;
}

function optionalValue(env, name) {
  const value = String(env[name] || "").trim();
  if (!value) return undefined;
  if (PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} must not be a placeholder when supplied`);
  }
  return value;
}

function checkedFlag(env, name) {
  const value = String(env[name] || "0").trim();
  if (!/^[01]$/.test(value)) throw new Error(`${name} must be 0 or 1 when supplied`);
  return value === "1";
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

function checkedHash(value, name) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error(`${name} must be a 32-byte transaction hash`);
  return value;
}

function safeErrorMessage(error) {
  return sanitizeRpcError(error);
}

function loadConfig(env = process.env) {
  const rpc = loadRpcConfig(env, "RPC_URL", { requireHttps: true });
  const expectedChainIdValue = requiredValue(env, "EXPECTED_CHAIN_ID");
  if (!/^\d+$/.test(expectedChainIdValue) || BigInt(expectedChainIdValue) !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(`EXPECTED_CHAIN_ID must equal ${ARC_MAINNET_CHAIN_ID}`);
  }

  const referenceTxHash = optionalValue(env, "REFERENCE_TX_HASH");
  const usdcAddress = optionalValue(env, "USDC_ADDRESS");
  const sampleContractAddress = optionalValue(env, "SAMPLE_CONTRACT_ADDRESS");

  return {
    rpcUrl: rpc.rpcUrl,
    rpcMasked: rpc.rpcMasked,
    authMode: rpc.authMode,
    authProvided: rpc.authProvided,
    authConfig: rpc,
    isRadar: RADAR_PATTERN.test(rpc.rpcUrl) || RADAR_PATTERN.test(rpc.parsed.hostname),
    expectedChainId: ARC_MAINNET_CHAIN_ID,
    deployerAddress: checkedAddress(requiredValue(env, "DEPLOYER_ADDRESS"), "DEPLOYER_ADDRESS"),
    adminSafeAddress: checkedAddress(requiredValue(env, "ADMIN_SAFE_ADDRESS"), "ADMIN_SAFE_ADDRESS"),
    referenceTxHash: referenceTxHash ? checkedHash(referenceTxHash, "REFERENCE_TX_HASH") : undefined,
    usdcAddress: usdcAddress ? checkedAddress(usdcAddress, "USDC_ADDRESS") : undefined,
    sampleContractAddress: sampleContractAddress
      ? checkedAddress(sampleContractAddress, "SAMPLE_CONTRACT_ADDRESS")
      : undefined,
    allowRadarCandidate: checkedFlag(env, "ALLOW_RADAR_DEPLOY_GRADE_CANDIDATE"),
    reviewedProviderApproved: checkedFlag(env, "REVIEWED_DEPLOY_GRADE_PROVIDER_APPROVED"),
  };
}

function printable(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(printable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, printable(item)]));
  }
  return value;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    console.error(`configurationError: ${safeErrorMessage(error)}`);
    console.log("verdict: FAIL_READ_ONLY_ASSESSMENT");
    console.log("deployGradeRecommendation: NOT_APPROVED");
    process.exitCode = 1;
    return;
  }

  console.log("ArcNS RPC deploy-grade candidate assessment (READ-ONLY)");
  console.log(`rpc: ${config.rpcMasked}`);
  console.log(`expectedChainId: ${config.expectedChainId}`);
  console.log(`providerClassification: ${config.isRadar ? "RADAR" : "OTHER"}`);
  console.log(`authMode: ${config.authMode}`);
  console.log(`authProvided: ${config.authProvided}`);
  console.log("batching: disabled (batchMaxCount=1)");

  const provider = createRpcProvider(config.authConfig, config.expectedChainId, { staticNetwork: true });
  const results = [];
  let latestBlockNumber;

  async function check(name, mandatory, operation, validate = () => true) {
    try {
      const value = await operation();
      if (!validate(value)) throw new Error("returned invalid or unexpected data");
      results.push({ name, mandatory, status: "PASS", detail: printable(value) });
      console.log(`check ${name}: PASS`);
      return value;
    } catch (error) {
      results.push({ name, mandatory, status: "FAIL", detail: safeErrorMessage(error) });
      console.log(`check ${name}: FAIL (${safeErrorMessage(error)})`);
      return undefined;
    } finally {
      // Avoid turning a sequential capability assessment into an accidental
      // burst against endpoints with conservative per-project rate limits.
      await delay(CHECK_PACING_DELAY_MS);
    }
  }

  async function optionalCheck(name, operation, validate = () => true) {
    try {
      const value = await operation();
      if (!validate(value)) throw new Error("returned invalid or unexpected data");
      results.push({ name, mandatory: false, status: "PASS", detail: printable(value) });
      console.log(`check ${name}: PASS`);
      return value;
    } catch (error) {
      results.push({ name, mandatory: false, status: "UNSUPPORTED_OR_UNAVAILABLE", detail: safeErrorMessage(error) });
      console.log(`check ${name}: UNSUPPORTED_OR_UNAVAILABLE (${safeErrorMessage(error)})`);
      return undefined;
    } finally {
      await delay(CHECK_PACING_DELAY_MS);
    }
  }

  function skipped(name, reason) {
    results.push({ name, mandatory: false, status: "SKIPPED", detail: reason });
    console.log(`check ${name}: SKIPPED (${reason})`);
  }

  await check(
    "chainId",
    true,
    async () => (await provider.getNetwork()).chainId,
    (chainId) => chainId === config.expectedChainId
  );
  await check(
    "noBatchCompatibility",
    true,
    () => provider.send("eth_chainId", []),
    (value) => typeof value === "string" && BigInt(value) === config.expectedChainId
  );
  latestBlockNumber = await check(
    "latestBlockNumber",
    true,
    () => provider.getBlockNumber(),
    (value) => Number.isSafeInteger(value) && value > 0
  );

  const latestBlock = latestBlockNumber === undefined
    ? undefined
    : await check(
      "latestBlockObject",
      true,
      () => provider.getBlock(latestBlockNumber),
      (block) => block && block.number === latestBlockNumber && /^0x[0-9a-f]{64}$/i.test(block.hash || "")
    );

  if (latestBlock) {
    await check(
      "latestBlockFreshness",
      true,
      async () => {
        const localTimestamp = Math.floor(Date.now() / 1000);
        const ageSeconds = localTimestamp - latestBlock.timestamp;
        return { blockTimestamp: latestBlock.timestamp, localTimestamp, ageSeconds, maximumAgeSeconds: MAX_BLOCK_AGE_SECONDS };
      },
      ({ ageSeconds }) => ageSeconds >= -30 && ageSeconds <= MAX_BLOCK_AGE_SECONDS
    );
  } else {
    results.push({ name: "latestBlockFreshness", mandatory: true, status: "FAIL", detail: "latest block object unavailable" });
    console.log("check latestBlockFreshness: FAIL (latest block object unavailable)");
  }

  await check(
    "deployerBalance",
    true,
    () => provider.getBalance(config.deployerAddress),
    (value) => typeof value === "bigint" && value >= 0n
  );
  const latestNonce = await check(
    "deployerNonceLatest",
    true,
    () => provider.getTransactionCount(config.deployerAddress, "latest"),
    (value) => Number.isSafeInteger(value) && value >= 0
  );
  const pendingNonce = await check(
    "deployerNoncePending",
    true,
    () => provider.getTransactionCount(config.deployerAddress, "pending"),
    (value) => Number.isSafeInteger(value) && value >= 0
  );
  if (latestNonce !== undefined && pendingNonce !== undefined && pendingNonce < latestNonce) {
    results.push({ name: "deployerNonceOrdering", mandatory: true, status: "FAIL", detail: "pending nonce is below latest nonce" });
    console.log("check deployerNonceOrdering: FAIL (pending nonce is below latest nonce)");
  } else if (latestNonce !== undefined && pendingNonce !== undefined) {
    results.push({ name: "deployerNonceOrdering", mandatory: true, status: "PASS", detail: { latestNonce, pendingNonce } });
    console.log("check deployerNonceOrdering: PASS");
  }

  await check(
    "feeData",
    true,
    () => provider.getFeeData(),
    (value) => value && [value.gasPrice, value.maxFeePerGas, value.maxPriorityFeePerGas].some((item) => typeof item === "bigint" && item > 0n)
  );
  await optionalCheck(
    "feeHistory",
    () => provider.send("eth_feeHistory", ["0x3", "latest", [25, 50, 75]]),
    (value) => value && Array.isArray(value.baseFeePerGas) && value.baseFeePerGas.length > 0
  );
  await check(
    "zeroValueSelfTransferGasEstimate",
    true,
    () => provider.estimateGas({
      from: config.deployerAddress,
      to: config.deployerAddress,
      value: 0n,
    }),
    (value) => typeof value === "bigint" && value > 0n
  );

  await check(
    "adminSafeCode",
    true,
    () => provider.getCode(config.adminSafeAddress),
    (value) => /^0x[0-9a-f]+$/i.test(value) && value !== "0x"
  );
  const safe = new ethers.Contract(config.adminSafeAddress, SAFE_ABI, provider);
  const safeOwners = await check(
    "safeGetOwnersEthCall",
    true,
    () => safe.getOwners(),
    (owners) => Array.isArray(owners) && owners.length > 0 && owners.every(ethers.isAddress)
  );
  const safeThreshold = await check(
    "safeGetThresholdEthCall",
    true,
    () => safe.getThreshold(),
    (threshold) => typeof threshold === "bigint" && threshold > 0n
  );
  if (safeOwners && safeThreshold) {
    await check(
      "safeThresholdConsistency",
      true,
      async () => ({ ownerCount: safeOwners.length, threshold: safeThreshold }),
      ({ ownerCount, threshold }) => threshold <= BigInt(ownerCount)
    );
  }

  if (config.referenceTxHash) {
    await check(
      "referenceTransactionReceipt",
      true,
      () => provider.getTransactionReceipt(config.referenceTxHash),
      (receipt) => receipt && receipt.hash.toLowerCase() === config.referenceTxHash.toLowerCase() && receipt.blockNumber > 0
    );
  } else {
    skipped("referenceTransactionReceipt", "REFERENCE_TX_HASH not supplied");
  }

  if (latestBlockNumber !== undefined) {
    await optionalCheck(
      "recentSafeLogs",
      () => provider.getLogs({
        address: config.adminSafeAddress,
        fromBlock: Math.max(0, latestBlockNumber - RECENT_LOG_BLOCK_RANGE),
        toBlock: latestBlockNumber,
      }),
      (logs) => Array.isArray(logs)
    );
  } else {
    skipped("recentSafeLogs", "latest block number unavailable");
  }

  if (config.usdcAddress) {
    await optionalCheck(
      "usdcCode",
      () => provider.getCode(config.usdcAddress),
      (value) => /^0x[0-9a-f]+$/i.test(value) && value !== "0x"
    );
  } else {
    skipped("usdcCode", "USDC_ADDRESS not supplied");
  }

  if (config.sampleContractAddress) {
    await optionalCheck(
      "sampleContractCode",
      () => provider.getCode(config.sampleContractAddress),
      (value) => /^0x[0-9a-f]+$/i.test(value) && value !== "0x"
    );
  } else {
    skipped("sampleContractCode", "SAMPLE_CONTRACT_ADDRESS not supplied");
  }

  await check(
    "repeatedBlockNumberStability",
    true,
    async () => {
      const observations = [];
      for (let index = 0; index < BLOCK_OBSERVATIONS; index += 1) {
        observations.push(await provider.getBlockNumber());
        if (index + 1 < BLOCK_OBSERVATIONS) await delay(BLOCK_OBSERVATION_DELAY_MS);
      }
      return observations;
    },
    (observations) => observations.length === BLOCK_OBSERVATIONS
      && observations.every((value) => Number.isSafeInteger(value) && value > 0)
      && observations.every((value, index) => index === 0 || value >= observations[index - 1])
  );

  const mandatoryFailures = results.filter((result) => result.mandatory && result.status === "FAIL");
  const optionalUnavailable = results.filter((result) => result.status === "UNSUPPORTED_OR_UNAVAILABLE");
  const verdict = mandatoryFailures.length > 0
    ? "FAIL_READ_ONLY_ASSESSMENT"
    : optionalUnavailable.length > 0
      ? "INCONCLUSIVE_READ_ONLY_ASSESSMENT"
      : "PASS_READ_ONLY_ASSESSMENT";

  let recommendation;
  let recommendationReason;
  if (mandatoryFailures.length > 0) {
    recommendation = "NOT_APPROVED";
    recommendationReason = "One or more critical mandatory read-only checks failed.";
  } else if (config.isRadar) {
    recommendation = "NOT_APPROVED";
    recommendationReason = config.allowRadarCandidate
      ? "Radar candidacy acknowledgement does not override its failed deploy-grade assessment; deployment use remains rejected."
      : "Radar failed deploy-grade assessment and remains rejected for deployment use.";
  } else if (verdict === "PASS_READ_ONLY_ASSESSMENT" && config.reviewedProviderApproved) {
    recommendation = "APPROVED";
    recommendationReason = "Read-only checks passed and the environment explicitly records separate reviewed-provider approval; retain independent human evidence.";
  } else {
    recommendation = "CONDITIONAL_RISK_ACCEPTANCE_REQUIRED";
    recommendationReason = "Read-only capability evidence alone does not establish reviewed provider provenance, operational ownership, support, limits, or SLA.";
  }

  console.log("\nAssessment summary");
  console.log(`mandatoryChecksFailed: ${mandatoryFailures.length}`);
  console.log(`optionalMethodsUnsupportedOrUnavailable: ${optionalUnavailable.length}`);
  console.log(`verdict: ${verdict}`);
  console.log(`deployGradeRecommendation: ${recommendation}`);
  console.log(`recommendationReason: ${recommendationReason}`);
  console.log("readOnlySuccessIsDeploymentApproval: NO");

  if (verdict === "FAIL_READ_ONLY_ASSESSMENT") process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`assessmentError: ${safeErrorMessage(error)}`);
    console.log("verdict: FAIL_READ_ONLY_ASSESSMENT");
    console.log("deployGradeRecommendation: NOT_APPROVED");
    process.exitCode = 1;
  });
}

module.exports = {
  loadConfig,
  main,
  safeErrorMessage,
};