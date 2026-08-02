"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const { ARC_MAINNET_CHAIN_ID, requiredAddress } = require("./discount-operation-guards");

const REQUIRED_CONTRACTS = ["registry", "arcRegistrar", "circleRegistrar", "arcController", "circleController", "resolver", "reverseRegistrar", "priceOracle", "discountRegistry"];
const OWNABLE_ABI = ["function owner() view returns (address)"];
const ACCESS_ABI = ["function hasRole(bytes32,address) view returns (bool)", "function DEFAULT_ADMIN_ROLE() view returns (bytes32)", "function ADMIN_ROLE() view returns (bytes32)", "function PAUSER_ROLE() view returns (bytes32)", "function ORACLE_ROLE() view returns (bytes32)", "function UPGRADER_ROLE() view returns (bytes32)", "function treasury() view returns (address)"];

function loadAssertionConfig(env = process.env) {
  const config = {
    adminSafe: requiredAddress(env, "EXPECTED_ADMIN_SAFE_ADDRESS"), timelock: requiredAddress(env, "EXPECTED_TIMELOCK_ADDRESS"),
    treasury: requiredAddress(env, "EXPECTED_TREASURY_RECIPIENT"), deployer: requiredAddress(env, "EXPECTED_DEPLOYER_ADDRESS"), contracts: {},
  };
  let artifact = {};
  if (env.DEPLOYMENT_ARTIFACT_PATH) artifact = JSON.parse(fs.readFileSync(path.resolve(env.DEPLOYMENT_ARTIFACT_PATH), "utf8")).contracts || {};
  for (const key of REQUIRED_CONTRACTS) config.contracts[key] = requiredAddress({ value: env[`DEPLOYED_${key.replace(/[A-Z]/g, m => `_${m}`).toUpperCase()}_ADDRESS`] || artifact[key] }, "value");
  return config;
}

async function main() {
  const c = loadAssertionConfig();
  const { chainId } = await ethers.provider.getNetwork();
  if (Number(chainId) !== ARC_MAINNET_CHAIN_ID) throw new Error(`Expected Arc mainnet chain ID ${ARC_MAINNET_CHAIN_ID}, received ${chainId}`);
  for (const [name, address] of Object.entries(c.contracts)) if (await ethers.provider.getCode(address) === "0x") throw new Error(`No bytecode for ${name}`);
  const eq = (label, actual, expected) => { if (ethers.getAddress(actual) !== expected) throw new Error(`${label} mismatch`); };
  eq("registry root owner", await new ethers.Contract(c.contracts.registry, ["function owner(bytes32) view returns(address)"], ethers.provider).owner(ethers.ZeroHash), c.adminSafe);
  for (const key of ["arcRegistrar", "circleRegistrar", "reverseRegistrar", "priceOracle", "discountRegistry"]) eq(`${key} owner`, await new ethers.Contract(c.contracts[key], OWNABLE_ABI, ethers.provider).owner(), c.adminSafe);
  for (const key of ["arcController", "circleController"]) {
    const x = new ethers.Contract(c.contracts[key], ACCESS_ABI, ethers.provider);
    for (const [role, holder] of [[await x.DEFAULT_ADMIN_ROLE(), c.adminSafe], [await x.ADMIN_ROLE(), c.adminSafe], [await x.PAUSER_ROLE(), c.adminSafe], [await x.ORACLE_ROLE(), c.adminSafe], [await x.UPGRADER_ROLE(), c.timelock]]) {
      if (!(await x.hasRole(role, holder))) throw new Error(`${key} expected holder role assertion failed`);
      if (c.deployer !== holder && await x.hasRole(role, c.deployer)) throw new Error(`${key} deployer role revocation assertion failed`);
    }
    eq(`${key} treasury`, await x.treasury(), c.treasury);
  }
  const resolver = new ethers.Contract(c.contracts.resolver, ACCESS_ABI, ethers.provider);
  for (const [role, holder] of [[await resolver.DEFAULT_ADMIN_ROLE(), c.adminSafe], [await resolver.ADMIN_ROLE(), c.adminSafe], [await resolver.UPGRADER_ROLE(), c.timelock]]) {
    if (!(await resolver.hasRole(role, holder))) throw new Error("resolver expected holder role assertion failed");
    if (c.deployer !== holder && await resolver.hasRole(role, c.deployer)) throw new Error("resolver deployer role revocation assertion failed");
  }
  console.log("PASS: all configured ownership, role, treasury, and deployer-revocation assertions passed (read-only).");
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { loadAssertionConfig, main };