"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const { ARC_MAINNET_CHAIN_ID, requiredAddress } = require("./discount-operation-guards");
const { loadAndValidateFinalSnapshot } = require("./final-snapshot");

const STAGES = Object.freeze({
  deployed: { rootSet: false, frozen: false, active: false },
  "root-set": { rootSet: true, frozen: false, active: false },
  frozen: { rootSet: true, frozen: true, active: false },
  active: { rootSet: true, frozen: true, active: true },
});
const REGISTRY_ABI = [
  "function owner() view returns(address)", "function campaignId() view returns(bytes32)",
  "function snapshotBlock() view returns(uint256)", "function merkleRoot() view returns(bytes32)",
  "function rootFrozen() view returns(bool)", "function discountActive() view returns(bool)",
  "function authorizedControllers(address) view returns(bool)",
];
const CONTROLLER_ABI = [
  "function discountRegistry() view returns(address)",
  "function discountRentPrice(string,uint256) view returns(uint256 base,uint256 premium)",
];

function loadConfig(env = process.env) {
  const stage = env.EXPECTED_DISCOUNT_STAGE;
  if (!STAGES[stage]) throw new Error(`EXPECTED_DISCOUNT_STAGE must be one of: ${Object.keys(STAGES).join(", ")}`);
  if (!env.DEPLOYMENT_ARTIFACT_PATH) throw new Error("DEPLOYMENT_ARTIFACT_PATH is required");
  const deployment = JSON.parse(fs.readFileSync(path.resolve(env.DEPLOYMENT_ARTIFACT_PATH), "utf8"));
  if (deployment.network !== "arc_mainnet" || Number(deployment.chainId) !== ARC_MAINNET_CHAIN_ID) throw new Error("Deployment artifact must target Arc mainnet 5042");
  return Object.freeze({
    stage,
    expected: STAGES[stage],
    snapshot: loadAndValidateFinalSnapshot(env),
    owner: requiredAddress(env, "EXPECTED_ADMIN_SAFE_ADDRESS"),
    registry: requiredAddress({ value: deployment.contracts?.discountRegistry }, "value"),
    arcController: requiredAddress({ value: deployment.contracts?.arcController }, "value"),
    circleController: requiredAddress({ value: deployment.contracts?.circleController }, "value"),
  });
}

function eqAddress(label, actual, expected) {
  if (ethers.getAddress(actual) !== ethers.getAddress(expected)) throw new Error(`${label} mismatch: ${actual}`);
}

async function main() {
  const config = loadConfig();
  const { chainId } = await ethers.provider.getNetwork();
  if (Number(chainId) !== ARC_MAINNET_CHAIN_ID) throw new Error(`Expected chain ${ARC_MAINNET_CHAIN_ID}, received ${chainId}`);
  for (const [label, address] of [["registry", config.registry], ["arcController", config.arcController], ["circleController", config.circleController]]) {
    if (await ethers.provider.getCode(address) === "0x") throw new Error(`No bytecode for ${label}`);
  }
  const registry = new ethers.Contract(config.registry, REGISTRY_ABI, ethers.provider);
  const [owner, campaignId, snapshotBlock, root, frozen, active, arcAuthorized, circleAuthorized] = await Promise.all([
    registry.owner(), registry.campaignId(), registry.snapshotBlock(), registry.merkleRoot(),
    registry.rootFrozen(), registry.discountActive(), registry.authorizedControllers(config.arcController),
    registry.authorizedControllers(config.circleController),
  ]);
  eqAddress("owner", owner, config.owner);
  if (campaignId.toLowerCase() !== config.snapshot.campaignIdBytes32.toLowerCase()) throw new Error("campaignId mismatch");
  if (snapshotBlock !== BigInt(config.snapshot.snapshotBlock)) throw new Error("snapshotBlock mismatch");
  const rootSet = root !== ethers.ZeroHash;
  if (rootSet !== config.expected.rootSet || frozen !== config.expected.frozen || active !== config.expected.active) {
    throw new Error(`Lifecycle mismatch for ${config.stage}: root=${root}, frozen=${frozen}, active=${active}`);
  }
  if (rootSet && root.toLowerCase() !== config.snapshot.merkleRoot.toLowerCase()) throw new Error("Merkle root mismatch");
  if (!arcAuthorized || !circleAuthorized) throw new Error("Both controllers must be authorized");

  const duration = 365n * 24n * 60n * 60n;
  for (const [label, address] of [["arc", config.arcController], ["circle", config.circleController]]) {
    const controller = new ethers.Contract(address, CONTROLLER_ABI, ethers.provider);
    eqAddress(`${label} controller registry pointer`, await controller.discountRegistry(), config.registry);
    const quote = await controller.discountRentPrice("launchcheck", duration);
    if (quote.base !== 2_000_000n || quote.premium !== 0n) throw new Error(`${label} controller discount quote mismatch`);
  }
  console.log(`PASS: discount stage ${config.stage} matches the finalized snapshot and both controllers.`);
}

if (require.main === module) main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exit(1); });
module.exports = { STAGES, loadConfig, main };
