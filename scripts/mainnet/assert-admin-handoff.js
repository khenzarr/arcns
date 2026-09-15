"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const { ARC_MAINNET_CHAIN_ID, requiredAddress } = require("./discount-operation-guards");

const REQUIRED_CONTRACTS = ["usdc", "registry", "arcRegistrar", "circleRegistrar", "arcController", "circleController", "resolver", "reverseRegistrar", "priceOracle", "discountRegistry"];
const OWNABLE_ABI = ["function owner() view returns (address)"];
const ACCESS_ABI = ["function hasRole(bytes32,address) view returns (bool)", "function DEFAULT_ADMIN_ROLE() view returns (bytes32)", "function ADMIN_ROLE() view returns (bytes32)", "function PAUSER_ROLE() view returns (bytes32)", "function ORACLE_ROLE() view returns (bytes32)", "function UPGRADER_ROLE() view returns (bytes32)", "function treasury() view returns (address)"];
const CONTROLLER_WIRING_ABI = [
  "function base() view returns(address)", "function priceOracle() view returns(address)",
  "function usdc() view returns(address)", "function registry() view returns(address)",
  "function resolver() view returns(address)", "function reverseRegistrar() view returns(address)",
  "function discountRegistry() view returns(address)", "function approvedResolvers(address) view returns(bool)",
  "function paused() view returns(bool)",
];
const REGISTRAR_ABI = ["function controllers(address) view returns(bool)", "function registry() view returns(address)", "function baseNode() view returns(bytes32)"];
const RESOLVER_WIRING_ABI = ["function CONTROLLER_ROLE() view returns(bytes32)", "function hasRole(bytes32,address) view returns(bool)", "function registry() view returns(address)"];
const REVERSE_ABI = ["function registry() view returns(address)", "function defaultResolver() view returns(address)"];
const ORACLE_ABI = ["function price1Char() view returns(uint256)", "function price2Char() view returns(uint256)", "function price3Char() view returns(uint256)", "function price4Char() view returns(uint256)", "function price5Plus() view returns(uint256)"];
const DISCOUNT_ABI = ["function authorizedControllers(address) view returns(bool)"];

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

  const expectedControllerWiring = {
    arcController: c.contracts.arcRegistrar,
    circleController: c.contracts.circleRegistrar,
  };
  for (const [key, registrarAddress] of Object.entries(expectedControllerWiring)) {
    const x = new ethers.Contract(c.contracts[key], CONTROLLER_WIRING_ABI, ethers.provider);
    for (const [label, actual, expected] of [
      ["base", await x.base(), registrarAddress], ["priceOracle", await x.priceOracle(), c.contracts.priceOracle],
      ["usdc", await x.usdc(), c.contracts.usdc], ["registry", await x.registry(), c.contracts.registry],
      ["resolver", await x.resolver(), c.contracts.resolver], ["reverseRegistrar", await x.reverseRegistrar(), c.contracts.reverseRegistrar],
      ["discountRegistry", await x.discountRegistry(), c.contracts.discountRegistry],
    ]) eq(`${key} ${label}`, actual, expected);
    if (!(await x.approvedResolvers(c.contracts.resolver))) throw new Error(`${key} resolver is not approved`);
    if (await x.paused()) throw new Error(`${key} is paused`);
  }

  for (const [key, controllerKey] of [["arcRegistrar", "arcController"], ["circleRegistrar", "circleController"]]) {
    const registrar = new ethers.Contract(c.contracts[key], REGISTRAR_ABI, ethers.provider);
    if (!(await registrar.controllers(c.contracts[controllerKey]))) throw new Error(`${key} controller allowlist mismatch`);
    eq(`${key} registry`, await registrar.registry(), c.contracts.registry);
  }

  const resolverWiring = new ethers.Contract(c.contracts.resolver, RESOLVER_WIRING_ABI, ethers.provider);
  eq("resolver registry", await resolverWiring.registry(), c.contracts.registry);
  const controllerRole = await resolverWiring.CONTROLLER_ROLE();
  for (const key of ["arcController", "circleController", "reverseRegistrar"]) {
    if (!(await resolverWiring.hasRole(controllerRole, c.contracts[key]))) throw new Error(`resolver missing CONTROLLER_ROLE for ${key}`);
  }

  const reverse = new ethers.Contract(c.contracts.reverseRegistrar, REVERSE_ABI, ethers.provider);
  eq("reverse registrar registry", await reverse.registry(), c.contracts.registry);
  eq("reverse registrar resolver", await reverse.defaultResolver(), c.contracts.resolver);

  const discount = new ethers.Contract(c.contracts.discountRegistry, DISCOUNT_ABI, ethers.provider);
  for (const key of ["arcController", "circleController"]) {
    if (!(await discount.authorizedControllers(c.contracts[key]))) throw new Error(`discount registry has not authorized ${key}`);
  }

  const oracle = new ethers.Contract(c.contracts.priceOracle, ORACLE_ABI, ethers.provider);
  const prices = await Promise.all([oracle.price1Char(), oracle.price2Char(), oracle.price3Char(), oracle.price4Char(), oracle.price5Plus()]);
  const expectedPrices = [100_000_000n, 50_000_000n, 25_000_000n, 15_000_000n, 5_000_000n];
  if (prices.some((value, index) => value !== expectedPrices[index])) throw new Error(`mainnet oracle price mismatch: ${prices.join("/")}`);
  console.log("PASS: all configured ownership, role, treasury, and deployer-revocation assertions passed (read-only).");
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = { loadAssertionConfig, main };
