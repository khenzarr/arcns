/**
 * ArcNS v3 — Post-Migration Validation Script
 *
 * Validates the fully clean security migration end-to-end.
 * Run this after migrateSecurityFixes.js completes (fork or live).
 *
 * Checks:
 *   1.  registry.owner(namehash("addr.reverse")) == NEW_RR
 *   2.  resolver.hasRole(CONTROLLER_ROLE, NEW_RR) == true
 *   3.  resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false
 *   4.  arcController implementation == NEW_CTRL_IMPL
 *   5.  circleController implementation == NEW_CTRL_IMPL
 *   6.  arcController.reverseRegistrar() == NEW_RR
 *   7.  circleController.reverseRegistrar() == NEW_RR
 *   8.  Registration still works on .arc (commit-reveal, name minted)
 *   9.  Registration still works on .circle (commit-reveal, name minted)
 *   10. Reverse flow works — register with reverseRecord=true, resolver.name() returns correct value
 *   11. Renew works on .arc
 *   12. Unauthorized claimWithResolver now fails (NotAuthorised)
 *   13. Legitimate self-claim still works
 *
 * Usage:
 *   Fork:
 *     npx hardhat run scripts/v3/validateMigration.js --network hardhat
 *
 *   Live:
 *     npx hardhat run scripts/v3/validateMigration.js --network arc_testnet
 *
 * Note: Checks 8–11 require USDC balance and a 60-second commitment wait.
 *       On a fork these are executed automatically.
 *       On live testnet, registration checks are skipped with instructions printed.
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
  return ethers.keccak256(ethers.concat([
    namehash("addr.reverse"),
    labelHash,
  ]));
}

async function getImplAddress(proxyAddress) {
  const raw = await ethers.provider.getStorage(proxyAddress, IMPL_SLOT);
  return ethers.getAddress("0x" + raw.slice(-40));
}

// ─── Result tracking ──────────────────────────────────────────────────────────

const results = [];

function pass(id, label) {
  results.push({ id, label, status: "PASS" });
  console.log(`   ✅ CHECK ${id}: ${label}`);
}

function fail(id, label, detail) {
  results.push({ id, label, status: "FAIL", detail });
  console.error(`   ❌ CHECK ${id}: ${label}`);
  if (detail) console.error(`      Detail: ${detail}`);
}

function skip(id, label, reason) {
  results.push({ id, label, status: "SKIP", reason });
  console.log(`   ⏭  CHECK ${id}: ${label} — SKIPPED (${reason})`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isLocal = ["hardhat", "localhost"].includes(network.name);
  const isFork  = network.name === "fork" || (isLocal && process.env.ARC_FORK === "1");

  // On a fork, impersonate the original deployer
  let deployer;
  if (isFork) {
    const depPath0 = path.join(__dirname, "../../deployments/arc_testnet-v3.json");
    const dep0 = JSON.parse(fs.readFileSync(depPath0, "utf8"));
    const deployerAddr = dep0.deployer;

    // Mine one empty block so the "current" block is forkBlock+1 (non-historical).
    await ethers.provider.send("evm_mine", []);

    await ethers.provider.send("hardhat_impersonateAccount", [deployerAddr]);
    await ethers.provider.send("hardhat_setBalance", [deployerAddr, "0x56BC75E2D63100000"]);
    deployer = await ethers.getSigner(deployerAddr);
    console.log(`\n[FORK] Impersonating deployer: ${deployerAddr}`);
    console.log(`[FORK] Mined one block to advance past fork block.`);
  } else {
    [deployer] = await ethers.getSigners();
  }

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ArcNS v3 — Post-Migration Validation                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`Deployer : ${deployer.address}`);
  console.log(`Mode     : ${isFork ? "FORK" : (isLocal ? "LOCAL HARDHAT" : "LIVE")}\n`);

  // ── Load deployment ──────────────────────────────────────────────────────────
  // On fork, read from hardhat-v3.json (written by migrateSecurityFixes fork run)
  // On live, read from arc_testnet-v3.json (written by live migration run)
  const depFileName = (isFork || isLocal) ? "hardhat-v3.json" : `${network.name}-v3.json`;
  const depPath = path.join(__dirname, `../../deployments/${depFileName}`);
  if (!fs.existsSync(depPath)) {
    throw new Error(
      `Deployment file not found: ${depPath}\n` +
      `Run migrateSecurityFixes.js first, then re-run this script.`
    );
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const NEW_RR  = c.reverseRegistrar;
  const OLD_RR  = c.oldReverseRegistrar;
  const NEW_IMPL = c.arcControllerImpl; // both proxies share the same impl after migration

  console.log("📋 Loaded deployment (post-migration):");
  console.log(`   NEW_RR           : ${NEW_RR}`);
  console.log(`   OLD_RR           : ${OLD_RR}`);
  console.log(`   NEW_CTRL_IMPL    : ${NEW_IMPL}`);
  console.log(`   arcController    : ${c.arcController}`);
  console.log(`   circleController : ${c.circleController}`);
  console.log(`   resolver         : ${c.resolver}`);
  console.log(`   registry         : ${c.registry}\n`);

  // ── Attach contracts ─────────────────────────────────────────────────────────
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

  console.log("─".repeat(62));
  console.log("Running checks...");
  console.log("─".repeat(62));

  // ── Check 1: addr.reverse owner == NEW_RR ────────────────────────────────────
  {
    const owner = await registry.owner(namehash("addr.reverse"));
    if (owner.toLowerCase() === NEW_RR.toLowerCase()) {
      pass(1, `registry.owner(addr.reverse) == NEW_RR`);
    } else {
      fail(1, `registry.owner(addr.reverse) == NEW_RR`, `got ${owner}`);
    }
  }

  // ── Check 2: NEW_RR has CONTROLLER_ROLE ──────────────────────────────────────
  {
    const hasRole = await resolver.hasRole(CONTROLLER_ROLE, NEW_RR);
    if (hasRole) {
      pass(2, `resolver.hasRole(CONTROLLER_ROLE, NEW_RR) == true`);
    } else {
      fail(2, `resolver.hasRole(CONTROLLER_ROLE, NEW_RR) == true`, `got false`);
    }
  }

  // ── Check 3: OLD_RR does NOT have CONTROLLER_ROLE ────────────────────────────
  {
    if (!OLD_RR) {
      skip(3, `resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false`, "OLD_RR not recorded in deployment");
    } else {
      const hasRole = await resolver.hasRole(CONTROLLER_ROLE, OLD_RR);
      if (!hasRole) {
        pass(3, `resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false`);
      } else {
        fail(3, `resolver.hasRole(CONTROLLER_ROLE, OLD_RR) == false`, `OLD_RR still has CONTROLLER_ROLE`);
      }
    }
  }

  // ── Check 4: arcController impl == NEW_CTRL_IMPL ─────────────────────────────
  {
    const impl = await getImplAddress(c.arcController);
    if (impl.toLowerCase() === NEW_IMPL.toLowerCase()) {
      pass(4, `arcController implementation == NEW_CTRL_IMPL`);
    } else {
      fail(4, `arcController implementation == NEW_CTRL_IMPL`, `got ${impl}`);
    }
  }

  // ── Check 5: circleController impl == NEW_CTRL_IMPL ──────────────────────────
  {
    const impl = await getImplAddress(c.circleController);
    const expectedImpl = c.circleControllerImpl || NEW_IMPL;
    if (impl.toLowerCase() === expectedImpl.toLowerCase()) {
      pass(5, `circleController implementation == NEW_CTRL_IMPL`);
    } else {
      fail(5, `circleController implementation == NEW_CTRL_IMPL`, `got ${impl}`);
    }
  }

  // ── Check 6: arcController.reverseRegistrar() == NEW_RR ──────────────────────
  {
    const rr = await arcController.reverseRegistrar();
    if (rr.toLowerCase() === NEW_RR.toLowerCase()) {
      pass(6, `arcController.reverseRegistrar() == NEW_RR`);
    } else {
      fail(6, `arcController.reverseRegistrar() == NEW_RR`, `got ${rr}`);
    }
  }

  // ── Check 7: circleController.reverseRegistrar() == NEW_RR ───────────────────
  {
    const rr = await circleController.reverseRegistrar();
    if (rr.toLowerCase() === NEW_RR.toLowerCase()) {
      pass(7, `circleController.reverseRegistrar() == NEW_RR`);
    } else {
      fail(7, `circleController.reverseRegistrar() == NEW_RR`, `got ${rr}`);
    }
  }

  // ── Checks 8–13: Functional tests (fork only) ────────────────────────────────
  if (!isFork && !isLocal) {
    skip(8,  "Registration works on .arc",                  "live testnet — run manually");
    skip(9,  "Registration works on .circle",               "live testnet — run manually");
    skip(10, "Reverse flow works (reverseRecord=true)",     "live testnet — run manually");
    skip(11, "Renew works on .arc",                         "live testnet — run manually");
    skip(12, "Unauthorized claimWithResolver fails",        "live testnet — run manually");
    skip(13, "Legitimate self-claim still works",           "live testnet — run manually");

    console.log("\n📋 Manual validation instructions for live testnet:");
    console.log("   8.  arcController.register('migtest', deployer, 365d, secret, resolver, false, maxCost)");
    console.log("   9.  circleController.register('migtest', deployer, 365d, secret, resolver, false, maxCost)");
    console.log("   10. arcController.register('revtest', deployer, 365d, secret, resolver, true, maxCost)");
    console.log("       → resolver.name(reverseNode(deployer)) must return 'revtest.arc'");
    console.log("   11. arcController.renew('migtest', 365d, maxCost)");
    console.log("   12. newRR.claimWithResolver(otherAddr, attacker, resolver) — must revert NotAuthorised");
    console.log("   13. newRR.claimWithResolver(deployer, deployer, resolver) — must succeed");
  } else {
    // Fork: run functional tests automatically
    const arcRegistrar = await ethers.getContractAt(
      "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar",
      c.arcRegistrar
    );
    const circleRegistrar = await ethers.getContractAt(
      "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar",
      c.circleRegistrar
    );
    const usdc = await ethers.getContractAt(
      "contracts/v3/mocks/MockUSDC.sol:MockUSDC",
      c.usdc
    );
    const newRR = await ethers.getContractAt(
      "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar",
      NEW_RR
    );

    // Mint USDC to deployer for test registrations
    try {
      await (await usdc.mint(deployer.address, 10_000_000_000n)).wait();
      await (await usdc.approve(c.arcController, ethers.MaxUint256)).wait();
      await (await usdc.approve(c.circleController, ethers.MaxUint256)).wait();
    } catch (e) {
      console.warn(`   ⚠ Could not mint/approve USDC: ${e.message.slice(0, 80)}`);
    }

    // ── Check 8: Registration on .arc ──────────────────────────────────────────
    try {
      const secret8 = ethers.id("valcheck8");
      const comm8 = await arcController.makeCommitment(
        "migtest8", deployer.address, ONE_YEAR, secret8, ethers.ZeroAddress, false, deployer.address
      );
      await (await arcController.commit(comm8)).wait();
      await time.increase(MIN_COMMIT_AGE + 1);
      await (await arcController.register(
        "migtest8", deployer.address, ONE_YEAR, secret8, ethers.ZeroAddress, false, ethers.MaxUint256
      )).wait();
      const tokenId8 = BigInt(labelhash("migtest8"));
      const owner8 = await arcRegistrar.ownerOf(tokenId8);
      if (owner8.toLowerCase() === deployer.address.toLowerCase()) {
        pass(8, "Registration works on .arc");
      } else {
        fail(8, "Registration works on .arc", `owner mismatch: ${owner8}`);
      }
    } catch (e) {
      fail(8, "Registration works on .arc", e.message.slice(0, 120));
    }

    // ── Check 9: Registration on .circle ───────────────────────────────────────
    try {
      const secret9 = ethers.id("valcheck9");
      const comm9 = await circleController.makeCommitment(
        "migtest9", deployer.address, ONE_YEAR, secret9, ethers.ZeroAddress, false, deployer.address
      );
      await (await circleController.commit(comm9)).wait();
      await time.increase(MIN_COMMIT_AGE + 1);
      await (await circleController.register(
        "migtest9", deployer.address, ONE_YEAR, secret9, ethers.ZeroAddress, false, ethers.MaxUint256
      )).wait();
      const tokenId9 = BigInt(labelhash("migtest9"));
      const owner9 = await circleRegistrar.ownerOf(tokenId9);
      if (owner9.toLowerCase() === deployer.address.toLowerCase()) {
        pass(9, "Registration works on .circle");
      } else {
        fail(9, "Registration works on .circle", `owner mismatch: ${owner9}`);
      }
    } catch (e) {
      fail(9, "Registration works on .circle", e.message.slice(0, 120));
    }

    // ── Check 10: Reverse flow works ───────────────────────────────────────────
    try {
      // Need resolver approved on arcController
      const resolverApproved = await arcController.approvedResolvers(c.resolver);
      if (!resolverApproved) {
        skip(10, "Reverse flow works (reverseRecord=true)", "resolver not approved on arcController");
      } else {
        const secret10 = ethers.id("valcheck10");
        const comm10 = await arcController.makeCommitment(
          "revtest10", deployer.address, ONE_YEAR, secret10, c.resolver, true, deployer.address
        );
        await (await arcController.commit(comm10)).wait();
        await time.increase(MIN_COMMIT_AGE + 1);
        await (await arcController.register(
          "revtest10", deployer.address, ONE_YEAR, secret10, c.resolver, true, ethers.MaxUint256
        )).wait();
        const rNode = reverseNodeFor(deployer.address);
        const reverseName = await resolver.name(rNode);
        if (reverseName === "revtest10.arc") {
          pass(10, `Reverse flow works — resolver.name() = "${reverseName}"`);
        } else {
          fail(10, "Reverse flow works (reverseRecord=true)", `resolver.name() = "${reverseName}", expected "revtest10.arc"`);
        }
      }
    } catch (e) {
      fail(10, "Reverse flow works (reverseRecord=true)", e.message.slice(0, 120));
    }

    // ── Check 11: Renew works ──────────────────────────────────────────────────
    try {
      // migtest8 was registered in check 8
      const tokenId11 = BigInt(labelhash("migtest8"));
      const expiryBefore = await arcRegistrar.nameExpires(tokenId11);
      await (await arcController.renew("migtest8", ONE_YEAR, ethers.MaxUint256)).wait();
      const expiryAfter = await arcRegistrar.nameExpires(tokenId11);
      if (expiryAfter > expiryBefore) {
        pass(11, `Renew works on .arc — expiry extended by ${Number(expiryAfter - expiryBefore)}s`);
      } else {
        fail(11, "Renew works on .arc", `expiry did not increase: before=${expiryBefore} after=${expiryAfter}`);
      }
    } catch (e) {
      fail(11, "Renew works on .arc", e.message.slice(0, 120));
    }

    // ── Check 12: Unauthorized claimWithResolver fails ─────────────────────────
    try {
      const [, , , , stranger] = await ethers.getSigners();
      // stranger tries to claim deployer's reverse node — must revert NotAuthorised
      let reverted = false;
      try {
        await newRR.connect(stranger).claimWithResolver(deployer.address, stranger.address, c.resolver);
      } catch (e) {
        if (e.message.includes("NotAuthorised") || e.message.includes("NotAuthorized")) {
          reverted = true;
        } else {
          throw e;
        }
      }
      if (reverted) {
        pass(12, "Unauthorized claimWithResolver reverts NotAuthorised");
      } else {
        fail(12, "Unauthorized claimWithResolver reverts NotAuthorised", "call did not revert");
      }
    } catch (e) {
      fail(12, "Unauthorized claimWithResolver reverts NotAuthorised", e.message.slice(0, 120));
    }

    // ── Check 13: Legitimate self-claim still works ────────────────────────────
    try {
      // deployer claims their own reverse node — must succeed
      const tx13 = await newRR.claimWithResolver(deployer.address, deployer.address, c.resolver);
      await tx13.wait();
      pass(13, "Legitimate self-claim (claimWithResolver) still works");
    } catch (e) {
      fail(13, "Legitimate self-claim (claimWithResolver) still works", e.message.slice(0, 120));
    }
  }

  // ── Final report ──────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("VALIDATION REPORT");
  console.log("═".repeat(62));

  const passed  = results.filter(r => r.status === "PASS").length;
  const failed  = results.filter(r => r.status === "FAIL").length;
  const skipped = results.filter(r => r.status === "SKIP").length;

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭ ";
    console.log(`   ${icon} [${r.id.toString().padStart(2)}] ${r.label}`);
    if (r.detail)  console.log(`         → ${r.detail}`);
    if (r.reason)  console.log(`         → ${r.reason}`);
  }

  console.log("─".repeat(62));
  console.log(`   PASS: ${passed}  |  FAIL: ${failed}  |  SKIP: ${skipped}`);
  console.log("═".repeat(62));

  if (failed > 0) {
    console.error(`\n❌ ${failed} check(s) failed. Migration is NOT clean. Do not proceed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ All checks passed${skipped > 0 ? ` (${skipped} skipped — run manually on live)` : ""}.`);
    if (!isLocal) {
      console.log("   Migration is confirmed clean on Arc Testnet.");
    } else {
      console.log("   Fork validation passed. Safe to proceed with live execution.");
    }
  }
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  process.exit(1);
});
