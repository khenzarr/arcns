"use strict";

const { ethers } = require("hardhat");
const {
  connectExpectedOwner,
  loadOperationConfig,
  loadRegistryState,
} = require("./discount-operation-guards");

async function main() {
  console.warn("WARNING: WRITE-CAPABLE AND IRREVERSIBLE MAINNET OPERATION — freezes only the finalized DiscountRegistry root.");
  const config = loadOperationConfig("discount-freeze-root");
  const state = await loadRegistryState(config, ethers.provider);

  if (state.merkleRoot !== config.snapshot.merkleRoot) {
    throw new Error(`Refusing to freeze: expected finalized root ${config.snapshot.merkleRoot}, received ${state.merkleRoot}`);
  }
  if (state.rootFrozen) throw new Error("Finalized Merkle root is already frozen; no write is required");
  if (state.discountActive) throw new Error("Refusing to freeze: discount campaign is already active");

  const registry = await connectExpectedOwner(state.registry, config.expectedOwner);
  const transaction = await registry.freezeRoot();
  console.log(`Submitted freezeRoot transaction: ${transaction.hash}`);
  await transaction.wait();
  if (!(await state.registry.rootFrozen())) throw new Error("Root freeze read-back failed");
  if ((await state.registry.merkleRoot()) !== config.snapshot.merkleRoot) throw new Error("Frozen root read-back mismatch");
  console.log(`PASS: finalized Merkle root frozen and read back at ${config.registryAddress}`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { main };