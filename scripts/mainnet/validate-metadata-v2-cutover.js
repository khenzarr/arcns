"use strict";

const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const CHAIN_ID = 5042n;
const ADMIN_SAFE = "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72";
const REGISTRY = "0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb";
const TIMELOCK = "0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c";
const ARC_CONTROLLER = "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350";
const CIRCLE_CONTROLLER = "0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1";
const EXPECTED_IMPLEMENTATION = "0xb343b3fca4e52238b21F8fDb41211a03556DD232";
const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

const registrarAbi = [
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
  "function owner() view returns (address)",
  "function controllers(address) view returns (bool)",
  "function ownerOf(uint256) view returns (address)",
  "function nameExpires(uint256) view returns (uint256)",
  "function labelOf(uint256) view returns (string)",
  "function tokenURI(uint256) view returns (string)",
  "function metadataVersion() view returns (uint256)",
];

function implementationFromSlot(value) {
  return ethers.getAddress(`0x${value.slice(-40)}`);
}

function decodeMetadata(uri) {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) throw new Error("Unexpected tokenURI format");
  return JSON.parse(Buffer.from(uri.slice(prefix.length), "base64").toString("utf8"));
}

async function validateRegistrar(tld, address, controller, records, deploymentBlock, now) {
  const registrar = new ethers.Contract(address, registrarAbi, ethers.provider);
  if (ethers.getAddress(await registrar.owner()) !== ethers.getAddress(ADMIN_SAFE)) throw new Error(`${tld}: owner is not Safe`);
  if (!(await registrar.controllers(controller))) throw new Error(`${tld}: controller missing`);
  if ((await registrar.metadataVersion()) !== 2n) throw new Error(`${tld}: metadata version mismatch`);

  const iface = new ethers.Interface(registrarAbi);
  const logs = await ethers.provider.getLogs({
    address,
    topics: [iface.getEvent("Transfer").topicHash],
    fromBlock: deploymentBlock,
    toBlock: "latest",
  });
  const owners = new Map();
  for (const log of logs) {
    const parsed = iface.parseLog(log);
    owners.set(parsed.args.tokenId.toString(), ethers.getAddress(parsed.args.to));
  }

  for (const record of records) {
    const id = BigInt(record.id);
    if ((await registrar.nameExpires(id)).toString() !== record.expiry) throw new Error(`${tld}: expiry mismatch for ${record.label}`);
    if ((await registrar.labelOf(id)) !== record.label) throw new Error(`${tld}: label mismatch for ${record.label}`);
    if (owners.get(id.toString()) !== ethers.getAddress(record.owner)) throw new Error(`${tld}: owner mismatch for ${record.label}`);
    const metadata = decodeMetadata(await registrar.tokenURI(id));
    if (metadata.name !== `${record.label}.${tld}`) throw new Error(`${tld}: metadata name mismatch for ${record.label}`);
    if (metadata.description !== "ArcNS domain name. Decentralized identity on Arc Mainnet.") {
      throw new Error(`${tld}: description mismatch for ${record.label}`);
    }
    if (BigInt(record.expiry) > now && ethers.getAddress(await registrar.ownerOf(id)) !== ethers.getAddress(record.owner)) {
      throw new Error(`${tld}: active ownerOf mismatch for ${record.label}`);
    }
  }
}

async function main() {
  if (network.name !== "arc_mainnet") throw new Error("Use --network arc_mainnet");
  const expectPaused = process.env.EXPECT_CONTROLLERS_UNPAUSED !== "1";
  const chain = await ethers.provider.getNetwork();
  if (chain.chainId !== CHAIN_ID) throw new Error(`Expected chain 5042, received ${chain.chainId}`);
  const artifactPath = path.resolve(__dirname, "../../deployments/mainnet/metadata-v2-cutover-prepared.json");
  if (!fs.existsSync(artifactPath)) throw new Error("Cutover artifact does not exist yet");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const controllerAbi = [
    "function paused() view returns(bool)",
    "function base() view returns(address)",
    "function hasRole(bytes32,address) view returns(bool)",
  ];
  const registry = new ethers.Contract(REGISTRY, ["function owner(bytes32) view returns(address)"], ethers.provider);

  const pairs = [
    ["arc", ARC_CONTROLLER, artifact.newRegistrars.arc.address, artifact.newRegistrars.arc.deploymentBlock, artifact.snapshots.arc,
      "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae"],
    ["circle", CIRCLE_CONTROLLER, artifact.newRegistrars.circle.address, artifact.newRegistrars.circle.deploymentBlock, artifact.snapshots.circle,
      "0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084"],
  ];
  const latest = await ethers.provider.getBlock("latest");
  for (const [tld, controllerAddress, registrarAddress, deploymentBlock, records, node] of pairs) {
    const controller = new ethers.Contract(controllerAddress, controllerAbi, ethers.provider);
    const isPaused = await controller.paused();
    if (expectPaused && !isPaused) throw new Error(`${tld}: controller must remain paused during pre-unpause validation`);
    if (!expectPaused && isPaused) throw new Error(`${tld}: controller is still paused after unpause batch`);
    if (await controller.hasRole(UPGRADER_ROLE, ADMIN_SAFE)) throw new Error(`${tld}: temporary Safe upgrade role was not revoked`);
    if (!(await controller.hasRole(UPGRADER_ROLE, TIMELOCK))) throw new Error(`${tld}: Timelock upgrade role missing`);
    if (ethers.getAddress(await controller.base()) !== ethers.getAddress(registrarAddress)) throw new Error(`${tld}: controller base mismatch`);
    if (ethers.getAddress(await registry.owner(node)) !== ethers.getAddress(registrarAddress)) throw new Error(`${tld}: registry TLD owner mismatch`);
    const implementation = implementationFromSlot(await ethers.provider.getStorage(controllerAddress, IMPLEMENTATION_SLOT));
    if (implementation !== ethers.getAddress(EXPECTED_IMPLEMENTATION)) throw new Error(`${tld}: implementation mismatch`);
    await validateRegistrar(tld, registrarAddress, controllerAddress, records, deploymentBlock, BigInt(latest.timestamp));
  }

  console.log("PASS: metadata V2 cutover state and migrated NFT metadata are valid");
  if (expectPaused) console.log("SAFE TO PROCEED: 05-unpause-controllers.json");
  else console.log("PASS: both registration controllers are unpaused");
}

main().catch((error) => {
  console.error(`FAIL: ${error.message || error}`);
  process.exitCode = 1;
});
