"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { ethers, network } = require("hardhat");

const CHAIN_ID = 5042n;
const START_BLOCK = 21070696;
const LOG_CHUNK = 9999;
const GRACE_PERIOD = 90n * 24n * 60n * 60n;
const EXPECTED_DEPLOYER = "0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D";
const ADMIN_SAFE = "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72";
const REGISTRY = "0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb";
const TIMELOCK = "0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c";
const ARC_CONTROLLER = "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350";
const CIRCLE_CONTROLLER = "0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1";
const ARC_REGISTRAR = "0x6C6C0d5B38B3a69F53301CEe0ba360E02d53933d";
const CIRCLE_REGISTRAR = "0x1c23D75E0c7a3B9E9eD4CcEea0e97CDCFB0E9A9C";
const ARC_NODE = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";
const CIRCLE_NODE = "0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084";
const OPERATION_ID = "0x82959b73f45abe0cecc1cab34991e09c75810a66e6f98883fcc0a4fad85ea075";
const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const CONFIRMATION = "I_UNDERSTAND_THIS_DEPLOYS_AND_SEEDS_THE_ARCNS_METADATA_V2_REGISTRARS";

const controllerInterface = new ethers.Interface([
  "event NameRegistered(string name,bytes32 indexed label,address indexed owner,uint256 cost,uint256 expires)",
  "function paused() view returns (bool)",
  "function base() view returns (address)",
  "function setBaseRegistrar(address newBaseRegistrar)",
  "function hasRole(bytes32 role,address account) view returns (bool)",
  "function grantRole(bytes32 role,address account)",
  "function revokeRole(bytes32 role,address account)",
  "function upgradeToAndCall(address newImplementation,bytes data)",
]);
const registrarInterface = new ethers.Interface([
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
  "function nameExpires(uint256 id) view returns (uint256)",
  "function ownerOf(uint256 id) view returns (address)",
]);
const registryInterface = new ethers.Interface([
  "function setSubnodeOwner(bytes32 node,bytes32 label,address owner) returns (bytes32)",
]);

function safeBatch(name, description, transactions) {
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
    transactions: transactions.map(({ to, data }) => ({
      to,
      value: "0",
      data,
      contractMethod: null,
      contractInputsValues: null,
    })),
  };
}

async function getLogsChunked(address, topic, fromBlock, toBlock) {
  const logs = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
    const end = Math.min(start + LOG_CHUNK - 1, toBlock);
    logs.push(...await ethers.provider.getLogs({ address, topics: [topic], fromBlock: start, toBlock: end }));
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return logs;
}

async function snapshotTld({ tld, controllerAddress, registrarAddress, baseNode, snapshotBlock, snapshotTime }) {
  const registrationTopic = controllerInterface.getEvent("NameRegistered").topicHash;
  const transferTopic = registrarInterface.getEvent("Transfer").topicHash;
  const [registrationLogs, transferLogs] = await Promise.all([
    getLogsChunked(controllerAddress, registrationTopic, START_BLOCK, snapshotBlock),
    getLogsChunked(registrarAddress, transferTopic, START_BLOCK, snapshotBlock),
  ]);

  const labels = new Map();
  for (const log of registrationLogs) {
    const parsed = controllerInterface.parseLog(log);
    const label = parsed.args.name;
    const expected = ethers.keccak256(ethers.toUtf8Bytes(label));
    if (expected.toLowerCase() !== parsed.args.label.toLowerCase()) {
      throw new Error(`${tld}: event label mismatch for ${label}`);
    }
    labels.set(BigInt(parsed.args.label).toString(), label);
  }

  const owners = new Map();
  for (const log of transferLogs) {
    const parsed = registrarInterface.parseLog(log);
    const id = parsed.args.tokenId.toString();
    if (parsed.args.to === ethers.ZeroAddress) owners.delete(id);
    else owners.set(id, ethers.getAddress(parsed.args.to));
  }

  const registrar = new ethers.Contract(registrarAddress, registrarInterface, ethers.provider);
  const records = [];
  for (const [idString, label] of labels) {
    const id = BigInt(idString);
    const expiry = await registrar.nameExpires(id, { blockTag: snapshotBlock });
    if (expiry + GRACE_PERIOD < snapshotTime) continue;
    const owner = owners.get(idString);
    if (!owner) throw new Error(`${tld}: no ERC-721 owner found for ${label}`);

    if (expiry > snapshotTime) {
      const onchainOwner = await registrar.ownerOf(id, { blockTag: snapshotBlock });
      if (ethers.getAddress(onchainOwner) !== owner) {
        throw new Error(`${tld}: owner mismatch for ${label}`);
      }
    }
    records.push({ label, id: ethers.toBeHex(id, 32), owner, expiry: expiry.toString() });
  }

  for (const idString of owners.keys()) {
    if (!labels.has(idString)) {
      const expiry = await registrar.nameExpires(BigInt(idString), { blockTag: snapshotBlock });
      if (expiry + GRACE_PERIOD >= snapshotTime) {
        throw new Error(`${tld}: live token ${idString} has no plaintext NameRegistered event`);
      }
    }
  }

  records.sort((a, b) => a.label.localeCompare(b.label));
  return { tld, controllerAddress, registrarAddress, baseNode, records };
}

