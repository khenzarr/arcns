/**
 * ArcNS V2 Upgrade Script
 *
 * Upgrades the deployed UUPS proxies to the latest implementation:
 *   1. ArcNSRegistrarControllerV2 — MIN_NAME_LENGTH=1, setAddr on registration
 *   2. ArcNSResolverV2            — ensure CONTROLLER_ROLE is set
 *   3. ArcNSPriceOracle           — update prices to $50/$25/$15/$10/$2
 *
 * Run: npx hardhat run scripts/upgradeV2.js --network arc_testnet
 */

const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🔧 ArcNS V2 Upgrade");
  console.log("===================");
  console.log("Network  :", network.name);
  console.log("Deployer :", deployer.address);

  const depPath = path.join(__dirname, `../deployments/${network.name}-v2.json`);
  if (!fs.existsSync(depPath)) throw new Error(`No deployment found: ${depPath}`);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c = dep.contracts;

  // ── 1. Upgrade ArcNSRegistrarControllerV2 (.arc) ──────────────────────────
  console.log("\n📦 Upgrading ArcNSRegistrarControllerV2 (.arc)...");
  const ControllerV2 = await ethers.getContractFactory("ArcNSRegistrarControllerV2");
  const arcController = await upgrades.upgradeProxy(c.arcController, ControllerV2, {
    kind: "uups",
    call: { fn: "unpause", args: [] }, // ensure not paused after upgrade
  }).catch(async () => {
    // If unpause fails (already unpaused), just upgrade
    return upgrades.upgradeProxy(c.arcController, ControllerV2, { kind: "uups" });
  });
  await arcController.waitForDeployment();
  console.log("   ✓ arcController upgraded:", c.arcController);

  // ── 2. Upgrade ArcNSRegistrarControllerV2 (.circle) ───────────────────────
  console.log("\n📦 Upgrading ArcNSRegistrarControllerV2 (.circle)...");
  const circleController = await upgrades.upgradeProxy(c.circleController, ControllerV2, {
    kind: "uups",
  });
  await circleController.waitForDeployment();
  console.log("   ✓ circleController upgraded:", c.circleController);

  // ── 3. Upgrade ArcNSResolverV2 ────────────────────────────────────────────
  console.log("\n📦 Upgrading ArcNSResolverV2...");
  const ResolverV2 = await ethers.getContractFactory("ArcNSResolverV2");
  const resolver = await upgrades.upgradeProxy(c.resolver, ResolverV2, { kind: "uups" });
  await resolver.waitForDeployment();
  const newResolverImpl = await upgrades.erc1967.getImplementationAddress(c.resolver);
  console.log("   ✓ resolver upgraded:", c.resolver);
  console.log("   ✓ new impl:", newResolverImpl);

  // ── 4. Ensure CONTROLLER_ROLE is granted to both controllers ──────────────
  console.log("\n🔧 Ensuring CONTROLLER_ROLE on resolver...");
  const resolverContract = await ethers.getContractAt("ArcNSResolverV2", c.resolver);
  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

  const arcHasRole = await resolverContract.hasRole(CONTROLLER_ROLE, c.arcController);
  if (!arcHasRole) {
    await (await resolverContract.grantRole(CONTROLLER_ROLE, c.arcController)).wait();
    console.log("   ✓ CONTROLLER_ROLE granted to arcController");
  } else {
    console.log("   ✓ arcController already has CONTROLLER_ROLE");
  }

  const circleHasRole = await resolverContract.hasRole(CONTROLLER_ROLE, c.circleController);
  if (!circleHasRole) {
    await (await resolverContract.grantRole(CONTROLLER_ROLE, c.circleController)).wait();
    console.log("   ✓ CONTROLLER_ROLE granted to circleController");
  } else {
    console.log("   ✓ circleController already has CONTROLLER_ROLE");
  }

  // ── 5. Update oracle prices to $50/$25/$15/$10/$2 ─────────────────────────
  console.log("\n🔧 Updating price oracle...");
  const oracle = await ethers.getContractAt("ArcNSPriceOracle", c.priceOracle);

  // New prices (USDC, 6 decimals)
  const p1 = 50_000_000n;  // $50/yr  — 1 char
  const p2 = 25_000_000n;  // $25/yr  — 2 chars
  const p3 = 15_000_000n;  // $15/yr  — 3 chars
  const p4 = 10_000_000n;  // $10/yr  — 4 chars
  const p5 =  2_000_000n;  //  $2/yr  — 5+ chars

  const current1 = await oracle.price1Char();
  console.log(`   Current 1-char price: $${Number(current1) / 1e6}`);

  await (await oracle.setPrices(p1, p2, p3, p4, p5)).wait();
  console.log(`   ✓ Prices updated: $50 / $25 / $15 / $10 / $2`);

  // Verify
  const v1 = await oracle.price1Char();
  const v2 = await oracle.price2Char();
  const v5 = await oracle.price5Plus();
  console.log(`   ✓ Verified: 1-char=$${Number(v1)/1e6}, 2-char=$${Number(v2)/1e6}, 5+=$${Number(v5)/1e6}`);

  // ── 6. Verify MIN_NAME_LENGTH on upgraded controller ──────────────────────
  console.log("\n🔍 Verifying upgrade...");
  const arcCtrl = await ethers.getContractAt("ArcNSRegistrarControllerV2", c.arcController);

  const minLen = await arcCtrl.MIN_NAME_LENGTH();
  console.log(`   MIN_NAME_LENGTH: ${minLen}`);
  if (minLen !== 1n) throw new Error(`❌ MIN_NAME_LENGTH is ${minLen}, expected 1`);

  const availA = await arcCtrl.available("a");
  console.log(`   available("a"): ${availA}`);

  const availAA = await arcCtrl.available("aa");
  console.log(`   available("aa"): ${availAA}`);

  const priceA = await arcCtrl.rentPrice("a", BigInt(365 * 24 * 60 * 60));
  console.log(`   rentPrice("a", 1yr): $${Number(priceA.base) / 1e6}`);

  const priceAA = await arcCtrl.rentPrice("aa", BigInt(365 * 24 * 60 * 60));
  console.log(`   rentPrice("aa", 1yr): $${Number(priceAA.base) / 1e6}`);

  // ── 7. Update deployment file ──────────────────────────────────────────────
  dep.contracts.resolverImpl = newResolverImpl;
  dep.upgradedAt = new Date().toISOString();
  dep.upgrades = dep.upgrades || [];
  dep.upgrades.push({
    at: new Date().toISOString(),
    changes: [
      "ArcNSRegistrarControllerV2: MIN_NAME_LENGTH=1, setAddr on registration",
      "ArcNSResolverV2: upgraded implementation",
      "ArcNSPriceOracle: prices updated to $50/$25/$15/$10/$2",
    ],
  });
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));

  console.log("\n✅ Upgrade complete!");
}

main().catch(e => { console.error(e); process.exit(1); });
