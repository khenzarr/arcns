/**
 * ArcNS v3 — Canonical Deploy Script
 *
 * Deploys the full v3 contract system in dependency order:
 *   1. MockUSDC (local/testnet only) or use USDC_ADDRESS env var
 *   2. ArcNSRegistry
 *   3. ArcNSResolver (UUPS proxy)
 *   4. ArcNSPriceOracle
 *   5. ArcNSBaseRegistrar (.arc)
 *   6. ArcNSBaseRegistrar (.circle)
 *   7. ArcNSReverseRegistrar
 *   8. ArcNSController (.arc, UUPS proxy)
 *   9. ArcNSController (.circle, UUPS proxy)
 *  10. Wire: TLD nodes, controller auth, resolver roles, reverse node
 *  11. Optionally deploy and wire one shared early-adopter discount registry
 *  12. Write deployments/arc_testnet-v3.json
 *
 * Usage:
 *   npx hardhat run scripts/v3/deployV3.js --network hardhat
 *   npx hardhat run scripts/v3/deployV3.js --network arc_testnet
 *
 * Environment variables:
 *   USDC_ADDRESS      — use existing USDC (skips MockUSDC deploy)
 *   TREASURY_ADDRESS  — treasury EOA (defaults to deployer)
 *   PRIVATE_KEY       — deployer private key (from .env)
 *   DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY — true to deploy/wire the shared registry
 *   Campaign facts come only from the finalized snapshot manifest. Supplied
 *   EARLY_ADOPTER_* fact values must match it exactly. Root set, root freeze,
 *   and activation are intentionally separate reviewed operations.
 */

"use strict";

