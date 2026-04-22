/**
 * ArcNS Full Deployment Script
 * Deploys all contracts in correct dependency order:
 * 1. MockUSDC (local/testnet only) or use existing USDC
 * 2. ArcNSRegistry
 * 3. ArcNSResolver
 * 4. ArcNSPriceOracle
 * 5. ArcNSBaseRegistrar (.arc TLD)
 * 6. ArcNSBaseRegistrar (.circle TLD)
 * 7. ArcNSRegistrarController (for .arc)
 * 8. ArcNSRegistrarController (for .circle)
 * 9. ArcNSReverseRegistrar
 * 10. Wire everything together
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ─── Namehash implementation ──────────────────────────────────────────────────
function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const labelHash = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, labelHash]));
  }
  return node;
}

// ─── Main deployment ──────────────────────────────────────────────────────────
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🚀 ArcNS Deployment");
  console.log("===================");
  console.log("Network  :", network.name);
  console.log("Deployer :", deployer.address);
  console.log("Balance  :", ethers.formatUnits(await ethers.provider.getBalance(deployer.address), 6), "USDC\n");

  const addresses = {};
  const isLocal = network.name === "hardhat" || network.name === "localhost";

  // ── 1. USDC ────────────────────────────────────────────────────────────────
  let usdcAddress = process.env.USDC_ADDRESS;
  if (isLocal || !usdcAddress) {
    console.log("📦 Deploying MockUSDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("   MockUSDC:", usdcAddress);
  }
  addresses.usdc = usdcAddress;

  // ── 2. Registry ────────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistry...");
  const Registry = await ethers.getContractFactory("ArcNSRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  addresses.registry = await registry.getAddress();
  console.log("   ArcNSRegistry:", addresses.registry);

  // ── 3. Resolver ────────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSResolver...");
  const Resolver = await ethers.getContractFactory("ArcNSResolver");
  const resolver = await Resolver.deploy(addresses.registry);
  await resolver.waitForDeployment();
  addresses.resolver = await resolver.getAddress();
  console.log("   ArcNSResolver:", addresses.resolver);

  // ── 4. Price Oracle ────────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSPriceOracle...");
  const PriceOracle = await ethers.getContractFactory("ArcNSPriceOracle");
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  addresses.priceOracle = await priceOracle.getAddress();
  console.log("   ArcNSPriceOracle:", addresses.priceOracle);

  // ── 5. BaseRegistrar (.arc) ────────────────────────────────────────────────
  const arcNode = namehash("arc");
  console.log("\n📦 Deploying ArcNSBaseRegistrar (.arc)...");
  console.log("   .arc namehash:", arcNode);
  const BaseRegistrar = await ethers.getContractFactory("ArcNSBaseRegistrar");
  const arcRegistrar = await BaseRegistrar.deploy(addresses.registry, arcNode, "arc");
  await arcRegistrar.waitForDeployment();
  addresses.arcRegistrar = await arcRegistrar.getAddress();
  console.log("   ArcNSBaseRegistrar (.arc):", addresses.arcRegistrar);

  // ── 6. BaseRegistrar (.circle) ─────────────────────────────────────────────
  const circleNode = namehash("circle");
  console.log("\n📦 Deploying ArcNSBaseRegistrar (.circle)...");
  console.log("   .circle namehash:", circleNode);
  const circleRegistrar = await BaseRegistrar.deploy(addresses.registry, circleNode, "circle");
  await circleRegistrar.waitForDeployment();
  addresses.circleRegistrar = await circleRegistrar.getAddress();
  console.log("   ArcNSBaseRegistrar (.circle):", addresses.circleRegistrar);

  // ── 7. ReverseRegistrar ────────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSReverseRegistrar...");
  const ReverseRegistrar = await ethers.getContractFactory("ArcNSReverseRegistrar");
  const reverseRegistrar = await ReverseRegistrar.deploy(addresses.registry, addresses.resolver);
  await reverseRegistrar.waitForDeployment();
  addresses.reverseRegistrar = await reverseRegistrar.getAddress();
  console.log("   ArcNSReverseRegistrar:", addresses.reverseRegistrar);

  // ── 8. Controller (.arc) ───────────────────────────────────────────────────
  const treasury = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("\n📦 Deploying ArcNSRegistrarController (.arc)...");
  const Controller = await ethers.getContractFactory("ArcNSRegistrarController");
  const arcController = await Controller.deploy(
    addresses.arcRegistrar,
    addresses.priceOracle,
    addresses.usdc,
    addresses.registry,
    addresses.resolver,
    treasury
  );
  await arcController.waitForDeployment();
  addresses.arcController = await arcController.getAddress();
  console.log("   ArcNSRegistrarController (.arc):", addresses.arcController);

  // ── 9. Controller (.circle) ────────────────────────────────────────────────
  console.log("\n📦 Deploying ArcNSRegistrarController (.circle)...");
  const circleController = await Controller.deploy(
    addresses.circleRegistrar,
    addresses.priceOracle,
    addresses.usdc,
    addresses.registry,
    addresses.resolver,
    treasury
  );
  await circleController.waitForDeployment();
  addresses.circleController = await circleController.getAddress();
  console.log("   ArcNSRegistrarController (.circle):", addresses.circleController);

  // ── 10. Wire everything together ───────────────────────────────────────────
  console.log("\n🔧 Configuring contracts...");

  // Set TLD nodes in registry (deployer owns root, assigns TLDs to registrars)
  const arcLabel    = ethers.keccak256(ethers.toUtf8Bytes("arc"));
  const circleLabel = ethers.keccak256(ethers.toUtf8Bytes("circle"));
  const reverseLabel = ethers.keccak256(ethers.toUtf8Bytes("reverse"));
  const addrLabel    = ethers.keccak256(ethers.toUtf8Bytes("addr"));

  // Assign .arc TLD to arcRegistrar
  let tx = await registry.setSubnodeOwner(ethers.ZeroHash, arcLabel, addresses.arcRegistrar);
  await tx.wait();
  console.log("   ✓ .arc TLD → arcRegistrar");

  // Assign .circle TLD to circleRegistrar
  tx = await registry.setSubnodeOwner(ethers.ZeroHash, circleLabel, addresses.circleRegistrar);
  await tx.wait();
  console.log("   ✓ .circle TLD → circleRegistrar");

  // Set up reverse registrar: create "reverse" node, then "addr.reverse"
  tx = await registry.setSubnodeOwner(ethers.ZeroHash, reverseLabel, deployer.address);
  await tx.wait();
  const reverseNode = namehash("reverse");
  tx = await registry.setSubnodeOwner(reverseNode, addrLabel, addresses.reverseRegistrar);
  await tx.wait();
  console.log("   ✓ addr.reverse → reverseRegistrar");

  // Add controllers to base registrars
  tx = await arcRegistrar.addController(addresses.arcController);
  await tx.wait();
  console.log("   ✓ arcController added to arcRegistrar");

  tx = await circleRegistrar.addController(addresses.circleController);
  await tx.wait();
  console.log("   ✓ circleController added to circleRegistrar");

  // Trust controllers in resolver
  tx = await resolver.setTrustedController(addresses.arcController, true);
  await tx.wait();
  tx = await resolver.setTrustedController(addresses.circleController, true);
  await tx.wait();
  tx = await resolver.setTrustedController(addresses.reverseRegistrar, true);
  await tx.wait();
  console.log("   ✓ Controllers trusted in resolver");

  // Set default resolver on registry root
  tx = await registry.setResolver(ethers.ZeroHash, addresses.resolver);
  await tx.wait();
  console.log("   ✓ Default resolver set");

  // ── 11. Save addresses ─────────────────────────────────────────────────────
  const output = {
    network: network.name,
    chainId: 5042002,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    treasury,
    contracts: addresses,
    namehashes: {
      arc: arcNode,
      circle: circleNode,
    },
  };

  const outPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
  fs.writeFileSync(
    path.join(outPath, `${network.name}.json`),
    JSON.stringify(output, null, 2)
  );

  console.log("\n✅ Deployment complete!");
  console.log("📄 Addresses saved to deployments/" + network.name + ".json");
  console.log("\n📋 Contract Addresses:");
  console.log("─────────────────────────────────────────────────────");
  Object.entries(addresses).forEach(([k, v]) => {
    console.log(`   ${k.padEnd(22)}: ${v}`);
  });
  console.log("─────────────────────────────────────────────────────\n");

  return output;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
