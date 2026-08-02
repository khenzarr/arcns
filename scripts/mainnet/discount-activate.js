"use strict";

const { ethers } = require("hardhat");
const {
  connectExpectedOwner,
  loadOperationConfig,
  loadRegistryState,
} = require("./discount-operation-guards");

const READINESS_FLAGS = [
  "CONFIRM_CONTRACTS_VERIFIED",
  "CONFIRM_ADMIN_HANDOFF_ASSERTED",
  "CONFIRM_INDEXER_READY",
  "CONFIRM_FRONTEND_CUTOVER_READY",
  "CONFIRM_PROOF_DELIVERY_READY",
];

function requireActivationReadiness(env = process.env) {
  for (const name of READINESS_FLAGS) {
    if (env[name] !== "YES") throw new Error(`${name}=YES is required before discount activation`);
  }
}

async function main() {
  console.warn("WARNING: WRITE-CAPABLE MAINNET OPERATION — activates only the finalized DiscountRegistry campaign.");
  requireActivationReadiness();
  const config = loadOperationConfig("discount-activate");
  const state = await loadRegistryState(config, ethers.provider);

  if (state.merkleRoot !== config.snapshot.merkleRoot) {
    throw new Error(`Refusing to activate: expected finalized root ${config.snapshot.merkleRoot}, received ${state.merkleRoot}`);
  }
  if (!state.rootFrozen) throw new Error("Refusing to activate: finalized Merkle root is not frozen");
  if (state.discountActive) throw new Error("Discount campaign is already active; no write is required");

  const registry = await connectExpectedOwner(state.registry, config.expectedOwner);
  const transaction = await registry.setDiscountActive(true);
  console.log(`Submitted setDiscountActive transaction: ${transaction.hash}`);
  await transaction.wait();
  if (!(await state.registry.discountActive())) throw new Error("Discount activation read-back failed");
  console.log(`PASS: finalized discount campaign activated at ${config.registryAddress}`);
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exit(1); });

module.exports = { READINESS_FLAGS, main, requireActivationReadiness };