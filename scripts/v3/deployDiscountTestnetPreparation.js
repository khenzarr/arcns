"use strict";

const { ethers, upgrades } = require("hardhat");

const CHAIN_ID = 5042002n;
const EXPECTED_DEPLOYER = "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D";
const ADMIN_SAFE = "0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3";
const ARC_CONTROLLER = "0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46";
const CIRCLE_CONTROLLER = "0x4CB0650847459d9BbDd5823cc6D320C900D883dA";
const CURRENT_IMPLEMENTATION = "0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB";
const MANIFEST_LAYOUT_REFERENCE = "0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6";
const TIMELOCK = "0x0f9d898D74f29c69cAD1a66918b41891E73e08f0";
const CAMPAIGN_ID = "0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3";
const SNAPSHOT_BLOCK = 54933646n;
const DELAY = 172800n;
const ZERO_HASH = ethers.ZeroHash;
const EIP1967_IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function implementationFromSlot(value) {
  return ethers.getAddress(`0x${value.slice(-40)}`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== CHAIN_ID) throw new Error(`Refusing chain ${network.chainId}; expected ${CHAIN_ID}`);
  if (deployer.address !== ethers.getAddress(EXPECTED_DEPLOYER)) {
    throw new Error(`Unexpected deployer ${deployer.address}; expected ${EXPECTED_DEPLOYER}`);
  }

  for (const proxy of [ARC_CONTROLLER, CIRCLE_CONTROLLER]) {
    const slot = await ethers.provider.getStorage(proxy, EIP1967_IMPLEMENTATION_SLOT);
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

  const Timelock = new ethers.Contract(
    TIMELOCK,
    ["function getMinDelay() view returns (uint256)"],
    ethers.provider
  );
  if ((await Timelock.getMinDelay()) !== DELAY) throw new Error("Unexpected Timelock delay");

  console.log("ArcNS discount testnet preparation preflight PASS");
  console.log(`deployer=${deployer.address}`);
  console.log(`balance=${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}`);
  console.log(`registryOwner=${ADMIN_SAFE}`);
  console.log("root=unset frozen=false active=false");

  if (process.env.CONFIRM_TESTNET_DISCOUNT_PREPARE !== "YES") {
    console.log("NO WRITE: set CONFIRM_TESTNET_DISCOUNT_PREPARE=YES to deploy preparation contracts.");
    return;
  }

  const implementation = await Controller.deploy();
  await implementation.waitForDeployment();
  const implementationReceipt = await implementation.deploymentTransaction().wait();
  if (!implementationReceipt || implementationReceipt.status !== 1) throw new Error("Implementation deployment failed");

  const Registry = await ethers.getContractFactory(
    "contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry"
  );
  const registry = await Registry.deploy(CAMPAIGN_ID, SNAPSHOT_BLOCK, ADMIN_SAFE);
  await registry.waitForDeployment();
  const registryReceipt = await registry.deploymentTransaction().wait();
  if (!registryReceipt || registryReceipt.status !== 1) throw new Error("Registry deployment failed");

  const implementationAddress = await implementation.getAddress();
  const registryAddress = await registry.getAddress();
  const state = {
    owner: await registry.owner(),
    campaignId: await registry.campaignId(),
    snapshotBlock: await registry.snapshotBlock(),
    merkleRoot: await registry.merkleRoot(),
    rootFrozen: await registry.rootFrozen(),
    discountActive: await registry.discountActive(),
  };
  if (state.owner !== ethers.getAddress(ADMIN_SAFE)) throw new Error("Registry owner mismatch");
  if (state.campaignId !== CAMPAIGN_ID || state.snapshotBlock !== SNAPSHOT_BLOCK) throw new Error("Snapshot identity mismatch");
  if (state.merkleRoot !== ZERO_HASH || state.rootFrozen || state.discountActive) throw new Error("Registry was not deployed inert");

  const proxyInterface = new ethers.Interface([
    "function upgradeToAndCall(address newImplementation, bytes data)",
  ]);
  const upgradePayload = proxyInterface.encodeFunctionData("upgradeToAndCall", [implementationAddress, "0x"]);
  const salt = ethers.keccak256(ethers.toUtf8Bytes("ARCNS_TESTNET_EARLY_ADOPTER_CONTROLLER_UPGRADE_V1"));
  const timelockInterface = new ethers.Interface([
    "function scheduleBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt,uint256 delay)",
    "function executeBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt)",
    "function hashOperationBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt) view returns(bytes32)",
  ]);
  const targets = [ARC_CONTROLLER, CIRCLE_CONTROLLER];
  const values = [0n, 0n];
  const payloads = [upgradePayload, upgradePayload];
  const operationId = await new ethers.Contract(TIMELOCK, timelockInterface, ethers.provider)
    .hashOperationBatch(targets, values, payloads, ZERO_HASH, salt);

  console.log(JSON.stringify({
    chainId: Number(CHAIN_ID),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    controllerImplementation: implementationAddress,
    controllerImplementationTx: implementationReceipt.hash,
    controllerImplementationBlock: implementationReceipt.blockNumber,
    discountRegistry: registryAddress,
    discountRegistryTx: registryReceipt.hash,
    discountRegistryBlock: registryReceipt.blockNumber,
    registryOwner: state.owner,
    campaignId: state.campaignId,
    snapshotBlock: state.snapshotBlock.toString(),
    merkleRoot: state.merkleRoot,
    rootFrozen: state.rootFrozen,
    discountActive: state.discountActive,
    timelock: TIMELOCK,
    timelockDelay: DELAY.toString(),
    operationId,
    salt,
    upgradePayload,
    scheduleBatchCalldata: timelockInterface.encodeFunctionData("scheduleBatch", [targets, values, payloads, ZERO_HASH, salt, DELAY]),
    executeBatchCalldata: timelockInterface.encodeFunctionData("executeBatch", [targets, values, payloads, ZERO_HASH, salt]),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
