"use strict";

const { ethers } = require("hardhat");
const { loadAndValidateFinalSnapshot } = require("./final-snapshot");

const ARC_MAINNET_CHAIN_ID = 5042;
const DISCOUNT_REGISTRY_ABI = [
  "function owner() view returns (address)",
  "function campaignId() view returns (bytes32)",
  "function snapshotBlock() view returns (uint256)",
  "function merkleRoot() view returns (bytes32)",
  "function rootFrozen() view returns (bool)",
  "function discountActive() view returns (bool)",
  "function setMerkleRoot(bytes32 newRoot)",
  "function freezeRoot()",
  "function setDiscountActive(bool active)",
];

function requiredAddress(env, name) {
  const value = env[name];
  if (!value) throw new Error(`${name} is required; no address will be inferred`);
  if (!ethers.isAddress(value) || value === ethers.ZeroAddress) {
    throw new Error(`${name} must be a non-zero address`);
  }
  return ethers.getAddress(value);
}

function requireConfirmation(env, operation) {
  if (env.CONFIRM_MAINNET_WRITE !== "YES") {
    throw new Error(`CONFIRM_MAINNET_WRITE=YES is required for the write-capable ${operation} operation`);
  }
}

function loadOperationConfig(operation, env = process.env, options = {}) {
  requireConfirmation(env, operation);
  const snapshot = loadAndValidateFinalSnapshot(env, options.manifestPath);
  return Object.freeze({
    operation,
    snapshot,
    registryAddress: requiredAddress(env, "DISCOUNT_REGISTRY_ADDRESS"),
    expectedOwner: requiredAddress(env, "EXPECTED_DISCOUNT_REGISTRY_OWNER"),
  });
}

async function assertArcMainnet(provider) {
  const { chainId } = await provider.getNetwork();
  if (Number(chainId) !== ARC_MAINNET_CHAIN_ID) {
    throw new Error(`Expected Arc mainnet chain ID ${ARC_MAINNET_CHAIN_ID}, received ${chainId}`);
  }
}

async function loadRegistryState(config, provider) {
  await assertArcMainnet(provider);
  const code = await provider.getCode(config.registryAddress);
  if (code === "0x") throw new Error(`No contract bytecode at DISCOUNT_REGISTRY_ADDRESS ${config.registryAddress}`);

  const registry = new ethers.Contract(config.registryAddress, DISCOUNT_REGISTRY_ABI, provider);
  const [owner, campaignId, snapshotBlock, merkleRoot, rootFrozen, discountActive] = await Promise.all([
    registry.owner(),
    registry.campaignId(),
    registry.snapshotBlock(),
    registry.merkleRoot(),
    registry.rootFrozen(),
    registry.discountActive(),
  ]);

  if (ethers.getAddress(owner) !== config.expectedOwner) {
    throw new Error(`DiscountRegistry owner mismatch: expected ${config.expectedOwner}, received ${owner}`);
  }
  if (campaignId !== config.snapshot.campaignIdBytes32) {
    throw new Error(`DiscountRegistry campaignId mismatch: expected ${config.snapshot.campaignIdBytes32}, received ${campaignId}`);
  }
  if (snapshotBlock !== BigInt(config.snapshot.snapshotBlock)) {
    throw new Error(`DiscountRegistry snapshotBlock mismatch: expected ${config.snapshot.snapshotBlock}, received ${snapshotBlock}`);
  }

  return { registry, owner: ethers.getAddress(owner), campaignId, snapshotBlock, merkleRoot, rootFrozen, discountActive };
}

async function connectExpectedOwner(registry, expectedOwner) {
  const signer = await ethers.provider.getSigner();
  const signerAddress = ethers.getAddress(await signer.getAddress());
  if (signerAddress !== expectedOwner) {
    throw new Error(`Configured signer ${signerAddress} is not EXPECTED_DISCOUNT_REGISTRY_OWNER ${expectedOwner}`);
  }
  return registry.connect(signer);
}

module.exports = {
  ARC_MAINNET_CHAIN_ID,
  connectExpectedOwner,
  loadOperationConfig,
  loadRegistryState,
  requiredAddress,
};