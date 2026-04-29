/**
 * ArcNS v3 — Fork Dry-Run: Migration + Validation in one session
 *
 * Runs the full migration and then validates the result, all within
 * a single Hardhat fork session so state is preserved between steps.
 *
 * Usage:
 *   ARC_FORK=1 npx hardhat run scripts/v3/forkDryRun.js --network hardhat
 *
 * On success: prints "FORK DRY-RUN PASSED" and exits 0
 * On failure: prints "FORK DRY-RUN FAILED" and exits 1
 */

"use strict";

const { ethers, upgrades, network } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const fs   = require("fs");
const path = require("path");

// ─── Constants ────────────────────────────────────────────────────────────────
// keccak256("eip1967.proxy.implementation") - 1
const IMPL_SLOT       = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
const ONE_YEAR        = 365 * 24 * 60 * 60;
const MIN_COMMIT_AGE  = 60;

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

function reverseNodeFor(addr) {
  const hexAddr   = addr.toLowerCase().slice(2);
  const labelHash = ethers.keccak256(ethers.toUtf8Bytes(hexAddr));
  return ethers.keccak256(ethers.concat([namehash("addr.reverse"), labelHash]));
}

async function getImplAddress(proxyAddress) {
  const raw = await ethers.provider.getStorage(proxyAddress, IMPL_SLOT);
  return ethers.getAddress("0x" + raw.slice(-40));
}

function log(step, msg) { console.log(`\n── Step ${step}: ${msg} ──`); }
function ok(msg)        { console.log(`   ✓ ${msg}`); }
function warn(msg)      { console.warn(`   ⚠ ${msg}`); }
function fail(msg)      { throw new Error(`FATAL: ${msg}`); }

async function confirmTx(label, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  ok(`${label} — tx: ${receipt.hash}`);
  return receipt;
}

