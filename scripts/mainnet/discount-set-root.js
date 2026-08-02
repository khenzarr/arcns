"use strict";

const { ethers } = require("hardhat");
const {
  connectExpectedOwner,
  loadOperationConfig,
  loadRegistryState,
} = require("./discount-operation-guards");

async function main() {
  console.warn("WARNING: WRITE-CAPABLE MAINNET OPERATION — sets only the finalized DiscountRegistry Merkle root.");
  const config = loadOperationConfig("discount-set-root");
  const state = await loadRegistryState(config, ethers.provider);

  if (state.rootFrozen) throw new Error("Refusing to set root: DiscountRegistry root is already frozen");
  if (state.discountActive) throw new Error("Refusing to set root: discount campaign is already active");
  if (state.merkleRoot !== ethers.ZeroHash && state.merkleRoot !== config.snapshot.merkleRoot) {
    throw new Error(`Refusing to replace unexpected existing root ${state.merkleRoot}`);
  }
  if (state.merkleRoot === config.snapshot.merkleRoot) {
    throw new Error("Finalized Merkle root is already set; no write is required");
  }

  const registry = await connectExpectedOwner(state.registry, config.expectedOwner);
  const transaction = await registry.setMerkleRoot(config.snapshot.merkleRoot);
  console.log(`Submitted setMerkleRoot transaction: ${transaction.hash}`);
  await transaction.wait();
  const readBack = await state.registry.merkleRoot();
  if (readBack !== config.snapshot.merkleRoot) throw new Error(`Merkle root read-back mismatch: ${readBack}`);
  console.log(`PASS: finalized Merkle root set and read back at ${config.registryAddress}`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { main };