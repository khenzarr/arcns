"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers, upgrades, network } = require("hardhat");

const CHAIN_ID = 5042n;
const EXPECTED_DEPLOYER = "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D";
const ADMIN_SAFE = "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72";
const TIMELOCK = "0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c";
const ARC_CONTROLLER = "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350";
const CIRCLE_CONTROLLER = "0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1";
const CURRENT_IMPLEMENTATION = "0xA637a1574dC4CF9da40D3B36B21eBaB301e64bC3";
const ARC_REGISTRAR = "0x6C6C0d5B38B3a69F53301CEe0ba360E02d53933d";
const CIRCLE_REGISTRAR = "0x1c23D75E0c7a3B9E9eD4CcEea0e97CDCFB0E9A9C";
const DELAY = 172800n;
const ZERO_HASH = ethers.ZeroHash;
const CONFIRMATION = "I_UNDERSTAND_THIS_DEPLOYS_THE_ARCNS_METADATA_V2_IMPLEMENTATION";
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

function implementationFromSlot(value) {
  return ethers.getAddress(`0x${value.slice(-40)}`);
}

function safeBatch(name, description, to, data) {
  return {
    version: "1.0",
    chainId: CHAIN_ID.toString(),
    createdAt: Date.now(),
    meta: {
      name,
      description,
      txBuilderVersion: "2.0.1",
      createdFromSafeAddress: ADMIN_SAFE,
      createdFromOwnerAddress: "",
    },
    transactions: [{ to, value: "0", data, contractMethod: null, contractInputsValues: null }],
  };
}

function writeExclusive(filePath, value) {
  fs.writeFileSync(filePath, value, { flag: "wx" });
}

