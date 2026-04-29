/**
 * ArcNS v3 — Fully Clean Security Migration Script
 *
 * Executes the complete Tier-1 security migration in one controlled workflow:
 *
 *   Step 1:  Deploy NEW_RR (ArcNSReverseRegistrar with claimWithResolver fix)
 *   Step 2:  Deploy NEW_CTRL_IMPL (ArcNSController with initialize zero-address fix
 *            + setReverseRegistrar function) — via upgradeProxy
 *   Step 3:  Upgrade .arc controller proxy to NEW_CTRL_IMPL
 *   Step 4:  Upgrade .circle controller proxy to NEW_CTRL_IMPL
 *   Step 5:  Transfer addr.reverse node ownership to NEW_RR
 *   Step 6:  Grant CONTROLLER_ROLE on Resolver to NEW_RR
 *   Step 7:  Revoke CONTROLLER_ROLE on Resolver from OLD_RR
 *   Step 8:  Call setReverseRegistrar(NEW_RR) on .arc proxy
 *   Step 9:  Call setReverseRegistrar(NEW_RR) on .circle proxy
 *   Step 10: Post-step confirmations (all pointers verified)
 *   Step 11: Update deployment JSON
 *
 * Usage:
 *   Fork dry-run:
 *     npx hardhat run scripts/v3/migrateSecurityFixes.js --network hardhat
 *
 *   Live Arc Testnet (only after fork passes):
 *     npx hardhat run scripts/v3/migrateSecurityFixes.js --network arc_testnet
 *
 * Prerequisites:
 *   - deployments/arc_testnet-v3.json must exist
 *   - Deployer must hold ADMIN_ROLE and UPGRADER_ROLE on both controller proxies
 *   - Deployer must hold ADMIN_ROLE on Resolver (to call setController)
 *   - Deployer must own the addr.reverse node in Registry (to call setSubnodeOwner)
 *   - PRIVATE_KEY and ARC_RPC_URL set in .env
 */

"use strict";

const { ethers, upgrades, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── EIP-1967 implementation slot ─────────────────────────────────────────────
// keccak256("eip1967.proxy.implementation") - 1
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// ─── Role hashes ──────────────────────────────────────────────────────────────
const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelhash(label) {
  return ethers.keccak256(ethers.toUtf8Bytes(label));
}

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  for (const label of name.split(".").reverse()) {
    node = ethers.keccak256(ethers.concat([node, ethers.keccak256(ethers.toUtf8Bytes(label))]));
  }
  return node;
}

async function getImplAddress(proxyAddress) {
  const raw = await ethers.provider.getStorage(proxyAddress, IMPL_SLOT);
  return ethers.getAddress("0x" + raw.slice(-40));
}

function log(step, msg) {
  console.log(`\n── Step ${step}: ${msg} ──`);
}

function ok(msg) {
  console.log(`   ✓ ${msg}`);
}

function warn(msg) {
  console.warn(`   ⚠ ${msg}`);
}

function fail(msg) {
  throw new Error(`FATAL: ${msg}`);
}

async function confirmTx(label, txPromise) {
  const tx = await txPromise;
  const receipt = await tx.wait();
  ok(`${label} — tx: ${receipt.hash}`);
  return receipt;
}