const { ethers, upgrades, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");
const { loadAndValidateFinalSnapshot } = require("../mainnet/final-snapshot");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  for (const label of name.split(".").reverse()) {
    node = ethers.keccak256(ethers.concat([node, ethers.keccak256(ethers.toUtf8Bytes(label))]));
  }
  return node;
}

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function envBoolean(value, defaultValue = false) {
  if (value === undefined || value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Expected boolean true/false, received: ${value}`);
}

function discountDeploymentConfig(env = process.env, options = {}) {
  const enabled = envBoolean(env.DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY, false);
  if (!enabled) return { enabled: false };

  for (const name of ["EARLY_ADOPTER_DISCOUNT_ACTIVE", "EARLY_ADOPTER_FREEZE_ROOT", "EARLY_ADOPTER_SET_ROOT"]) {
    if (env[name] !== undefined && env[name] !== "" && env[name] !== "false") {
      throw new Error(`${name} is forbidden in deployV3.js; use the separate reviewed mainnet operation script`);
    }
  }
  const snapshot = loadAndValidateFinalSnapshot(env, options.manifestPath);
  return {
    enabled: true,
    campaignId: snapshot.campaignIdBytes32,
    snapshotBlock: snapshot.snapshotBlock,
    snapshotBlockHash: snapshot.snapshotBlockHash,
    merkleRoot: snapshot.merkleRoot,
    eligibleWalletCount: snapshot.eligibleWalletCount,
    rootSetDuringDeploy: false,
    rootFrozenDuringDeploy: false,
    activeDuringDeploy: false,
  };
}

const MAINNET_DEPLOY_CONFIRMATION = "I_UNDERSTAND_THIS_DEPLOYS_ARCNS_TO_MAINNET";
const ARC_MAINNET_USDC = "0x3600000000000000000000000000000000000000";

function mainnetDeploymentConfig(networkName, env = process.env) {
  if (networkName !== "arc_mainnet") return null;
  if (env.CONFIRM_MAINNET_PROTOCOL_DEPLOY !== MAINNET_DEPLOY_CONFIRMATION) {
    throw new Error(`CONFIRM_MAINNET_PROTOCOL_DEPLOY=${MAINNET_DEPLOY_CONFIRMATION} is required`);
  }
  if (!ethers.isAddress(env.USDC_ADDRESS) || ethers.getAddress(env.USDC_ADDRESS) !== ethers.getAddress(ARC_MAINNET_USDC)) {
    throw new Error(`USDC_ADDRESS must be the reviewed Arc mainnet USDC ${ARC_MAINNET_USDC}`);
  }
  for (const name of ["TREASURY_ADDRESS", "EXPECTED_DEPLOYER_ADDRESS", "EXPECTED_ADMIN_SAFE_ADDRESS"]) {
    if (!ethers.isAddress(env[name]) || env[name] === ethers.ZeroAddress) throw new Error(`${name} must be an explicit non-zero address`);
  }
  if (ethers.getAddress(env.EXPECTED_DEPLOYER_ADDRESS) === ethers.getAddress(env.EXPECTED_ADMIN_SAFE_ADDRESS)) {
    throw new Error("EXPECTED_DEPLOYER_ADDRESS must not equal EXPECTED_ADMIN_SAFE_ADDRESS");
  }
  if (env.DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY !== "true") {
    throw new Error("Mainnet deployment requires DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY=true");
  }
  if (env.PRICE_ORACLE_ADDRESS) throw new Error("PRICE_ORACLE_ADDRESS is not accepted for the canonical fresh mainnet deployment");
  const minimumBalance = env.MIN_DEPLOYER_BALANCE_WEI;
  if (!minimumBalance || !/^\d+$/.test(minimumBalance) || BigInt(minimumBalance) <= 0n) {
    throw new Error("MIN_DEPLOYER_BALANCE_WEI must be an explicitly reviewed positive integer");
  }
  return Object.freeze({
    expectedDeployer: ethers.getAddress(env.EXPECTED_DEPLOYER_ADDRESS),
    adminSafe: ethers.getAddress(env.EXPECTED_ADMIN_SAFE_ADDRESS),
    treasury: ethers.getAddress(env.TREASURY_ADDRESS),
    minimumBalance: BigInt(minimumBalance),
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isLocal = ["hardhat", "localhost"].includes(network.name);
  // All environment/manifest checks must finish before a signer is loaded or any write can occur.
  const discountConfig = discountDeploymentConfig();
  const mainnetConfig = mainnetDeploymentConfig(network.name);
  const outDir = path.join(__dirname, "../../deployments");
  const outFile = path.join(outDir, `${network.name}-v3.json`);
  if (network.name === "arc_mainnet" && fs.existsSync(outFile)) {
    throw new Error(`Refusing to overwrite existing mainnet deployment artifact: ${outFile}`);
  }
  const [deployer] = await ethers.getSigners();

  const providerNetwork = await ethers.provider.getNetwork();
  if (network.name === "arc_mainnet") {
    if (Number(providerNetwork.chainId) !== 5042) throw new Error(`Expected Arc mainnet chain 5042, received ${providerNetwork.chainId}`);
    if (ethers.getAddress(deployer.address) !== mainnetConfig.expectedDeployer) throw new Error("Signer does not match EXPECTED_DEPLOYER_ADDRESS");
    if (ethers.getAddress(process.env.TREASURY_ADDRESS) !== mainnetConfig.treasury) throw new Error("TREASURY_ADDRESS mismatch");
    if (await ethers.provider.getCode(mainnetConfig.adminSafe) === "0x") throw new Error("EXPECTED_ADMIN_SAFE_ADDRESS has no bytecode");
    const balance = await ethers.provider.getBalance(deployer.address);
    if (balance < mainnetConfig.minimumBalance) throw new Error(`Deployer balance ${balance} is below MIN_DEPLOYER_BALANCE_WEI ${mainnetConfig.minimumBalance}`);
  }

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Canonical Deployment    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${providerNetwork.chainId}`);
  console.log(`Deployer : ${deployer.address}\n`);

  const contracts = {};
  const deploymentRecords = {};
  const bootstrapTransactions = [];
  const deploymentArguments = {};

  async function recordDeployment(label, contract, address) {
    const tx = contract.deploymentTransaction();
    if (!tx) throw new Error(`Missing deployment transaction for ${label}`);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Deployment failed for ${label}`);
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    if (!block || block.hash !== receipt.blockHash) throw new Error(`Block reconciliation failed for ${label}`);
    deploymentRecords[label] = {
      address,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
    };
  }

  async function bootstrap(label, txPromise) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error(`Bootstrap transaction failed: ${label}`);
    bootstrapTransactions.push({ label, txHash: receipt.hash, blockNumber: receipt.blockNumber, blockHash: receipt.blockHash });
    return receipt;
  }

  if (network.name === "arc_mainnet") {
    const expected = [100_000_000n, 50_000_000n, 25_000_000n, 15_000_000n, 5_000_000n];
    const oracleAddress = process.env.PRICE_ORACLE_ADDRESS;
    if (oracleAddress) {
      const oracle = new ethers.Contract(oracleAddress, [
        "function price1Char() view returns (uint256)", "function price2Char() view returns (uint256)",
        "function price3Char() view returns (uint256)", "function price4Char() view returns (uint256)",
        "function price5Plus() view returns (uint256)",
      ], ethers.provider);
      const actual = await Promise.all([oracle.price1Char(), oracle.price2Char(), oracle.price3Char(), oracle.price4Char(), oracle.price5Plus()]);
      if (actual.some((value, index) => value !== expected[index])) {
        throw new Error(`Existing mainnet oracle does not match expected p1/p2/p3/p4/p5 values: ${actual.join("/")}`);
      }
      console.log("   ✓ Existing mainnet oracle prices validated; no setPrices transaction will be sent.");
    }
  }

  // ── 1. USDC ────────────────────────────────────────────────────────────────
  let usdcAddress = process.env.USDC_ADDRESS;
  if (isLocal) {
    console.log("📦 Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("contracts/v3/mocks/MockUSDC.sol:MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    await recordDeployment("usdc", usdc, usdcAddress);
    console.log(`   MockUSDC: ${usdcAddress}`);
  } else if (usdcAddress) {
    console.log(`   Using USDC: ${usdcAddress}`);
  } else {
    throw new Error(`USDC_ADDRESS is required on non-local network ${network.name}; refusing to deploy MockUSDC.`);
  }
  contracts.usdc = usdcAddress;

  // ── 2. Registry ────────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistry...");
  const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  contracts.registry = await registry.getAddress();
  deploymentArguments.registry = { constructor: [] };
  await recordDeployment("registry", registry, contracts.registry);
  console.log(`   ArcNSRegistry: ${contracts.registry}`);

  // ── 3. Resolver (UUPS proxy) ───────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSResolver (UUPS proxy)...");
  const ResolverFactory = await ethers.getContractFactory("contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver");
  const resolver = await upgrades.deployProxy(
    ResolverFactory,
    [contracts.registry, deployer.address],
    { kind: "uups", unsafeAllow: ["constructor"] }
  );
  await resolver.waitForDeployment();
  contracts.resolver     = await resolver.getAddress();
  contracts.resolverImpl = await upgrades.erc1967.getImplementationAddress(contracts.resolver);
  deploymentArguments.resolver = { proxyKind: "uups", initializer: [contracts.registry, deployer.address] };
  await recordDeployment("resolver", resolver, contracts.resolver);
  console.log(`   ArcNSResolver proxy: ${contracts.resolver}`);
  console.log(`   ArcNSResolver impl:  ${contracts.resolverImpl}`);

  // ── 4. PriceOracle ─────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSPriceOracle...");
  const Oracle = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  contracts.priceOracle = await oracle.getAddress();
  deploymentArguments.priceOracle = { constructor: [] };
  await recordDeployment("priceOracle", oracle, contracts.priceOracle);
  console.log(`   ArcNSPriceOracle: ${contracts.priceOracle}`);
  if (network.name === "arc_mainnet") {
    const expected = [100_000_000n, 50_000_000n, 25_000_000n, 15_000_000n, 5_000_000n];
    await bootstrap("priceOracle.setPrices", oracle.setPrices(...expected));
    const actual = await Promise.all([
      oracle.price1Char(), oracle.price2Char(), oracle.price3Char(),
      oracle.price4Char(), oracle.price5Plus(),
    ]);
    if (actual.some((value, index) => value !== expected[index])) {
      throw new Error(`Mainnet oracle post-deploy validation failed: ${actual.join("/")}`);
    }
    console.log(`   ✓ Mainnet p1/p2/p3/p4/p5 initialized and verified: ${actual.join("/")}`);
  }

  // ── 5. BaseRegistrar (.arc) ────────────────────────────────────────────────
  const arcNode    = namehash("arc");
  const circleNode = namehash("circle");

  console.log("\n📦 Deploying ArcNSBaseRegistrar (.arc)...");
  const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  const arcRegistrar = await Registrar.deploy(contracts.registry, arcNode, "arc");
  await arcRegistrar.waitForDeployment();
  contracts.arcRegistrar = await arcRegistrar.getAddress();
  deploymentArguments.arcRegistrar = { constructor: [contracts.registry, arcNode, "arc"] };
  await recordDeployment("arcRegistrar", arcRegistrar, contracts.arcRegistrar);
  console.log(`   arcRegistrar: ${contracts.arcRegistrar}`);

  // ── 6. BaseRegistrar (.circle) ─────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSBaseRegistrar (.circle)...");
  const circleRegistrar = await Registrar.deploy(contracts.registry, circleNode, "circle");
  await circleRegistrar.waitForDeployment();
  contracts.circleRegistrar = await circleRegistrar.getAddress();
  deploymentArguments.circleRegistrar = { constructor: [contracts.registry, circleNode, "circle"] };
  await recordDeployment("circleRegistrar", circleRegistrar, contracts.circleRegistrar);
  console.log(`   circleRegistrar: ${contracts.circleRegistrar}`);

  // ── 7. ReverseRegistrar ────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(contracts.registry, contracts.resolver);
  await reverseRegistrar.waitForDeployment();
  contracts.reverseRegistrar = await reverseRegistrar.getAddress();
  deploymentArguments.reverseRegistrar = { constructor: [contracts.registry, contracts.resolver] };
  await recordDeployment("reverseRegistrar", reverseRegistrar, contracts.reverseRegistrar);
  console.log(`   reverseRegistrar: ${contracts.reverseRegistrar}`);

  // ── 8. Controller (.arc, UUPS proxy) ──────────────────────────────────────
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("\n📦 Deploying ArcNSController (.arc, UUPS proxy)...");
  const ControllerFactory = await ethers.getContractFactory("contracts/v3/controller/ArcNSController.sol:ArcNSController");
  const arcController = await upgrades.deployProxy(ControllerFactory, [
    contracts.arcRegistrar,
    contracts.priceOracle,
    contracts.usdc,
    contracts.registry,
    contracts.resolver,
    contracts.reverseRegistrar,
    treasury,
    deployer.address,
  ], { kind: "uups", unsafeAllow: ["constructor"] });
  await arcController.waitForDeployment();
  contracts.arcController     = await arcController.getAddress();
  contracts.arcControllerImpl = await upgrades.erc1967.getImplementationAddress(contracts.arcController);
  deploymentArguments.arcController = { proxyKind: "uups", initializer: [contracts.arcRegistrar, contracts.priceOracle, contracts.usdc, contracts.registry, contracts.resolver, contracts.reverseRegistrar, treasury, deployer.address] };
  await recordDeployment("arcController", arcController, contracts.arcController);
  console.log(`   arcController proxy: ${contracts.arcController}`);
  console.log(`   arcController impl:  ${contracts.arcControllerImpl}`);

  // ── 9. Controller (.circle, UUPS proxy) ───────────────────────────────────
  console.log("\n📦 Deploying ArcNSController (.circle, UUPS proxy)...");
  const circleController = await upgrades.deployProxy(ControllerFactory, [
    contracts.circleRegistrar,
    contracts.priceOracle,
    contracts.usdc,
    contracts.registry,
    contracts.resolver,
    contracts.reverseRegistrar,
    treasury,
    deployer.address,
  ], { kind: "uups", unsafeAllow: ["constructor"] });
  await circleController.waitForDeployment();
  contracts.circleController     = await circleController.getAddress();
  contracts.circleControllerImpl = await upgrades.erc1967.getImplementationAddress(contracts.circleController);
  deploymentArguments.circleController = { proxyKind: "uups", initializer: [contracts.circleRegistrar, contracts.priceOracle, contracts.usdc, contracts.registry, contracts.resolver, contracts.reverseRegistrar, treasury, deployer.address] };
  await recordDeployment("circleController", circleController, contracts.circleController);
  console.log(`   circleController proxy: ${contracts.circleController}`);
  console.log(`   circleController impl:  ${contracts.circleControllerImpl}`);
  contracts.treasury = treasury;

  // ── 10. Wire ───────────────────────────────────────────────────────────────
  console.log("\n🔧 Wiring contracts...");

  // Assign TLD nodes to registrars
  await bootstrap("registry.setSubnodeOwner(.arc)", registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"), contracts.arcRegistrar));
  console.log("   ✓ .arc TLD → arcRegistrar");

  await bootstrap("registry.setSubnodeOwner(.circle)", registry.setSubnodeOwner(ethers.ZeroHash, labelhash("circle"), contracts.circleRegistrar));
  console.log("   ✓ .circle TLD → circleRegistrar");

  // Set up addr.reverse node for ReverseRegistrar
  await bootstrap("registry.setSubnodeOwner(reverse)", registry.setSubnodeOwner(ethers.ZeroHash, labelhash("reverse"), deployer.address));
  const reverseBaseNode = namehash("reverse");
  await bootstrap("registry.setSubnodeOwner(addr.reverse)", registry.setSubnodeOwner(reverseBaseNode, labelhash("addr"), contracts.reverseRegistrar));
  console.log("   ✓ addr.reverse → reverseRegistrar");

  // Add controllers to registrars
  await bootstrap("arcRegistrar.addController", arcRegistrar.addController(contracts.arcController));
  console.log("   ✓ arcController added to arcRegistrar");

  await bootstrap("circleRegistrar.addController", circleRegistrar.addController(contracts.circleController));
  console.log("   ✓ circleController added to circleRegistrar");

  // Grant CONTROLLER_ROLE on Resolver to both controllers and reverseRegistrar
  await bootstrap("resolver.setController(arcController)", resolver.setController(contracts.arcController, true));
  await bootstrap("resolver.setController(circleController)", resolver.setController(contracts.circleController, true));
  await bootstrap("resolver.setController(reverseRegistrar)", resolver.setController(contracts.reverseRegistrar, true));
  console.log("   ✓ CONTROLLER_ROLE granted on Resolver");

  // Approve the resolver on both controllers
  await bootstrap("arcController.setApprovedResolver", arcController.setApprovedResolver(contracts.resolver, true));
  await bootstrap("circleController.setApprovedResolver", circleController.setApprovedResolver(contracts.resolver, true));
  console.log("   ✓ Resolver approved on both controllers");

  if (discountConfig.enabled) {
    console.log("\n📦 Deploying one shared ArcNSEarlyAdopterDiscountRegistry...");
    const DiscountRegistry = await ethers.getContractFactory("contracts/v3/discount/ArcNSEarlyAdopterDiscountRegistry.sol:ArcNSEarlyAdopterDiscountRegistry");
    const discountRegistry = await DiscountRegistry.deploy(discountConfig.campaignId, discountConfig.snapshotBlock, deployer.address);
    await discountRegistry.waitForDeployment();
    contracts.discountRegistry = await discountRegistry.getAddress();
    deploymentArguments.discountRegistry = { constructor: [discountConfig.campaignId, String(discountConfig.snapshotBlock), deployer.address] };
    await recordDeployment("discountRegistry", discountRegistry, contracts.discountRegistry);

    await bootstrap("discountRegistry.authorize(arcController)", discountRegistry.setControllerAuthorization(contracts.arcController, true));
    await bootstrap("discountRegistry.authorize(circleController)", discountRegistry.setControllerAuthorization(contracts.circleController, true));
    await bootstrap("arcController.setDiscountRegistry", arcController.setDiscountRegistry(contracts.discountRegistry));
    await bootstrap("circleController.setDiscountRegistry", circleController.setDiscountRegistry(contracts.discountRegistry));

    if (await arcController.discountRegistry() !== contracts.discountRegistry || await circleController.discountRegistry() !== contracts.discountRegistry) {
      throw new Error("Both controllers must point to the same shared discount registry");
    }
    if (await discountRegistry.merkleRoot() !== ethers.ZeroHash || await discountRegistry.rootFrozen() || await discountRegistry.discountActive()) {
      throw new Error("Discount registry deploy/bootstrap must leave root unset, unfrozen, and inactive");
    }
    console.log("   ✓ Shared discount registry wired; root remains unset, unfrozen, and inactive");
  }

  // ── 12. Save deployment output ─────────────────────────────────────────────
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const output = {
    network:     network.name,
    chainId,
    version:     "v3",
    deployedAt:  new Date().toISOString(),
    deployer:    deployer.address,
    contracts,
    namehashes: {
      arc:    arcNode,
      circle: circleNode,
      addrReverse: namehash("addr.reverse"),
    },
    upgrades: [],
    deploymentRecords,
    bootstrapTransactions,
    deploymentArguments,
    earlyAdopterDiscount: discountConfig,
  };

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (network.name === "arc_mainnet") fs.writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`, { flag: "wx" });
  else fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

  console.log(`\n✅ ArcNS v3 deployment complete!`);
  console.log(`📄 Saved to deployments/${network.name}-v3.json`);
  console.log("\n📋 Contract Addresses:");
  console.log("─".repeat(60));
  for (const [k, v] of Object.entries(contracts)) {
    console.log(`   ${k.padEnd(26)}: ${v}`);
  }
  console.log("─".repeat(60));

  return output;
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { MAINNET_DEPLOY_CONFIRMATION, discountDeploymentConfig, envBoolean, mainnetDeploymentConfig, main };