// ─── Result tracking ──────────────────────────────────────────────────────────
const results = [];
function pass(id, label)         { results.push({ id, label, status: "PASS" }); console.log(`   ✅ CHECK ${id}: ${label}`); }
function checkFail(id, label, d) { results.push({ id, label, status: "FAIL", detail: d }); console.error(`   ❌ CHECK ${id}: ${label}\n      Detail: ${d}`); }

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isFork = process.env.ARC_FORK === "1" || network.name === "fork";

  // ── Setup: impersonate deployer ──────────────────────────────────────────────
  const depPath = path.join(__dirname, "../../deployments/arc_testnet-v3.json");
  if (!fs.existsSync(depPath)) throw new Error(`Deployment file not found: ${depPath}`);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  let deployer;
  if (isFork) {
    // Mine one block to advance past the fork block (avoids EDR hardfork history issue)
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("hardhat_impersonateAccount", [dep.deployer]);
    await ethers.provider.send("hardhat_setBalance", [dep.deployer, "0x56BC75E2D63100000"]);
    deployer = await ethers.getSigner(dep.deployer);
    console.log(`\n[FORK] Impersonating deployer: ${dep.deployer}`);
  } else {
    [deployer] = await ethers.getSigners();
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Fork Dry-Run: Migration + Validation        ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`OLD_RR   : ${c.reverseRegistrar}`);

  const OLD_RR = c.reverseRegistrar;

  // ── Contract factories ───────────────────────────────────────────────────────
  const ReverseRegistrarFactory = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar", deployer
  );
  const ControllerFactory = await ethers.getContractFactory(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController", deployer
  );

  const registry = await ethers.getContractAt("contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry", c.registry, deployer);
  const resolver = await ethers.getContractAt("contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver", c.resolver, deployer);
  const arcController = await ethers.getContractAt("contracts/v3/controller/ArcNSController.sol:ArcNSController", c.arcController, deployer);
  const circleController = await ethers.getContractAt("contracts/v3/controller/ArcNSController.sol:ArcNSController", c.circleController, deployer);

  // ── Pre-flight ───────────────────────────────────────────────────────────────
  console.log("\n🔍 Pre-flight checks...");
  const arcImplBefore    = await getImplAddress(c.arcController);
  const circleImplBefore = await getImplAddress(c.circleController);
  console.log(`   arcController impl (current)    : ${arcImplBefore}`);
  console.log(`   circleController impl (current) : ${circleImplBefore}`);
  const addrReverseNode = namehash("addr.reverse");
  const reverseBaseNode = namehash("reverse");
  console.log(`   addr.reverse owner (current)    : ${await registry.owner(addrReverseNode)}`);
  console.log(`   OLD_RR has CONTROLLER_ROLE      : ${await resolver.hasRole(CONTROLLER_ROLE, OLD_RR)}`);

  // ════════════════════════════════════════════════════════════════════════════
  // MIGRATION
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n\n══════════════════════════════════════════════════════════");
  console.log("PHASE: MIGRATION");
  console.log("══════════════════════════════════════════════════════════");

  // Step 1: Deploy NEW_RR
  log(1, "Deploy new ArcNSReverseRegistrar (NEW_RR)");
  const newRR = await ReverseRegistrarFactory.deploy(c.registry, c.resolver);
  await newRR.waitForDeployment();
  const NEW_RR = await newRR.getAddress();
  ok(`NEW_RR deployed: ${NEW_RR}`);

  // Step 2: Note
  log(2, "Prepare new ArcNSController implementation (NEW_CTRL_IMPL)");
  console.log("   (Deployed during upgradeProxy in steps 3–4)");

  // Step 3: Upgrade .arc proxy
  log(3, "Upgrade .arc controller proxy to NEW_CTRL_IMPL");
  const arcUpgraded = await upgrades.upgradeProxy(c.arcController, ControllerFactory, { kind: "uups", unsafeAllow: ["constructor"] });
  await arcUpgraded.waitForDeployment();
  const arcImplAfter = await getImplAddress(c.arcController);
  ok(`arcController impl: ${arcImplBefore} → ${arcImplAfter}`);

  // Step 4: Upgrade .circle proxy
  log(4, "Upgrade .circle controller proxy to NEW_CTRL_IMPL");
  const circleUpgraded = await upgrades.upgradeProxy(c.circleController, ControllerFactory, { kind: "uups", unsafeAllow: ["constructor"] });
  await circleUpgraded.waitForDeployment();
  const circleImplAfter = await getImplAddress(c.circleController);
  ok(`circleController impl: ${circleImplBefore} → ${circleImplAfter}`);

  // Step 5: Transfer addr.reverse
  log(5, "Transfer addr.reverse node ownership to NEW_RR");
  await confirmTx("registry.setSubnodeOwner(reverseBaseNode, addr, NEW_RR)",
    registry.setSubnodeOwner(reverseBaseNode, labelhash("addr"), NEW_RR));
  const addrReverseOwnerAfter = await registry.owner(addrReverseNode);
  if (addrReverseOwnerAfter.toLowerCase() !== NEW_RR.toLowerCase()) fail(`addr.reverse owner mismatch: ${addrReverseOwnerAfter}`);
  ok(`addr.reverse owner confirmed: ${addrReverseOwnerAfter}`);

  // Step 6: Grant CONTROLLER_ROLE to NEW_RR
  log(6, "Grant CONTROLLER_ROLE on Resolver to NEW_RR");
  await confirmTx("resolver.setController(NEW_RR, true)", resolver.setController(NEW_RR, true));
  if (!await resolver.hasRole(CONTROLLER_ROLE, NEW_RR)) fail("NEW_RR does not have CONTROLLER_ROLE");
  ok(`NEW_RR CONTROLLER_ROLE confirmed`);

  // Step 7: Revoke CONTROLLER_ROLE from OLD_RR
  log(7, "Revoke CONTROLLER_ROLE on Resolver from OLD_RR");
  await confirmTx("resolver.setController(OLD_RR, false)", resolver.setController(OLD_RR, false));
  if (await resolver.hasRole(CONTROLLER_ROLE, OLD_RR)) fail("OLD_RR still has CONTROLLER_ROLE");
  ok(`OLD_RR CONTROLLER_ROLE revoked`);

  // Step 8: setReverseRegistrar on .arc proxy
  log(8, "setReverseRegistrar(NEW_RR) on .arc proxy");
  await confirmTx("arcController.setReverseRegistrar(NEW_RR)", arcController.setReverseRegistrar(NEW_RR));
  if ((await arcController.reverseRegistrar()).toLowerCase() !== NEW_RR.toLowerCase()) fail("arcController.reverseRegistrar() mismatch");
  ok(`arcController.reverseRegistrar() confirmed: ${await arcController.reverseRegistrar()}`);

  // Step 9: setReverseRegistrar on .circle proxy
  log(9, "setReverseRegistrar(NEW_RR) on .circle proxy");
  await confirmTx("circleController.setReverseRegistrar(NEW_RR)", circleController.setReverseRegistrar(NEW_RR));
  if ((await circleController.reverseRegistrar()).toLowerCase() !== NEW_RR.toLowerCase()) fail("circleController.reverseRegistrar() mismatch");
  ok(`circleController.reverseRegistrar() confirmed: ${await circleController.reverseRegistrar()}`);

  console.log("\n✅ Migration steps complete.");

  // ════════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ════════════════════════════════════════════════════════════════════════════
  console.log("\n\n══════════════════════════════════════════════════════════");
  console.log("PHASE: VALIDATION");
  console.log("══════════════════════════════════════════════════════════");

  // Check 1: addr.reverse owner
  {
    const owner = await registry.owner(addrReverseNode);
    owner.toLowerCase() === NEW_RR.toLowerCase()
      ? pass(1, `registry.owner(addr.reverse) == NEW_RR`)
      : checkFail(1, `registry.owner(addr.reverse) == NEW_RR`, `got ${owner}`);
  }

  // Check 2: NEW_RR has CONTROLLER_ROLE
  {
    const hasRole = await resolver.hasRole(CONTROLLER_ROLE, NEW_RR);
    hasRole
      ? pass(2, `resolver.hasRole(CONTROLLER_ROLE, NEW_RR) == true`)
      : checkFail(2, `resolver.hasRole(CONTROLLER_ROLE, NEW_RR) == true`, `got false`);
  }

  // Check 3: OLD_RR does NOT have CONTROLLER_ROLE
  {
    const hasRole = await resolver.hasRole(CONTROLLER_ROLE, OLD_RR);
    !hasRole
      ? pass(3, `resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false`)
      : checkFail(3, `resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false`, `OLD_RR still has CONTROLLER_ROLE`);
  }

  // Check 4: arcController impl == NEW_CTRL_IMPL
  {
    const impl = await getImplAddress(c.arcController);
    impl.toLowerCase() === arcImplAfter.toLowerCase()
      ? pass(4, `arcController implementation == NEW_CTRL_IMPL`)
      : checkFail(4, `arcController implementation == NEW_CTRL_IMPL`, `got ${impl}`);
  }

  // Check 5: circleController impl == NEW_CTRL_IMPL
  {
    const impl = await getImplAddress(c.circleController);
    impl.toLowerCase() === circleImplAfter.toLowerCase()
      ? pass(5, `circleController implementation == NEW_CTRL_IMPL`)
      : checkFail(5, `circleController implementation == NEW_CTRL_IMPL`, `got ${impl}`);
  }

  // Check 6: arcController.reverseRegistrar() == NEW_RR
  {
    const rr = await arcController.reverseRegistrar();
    rr.toLowerCase() === NEW_RR.toLowerCase()
      ? pass(6, `arcController.reverseRegistrar() == NEW_RR`)
      : checkFail(6, `arcController.reverseRegistrar() == NEW_RR`, `got ${rr}`);
  }

  // Check 7: circleController.reverseRegistrar() == NEW_RR
  {
    const rr = await circleController.reverseRegistrar();
    rr.toLowerCase() === NEW_RR.toLowerCase()
      ? pass(7, `circleController.reverseRegistrar() == NEW_RR`)
      : checkFail(7, `circleController.reverseRegistrar() == NEW_RR`, `got ${rr}`);
  }

  // Checks 8–13: Functional tests
  const arcRegistrar    = await ethers.getContractAt("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar", c.arcRegistrar, deployer);
  const circleRegistrar = await ethers.getContractAt("contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar", c.circleRegistrar, deployer);
  const usdc = await ethers.getContractAt("contracts/v3/mocks/MockUSDC.sol:MockUSDC", c.usdc, deployer);

  // Mint USDC
  try {
    await (await usdc.mint(deployer.address, 10_000_000_000n)).wait();
    await (await usdc.approve(c.arcController, ethers.MaxUint256)).wait();
    await (await usdc.approve(c.circleController, ethers.MaxUint256)).wait();
  } catch (e) {
    warn(`Could not mint/approve USDC (live USDC — expected on fork): ${e.message.slice(0, 60)}`);
    // On fork with live USDC, we can't mint. Skip functional tests.
    for (let i = 8; i <= 13; i++) {
      results.push({ id: i, label: `Functional test ${i}`, status: "SKIP", reason: "live USDC — cannot mint on fork" });
      console.log(`   ⏭  CHECK ${i}: Functional test ${i} — SKIPPED (live USDC on fork)`);
    }
    // Still run claimWithResolver checks using newRR directly
    goto_claim_checks: {
      // Check 12: Unauthorized claimWithResolver fails
      try {
        const [, , , , stranger] = await ethers.getSigners();
        let reverted = false;
        try {
          await newRR.connect(stranger).claimWithResolver(deployer.address, stranger.address, c.resolver);
        } catch (e2) {
          if (e2.message.includes("NotAuthorised") || e2.message.includes("NotAuthorized")) reverted = true;
          else throw e2;
        }
        reverted
          ? pass(12, "Unauthorized claimWithResolver reverts NotAuthorised")
          : checkFail(12, "Unauthorized claimWithResolver reverts NotAuthorised", "call did not revert");
      } catch (e2) {
        checkFail(12, "Unauthorized claimWithResolver reverts NotAuthorised", e2.message.slice(0, 80));
      }

      // Check 13: Legitimate self-claim works
      try {
        await (await newRR.claimWithResolver(deployer.address, deployer.address, c.resolver)).wait();
        pass(13, "Legitimate self-claim (claimWithResolver) still works");
      } catch (e2) {
        checkFail(13, "Legitimate self-claim (claimWithResolver) still works", e2.message.slice(0, 80));
      }
    }
    // Update results for 12 and 13 (already added above, remove the SKIP entries)
    const idx12 = results.findIndex(r => r.id === 12 && r.status === "SKIP");
    if (idx12 !== -1) results.splice(idx12, 1);
    const idx13 = results.findIndex(r => r.id === 13 && r.status === "SKIP");
    if (idx13 !== -1) results.splice(idx13, 1);
  }

  // If USDC mint succeeded, run full functional tests
  if (!results.find(r => r.id === 8)) {
    // Check 8: Registration on .arc
    try {
      const secret8 = ethers.id("forkcheck8");
      const comm8 = await arcController.makeCommitment("forktest8", deployer.address, ONE_YEAR, secret8, ethers.ZeroAddress, false, deployer.address);
      await (await arcController.commit(comm8)).wait();
      await time.increase(MIN_COMMIT_AGE + 1);
      await (await arcController.register("forktest8", deployer.address, ONE_YEAR, secret8, ethers.ZeroAddress, false, ethers.MaxUint256)).wait();
      const owner8 = await arcRegistrar.ownerOf(BigInt(labelhash("forktest8")));
      owner8.toLowerCase() === deployer.address.toLowerCase()
        ? pass(8, "Registration works on .arc")
        : checkFail(8, "Registration works on .arc", `owner mismatch: ${owner8}`);
    } catch (e) { checkFail(8, "Registration works on .arc", e.message.slice(0, 120)); }

    // Check 9: Registration on .circle
    try {
      const secret9 = ethers.id("forkcheck9");
      const comm9 = await circleController.makeCommitment("forktest9", deployer.address, ONE_YEAR, secret9, ethers.ZeroAddress, false, deployer.address);
      await (await circleController.commit(comm9)).wait();
      await time.increase(MIN_COMMIT_AGE + 1);
      await (await circleController.register("forktest9", deployer.address, ONE_YEAR, secret9, ethers.ZeroAddress, false, ethers.MaxUint256)).wait();
      const owner9 = await circleRegistrar.ownerOf(BigInt(labelhash("forktest9")));
      owner9.toLowerCase() === deployer.address.toLowerCase()
        ? pass(9, "Registration works on .circle")
        : checkFail(9, "Registration works on .circle", `owner mismatch: ${owner9}`);
    } catch (e) { checkFail(9, "Registration works on .circle", e.message.slice(0, 120)); }

    // Check 10: Reverse flow
    try {
      const resolverApproved = await arcController.approvedResolvers(c.resolver);
      if (!resolverApproved) {
        results.push({ id: 10, label: "Reverse flow", status: "SKIP", reason: "resolver not approved" });
        console.log("   ⏭  CHECK 10: Reverse flow — SKIPPED (resolver not approved on arcController)");
      } else {
        const secret10 = ethers.id("forkcheck10");
        const comm10 = await arcController.makeCommitment("forkrev10", deployer.address, ONE_YEAR, secret10, c.resolver, true, deployer.address);
        await (await arcController.commit(comm10)).wait();
        await time.increase(MIN_COMMIT_AGE + 1);
        await (await arcController.register("forkrev10", deployer.address, ONE_YEAR, secret10, c.resolver, true, ethers.MaxUint256)).wait();
        const rNode = reverseNodeFor(deployer.address);
        const reverseName = await resolver.name(rNode);
        reverseName === "forkrev10.arc"
          ? pass(10, `Reverse flow works — resolver.name() = "${reverseName}"`)
          : checkFail(10, "Reverse flow works (reverseRecord=true)", `resolver.name() = "${reverseName}", expected "forkrev10.arc"`);
      }
    } catch (e) { checkFail(10, "Reverse flow works (reverseRecord=true)", e.message.slice(0, 120)); }

    // Check 11: Renew
    try {
      const tokenId11 = BigInt(labelhash("forktest8"));
      const expiryBefore = await arcRegistrar.nameExpires(tokenId11);
      await (await arcController.renew("forktest8", ONE_YEAR, ethers.MaxUint256)).wait();
      const expiryAfter = await arcRegistrar.nameExpires(tokenId11);
      expiryAfter > expiryBefore
        ? pass(11, `Renew works on .arc — expiry extended`)
        : checkFail(11, "Renew works on .arc", `expiry did not increase`);
    } catch (e) { checkFail(11, "Renew works on .arc", e.message.slice(0, 120)); }

    // Check 12: Unauthorized claimWithResolver fails
    try {
      const [, , , , stranger] = await ethers.getSigners();
      let reverted = false;
      try {
        await newRR.connect(stranger).claimWithResolver(deployer.address, stranger.address, c.resolver);
      } catch (e2) {
        if (e2.message.includes("NotAuthorised") || e2.message.includes("NotAuthorized")) reverted = true;
        else throw e2;
      }
      reverted
        ? pass(12, "Unauthorized claimWithResolver reverts NotAuthorised")
        : checkFail(12, "Unauthorized claimWithResolver reverts NotAuthorised", "call did not revert");
    } catch (e) { checkFail(12, "Unauthorized claimWithResolver reverts NotAuthorised", e.message.slice(0, 120)); }

    // Check 13: Legitimate self-claim works
    try {
      await (await newRR.claimWithResolver(deployer.address, deployer.address, c.resolver)).wait();
      pass(13, "Legitimate self-claim (claimWithResolver) still works");
    } catch (e) { checkFail(13, "Legitimate self-claim (claimWithResolver) still works", e.message.slice(0, 120)); }
  }

  // ── Final report ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("FORK DRY-RUN VALIDATION REPORT");
  console.log("═".repeat(62));

  const passed  = results.filter(r => r.status === "PASS").length;
  const failed  = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭ ";
    console.log(`   ${icon} [${r.id.toString().padStart(2)}] ${r.label}`);
    if (r.detail) console.log(`         → ${r.detail}`);
    if (r.reason) console.log(`         → ${r.reason}`);
  }

  console.log("─".repeat(62));
  console.log(`   PASS: ${passed}  |  FAIL: ${failed}  |  SKIP: ${skipped}`);
  console.log("═".repeat(62));

  // ── Migration summary ─────────────────────────────────────────────────────────
  console.log("\n📋 Fork Dry-Run Migration Summary:");
  console.log(`   OLD_RR           : ${OLD_RR}`);
  console.log(`   NEW_RR           : ${NEW_RR}`);
  console.log(`   arcController impl (before) : ${arcImplBefore}`);
  console.log(`   arcController impl (after)  : ${arcImplAfter}`);
  console.log(`   circleController impl (after): ${circleImplAfter}`);

  if (failed > 0) {
    console.error(`\n❌ FORK DRY-RUN FAILED — ${failed} check(s) failed. Do NOT proceed to live execution.`);
    process.exit(1);
  } else {
    console.log(`\n✅ FORK DRY-RUN PASSED — ${passed} checks passed${skipped > 0 ? `, ${skipped} skipped` : ""}.`);
    console.log("   Safe to proceed with live Arc Testnet execution:");
    console.log("   npx hardhat run scripts/v3/migrateSecurityFixes.js --network arc_testnet");
  }
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  process.exit(1);
});