async function deployRegistrar(snapshot) {
  const Registrar = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSBaseRegistrarV2.sol:ArcNSBaseRegistrarV2"
  );
  const labels = snapshot.records.map((record) => record.label);
  const owners = snapshot.records.map((record) => record.owner);
  const expiries = snapshot.records.map((record) => record.expiry);
  const constructorArguments = [REGISTRY, snapshot.baseNode, snapshot.tld, labels, owners, expiries];
  const constructorArgumentsEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes32", "string", "string[]", "address[]", "uint256[]"],
    constructorArguments
  );
  const registrar = await Registrar.deploy(...constructorArguments);
  await registrar.waitForDeployment();
  const deploymentReceipt = await registrar.deploymentTransaction().wait();
  if (!deploymentReceipt || deploymentReceipt.status !== 1) throw new Error(`${snapshot.tld}: deployment failed`);

  const registrarAddress = await registrar.getAddress();
  await (await registrar.addController(snapshot.controllerAddress)).wait();
  await (await registrar.transferOwnership(ADMIN_SAFE)).wait();

  if (!(await registrar.controllers(snapshot.controllerAddress))) throw new Error(`${snapshot.tld}: controller not added`);
  if (ethers.getAddress(await registrar.owner()) !== ethers.getAddress(ADMIN_SAFE)) {
    throw new Error(`${snapshot.tld}: Safe ownership handoff failed`);
  }
  if ((await registrar.metadataVersion()) !== 2n) throw new Error(`${snapshot.tld}: wrong metadata version`);

  return {
    address: registrarAddress,
    deploymentTransaction: deploymentReceipt.hash,
    deploymentBlock: deploymentReceipt.blockNumber,
    constructorArguments,
    constructorArgumentsEncoded,
  };
}

