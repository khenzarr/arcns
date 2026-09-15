"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const { ARC_MAINNET_CHAIN_ID, requiredAddress } = require("./discount-operation-guards");

const CONFIRMATION = "I_UNDERSTAND_THIS_REMOVES_DEPLOYER_ADMIN_ACCESS";
const REQUIRED_CONTRACTS = [
  "registry", "arcRegistrar", "circleRegistrar", "arcController",
  "circleController", "resolver", "reverseRegistrar", "priceOracle",
  "discountRegistry",
];

const ACCESS_ABI = [
  "function hasRole(bytes32,address) view returns (bool)",
  "function grantRole(bytes32,address)",
  "function revokeRole(bytes32,address)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function ADMIN_ROLE() view returns (bytes32)",
  "function PAUSER_ROLE() view returns (bytes32)",
  "function ORACLE_ROLE() view returns (bytes32)",
  "function UPGRADER_ROLE() view returns (bytes32)",
  "function treasury() view returns (address)",
];
const OWNABLE_ABI = [
  "function owner() view returns (address)",
  "function transferOwnership(address)",
];
const REGISTRY_ABI = [
  "function owner(bytes32) view returns (address)",
  "function setOwner(bytes32,address)",
];

function readJson(filePath, label) {
  if (!filePath) throw new Error(`${label} path is required`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} not found: ${resolved}`);
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function loadHandoffConfig(env = process.env) {
  if (env.CONFIRM_MAINNET_ADMIN_HANDOFF !== CONFIRMATION) {
    throw new Error(`CONFIRM_MAINNET_ADMIN_HANDOFF=${CONFIRMATION} is required`);
  }
  const deployment = readJson(env.DEPLOYMENT_ARTIFACT_PATH, "DEPLOYMENT_ARTIFACT_PATH");
  const timelockArtifact = readJson(env.TIMELOCK_ARTIFACT_PATH, "TIMELOCK_ARTIFACT_PATH");
  if (deployment.network !== "arc_mainnet" || Number(deployment.chainId) !== ARC_MAINNET_CHAIN_ID) {
    throw new Error("Deployment artifact must be an Arc mainnet (5042) v3 artifact");
  }
  const contracts = {};
  for (const key of REQUIRED_CONTRACTS) {
    contracts[key] = requiredAddress({ value: deployment.contracts?.[key] }, "value");
  }
  return Object.freeze({
    deployment,
    contracts,
    adminSafe: requiredAddress(env, "EXPECTED_ADMIN_SAFE_ADDRESS"),
    timelock: requiredAddress({ value: timelockArtifact.timelock }, "value"),
    deployer: requiredAddress(env, "EXPECTED_DEPLOYER_ADDRESS"),
    treasury: requiredAddress(env, "EXPECTED_TREASURY_RECIPIENT"),
  });
}

function sameAddress(a, b) {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

async function waitFor(label, txPromise) {
  const tx = await txPromise;
  console.log(`${label}: ${tx.hash}`);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${label} failed`);
  return receipt;
}

async function ensureRole(contract, role, holder, label) {
  if (!(await contract.hasRole(role, holder))) {
    await waitFor(`grant ${label}`, contract.grantRole(role, holder));
  }
  if (!(await contract.hasRole(role, holder))) throw new Error(`${label} grant did not persist`);
}

async function revokeRoleIfHeld(contract, role, holder, label) {
  if (await contract.hasRole(role, holder)) {
    await waitFor(`revoke ${label}`, contract.revokeRole(role, holder));
  }
  if (await contract.hasRole(role, holder)) throw new Error(`${label} revoke did not persist`);
}

async function transferOwnable(address, deployer, adminSafe, label) {
  const contract = new ethers.Contract(address, OWNABLE_ABI, deployer);
  const owner = await contract.owner();
  if (sameAddress(owner, adminSafe)) return;
  if (!sameAddress(owner, await deployer.getAddress())) {
    throw new Error(`${label} owner is neither deployer nor Admin Safe: ${owner}`);
  }
  await waitFor(`transfer ${label} ownership`, contract.transferOwnership(adminSafe));
  if (!sameAddress(await contract.owner(), adminSafe)) throw new Error(`${label} ownership transfer did not persist`);
}

