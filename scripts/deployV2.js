/**
 * ArcNS V2 Deployment Script
 * Deploys UUPS-upgradeable contracts + Treasury + wires everything
 * Phase 13: UUPS proxies
 * Phase 16: Treasury
 */

const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const lh = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, lh]));
  }
  return node;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🚀 ArcNS V2 Deployment");
  console.log("======================");
  console.log("Network  :", network.name);
  console.log("Deployer :", deployer.address);

  const addresses = {};
  const isLocal = network.name === "hardhat" || network.name === "localhost";

  // ── 1. USDC ────────────────────────────────────────────────────────────────
  let usdcAddress = process.env.USDC_ADDRESS;
  if (isLocal || !usdcAddress) {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("MockUSDC:", usdcAddress);
  }
  addresses.usdc = usdcAddress;

  // ── 2. Registry (non-upgradeable — storage is the source of truth) ─────────
  console.log("\n📦 Deploying ArcNSRegistry...");
  const Registry = await ethers.getContractFactory("ArcNSRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  addresses.registry = await registry.getAddress();
  console.log("   ArcNSRegistry:", addresses.registry);

  // ── 3. ResolverV2 (UUPS proxy) ─────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSResolverV2 (UUPS)...");
  const ResolverV2 = await ethers.getContractFactory("ArcNSResolverV2");
  const resolverV2 = await upgrades.deployProxy(ResolverV2, [addresses.registry, deployer.address], {
    kind: "uups",
    initializer: "initialize",
  });
  await resolverV2.waitForDeployment();
  addresses.resolver = await resolverV2.getAddress();
  addresses.resolverImpl = await upgrades.erc1967.getImplementationAddress(addresses.resolver);
  console.log("   ArcNSResolverV2 proxy:", addresses.resolver);
  console.log("   ArcNSResolverV2 impl: ", addresses.resolverImpl);

  // ── 4. PriceOracleV2 (UUPS proxy) ─────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSPriceOracleV2 (UUPS)...");
  const PriceOracleV2 = await ethers.getContractFactory("ArcNSPriceOracleV2");
  const priceOracleV2 = await upgrades.deployProxy(PriceOracleV2, [deployer.address], {
    kind: "uups",
    initializer: "initialize",
  });
  await priceOracleV2.waitForDeployment();
  addresses.priceOracle = await priceOracleV2.getAddress();
  console.log("   ArcNSPriceOracleV2:", addresses.priceOracle);

  // ── 5. BaseRegistrars (non-upgradeable ERC-721) ────────────────────────────
  const arcNode    = namehash("arc");
  const circleNode = namehash("circle");

  console.log("\n📦 Deploying BaseRegistrars...");
  const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
  const arcRegistrar = await BaseRegistrar.deploy(addresses.registry, arcNode, "arc");
  await arcRegistrar.waitForDeployment();
  addresses.arcRegistrar = await arcRegistrar.getAddress();

  const circleRegistrar = await BaseRegistrar.deploy(addresses.registry, circleNode, "circle");
  await circleRegistrar.waitForDeployment();
  addresses.circleRegistrar = await circleRegistrar.getAddress();
  console.log("   arcRegistrar:", addresses.arcRegistrar);
  console.log("   circleRegistrar:", addresses.circleRegistrar);

  // ── 6. ReverseRegistrar ────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ArcNSReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(addresses.registry, addresses.resolver);
  await reverseRegistrar.waitForDeployment();
  addresses.reverseRegistrar = await reverseRegistrar.getAddress();
  console.log("   ReverseRegistrar:", addresses.reverseRegistrar);

  // ── 7. Treasury (UUPS proxy) ───────────────────────────────────────────────
  const treasuryAddr = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("\n📦 Deploying ArcNSTreasury (UUPS)...");
  const Treasury = await ethers.getContractFactory("ArcNSTreasury");
  const treasury = await upgrades.deployProxy(Treasury, [
    addresses.usdc,
    deployer.address,
    treasuryAddr,   // protocol wallet
    treasuryAddr,   // reserve wallet (update post-deploy)
    treasuryAddr,   // community wallet (update post-deploy)
  ], { kind: "uups", initializer: "initialize" });
  await treasury.waitForDeployment();
  addresses.treasury = await treasury.getAddress();
  console.log("   ArcNSTreasury:", addresses.treasury);

  // ── 8. ControllerV2 (.arc) — UUPS proxy ───────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistrarControllerV2 (.arc, UUPS)...");
  const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
  const arcControllerV2 = await upgrades.deployProxy(ControllerV2, [
    addresses.arcRegistrar,
    addresses.priceOracle,
    addresses.usdc,
    addresses.registry,
    addresses.resolver,
    addresses.treasury,
    deployer.address,
  ], { kind: "uups", initializer: "initialize" });
  await arcControllerV2.waitForDeployment();
  addresses.arcController = await arcControllerV2.getAddress();
  console.log("   arcControllerV2:", addresses.arcController);

  // ── 9. ControllerV2 (.circle) ─────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistrarControllerV2 (.circle, UUPS)...");
  const circleControllerV2 = await upgrades.deployProxy(ControllerV2, [
    addresses.circleRegistrar,
    addresses.priceOracle,
    addresses.usdc,
    addresses.registry,
    addresses.resolver,
    addresses.treasury,
    deployer.address,
  ], { kind: "uups", initializer: "initialize" });
  await circleControllerV2.waitForDeployment();
  addresses.circleController = await circleControllerV2.getAddress();
  console.log("   circleControllerV2:", addresses.circleController);

  // ── 10. Wire everything ────────────────────────────────────────────────────
  console.log("\n🔧 Configuring...");

  const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
  const circleLabel = ethers.keccak256(ethers.toUtf8Bytes("circle"));
  const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
  const addrLabel    = ethers.keccak256(ethers.toUtf8Bytes("addr"));

  await (await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, addresses.arcRegistrar)).wait();
  await (await registry.setSubnodeOwner(ethers.ZeroHash, circleLabel, addresses.circleRegistrar)).wait();
  await (await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address)).wait();
  await (await registry.setSubnodeOwner(namehash("reverse"), addrLabel, addresses.reverseRegistrar)).wait();

  await (await arcRegistrar.addController(addresses.arcController)).wait();
  await (await circleRegistrar.addController(addresses.circleController)).wait();

  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
  await (await resolverV2.grantRole(CONTROLLER_ROLE, addresses.arcController)).wait();
  await (await resolverV2.grantRole(CONTROLLER_ROLE, addresses.circleController)).wait();
  await (await resolverV2.grantRole(CONTROLLER_ROLE, addresses.reverseRegistrar)).wait();

  await (await registry.setResolver(ethers.ZeroHash, addresses.resolver)).wait();

  console.log("   ✓ All contracts wired");

  // ── 11. Save ───────────────────────────────────────────────────────────────
  const output = {
    network: network.name,
    chainId: 5042002,
    version: "v2",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addresses,
    namehashes: { arc: arcNode, circle: circleNode },
  };

  const outPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(
    path.join(outPath, `${network.name}-v2.json`),
    JSON.stringify(output, null, 2)
  );

  console.log("\n✅ V2 Deployment complete!");
  console.log("📄 Saved to deployments/" + network.name + "-v2.json\n");
  Object.entries(addresses).forEach(([k, v]) => console.log(`   ${k.padEnd(22)}: ${v}`));
}

main().catch(e => { console.error(e); process.exit(1); });
