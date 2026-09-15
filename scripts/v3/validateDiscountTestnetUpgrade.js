"use strict";

const { ethers, upgrades } = require("hardhat");

const ARC_TESTNET_CHAIN_ID = 5042002n;
const ARC_CONTROLLER = "0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46";
const CIRCLE_CONTROLLER = "0x4CB0650847459d9BbDd5823cc6D320C900D883dA";
const CURRENT_IMPLEMENTATION = "0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB";
// The manifest-tracked pre-discount implementation has the same controller
// storage layout as CURRENT_IMPLEMENTATION and is used only as the local
// OpenZeppelin layout reference. No transaction is submitted by this script.
const MANIFEST_LAYOUT_REFERENCE = "0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6";
const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function implementationFromSlot(value) {
  return ethers.getAddress(`0x${value.slice(-40)}`);
}

async function main() {
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(`Refusing non-testnet validation: expected ${ARC_TESTNET_CHAIN_ID}, received ${network.chainId}`);
  }

  for (const proxy of [ARC_CONTROLLER, CIRCLE_CONTROLLER]) {
    const slot = await ethers.provider.getStorage(proxy, IMPLEMENTATION_SLOT);
    const implementation = implementationFromSlot(slot);
    if (implementation !== ethers.getAddress(CURRENT_IMPLEMENTATION)) {
      throw new Error(`Unexpected implementation for ${proxy}: ${implementation}`);
    }
  }

  const Controller = await ethers.getContractFactory(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController"
  );
  await upgrades.validateUpgrade(MANIFEST_LAYOUT_REFERENCE, Controller, {
    kind: "uups",
    unsafeAllow: ["constructor"],
  });

  console.log("PASS: Arc Testnet controller implementations match the reviewed baseline.");
  console.log("PASS: OpenZeppelin storage-layout validation accepts the discount controller upgrade.");
  console.log("READ ONLY: no deployment, schedule, upgrade, or configuration transaction was submitted.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