async function main() {
  const config = loadHandoffConfig();
  const { chainId } = await ethers.provider.getNetwork();
  if (Number(chainId) !== ARC_MAINNET_CHAIN_ID) throw new Error(`Expected chain ${ARC_MAINNET_CHAIN_ID}, received ${chainId}`);

  const [signer] = await ethers.getSigners();
  if (!sameAddress(await signer.getAddress(), config.deployer)) throw new Error("Configured signer is not EXPECTED_DEPLOYER_ADDRESS");
  for (const [label, address] of Object.entries({ ...config.contracts, adminSafe: config.adminSafe, timelock: config.timelock })) {
    if (await ethers.provider.getCode(address) === "0x") throw new Error(`No bytecode for ${label} at ${address}`);
  }
  if (!sameAddress(config.deployment.contracts.treasury, config.treasury)) throw new Error("Deployment artifact treasury mismatch");

  for (const key of ["arcController", "circleController"]) {
    const contract = new ethers.Contract(config.contracts[key], ACCESS_ABI, signer);
    if (!sameAddress(await contract.treasury(), config.treasury)) throw new Error(`${key} treasury mismatch`);
    const roles = {
      DEFAULT_ADMIN_ROLE: await contract.DEFAULT_ADMIN_ROLE(),
      ADMIN_ROLE: await contract.ADMIN_ROLE(),
      PAUSER_ROLE: await contract.PAUSER_ROLE(),
      ORACLE_ROLE: await contract.ORACLE_ROLE(),
      UPGRADER_ROLE: await contract.UPGRADER_ROLE(),
    };
    for (const name of ["DEFAULT_ADMIN_ROLE", "ADMIN_ROLE", "PAUSER_ROLE", "ORACLE_ROLE"]) {
      await ensureRole(contract, roles[name], config.adminSafe, `${key}.${name} -> Admin Safe`);
    }
    await ensureRole(contract, roles.UPGRADER_ROLE, config.timelock, `${key}.UPGRADER_ROLE -> Timelock`);
    for (const name of ["ADMIN_ROLE", "PAUSER_ROLE", "ORACLE_ROLE", "UPGRADER_ROLE", "DEFAULT_ADMIN_ROLE"]) {
      await revokeRoleIfHeld(contract, roles[name], config.deployer, `${key}.${name} from deployer`);
    }
  }

  const resolver = new ethers.Contract(config.contracts.resolver, ACCESS_ABI, signer);
  const resolverRoles = {
    DEFAULT_ADMIN_ROLE: await resolver.DEFAULT_ADMIN_ROLE(),
    ADMIN_ROLE: await resolver.ADMIN_ROLE(),
    UPGRADER_ROLE: await resolver.UPGRADER_ROLE(),
  };
  await ensureRole(resolver, resolverRoles.DEFAULT_ADMIN_ROLE, config.adminSafe, "resolver.DEFAULT_ADMIN_ROLE -> Admin Safe");
  await ensureRole(resolver, resolverRoles.ADMIN_ROLE, config.adminSafe, "resolver.ADMIN_ROLE -> Admin Safe");
  await ensureRole(resolver, resolverRoles.UPGRADER_ROLE, config.timelock, "resolver.UPGRADER_ROLE -> Timelock");
  for (const name of ["ADMIN_ROLE", "UPGRADER_ROLE", "DEFAULT_ADMIN_ROLE"]) {
    await revokeRoleIfHeld(resolver, resolverRoles[name], config.deployer, `resolver.${name} from deployer`);
  }

  for (const key of ["arcRegistrar", "circleRegistrar", "reverseRegistrar", "priceOracle", "discountRegistry"]) {
    await transferOwnable(config.contracts[key], signer, config.adminSafe, key);
  }

  const registry = new ethers.Contract(config.contracts.registry, REGISTRY_ABI, signer);
  const rootOwner = await registry.owner(ethers.ZeroHash);
  if (!sameAddress(rootOwner, config.adminSafe)) {
    if (!sameAddress(rootOwner, config.deployer)) throw new Error(`Registry root owner is neither deployer nor Admin Safe: ${rootOwner}`);
    await waitFor("transfer registry root ownership", registry.setOwner(ethers.ZeroHash, config.adminSafe));
  }
  if (!sameAddress(await registry.owner(ethers.ZeroHash), config.adminSafe)) throw new Error("Registry root ownership transfer did not persist");

  console.log("PASS: authority handoff completed. Run assert-admin-handoff.js before any activation.");
}

if (require.main === module) main().catch((error) => { console.error(`FAIL: ${error.message}`); process.exit(1); });

module.exports = { CONFIRMATION, REQUIRED_CONTRACTS, loadHandoffConfig, main };
