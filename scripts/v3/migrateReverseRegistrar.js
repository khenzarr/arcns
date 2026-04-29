/**
 * ArcNS v3 — Reverse Registrar Migration Script
 *
 * Executes the full clean migration plan for the Tier-1 security fix:
 *
 *   Step 1:  Deploy new ArcNSReverseRegistrar (NEW_RR) — has claimWithResolver fix
 *   Step 2:  Deploy new ArcNSController implementation (NEW_IMPL) — has initialize
 *            zero-address fix + new setReverseRegistrar function
 *   Step 3:  Upgrade ArcNSController proxy 1 (.arc) to NEW_IMPL
 *   Step 4:  Upgrade ArcNSController proxy 2 (.circle) to NEW_IMPL
 *   Step 5:  Call setReverseRegistrar(NEW_RR) on proxy 1
 *   Step 6:  Call setReverseRegistrar(NEW_RR) on proxy 2
 *   Step 7:  Transfer addr.reverse node ownership in Registry to NEW_RR
 *   Step 8:  Grant CONTROLLER_ROLE on Resolver to NEW_RR
 *   Step 9:  Revoke CONTROLLER_ROLE on Resolver from OLD_RR
 *   Step 10: Validate — reverseRegistrar() on both proxies must return NEW_RR
 *   Step 11: Validate — register a test name with reverseRecord=true on proxy 1,
 *            verify reverse record is written on NEW_RR (manual — requires USDC)
 *
 * Steps 7–9 are the critical registry/role rewiring steps that complete the
 * clean migration. Each step is idempotent: if already applied on-chain it
 * will be detected and skipped with a log message.
 *
 * Usage:
 *   npx hardhat run scripts/v3/migrateReverseRegistrar.js --network arc_testnet
 *
 * Environment variables:
 *   PRIVATE_KEY       — deployer private key (from .env)
 *   ARC_RPC_URL       — RPC endpoint
 *
 * Prerequisites:
 *   - deployments/arc_testnet-v3.json must exist (from deployV3.js)
 *   - Deployer must hold ADMIN_ROLE and UPGRADER_ROLE on both controller proxies
 */

"use strict";