async function main() {
  if (network.name !== "arc_mainnet") throw new Error("Use --network arc_mainnet");
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();
  if (chain.chainId !== CHAIN_ID) throw new Error(`Expected chain 5042, received ${chain.chainId}`);
  if (ethers.getAddress(deployer.address) !== ethers.getAddress(EXPECTED_DEPLOYER)) {
    throw new Error(`Unexpected deployer ${deployer.address}`);
  }
  if (await ethers.provider.getCode(ADMIN_SAFE) === "0x") throw new Error("Admin Safe has no code");
  if (await ethers.provider.getCode(TIMELOCK) === "0x") throw new Error("Timelock has no code");

  const controllerAbi = ["function base() view returns (address)"];
  for (const [proxy, expectedBase] of [[ARC_CONTROLLER, ARC_REGISTRAR], [CIRCLE_CONTROLLER, CIRCLE_REGISTRAR]]) {
    const current = implementationFromSlot(await ethers.provider.getStorage(proxy, IMPLEMENTATION_SLOT));
    if (current !== ethers.getAddress(CURRENT_IMPLEMENTATION)) {
      throw new Error(`Unexpected implementation for ${proxy}: ${current}`);
    }
    const base = await new ethers.Contract(proxy, controllerAbi, ethers.provider).base();
    if (ethers.getAddress(base) !== ethers.getAddress(expectedBase)) {
      throw new Error(`Unexpected base registrar for ${proxy}: ${base}`);
    }
  }

  const timelock = new ethers.Contract(TIMELOCK, ["function getMinDelay() view returns (uint256)"], ethers.provider);
  if ((await timelock.getMinDelay()) !== DELAY) throw new Error("Unexpected Timelock delay");

  const Controller = await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController");
  await upgrades.validateImplementation(Controller, { kind: "uups", unsafeAllow: ["constructor"] });

  console.log("PASS: metadata V2 controller implementation preflight");
  console.log(`deployer=${deployer.address}`);
  console.log(`balance=${ethers.formatEther(await ethers.provider.getBalance(deployer.address))}`);
  if (process.env.CONFIRM_MAINNET_METADATA_V2_DEPLOY !== CONFIRMATION) {
    console.log(`NO WRITE: set CONFIRM_MAINNET_METADATA_V2_DEPLOY=${CONFIRMATION}`);
    return;
  }

  const artifactPath = path.resolve(__dirname, "../../deployments/mainnet/metadata-v2-preparation.json");
  const batchDir = path.resolve(__dirname, "../../deployments/safe-batches/arc-mainnet-metadata-v2-upgrade");
  if (fs.existsSync(artifactPath)) throw new Error(`Refusing to overwrite ${artifactPath}`);
  if (fs.existsSync(batchDir)) throw new Error(`Refusing to overwrite ${batchDir}`);

  const implementation = await Controller.deploy();
  await implementation.waitForDeployment();
  const receipt = await implementation.deploymentTransaction().wait();
  if (!receipt || receipt.status !== 1) throw new Error("Controller implementation deployment failed");
  const implementationAddress = await implementation.getAddress();

  const proxyInterface = new ethers.Interface(["function upgradeToAndCall(address newImplementation, bytes data)"]);
  const upgradePayload = proxyInterface.encodeFunctionData("upgradeToAndCall", [implementationAddress, "0x"]);
  const targets = [ARC_CONTROLLER, CIRCLE_CONTROLLER];
  const values = [0n, 0n];
  const payloads = [upgradePayload, upgradePayload];
  const salt = ethers.keccak256(ethers.toUtf8Bytes(`ARCNS_MAINNET_METADATA_V2_${implementationAddress}`));
  const timelockInterface = new ethers.Interface([
    "function scheduleBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt,uint256 delay)",
    "function executeBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt)",
    "function hashOperationBatch(address[] targets,uint256[] values,bytes[] payloads,bytes32 predecessor,bytes32 salt) view returns(bytes32)",
  ]);
  const governed = new ethers.Contract(TIMELOCK, timelockInterface, ethers.provider);
  const operationId = await governed.hashOperationBatch(targets, values, payloads, ZERO_HASH, salt);
  const scheduleData = timelockInterface.encodeFunctionData("scheduleBatch", [targets, values, payloads, ZERO_HASH, salt, DELAY]);
  const executeData = timelockInterface.encodeFunctionData("executeBatch", [targets, values, payloads, ZERO_HASH, salt]);

  fs.mkdirSync(batchDir, { recursive: false });
  const schedule = safeBatch(
    "ArcNS mainnet metadata V2 controller upgrade - schedule",
    "Starts the required 48-hour Timelock delay for the two controller upgrades. It does not change live behavior.",
    TIMELOCK,
    scheduleData
  );
  const execute = safeBatch(
    "ArcNS mainnet metadata V2 controller upgrade - execute",
    "Execute only after the delay and after both controllers have been paused for the registrar cutover.",
    TIMELOCK,
    executeData
  );
  const scheduleJson = `${JSON.stringify(schedule, null, 2)}\n`;
  const executeJson = `${JSON.stringify(execute, null, 2)}\n`;
  writeExclusive(path.join(batchDir, "01-schedule-controller-upgrade.json"), scheduleJson);
  writeExclusive(path.join(batchDir, "03-execute-controller-upgrade.json"), executeJson);

  const artifact = {
    chainId: Number(CHAIN_ID),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    controllerImplementation: implementationAddress,
    deploymentTransaction: receipt.hash,
    deploymentBlock: receipt.blockNumber,
    currentImplementation: CURRENT_IMPLEMENTATION,
    controllers: { arc: ARC_CONTROLLER, circle: CIRCLE_CONTROLLER },
    timelock: TIMELOCK,
    delay: DELAY.toString(),
    salt,
    operationId,
    upgradePayload,
    scheduleData,
    executeData,
    safeBatches: {
      schedule: "deployments/safe-batches/arc-mainnet-metadata-v2-upgrade/01-schedule-controller-upgrade.json",
      execute: "deployments/safe-batches/arc-mainnet-metadata-v2-upgrade/03-execute-controller-upgrade.json",
      scheduleSha256: crypto.createHash("sha256").update(scheduleJson).digest("hex"),
      executeSha256: crypto.createHash("sha256").update(executeJson).digest("hex"),
    },
  };
  writeExclusive(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify(artifact, null, 2));
  console.log("PASS: implementation deployed and Safe schedule/execute files generated");
}

main().catch((error) => {
  console.error(`FAIL: ${error.message || error}`);
  process.exitCode = 1;
});
