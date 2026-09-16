/** ArcNS v3 mainnet source verification. */
"use strict";

const { ethers, network, run } = require("hardhat");
const fs = require("fs");
const path = require("path");
const MAINNET_CHAIN_ID = 5042;
const deploymentPath = path.resolve(__dirname, "../../deployments/arc_mainnet-v3.json");
const timelockPath = path.resolve(__dirname, "../../deployments/mainnet/timelock-5042.json");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Required verification artifact not found: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function buildPlan(deployment, timelock) {
  const c = deployment.contracts;
  const nh = deployment.namehashes;
  const ownerAtDeploy = deployment.deployer;
  const discount = deployment.earlyAdopterDiscount;
  const resolverInit = new ethers.Interface([
    "function initialize(address registry_, address admin_)",
  ]).encodeFunctionData("initialize", [c.registry, ownerAtDeploy]);
  const controllerInterface = new ethers.Interface([
    "function initialize(address registrar_,address priceOracle_,address usdc_,address registry_,address resolver_,address reverseRegistrar_,address treasury_,address admin_)",
  ]);
  const controllerInit = (registrar) => controllerInterface.encodeFunctionData("initialize", [
    registrar, c.priceOracle, c.usdc, c.registry, c.resolver,
    c.reverseRegistrar, c.treasury, ownerAtDeploy,
  ]);
  const proxyContract = "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy";

  return [
    ["ArcNSRegistry", c.registry, [], "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry"],
    ["ArcNSPriceOracle", c.priceOracle, [], "contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle"],
    ["ArcNSBaseRegistrar (.arc)", c.arcRegistrar, [c.registry, nh.arc, "arc"], "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"],
    ["ArcNSBaseRegistrar (.circle)", c.circleRegistrar, [c.registry, nh.circle, "circle"], "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"],
    ["ArcNSReverseRegistrar", c.reverseRegistrar, [c.registry, c.resolver], "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"],
    ["ArcNSEarlyAdopterDiscountRegistry", c.discountRegistry, [discount.campaignId, discount.snapshotBlock, ownerAtDeploy], "contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry"],
    ["ArcNSResolver implementation", c.resolverImpl, [], "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"],
    ["ArcNSController implementation", c.arcControllerImpl, [], "contracts/v3/controller/ArcNSController.sol:ArcNSController"],
    ["ArcNSResolver proxy", c.resolver, [c.resolverImpl, resolverInit], proxyContract],
    ["ArcNSController .arc proxy", c.arcController, [c.arcControllerImpl, controllerInit(c.arcRegistrar)], proxyContract],
    ["ArcNSController .circle proxy", c.circleController, [c.circleControllerImpl, controllerInit(c.circleRegistrar)], proxyContract],
    ["ArcNSTimelock", timelock.timelock, [
      timelock.constructorArgs.minDelay,
      timelock.constructorArgs.proposers,
      timelock.constructorArgs.executors,
      timelock.constructorArgs.admin,
    ], "contracts/v3/governance/ArcNSTimelock.sol:ArcNSTimelock"],
  ].map(([name, address, constructorArguments, contract]) => ({
    name, address: ethers.getAddress(address), constructorArguments, contract,
  }));
}

async function verifyOne(item) {
  process.stdout.write(`Verifying ${item.name} at ${item.address}... `);
  try {
    await run("verify:verify", {
      address: item.address,
      constructorArguments: item.constructorArguments,
      contract: item.contract,
    });
    console.log("verified");
  } catch (error) {
    const message = String(error?.message || error);
    if (/already verified|already been verified/i.test(message)) {
      console.log("already verified");
      return;
    }
    console.log("FAILED");
    throw error;
  }
}

async function main() {
  if (network.name !== "arc_mainnet") throw new Error("Mainnet verification requires --network arc_mainnet");
  const providerNetwork = await ethers.provider.getNetwork();
  if (Number(providerNetwork.chainId) !== MAINNET_CHAIN_ID) {
    throw new Error(`Expected Arc mainnet chain ${MAINNET_CHAIN_ID}, received ${providerNetwork.chainId}`);
  }
  const deployment = readJson(deploymentPath);
  const timelock = readJson(timelockPath);
  if (deployment.chainId !== MAINNET_CHAIN_ID || timelock.chainId !== MAINNET_CHAIN_ID) {
    throw new Error("Verification artifacts are not for Arc mainnet");
  }
  const plan = buildPlan(deployment, timelock);
  const seen = new Set();
  for (const item of plan) {
    if (await ethers.provider.getCode(item.address) === "0x") throw new Error(`No bytecode for ${item.name}`);
    const key = `${item.address}:${item.contract}`;
    if (seen.has(key)) throw new Error(`Duplicate verification plan item: ${item.name}`);
    seen.add(key);
  }
  console.log(`ArcNS mainnet verification coverage: ${plan.length} contracts`);
  for (const item of plan) console.log(`- ${item.name}: ${item.address}`);
  if (process.env.VERIFY_DRY_RUN === "1") {
    console.log("PASS: verification plan and on-chain bytecode preflight complete; no submission sent.");
    return;
  }
  if (!String(process.env.ARC_MAINNET_EXPLORER_API_URL || "").startsWith("https://")) {
    throw new Error("ARC_MAINNET_EXPLORER_API_URL must be a confirmed HTTPS verification endpoint");
  }
  for (const item of plan) await verifyOne(item);
  console.log("PASS: all ArcNS mainnet verification requests completed.");
}

if (require.main === module) main().catch((error) => {
  console.error(String(error?.message || error).replace(/https:\/\/[^\s]+/g, "[masked URL]"));
  process.exit(1);
});
module.exports = { buildPlan, main };