const { ethers, upgrades, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// EIP-1967 implementation slot
// keccak256("eip1967.proxy.implementation") - 1
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function getImplementationAddress(provider, proxyAddress) {
  const raw = await provider.getStorage(proxyAddress, IMPL_SLOT);
  return ethers.getAddress("0x" + raw.slice(-40));
}

async function upgradeAndVerify(factory, proxyAddress, label) {
  const implBefore = await getImplementationAddress(ethers.provider, proxyAddress);
  console.log(`   impl before: ${implBefore}`);

  const upgraded = await upgrades.upgradeProxy(proxyAddress, factory, {
    kind: "uups",
    unsafeAllow: ["constructor"],
  });
  await upgraded.waitForDeployment();

  const implAfter = await getImplementationAddress(ethers.provider, proxyAddress);
  console.log(`   impl after : ${implAfter}`);

  if (implAfter.toLowerCase() === implBefore.toLowerCase()) {
    console.warn(`   ⚠ ${label}: implementation slot unchanged — proxy may already be current`);
  } else {
    console.log(`   ✓ ${label}: implementation slot updated`);
  }

  const code = await ethers.provider.getCode(implAfter);
  if (!code || code === "0x") {
    throw new Error(`STALE PROXY — ${label} implementation ${implAfter} has no bytecode after upgrade`);
  }

  return { upgraded, implAfter };
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Reverse Registrar Migration             ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer : ${deployer.address}\n`);

  // ── Load deployment ────────────────────────────────────────────────────────
  const depPath = path.join(__dirname, `../../deployments/${network.name}-v3.json`);
  if (!fs.existsSync(depPath)) {
    throw new Error(`Deployment file not found: ${depPath}\nRun deployV3.js first.`);
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  console.log("📋 Loaded deployment:");
  console.log(`   arcController    : ${c.arcController}`);
  console.log(`   circleController : ${c.circleController}`);
  console.log(`   reverseRegistrar : ${c.reverseRegistrar} (OLD)`);
  console.log(`   resolver         : ${c.resolver}`);

  // ── Step 1: Deploy NEW ArcNSReverseRegistrar ───────────────────────────────
  console.log("\n── Step 1: Deploy new ArcNSReverseRegistrar (NEW_RR) ──");
  const ReverseRegistrar = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"
  );
  const newRR = await ReverseRegistrar.deploy(c.registry, c.resolver);
  await newRR.waitForDeployment();
  const newRRAddress = await newRR.getAddress();
  console.log(`   ✓ NEW_RR deployed: ${newRRAddress}`);

  // ── Step 2: Deploy NEW ArcNSController implementation ─────────────────────
  console.log("\n── Step 2: Deploy new ArcNSController implementation (NEW_IMPL) ──");
  const ControllerFactory = await ethers.getContractFactory(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController"
  );
  // The implementation is deployed as part of upgradeProxy — we capture it after upgrade.
  // No standalone deploy needed; upgrades.upgradeProxy handles it.
  console.log("   (Implementation will be deployed during proxy upgrade in steps 3–4)");

  // ── Step 3: Upgrade .arc controller proxy ─────────────────────────────────
  console.log("\n── Step 3: Upgrade .arc controller proxy to NEW_IMPL ──");
  const { implAfter: arcImplAfter } = await upgradeAndVerify(
    ControllerFactory, c.arcController, "arcController"
  );
  console.log(`   ✓ arcController upgraded: ${c.arcController}`);

  // ── Step 4: Upgrade .circle controller proxy ──────────────────────────────
  console.log("\n── Step 4: Upgrade .circle controller proxy to NEW_IMPL ──");
  const { implAfter: circleImplAfter } = await upgradeAndVerify(
    ControllerFactory, c.circleController, "circleController"
  );
  console.log(`   ✓ circleController upgraded: ${c.circleController}`);

  // ── Step 5: setReverseRegistrar on .arc proxy ──────────────────────────────
  console.log("\n── Step 5: setReverseRegistrar(NEW_RR) on .arc proxy ──");
  const arcController = await ethers.getContractAt(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController",
    c.arcController
  );
  const arcOldRR = await arcController.reverseRegistrar();
  console.log(`   old reverseRegistrar: ${arcOldRR}`);

  const tx5 = await arcController.setReverseRegistrar(newRRAddress);
  const receipt5 = await tx5.wait();
  console.log(`   ✓ setReverseRegistrar tx: ${receipt5.hash}`);

  // ── Step 6: setReverseRegistrar on .circle proxy ───────────────────────────
  console.log("\n── Step 6: setReverseRegistrar(NEW_RR) on .circle proxy ──");
  const circleController = await ethers.getContractAt(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController",
    c.circleController
  );
  const circleOldRR = await circleController.reverseRegistrar();
  console.log(`   old reverseRegistrar: ${circleOldRR}`);

  const tx6 = await circleController.setReverseRegistrar(newRRAddress);
  const receipt6 = await tx6.wait();
  console.log(`   ✓ setReverseRegistrar tx: ${receipt6.hash}`);

  // ── Step 7: Transfer addr.reverse node ownership to NEW_RR ───────────────
  console.log("\n── Step 7: Transfer addr.reverse node ownership to NEW_RR ──");
  const ADDR_REVERSE_NODE = dep.namehashes.addrReverse;
  const registry = await ethers.getContractAt(
    "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry",
    c.registry
  );

  const currentOwner = await registry.owner(ADDR_REVERSE_NODE);
  console.log(`   current addr.reverse owner: ${currentOwner}`);

  if (currentOwner.toLowerCase() === newRRAddress.toLowerCase()) {
    console.log("   ✓ addr.reverse node already owned by NEW_RR — skipping");
  } else {
    const tx7 = await registry.setOwner(ADDR_REVERSE_NODE, newRRAddress);
    const receipt7 = await tx7.wait();
    console.log(`   ✓ setOwner tx: ${receipt7.hash}`);
    const newOwner = await registry.owner(ADDR_REVERSE_NODE);
    if (newOwner.toLowerCase() !== newRRAddress.toLowerCase()) {
      throw new Error(`VALIDATION FAILED: addr.reverse owner = ${newOwner}, expected ${newRRAddress}`);
    }
    console.log(`   ✓ addr.reverse node owner confirmed: ${newOwner}`);
  }

  // ── Step 8: Grant CONTROLLER_ROLE on Resolver to NEW_RR ───────────────────
  console.log("\n── Step 8: Grant CONTROLLER_ROLE on Resolver to NEW_RR ──");
  const resolver = await ethers.getContractAt(
    "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver",
    c.resolver
  );
  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

  const alreadyGranted = await resolver.hasRole(CONTROLLER_ROLE, newRRAddress);
  if (alreadyGranted) {
    console.log("   ✓ CONTROLLER_ROLE already granted to NEW_RR — skipping");
  } else {
    const tx8 = await resolver.grantRole(CONTROLLER_ROLE, newRRAddress);
    const receipt8 = await tx8.wait();
    console.log(`   ✓ grantRole tx: ${receipt8.hash}`);
    const confirmed = await resolver.hasRole(CONTROLLER_ROLE, newRRAddress);
    if (!confirmed) {
      throw new Error(`VALIDATION FAILED: CONTROLLER_ROLE not held by NEW_RR after grant`);
    }
    console.log(`   ✓ CONTROLLER_ROLE confirmed on NEW_RR`);
  }

  // ── Step 9: Revoke CONTROLLER_ROLE on Resolver from OLD_RR ────────────────
  console.log("\n── Step 9: Revoke CONTROLLER_ROLE on Resolver from OLD_RR ──");
  const oldRRAddress = c.oldReverseRegistrar || c.reverseRegistrar;
  console.log(`   OLD_RR: ${oldRRAddress}`);

  const oldHasRole = await resolver.hasRole(CONTROLLER_ROLE, oldRRAddress);
  if (!oldHasRole) {
    console.log("   ✓ CONTROLLER_ROLE already absent from OLD_RR — skipping");
  } else {
    const tx9 = await resolver.revokeRole(CONTROLLER_ROLE, oldRRAddress);
    const receipt9 = await tx9.wait();
    console.log(`   ✓ revokeRole tx: ${receipt9.hash}`);
    const stillHasRole = await resolver.hasRole(CONTROLLER_ROLE, oldRRAddress);
    if (stillHasRole) {
      throw new Error(`VALIDATION FAILED: CONTROLLER_ROLE still held by OLD_RR after revoke`);
    }
    console.log(`   ✓ CONTROLLER_ROLE confirmed revoked from OLD_RR`);
  }

  // ── Step 10: Validate — reverseRegistrar() on both proxies ────────────────
  console.log("\n── Step 10: Validate reverseRegistrar() on both proxies ──");
  const arcRR    = await arcController.reverseRegistrar();
  const circleRR = await circleController.reverseRegistrar();

  if (arcRR.toLowerCase() !== newRRAddress.toLowerCase()) {
    throw new Error(`VALIDATION FAILED: arcController.reverseRegistrar() = ${arcRR}, expected ${newRRAddress}`);
  }
  if (circleRR.toLowerCase() !== newRRAddress.toLowerCase()) {
    throw new Error(`VALIDATION FAILED: circleController.reverseRegistrar() = ${circleRR}, expected ${newRRAddress}`);
  }
  console.log(`   ✓ arcController.reverseRegistrar()    = ${arcRR}`);
  console.log(`   ✓ circleController.reverseRegistrar() = ${circleRR}`);
  console.log("   ✓ Both proxies point to NEW_RR");

  // ── Step 11: Validate — register test name with reverseRecord=true ─────────
  console.log("\n── Step 11: Validate reverse record written on NEW_RR ──");
  console.log("   (Skipping live registration on testnet — requires USDC balance and commitment wait)");
  console.log("   To validate manually:");
  console.log(`     1. Call arcController.makeCommitment("migrationtest", <owner>, <duration>, <secret>, <resolver>, true, <sender>)`);
  console.log(`     2. Wait ${60}s after commit()`);
  console.log(`     3. Call arcController.register("migrationtest", ...)`);
  console.log(`     4. Call resolver.name(reverseNode(<owner>)) — must return "migrationtest.arc"`);

  // ── Update deployment file ─────────────────────────────────────────────────
  const prevRRAddress = c.reverseRegistrar;
  c.reverseRegistrar         = newRRAddress;
  c.oldReverseRegistrar      = prevRRAddress;
  c.arcControllerImpl        = arcImplAfter;
  c.circleControllerImpl     = circleImplAfter;

  dep.upgrades = dep.upgrades || [];
  dep.upgrades.push({
    at: new Date().toISOString(),
    type: "reverse-registrar-migration",
    changes: [
      `ArcNSReverseRegistrar: redeployed at ${newRRAddress} (claimWithResolver fix)`,
      `ArcNSController: upgraded to new impl with setReverseRegistrar function`,
      `addr.reverse node: ${prevRRAddress} → ${newRRAddress}`,
      `Resolver CONTROLLER_ROLE granted to: ${newRRAddress}`,
      `Resolver CONTROLLER_ROLE revoked from: ${prevRRAddress}`,
      `arcController.reverseRegistrar: ${prevRRAddress} → ${newRRAddress}`,
      `circleController.reverseRegistrar: ${prevRRAddress} → ${newRRAddress}`,
    ],
  });

  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  console.log(`\n📄 Updated deployment file: deployments/${network.name}-v3.json`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n✅ Migration complete!");
  console.log("─".repeat(60));
  console.log(`   OLD_RR                  : ${prevRRAddress}`);
  console.log(`   NEW_RR                  : ${newRRAddress}`);
  console.log(`   arcController impl      : ${arcImplAfter}`);
  console.log(`   circleController impl   : ${circleImplAfter}`);
  console.log("─".repeat(60));
  console.log("\n📋 Remaining manual step:");
  console.log("   [ ] Run Step 11 live registration validation on testnet");
  console.log("   [ ] Verify NEW_RR on ArcScan");
}

main().catch(e => { console.error("\n❌ Fatal:", e.message); process.exit(1); });