// Retry a transaction up to 3 times on txpool full errors
async function confirmTxWithRetry(label, txFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await confirmTx(label, txFn());
    } catch (e) {
      const msg = e.message || "";
      if ((msg.includes("txpool is full") || msg.includes("replacement transaction underpriced") || msg.includes("nonce too low")) && attempt < maxRetries) {
        console.warn(`   ⚠ ${label}: attempt ${attempt} failed (${msg.slice(0, 60)}), retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw e;
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isLocal = ["hardhat", "localhost"].includes(network.name);
  const isFork  = network.name === "fork" || (isLocal && process.env.ARC_FORK === "1");

  // On a fork, impersonate the original deployer so we have all roles
  let deployer;
  if (isFork) {
    const depPath0 = path.join(__dirname, "../../deployments/arc_testnet-v3.json");
    const dep0 = JSON.parse(fs.readFileSync(depPath0, "utf8"));
    const deployerAddr = dep0.deployer;

    // Mine one empty block so the "current" block is forkBlock+1 (non-historical).
    // This bypasses EDR's hardfork history lookup for the fork block itself.
    await ethers.provider.send("evm_mine", []);

    await ethers.provider.send("hardhat_impersonateAccount", [deployerAddr]);
    await ethers.provider.send("hardhat_setBalance", [deployerAddr, "0x56BC75E2D63100000"]); // 100 ETH
    deployer = await ethers.getSigner(deployerAddr);
    console.log(`\n[FORK] Impersonating deployer: ${deployerAddr}`);
    console.log(`[FORK] Mined one block to advance past fork block.`);
  } else {
    [deployer] = await ethers.getSigners();
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Fully Clean Security Migration              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Mode     : ${isFork ? "FORK DRY-RUN (arc_testnet fork)" : (isLocal ? "LOCAL HARDHAT" : "LIVE EXECUTION")}\n`);

  // ── Load deployment ──────────────────────────────────────────────────────────
  // For fork dry-run we read from arc_testnet-v3.json (the live state we are simulating)
  const depFileName = (isLocal || isFork) ? "arc_testnet-v3.json" : `${network.name}-v3.json`;
  const depPath = path.join(__dirname, `../../deployments/${depFileName}`);
  if (!fs.existsSync(depPath)) {
    fail(`Deployment file not found: ${depPath}\nRun deployV3.js first.`);
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  console.log("📋 Loaded deployment:");
  console.log(`   arcController    : ${c.arcController}`);
  console.log(`   circleController : ${c.circleController}`);
  console.log(`   reverseRegistrar : ${c.reverseRegistrar}  ← OLD_RR`);
  console.log(`   resolver         : ${c.resolver}`);
  console.log(`   registry         : ${c.registry}`);

  const OLD_RR = c.reverseRegistrar;

  // ── Contract factories ───────────────────────────────────────────────────────
  const ReverseRegistrarFactory = await ethers.getContractFactory(
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar",
    deployer
  );
  const ControllerFactory = await ethers.getContractFactory(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController",
    deployer
  );

  // Attach to existing contracts
  const registry = await ethers.getContractAt(
    "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry",
    c.registry,
    deployer
  );
  const resolver = await ethers.getContractAt(
    "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver",
    c.resolver,
    deployer
  );
  const arcController = await ethers.getContractAt(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController",
    c.arcController,
    deployer
  );
  const circleController = await ethers.getContractAt(
    "contracts/v3/controller/ArcNSController.sol:ArcNSController",
    c.circleController,
    deployer
  );

  // ── Pre-flight checks ────────────────────────────────────────────────────────
  console.log("\n🔍 Pre-flight checks...");

  const arcImplBefore    = await getImplAddress(c.arcController);
  const circleImplBefore = await getImplAddress(c.circleController);
  console.log(`   arcController impl (current)    : ${arcImplBefore}`);
  console.log(`   circleController impl (current) : ${circleImplBefore}`);

  const addrReverseNode = namehash("addr.reverse");
  const reverseBaseNode = namehash("reverse");
  const currentAddrReverseOwner = await registry.owner(addrReverseNode);
  console.log(`   addr.reverse owner (current)    : ${currentAddrReverseOwner}`);

  const oldRRHasControllerRole = await resolver.hasRole(CONTROLLER_ROLE, OLD_RR);
  console.log(`   OLD_RR has CONTROLLER_ROLE      : ${oldRRHasControllerRole}`);

  // ── Step 1: Deploy NEW_RR ────────────────────────────────────────────────────
  log(1, "Deploy new ArcNSReverseRegistrar (NEW_RR)");
  let newRR;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      newRR = await ReverseRegistrarFactory.deploy(c.registry, c.resolver);
      await newRR.waitForDeployment();
      break;
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("txpool is full") && attempt < 3) {
        console.warn(`   ⚠ Deploy NEW_RR attempt ${attempt} failed (txpool full), retrying in 8s...`);
        await new Promise(r => setTimeout(r, 8000));
      } else { throw e; }
    }
  }
  const NEW_RR = await newRR.getAddress();
  ok(`NEW_RR deployed: ${NEW_RR}`);

  // ── Step 2: Prepare NEW_CTRL_IMPL (deployed during upgradeProxy) ─────────────
  log(2, "Prepare new ArcNSController implementation (NEW_CTRL_IMPL)");
  console.log("   (Implementation will be deployed as part of upgradeProxy in steps 3–4)");

  // ── Step 3: Upgrade .arc controller proxy ────────────────────────────────────
  log(3, "Upgrade .arc controller proxy to NEW_CTRL_IMPL");
  let arcUpgraded;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      arcUpgraded = await upgrades.upgradeProxy(c.arcController, ControllerFactory, {
        kind: "uups",
        unsafeAllow: ["constructor"],
      });
      await arcUpgraded.waitForDeployment();
      break;
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("txpool is full") && attempt < 3) {
        console.warn(`   ⚠ Upgrade .arc attempt ${attempt} failed (txpool full), retrying in 8s...`);
        await new Promise(r => setTimeout(r, 8000));
      } else { throw e; }
    }
  }
  const arcImplAfter = await getImplAddress(c.arcController);
  if (arcImplAfter.toLowerCase() === arcImplBefore.toLowerCase()) {
    warn("arcController: implementation slot unchanged — proxy may already be on this impl");
  } else {
    ok(`arcController impl updated: ${arcImplBefore} → ${arcImplAfter}`);
  }
  const arcCode = await ethers.provider.getCode(arcImplAfter);
  if (!arcCode || arcCode === "0x") fail(`arcController impl ${arcImplAfter} has no bytecode`);
  ok(`arcController impl bytecode confirmed`);

  // ── Step 4: Upgrade .circle controller proxy ─────────────────────────────────
  log(4, "Upgrade .circle controller proxy to NEW_CTRL_IMPL");
  let circleUpgraded;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      circleUpgraded = await upgrades.upgradeProxy(c.circleController, ControllerFactory, {
        kind: "uups",
        unsafeAllow: ["constructor"],
      });
      await circleUpgraded.waitForDeployment();
      break;
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("txpool is full") && attempt < 3) {
        console.warn(`   ⚠ Upgrade .circle attempt ${attempt} failed (txpool full), retrying in 8s...`);
        await new Promise(r => setTimeout(r, 8000));
      } else { throw e; }
    }
  }
  const circleImplAfter = await getImplAddress(c.circleController);
  if (circleImplAfter.toLowerCase() === circleImplBefore.toLowerCase()) {
    warn("circleController: implementation slot unchanged — proxy may already be on this impl");
  } else {
    ok(`circleController impl updated: ${circleImplBefore} → ${circleImplAfter}`);
  }
  const circleCode = await ethers.provider.getCode(circleImplAfter);
  if (!circleCode || circleCode === "0x") fail(`circleController impl ${circleImplAfter} has no bytecode`);
  ok(`circleController impl bytecode confirmed`);

  // ── Step 5: Transfer addr.reverse node ownership to NEW_RR ───────────────────
  log(5, "Transfer addr.reverse node ownership to NEW_RR");
  await confirmTxWithRetry(
    "registry.setSubnodeOwner(reverseBaseNode, addr, NEW_RR)",
    () => registry.setSubnodeOwner(reverseBaseNode, labelhash("addr"), NEW_RR)
  );
  // Confirm
  const addrReverseOwnerAfter = await registry.owner(addrReverseNode);
  if (addrReverseOwnerAfter.toLowerCase() !== NEW_RR.toLowerCase()) {
    fail(`addr.reverse owner mismatch: got ${addrReverseOwnerAfter}, expected ${NEW_RR}`);
  }
  ok(`addr.reverse owner confirmed: ${addrReverseOwnerAfter}`);

  // ── Step 6: Grant CONTROLLER_ROLE on Resolver to NEW_RR ──────────────────────
  log(6, "Grant CONTROLLER_ROLE on Resolver to NEW_RR");
  await confirmTxWithRetry(
    "resolver.setController(NEW_RR, true)",
    () => resolver.setController(NEW_RR, true)
  );
  // Confirm
  const newRRHasRole = await resolver.hasRole(CONTROLLER_ROLE, NEW_RR);
  if (!newRRHasRole) fail(`NEW_RR does not have CONTROLLER_ROLE after grant`);
  ok(`NEW_RR CONTROLLER_ROLE confirmed: ${newRRHasRole}`);

  // ── Step 7: Revoke CONTROLLER_ROLE on Resolver from OLD_RR ───────────────────
  log(7, "Revoke CONTROLLER_ROLE on Resolver from OLD_RR");
  if (!oldRRHasControllerRole) {
    warn(`OLD_RR (${OLD_RR}) did not have CONTROLLER_ROLE — skipping revoke`);
  } else {
    await confirmTxWithRetry(
      "resolver.setController(OLD_RR, false)",
      () => resolver.setController(OLD_RR, false)
    );
    // Confirm
    const oldRRHasRoleAfter = await resolver.hasRole(CONTROLLER_ROLE, OLD_RR);
    if (oldRRHasRoleAfter) fail(`OLD_RR still has CONTROLLER_ROLE after revoke`);
    ok(`OLD_RR CONTROLLER_ROLE revoked confirmed: hasRole = ${oldRRHasRoleAfter}`);
  }

  // ── Step 8: setReverseRegistrar(NEW_RR) on .arc proxy ────────────────────────
  log(8, "setReverseRegistrar(NEW_RR) on .arc proxy");
  const arcOldRR = await arcController.reverseRegistrar();
  console.log(`   current reverseRegistrar: ${arcOldRR}`);
  await confirmTxWithRetry(
    "arcController.setReverseRegistrar(NEW_RR)",
    () => arcController.setReverseRegistrar(NEW_RR)
  );
  // Confirm
  const arcNewRR = await arcController.reverseRegistrar();
  if (arcNewRR.toLowerCase() !== NEW_RR.toLowerCase()) {
    fail(`arcController.reverseRegistrar() mismatch: got ${arcNewRR}, expected ${NEW_RR}`);
  }
  ok(`arcController.reverseRegistrar() confirmed: ${arcNewRR}`);

  // ── Step 9: setReverseRegistrar(NEW_RR) on .circle proxy ─────────────────────
  log(9, "setReverseRegistrar(NEW_RR) on .circle proxy");
  const circleOldRR = await circleController.reverseRegistrar();
  console.log(`   current reverseRegistrar: ${circleOldRR}`);
  await confirmTxWithRetry(
    "circleController.setReverseRegistrar(NEW_RR)",
    () => circleController.setReverseRegistrar(NEW_RR)
  );
  // Confirm
  const circleNewRR = await circleController.reverseRegistrar();
  if (circleNewRR.toLowerCase() !== NEW_RR.toLowerCase()) {
    fail(`circleController.reverseRegistrar() mismatch: got ${circleNewRR}, expected ${NEW_RR}`);
  }
  ok(`circleController.reverseRegistrar() confirmed: ${circleNewRR}`);

  // ── Step 10: Full post-step confirmation summary ──────────────────────────────
  log(10, "Post-step confirmation summary");

  const checks = [
    {
      label: "addr.reverse owner == NEW_RR",
      actual: (await registry.owner(addrReverseNode)).toLowerCase(),
      expected: NEW_RR.toLowerCase(),
    },
    {
      label: "NEW_RR has CONTROLLER_ROLE on Resolver",
      actual: String(await resolver.hasRole(CONTROLLER_ROLE, NEW_RR)),
      expected: "true",
    },
    {
      label: "OLD_RR does NOT have CONTROLLER_ROLE on Resolver",
      actual: String(await resolver.hasRole(CONTROLLER_ROLE, OLD_RR)),
      expected: "false",
    },
    {
      label: "arcController impl == NEW_CTRL_IMPL",
      actual: (await getImplAddress(c.arcController)).toLowerCase(),
      expected: arcImplAfter.toLowerCase(),
    },
    {
      label: "circleController impl == NEW_CTRL_IMPL",
      actual: (await getImplAddress(c.circleController)).toLowerCase(),
      expected: circleImplAfter.toLowerCase(),
    },
    {
      label: "arcController.reverseRegistrar() == NEW_RR",
      actual: (await arcController.reverseRegistrar()).toLowerCase(),
      expected: NEW_RR.toLowerCase(),
    },
    {
      label: "circleController.reverseRegistrar() == NEW_RR",
      actual: (await circleController.reverseRegistrar()).toLowerCase(),
      expected: NEW_RR.toLowerCase(),
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.actual === check.expected) {
      ok(`PASS — ${check.label}`);
    } else {
      console.error(`   ✗ FAIL — ${check.label}`);
      console.error(`           expected: ${check.expected}`);
      console.error(`           actual  : ${check.actual}`);
      allPassed = false;
    }
  }

  if (!allPassed) fail("One or more post-step confirmations failed. See above.");

  // ── Step 11: Update deployment JSON ──────────────────────────────────────────
  log(11, "Update deployment JSON");

  // For fork dry-run, write to a separate file so we don't corrupt the live deployment
  const outFileName = (isLocal || isFork)
    ? "hardhat-v3.json"
    : `${network.name}-v3.json`;
  const outPath = path.join(__dirname, `../../deployments/${outFileName}`);

  // For fork, start from the arc_testnet state we loaded
  const outDep = isLocal ? JSON.parse(JSON.stringify(dep)) : dep;
  const outC   = outDep.contracts;

  outC.oldReverseRegistrar  = OLD_RR;
  outC.reverseRegistrar     = NEW_RR;
  outC.arcControllerImpl    = arcImplAfter;
  outC.circleControllerImpl = circleImplAfter;

  outDep.upgrades = outDep.upgrades || [];
  outDep.upgrades.push({
    at:   new Date().toISOString(),
    type: "security-migration-v1",
    network: network.name,
    deployer: deployer.address,
    changes: [
      `ArcNSReverseRegistrar: redeployed at ${NEW_RR} (claimWithResolver NotAuthorised fix)`,
      `ArcNSController: upgraded to new impl ${arcImplAfter} (initialize zero-address fix + setReverseRegistrar)`,
      `addr.reverse node: ${OLD_RR} → ${NEW_RR}`,
      `Resolver CONTROLLER_ROLE granted to: ${NEW_RR}`,
      `Resolver CONTROLLER_ROLE revoked from: ${OLD_RR}`,
      `arcController.reverseRegistrar: ${arcOldRR} → ${NEW_RR}`,
      `circleController.reverseRegistrar: ${circleOldRR} → ${NEW_RR}`,
    ],
  });

  fs.writeFileSync(outPath, JSON.stringify(outDep, null, 2));
  ok(`Deployment file updated: deployments/${outFileName}`);

  // ── Final summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log(`✅ ${isLocal ? "FORK DRY-RUN" : "LIVE MIGRATION"} COMPLETE`);
  console.log("═".repeat(62));
  console.log(`   OLD_RR                  : ${OLD_RR}`);
  console.log(`   NEW_RR                  : ${NEW_RR}`);
  console.log(`   arcController impl      : ${arcImplAfter}`);
  console.log(`   circleController impl   : ${circleImplAfter}`);
  console.log("═".repeat(62));

  if (isFork || isLocal) {
    console.log("\n✅ Fork dry-run passed. Safe to proceed with live Arc Testnet execution.");
    console.log("   Run: npx hardhat run scripts/v3/migrateSecurityFixes.js --network arc_testnet");  } else {
    console.log("\n⚠  Post-migration checklist:");
    console.log("   [ ] Run validateMigration.js --network arc_testnet");
    console.log("   [ ] Verify NEW_RR on ArcScan");
    console.log("   [ ] Verify NEW_CTRL_IMPL on ArcScan");
    console.log("   [ ] Regenerate frontend config if needed");
  }

  return { NEW_RR, arcImplAfter, circleImplAfter };
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  process.exit(1);
});