async function main() {
  if (network.name !== "arc_mainnet") throw new Error("Use --network arc_mainnet");
  const chain = await ethers.provider.getNetwork();
  if (chain.chainId !== CHAIN_ID) throw new Error(`Expected chain 5042, received ${chain.chainId}`);

  const timelock = new ethers.Contract(TIMELOCK, [
    "function isOperationPending(bytes32 id) view returns (bool)",
    "function isOperationReady(bytes32 id) view returns (bool)",
    "function isOperationDone(bytes32 id) view returns (bool)",
  ], ethers.provider);
  const arcController = new ethers.Contract(ARC_CONTROLLER, controllerInterface, ethers.provider);
  const circleController = new ethers.Contract(CIRCLE_CONTROLLER, controllerInterface, ethers.provider);
  const state = {
    operationPending: await timelock.isOperationPending(OPERATION_ID),
    operationReady: await timelock.isOperationReady(OPERATION_ID),
    operationDone: await timelock.isOperationDone(OPERATION_ID),
    arcPaused: await arcController.paused(),
    circlePaused: await circleController.paused(),
    arcBase: await arcController.base(),
    circleBase: await circleController.base(),
    arcSafeDefaultAdmin: await arcController.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_SAFE),
    circleSafeDefaultAdmin: await circleController.hasRole(DEFAULT_ADMIN_ROLE, ADMIN_SAFE),
    arcSafeUpgrader: await arcController.hasRole(UPGRADER_ROLE, ADMIN_SAFE),
    circleSafeUpgrader: await circleController.hasRole(UPGRADER_ROLE, ADMIN_SAFE),
    arcTimelockUpgrader: await arcController.hasRole(UPGRADER_ROLE, TIMELOCK),
    circleTimelockUpgrader: await circleController.hasRole(UPGRADER_ROLE, TIMELOCK),
  };
  console.log(JSON.stringify(state, null, 2));

  if (process.env.READ_ONLY_METADATA_V2_SNAPSHOT === "1") {
    const snapshotBlock = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(snapshotBlock);
    const snapshotTime = BigInt(block.timestamp);
    const arcSnapshot = await snapshotTld({
      tld: "arc", controllerAddress: ARC_CONTROLLER, registrarAddress: ARC_REGISTRAR,
      baseNode: ARC_NODE, snapshotBlock, snapshotTime,
    });
    const circleSnapshot = await snapshotTld({
      tld: "circle", controllerAddress: CIRCLE_CONTROLLER, registrarAddress: CIRCLE_REGISTRAR,
      baseNode: CIRCLE_NODE, snapshotBlock, snapshotTime,
    });
    console.log(JSON.stringify({ snapshotBlock, arc: arcSnapshot.records, circle: circleSnapshot.records }, null, 2));
    console.log("READ ONLY: snapshot was not persisted and no transaction was sent");
    return;
  }

  if (process.env.CONFIRM_MAINNET_METADATA_V2_REGISTRARS !== CONFIRMATION) {
    console.log(`NO WRITE: set CONFIRM_MAINNET_METADATA_V2_REGISTRARS=${CONFIRMATION}`);
    return;
  }
  const [deployer] = await ethers.getSigners();
  if (ethers.getAddress(deployer.address) !== ethers.getAddress(EXPECTED_DEPLOYER)) {
    throw new Error(`Unexpected deployer ${deployer.address}`);
  }
  if (state.operationPending || state.operationReady || state.operationDone) {
    throw new Error("A Timelock operation exists; emergency route requires the unscheduled state");
  }
  if (!state.arcPaused || !state.circlePaused) throw new Error("Both controllers must be paused before snapshot");
  if (!state.arcSafeDefaultAdmin || !state.circleSafeDefaultAdmin) throw new Error("Safe is not DEFAULT_ADMIN_ROLE holder");
  if (state.arcSafeUpgrader || state.circleSafeUpgrader) throw new Error("Safe already has unexpected UPGRADER_ROLE");
  if (!state.arcTimelockUpgrader || !state.circleTimelockUpgrader) throw new Error("Timelock UPGRADER_ROLE missing");
  if (ethers.getAddress(state.arcBase) !== ethers.getAddress(ARC_REGISTRAR)) throw new Error("Unexpected .arc base");
  if (ethers.getAddress(state.circleBase) !== ethers.getAddress(CIRCLE_REGISTRAR)) throw new Error("Unexpected .circle base");

  const outputPath = path.resolve(__dirname, "../../deployments/mainnet/metadata-v2-cutover-prepared.json");
  const batchPath = path.resolve(
    __dirname,
    "../../deployments/safe-batches/arc-mainnet-metadata-v2-upgrade/03-emergency-atomic-upgrade-and-cutover.json"
  );
  if (fs.existsSync(outputPath) || fs.existsSync(batchPath)) throw new Error("Refusing to overwrite existing cutover artifacts");

  const snapshotBlock = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(snapshotBlock);
  const snapshotTime = BigInt(block.timestamp);
  const arcSnapshot = await snapshotTld({
    tld: "arc", controllerAddress: ARC_CONTROLLER, registrarAddress: ARC_REGISTRAR,
    baseNode: ARC_NODE, snapshotBlock, snapshotTime,
  });
  const circleSnapshot = await snapshotTld({
    tld: "circle", controllerAddress: CIRCLE_CONTROLLER, registrarAddress: CIRCLE_REGISTRAR,
    baseNode: CIRCLE_NODE, snapshotBlock, snapshotTime,
  });
  console.log(`snapshot block=${snapshotBlock} arc=${arcSnapshot.records.length} circle=${circleSnapshot.records.length}`);

  const arcDeployment = await deployRegistrar(arcSnapshot);
  console.log(`deployed .arc registrar=${arcDeployment.address}`);
  const circleDeployment = await deployRegistrar(circleSnapshot);
  console.log(`deployed .circle registrar=${circleDeployment.address}`);

  if (!(await arcController.paused()) || !(await circleController.paused())) {
    throw new Error("A controller was unpaused during registrar deployment");
  }
  const fenceBlock = await ethers.provider.getBlockNumber();
  const fenceHeader = await ethers.provider.getBlock(fenceBlock);
  const fenceTime = BigInt(fenceHeader.timestamp);
  const arcFence = await snapshotTld({
    tld: "arc", controllerAddress: ARC_CONTROLLER, registrarAddress: ARC_REGISTRAR,
    baseNode: ARC_NODE, snapshotBlock: fenceBlock, snapshotTime: fenceTime,
  });
  const circleFence = await snapshotTld({
    tld: "circle", controllerAddress: CIRCLE_CONTROLLER, registrarAddress: CIRCLE_REGISTRAR,
    baseNode: CIRCLE_NODE, snapshotBlock: fenceBlock, snapshotTime: fenceTime,
  });
  if (JSON.stringify(arcFence.records) !== JSON.stringify(arcSnapshot.records) ||
      JSON.stringify(circleFence.records) !== JSON.stringify(circleSnapshot.records)) {
    throw new Error("Registration ownership or expiry changed during deployment; refusing to generate cutover batch");
  }

  const root = ethers.ZeroHash;
  const cutoverTransactions = [
    { to: ARC_CONTROLLER, data: controllerInterface.encodeFunctionData("grantRole", [UPGRADER_ROLE, ADMIN_SAFE]) },
    { to: CIRCLE_CONTROLLER, data: controllerInterface.encodeFunctionData("grantRole", [UPGRADER_ROLE, ADMIN_SAFE]) },
    {
      to: ARC_CONTROLLER,
      data: controllerInterface.encodeFunctionData("upgradeToAndCall", [
        "0xb343b3fca4e52238b21F8fDb41211a03556DD232", "0x",
      ]),
    },
    {
      to: CIRCLE_CONTROLLER,
      data: controllerInterface.encodeFunctionData("upgradeToAndCall", [
        "0xb343b3fca4e52238b21F8fDb41211a03556DD232", "0x",
      ]),
    },
    { to: ARC_CONTROLLER, data: controllerInterface.encodeFunctionData("revokeRole", [UPGRADER_ROLE, ADMIN_SAFE]) },
    { to: CIRCLE_CONTROLLER, data: controllerInterface.encodeFunctionData("revokeRole", [UPGRADER_ROLE, ADMIN_SAFE]) },
    {
      to: REGISTRY,
      data: registryInterface.encodeFunctionData("setSubnodeOwner", [
        root, ethers.keccak256(ethers.toUtf8Bytes("arc")), arcDeployment.address,
      ]),
    },
    {
      to: REGISTRY,
      data: registryInterface.encodeFunctionData("setSubnodeOwner", [
        root, ethers.keccak256(ethers.toUtf8Bytes("circle")), circleDeployment.address,
      ]),
    },
    { to: ARC_CONTROLLER, data: controllerInterface.encodeFunctionData("setBaseRegistrar", [arcDeployment.address]) },
    { to: CIRCLE_CONTROLLER, data: controllerInterface.encodeFunctionData("setBaseRegistrar", [circleDeployment.address]) },
  ];
  const batch = safeBatch(
    "ArcNS mainnet metadata V2 - emergency atomic upgrade and cutover",
    "Temporarily grants the Safe upgrade authority, upgrades both paused controllers, revokes that temporary authority, and switches both TLDs to exact-match verified V2 registrars atomically.",
    cutoverTransactions
  );
  const batchJson = `${JSON.stringify(batch, null, 2)}\n`;
  fs.writeFileSync(batchPath, batchJson, { flag: "wx" });

  const artifact = {
    chainId: Number(CHAIN_ID),
    preparedAt: new Date().toISOString(),
    deployer: deployer.address,
    snapshotBlock,
    snapshotBlockHash: block.hash,
    snapshotTimestamp: snapshotTime.toString(),
    fenceBlock,
    fenceBlockHash: fenceHeader.hash,
    oldRegistrars: { arc: ARC_REGISTRAR, circle: CIRCLE_REGISTRAR },
    snapshots: { arc: arcSnapshot.records, circle: circleSnapshot.records },
    newRegistrars: { arc: arcDeployment, circle: circleDeployment },
    safeBatch: "deployments/safe-batches/arc-mainnet-metadata-v2-upgrade/03-emergency-atomic-upgrade-and-cutover.json",
    safeBatchSha256: crypto.createHash("sha256").update(batchJson).digest("hex"),
    requiredSequence: [
      "Verify both new registrar contracts as exact matches on the official Arc Explorer.",
      "Execute 03-emergency-atomic-upgrade-and-cutover.json.",
      "Run read-only validation before executing 05-unpause-controllers.json.",
    ],
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, { flag: "wx" });
  console.log(JSON.stringify(artifact, null, 2));
}

main().catch((error) => {
  console.error(`FAIL: ${error.message || error}`);
  process.exitCode = 1;
});
