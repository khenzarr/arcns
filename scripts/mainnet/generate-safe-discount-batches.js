"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers } = require("ethers");
const { loadAndValidateFinalSnapshot } = require("./final-snapshot");

const CHAIN_ID = "5042";
const REGISTRY_ABI = [
  "function setMerkleRoot(bytes32 newRoot)",
  "function freezeRoot()",
  "function setDiscountActive(bool active)",
];

function requiredAddress(value, label) {
  if (!value || !ethers.isAddress(value) || value === ethers.ZeroAddress) throw new Error(`${label} must be a non-zero address`);
  return ethers.getAddress(value);
}

function loadBatchConfig(env = process.env) {
  if (!env.DEPLOYMENT_ARTIFACT_PATH) throw new Error("DEPLOYMENT_ARTIFACT_PATH is required");
  if (!env.SAFE_BATCH_OUTPUT_DIR) throw new Error("SAFE_BATCH_OUTPUT_DIR is required");
  const artifactPath = path.resolve(env.DEPLOYMENT_ARTIFACT_PATH);
  const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  if (deployment.network !== "arc_mainnet" || String(deployment.chainId) !== CHAIN_ID) throw new Error("Deployment artifact must target Arc mainnet chain 5042");
  return Object.freeze({
    artifactPath,
    outputDir: path.resolve(env.SAFE_BATCH_OUTPUT_DIR),
    safe: requiredAddress(env.EXPECTED_ADMIN_SAFE_ADDRESS, "EXPECTED_ADMIN_SAFE_ADDRESS"),
    registry: requiredAddress(deployment.contracts?.discountRegistry, "deployment discountRegistry"),
    snapshot: loadAndValidateFinalSnapshot(env),
  });
}

function makeBatch(config, name, description, data) {
  return {
    version: "1.0",
    chainId: CHAIN_ID,
    createdAt: Date.now(),
    meta: {
      name,
      description,
      txBuilderVersion: "2.0.1",
      createdFromSafeAddress: config.safe,
      createdFromOwnerAddress: "",
    },
    transactions: [{
      to: config.registry,
      value: "0",
      data,
      contractMethod: null,
      contractInputsValues: null,
    }],
  };
}

function writeExclusive(filePath, value) {
  fs.writeFileSync(filePath, value, { flag: "wx" });
}

function generateBatches(config) {
  if (fs.existsSync(config.outputDir)) throw new Error(`Refusing to overwrite existing SAFE_BATCH_OUTPUT_DIR: ${config.outputDir}`);
  fs.mkdirSync(config.outputDir, { recursive: false });
  const iface = new ethers.Interface(REGISTRY_ABI);
  const batches = [
    ["01-set-root.json", makeBatch(config, "ArcNS mainnet discount: set finalized root", `Set the finalized ${config.snapshot.eligibleWalletCount}-wallet root. Review exact root before signing.`, iface.encodeFunctionData("setMerkleRoot", [config.snapshot.merkleRoot]))],
    ["02-freeze-root.json", makeBatch(config, "ArcNS mainnet discount: freeze root", "Irreversibly freeze the already verified root. Execute only after independent read-back.", iface.encodeFunctionData("freezeRoot"))],
    ["03-activate.json", makeBatch(config, "ArcNS mainnet discount: activate", "Activate only after contracts, handoff, proof delivery, frontend, indexer and final smoke gates pass.", iface.encodeFunctionData("setDiscountActive", [true]))],
  ];
  const review = [];
  for (const [filename, batch] of batches) {
    const json = `${JSON.stringify(batch, null, 2)}\n`;
    const filePath = path.join(config.outputDir, filename);
    writeExclusive(filePath, json);
    review.push({ filename, to: batch.transactions[0].to, data: batch.transactions[0].data, calldataKeccak256: ethers.keccak256(batch.transactions[0].data), sha256: crypto.createHash("sha256").update(json).digest("hex") });
  }
  writeExclusive(path.join(config.outputDir, "REVIEW.json"), `${JSON.stringify({ chainId: CHAIN_ID, safe: config.safe, registry: config.registry, snapshot: config.snapshot, files: review }, null, 2)}\n`);
  return review;
}

function main() {
  const config = loadBatchConfig();
  const review = generateBatches(config);
  console.log(JSON.stringify(review, null, 2));
  console.log(`PASS: Safe Transaction Builder files written to ${config.outputDir}`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exit(1); }
}

module.exports = { CHAIN_ID, generateBatches, loadBatchConfig, makeBatch };
