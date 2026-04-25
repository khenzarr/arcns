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
 *  11. Write deployments/arc_testnet-v3.json
 *
 * Usage:
 *   npx hardhat run scripts/v3/deployV3.js --network hardhat
 *   npx hardhat run scripts/v3/deployV3.js --network arc_testnet
 *
 * Environment variables:
 *   USDC_ADDRESS      — use existing USDC (skips MockUSDC deploy)
 *   TREASURY_ADDRESS  — treasury EOA (defaults to deployer)
 *   PRIVATE_KEY       — deployer private key (from .env)
 */

"use strict";

const { ethers, upgrades, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners();
  const isLocal = ["hardhat", "localhost"].includes(network.name);

  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Canonical Deployment    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer : ${deployer.address}\n`);

  const contracts = {};

  // ── 1. USDC ────────────────────────────────────────────────────────────────
  let usdcAddress = process.env.USDC_ADDRESS;
  if (isLocal || !usdcAddress) {
    console.log("📦 Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("contracts/v3/mocks/MockUSDC.sol:MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log(`   MockUSDC: ${usdcAddress}`);
  } else {
    console.log(`   Using USDC: ${usdcAddress}`);
  }
  contracts.usdc = usdcAddress;

  // ── 2. Registry ────────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistry...");
  const Registry = await ethers.getContractFactory("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  contracts.registry = await registry.getAddress();
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
  console.log(`   ArcNSResolver proxy: ${contracts.resolver}`);
  console.log(`   ArcNSResolver impl:  ${contracts.resolverImpl}`);

  // ── 4. PriceOracle ─────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSPriceOracle...");
  const Oracle = await ethers.getContractFactory("contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  contracts.priceOracle = await oracle.getAddress();
  console.log(`   ArcNSPriceOracle: ${contracts.priceOracle}`);

  // ── 5. BaseRegistrar (.arc) ────────────────────────────────────────────────
  const arcNode    = namehash("arc");
  const circleNode = namehash("circle");

  console.log("\n📦 Deploying ArcNSBaseRegistrar (.arc)...");
  const Registrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  const arcRegistrar = await Registrar.deploy(contracts.registry, arcNode, "arc");
  await arcRegistrar.waitForDeployment();
  contracts.arcRegistrar = await arcRegistrar.getAddress();
  console.log(`   arcRegistrar: ${contracts.arcRegistrar}`);

  // ── 6. BaseRegistrar (.circle) ─────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSBaseRegistrar (.circle)...");
  const circleRegistrar = await Registrar.deploy(contracts.registry, circleNode, "circle");
  await circleRegistrar.waitForDeployment();
  contracts.circleRegistrar = await circleRegistrar.getAddress();
  console.log(`   circleRegistrar: ${contracts.circleRegistrar}`);

  // ── 7. ReverseRegistrar ────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(contracts.registry, contracts.resolver);
  await reverseRegistrar.waitForDeployment();
  contracts.reverseRegistrar = await reverseRegistrar.getAddress();
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
  console.log(`   circleController proxy: ${contracts.circleController}`);
  console.log(`   circleController impl:  ${contracts.circleControllerImpl}`);
  contracts.treasury = treasury;

  // ── 10. Wire ───────────────────────────────────────────────────────────────
  console.log("\n🔧 Wiring contracts...");

  // Assign TLD nodes to registrars
  await (await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("arc"),    contracts.arcRegistrar)).wait();
  console.log("   ✓ .arc TLD → arcRegistrar");

  await (await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("circle"), contracts.circleRegistrar)).wait();
  console.log("   ✓ .circle TLD → circleRegistrar");

  // Set up addr.reverse node for ReverseRegistrar
  await (await registry.setSubnodeOwner(ethers.ZeroHash, labelhash("reverse"), deployer.address)).wait();
  const reverseBaseNode = namehash("reverse");
  await (await registry.setSubnodeOwner(reverseBaseNode, labelhash("addr"), contracts.reverseRegistrar)).wait();
  console.log("   ✓ addr.reverse → reverseRegistrar");

  // Add controllers to registrars
  await (await arcRegistrar.addController(contracts.arcController)).wait();
  console.log("   ✓ arcController added to arcRegistrar");

  await (await circleRegistrar.addController(contracts.circleController)).wait();
  console.log("   ✓ circleController added to circleRegistrar");

  // Grant CONTROLLER_ROLE on Resolver to both controllers and reverseRegistrar
  await (await resolver.setController(contracts.arcController,    true)).wait();
  await (await resolver.setController(contracts.circleController, true)).wait();
  await (await resolver.setController(contracts.reverseRegistrar, true)).wait();
  console.log("   ✓ CONTROLLER_ROLE granted on Resolver");

  // Approve the resolver on both controllers
  await (await arcController.setApprovedResolver(contracts.resolver,    true)).wait();
  await (await circleController.setApprovedResolver(contracts.resolver, true)).wait();
  console.log("   ✓ Resolver approved on both controllers");

  // ── 11. Save deployment output ─────────────────────────────────────────────
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
  };

  const outDir = path.join(__dirname, "../../deployments");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `${network.name}-v3.json`);
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2));

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

main().catch(e => { console.error(e); process.exit(1); });
