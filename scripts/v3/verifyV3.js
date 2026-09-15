/**
 * ArcNS v3 contract verification.
 *
 * Usage:
 *   npx hardhat run scripts/v3/verifyV3.js --network arc_testnet
 *   npx hardhat run scripts/v3/verifyV3.js --network arc_mainnet
 */

"use strict";

const { ethers, run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const NETWORKS = Object.freeze({
  arc_testnet: { chainId: 5042002, explorer: "https://testnet.arcscan.app" },
  arc_mainnet: { chainId: 5042, explorer: "https://arc-mainnet.cloud.blockscout.com" },
});

function readJson(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`${label} not found: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function requireAddress(value, label) {
  if (!ethers.isAddress(value) || value === ethers.ZeroAddress) throw new Error(`${label} must be a non-zero address`);
  return ethers.getAddress(value);
}

function loadVerificationPlan(networkName = network.name, env = process.env) {
  const expected = NETWORKS[networkName];
  if (!expected) throw new Error(`Unsupported verification network: ${networkName}`);
  if (networkName === "arc_mainnet") {
    let api;
    try { api = new URL(env.ARC_MAINNET_EXPLORER_API_URL); } catch (_) { throw new Error("ARC_MAINNET_EXPLORER_API_URL must be a validated HTTPS verification endpoint"); }
    if (api.protocol !== "https:") throw new Error("ARC_MAINNET_EXPLORER_API_URL must use HTTPS");
  }
  const deploymentPath = path.resolve(env.DEPLOYMENT_ARTIFACT_PATH || path.join(__dirname, `../../deployments/${networkName}-v3.json`));
  const deployment = readJson(deploymentPath, "Deployment artifact");
  if (deployment.network !== networkName || Number(deployment.chainId) !== expected.chainId) throw new Error("Deployment artifact network/chain mismatch");
  const c = deployment.contracts || {};
  for (const key of ["registry", "priceOracle", "arcRegistrar", "circleRegistrar", "reverseRegistrar", "resolver", "arcController", "circleController"]) requireAddress(c[key], key);
  if (networkName === "arc_mainnet") requireAddress(c.discountRegistry, "discountRegistry");

  let discountArgs = deployment.deploymentArguments?.discountRegistry?.constructor;
  if (!discountArgs && deployment.earlyAdopterDiscount?.enabled) discountArgs = [deployment.earlyAdopterDiscount.campaignId, deployment.earlyAdopterDiscount.snapshotBlock, deployment.deployer];
  if (networkName === "arc_mainnet" && (!Array.isArray(discountArgs) || discountArgs.length !== 3)) throw new Error("Mainnet DiscountRegistry constructor arguments are missing from the deployment artifact");

  let timelock;
  if (networkName === "arc_mainnet") {
    const timelockPath = path.resolve(env.TIMELOCK_ARTIFACT_PATH || path.join(__dirname, "../../deployments/mainnet/timelock-5042.json"));
    timelock = readJson(timelockPath, "Timelock artifact");
    requireAddress(timelock.timelock, "timelock");
    if (Number(timelock.chainId) !== expected.chainId || !timelock.constructorArgs) throw new Error("Timelock artifact chain/constructor mismatch");
  }
  return Object.freeze({ deployment, deploymentPath, discountArgs, expected, timelock });
}

async function verify(name, address, constructorArguments, contract) {
  process.stdout.write(`Verifying ${name} at ${address}... `);
  try {
    const request = { address };
    if (constructorArguments) request.constructorArguments = constructorArguments;
    if (contract) request.contract = contract;
    await run("verify:verify", request);
    console.log("verified");
  } catch (error) {
    const message = String(error.message || "");
    if (/already (been )?verified/i.test(message)) console.log("already verified");
    else { console.log(`FAILED: ${message.slice(0, 160)}`); throw error; }
  }
}

async function main() {
  const plan = loadVerificationPlan();
  const actualChainId = Number((await ethers.provider.getNetwork()).chainId);
  if (actualChainId !== plan.expected.chainId) throw new Error(`Provider chain mismatch: expected ${plan.expected.chainId}, received ${actualChainId}`);
  const c = plan.deployment.contracts;
  const nh = plan.deployment.namehashes;

  console.log(`\nVerifying ArcNS v3 on ${network.name}...\n`);
  await verify("ArcNSRegistry", c.registry, [], "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
  await verify("ArcNSPriceOracle", c.priceOracle, [], "contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
  await verify("ArcNSBaseRegistrar (.arc)", c.arcRegistrar, [c.registry, nh.arc, "arc"], "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  await verify("ArcNSBaseRegistrar (.circle)", c.circleRegistrar, [c.registry, nh.circle, "circle"], "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  await verify("ArcNSReverseRegistrar", c.reverseRegistrar, [c.registry, c.resolver], "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar");

  // The OpenZeppelin upgrades plugin extends verify:verify for proxy addresses
  // and verifies the proxy, implementation and implementation linkage.
  await verify("ArcNSResolver proxy", c.resolver);
  await verify("ArcNSController (.arc proxy)", c.arcController);
  await verify("ArcNSController (.circle proxy)", c.circleController);

  if (c.discountRegistry && plan.discountArgs) await verify("ArcNSEarlyAdopterDiscountRegistry", c.discountRegistry, plan.discountArgs, "contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry");
  if (plan.timelock) {
    const args = plan.timelock.constructorArgs;
    await verify("ArcNSTimelock", plan.timelock.timelock, [args.minDelay, args.proposers, args.executors, args.admin], "contracts/v3/governance/ArcNSTimelock.sol:ArcNSTimelock");
  }

  console.log("\nPASS: verification requests completed for the canonical deployment set.");
  console.log(`${plan.expected.explorer}/address/${c.registry}`);
}

if (require.main === module) main().catch((error) => { console.error(`\nFAIL: ${error.message}`); process.exit(1); });

module.exports = { NETWORKS, loadVerificationPlan, main, requireAddress };
