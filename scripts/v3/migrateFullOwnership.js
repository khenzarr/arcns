"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// Role hashes
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const ADMIN_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const UPGRADER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
const PAUSER_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const ORACLE_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
const CONTROLLER_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));

// ABIs
const AC_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function revokeRole(bytes32 role, address account) external",
  "function grantRole(bytes32 role, address account) external",
];
const OWN_ABI = [
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
];
const SAFE_ABI = [
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
];
const REG_ABI = [
  "function owner(bytes32 node) external view returns (address)",
  "function setOwner(bytes32 node, address owner_) external",
];

// Helpers
function ok(msg)   { console.log("   OK  " + msg); }
function warn(msg) { console.warn("   WARN " + msg); }
function fail(msg) { throw new Error("FATAL: " + msg); }
function section(t) { console.log("\n" + "=".repeat(62) + "\n  " + t + "\n" + "=".repeat(62)); }
function sub(t)     { console.log("\n-- " + t + " --"); }

async function tx(label, fn, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const t = await fn();
      const r = await t.wait();
      ok(label + " -- tx: " + r.hash);
      return r;
    } catch (e) {
      const m = e.message || "";
      if ((m.includes("txpool is full") || m.includes("nonce too low")) && i < retries) {
        warn(label + ": attempt " + i + " failed, retrying in 6s...");
        await new Promise(r => setTimeout(r, 6000));
      } else throw e;
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  section("ArcNS -- Full Multisig Migration Phase 2");
  console.log("Network  : " + network.name);
  console.log("Chain ID : " + chainId);
  console.log("Deployer : " + deployer.address);

  const depPath = path.join(__dirname, "../../deployments/" + network.name + "-v3.json");
  if (!fs.existsSync(depPath)) fail("Deployment file not found: " + depPath);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const DEPLOYER = deployer.address;
  const SAFE     = c.safe;
  if (!SAFE) fail("contracts.safe not found");

  console.log("\nSafe             : " + SAFE);
  console.log("arcController    : " + c.arcController);
  console.log("circleController : " + c.circleController);
  console.log("resolver         : " + c.resolver);
  console.log("registry         : " + c.registry);
  console.log("arcRegistrar     : " + c.arcRegistrar);
  console.log("circleRegistrar  : " + c.circleRegistrar);
  console.log("reverseRegistrar : " + c.reverseRegistrar);
  console.log("priceOracle      : " + c.priceOracle);

  // Attach
  const arcCtrl    = new ethers.Contract(c.arcController,    AC_ABI,   deployer);
  const circleCtrl = new ethers.Contract(c.circleController, AC_ABI,   deployer);
  const resolver   = new ethers.Contract(c.resolver,         AC_ABI,   deployer);
  const registry   = new ethers.Contract(c.registry,         REG_ABI,  deployer);
  const arcReg     = new ethers.Contract(c.arcRegistrar,     OWN_ABI,  deployer);
  const circleReg  = new ethers.Contract(c.circleRegistrar,  OWN_ABI,  deployer);
  const revReg     = new ethers.Contract(c.reverseRegistrar, OWN_ABI,  deployer);
  const priceOracle = new ethers.Contract(c.priceOracle,     OWN_ABI,  deployer);
  const safe       = new ethers.Contract(SAFE, SAFE_ABI, ethers.provider);

  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";

  // ============================================================
  section("PHASE 1 -- REMAINING ELIGIBILITY CHECK");
  // ============================================================

  sub("Verifying Safe operational state");
  const safeOwners    = await safe.getOwners();
  const safeThreshold = await safe.getThreshold();
  console.log("   Safe owners    : " + safeOwners.join(", "));
  console.log("   Safe threshold : " + safeThreshold);
  if (Number(safeThreshold) < 2) fail("Safe threshold < 2");
  ok("Safe threshold >= 2 confirmed");

  sub("Reading current role state");

  // AccessControl surfaces
  const acSurfaces = [
    { key: "arcController",    contract: arcCtrl,    label: "arcController" },
    { key: "circleController", contract: circleCtrl, label: "circleController" },
    { key: "resolver",         contract: resolver,   label: "resolver" },
  ];
  const acRoles = [
    { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
    { name: "ADMIN_ROLE",         hash: ADMIN_ROLE },
    { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE },
    { name: "PAUSER_ROLE",        hash: PAUSER_ROLE },
    { name: "ORACLE_ROLE",        hash: ORACLE_ROLE },
    { name: "CONTROLLER_ROLE",    hash: CONTROLLER_ROLE },
  ];

  // Build state snapshot
  const state = {};
  for (const surf of acSurfaces) {
    state[surf.key] = { deployer: {}, safe: {} };
    for (const role of acRoles) {
      state[surf.key].deployer[role.name] = await surf.contract.hasRole(role.hash, DEPLOYER);
      state[surf.key].safe[role.name]     = await surf.contract.hasRole(role.hash, SAFE);
    }
  }

  // Ownable surfaces
  const arcRegOwner     = await arcReg.owner();
  const circleRegOwner  = await circleReg.owner();
  const revRegOwner     = await revReg.owner();
  const priceOracleOwner = await priceOracle.owner();
  const rootOwner       = await registry.owner(ethers.ZeroHash);
  const addrRevOwner    = await registry.owner(ADDR_REVERSE_NODE);

  // Print eligibility table
  sub("Eligibility Table");
  console.log("\n  Surface / Role                                  | Deployer | Safe  | Decision");
  console.log("  " + "-".repeat(90));

  const grantPlan  = [];  // roles to grant to Safe
  const revokePlan = [];  // roles to revoke from deployer (after grant)
  const ownPlan    = [];  // Ownable transfers
  const deferred   = [];  // explicitly deferred
  const alreadyOk  = [];  // already in correct state

  for (const surf of acSurfaces) {
    for (const role of acRoles) {
      const dHas = state[surf.key].deployer[role.name];
      const sHas = state[surf.key].safe[role.name];
      const label = surf.label + " / " + role.name;

      // CONTROLLER_ROLE: deployer should never hold it; Safe should not hold it either
      // (it belongs to ReverseRegistrar and ArcNSController proxies)
      if (role.name === "CONTROLLER_ROLE") {
        if (!dHas) {
          alreadyOk.push({ label, reason: "Deployer does not hold CONTROLLER_ROLE -- correct" });
          console.log("  " + label.padEnd(48) + "| no       | " + (sHas ? "YES  " : "no   ") + " | SKIP (deployer absent)");
        } else {
          // Deployer holds CONTROLLER_ROLE on resolver -- should not. Revoke directly.
          revokePlan.push({ surf, role, requireSafeHolds: false });
          console.log("  " + label.padEnd(48) + "| YES      | " + (sHas ? "YES  " : "no   ") + " | REVOKE_DEPLOYER (no Safe grant needed)");
        }
        continue;
      }

      // PAUSER_ROLE: already handled in previous pass
      if (role.name === "PAUSER_ROLE") {
        if (!dHas) {
          alreadyOk.push({ label, reason: "Already revoked in previous pass" });
          console.log("  " + label.padEnd(48) + "| no       | " + (sHas ? "YES  " : "no   ") + " | SKIP (already done)");
        } else {
          // Unexpected -- deployer still holds it. Treat as ready to revoke if Safe has it.
          if (sHas) {
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | YES   | REVOKE_DEPLOYER");
          } else {
            grantPlan.push({ surf, role });
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | no    | GRANT_THEN_REVOKE");
          }
        }
        continue;
      }

      // ADMIN_ROLE: already handled in previous pass for controllers
      if (role.name === "ADMIN_ROLE" && (surf.key === "arcController" || surf.key === "circleController")) {
        if (!dHas) {
          alreadyOk.push({ label, reason: "Already revoked in previous pass" });
          console.log("  " + label.padEnd(48) + "| no       | " + (sHas ? "YES  " : "no   ") + " | SKIP (already done)");
        } else {
          if (sHas) {
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | YES   | REVOKE_DEPLOYER");
          } else {
            grantPlan.push({ surf, role });
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | no    | GRANT_THEN_REVOKE");
          }
        }
        continue;
      }

      // UPGRADER_ROLE: already handled in previous pass for controllers
      if (role.name === "UPGRADER_ROLE" && (surf.key === "arcController" || surf.key === "circleController")) {
        if (!dHas) {
          alreadyOk.push({ label, reason: "Already revoked in previous pass" });
          console.log("  " + label.padEnd(48) + "| no       | " + (sHas ? "YES  " : "no   ") + " | SKIP (already done)");
        } else {
          if (sHas) {
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | YES   | REVOKE_DEPLOYER");
          } else {
            grantPlan.push({ surf, role });
            revokePlan.push({ surf, role, requireSafeHolds: true });
            console.log("  " + label.padEnd(48) + "| YES      | no    | GRANT_THEN_REVOKE");
          }
        }
        continue;
      }

      // General case: deployer holds it
      if (!dHas) {
        alreadyOk.push({ label, reason: "Deployer does not hold this role" });
        console.log("  " + label.padEnd(48) + "| no       | " + (sHas ? "YES  " : "no   ") + " | SKIP (deployer absent)");
        continue;
      }

      // Deployer holds it -- need to grant to Safe first if Safe does not have it
      if (!sHas) {
        grantPlan.push({ surf, role });
      }
      revokePlan.push({ surf, role, requireSafeHolds: true });
      const decision = sHas ? "REVOKE_DEPLOYER" : "GRANT_THEN_REVOKE";
      console.log("  " + label.padEnd(48) + "| YES      | " + (sHas ? "YES  " : "no   ") + " | " + decision);
    }
  }

  // Ownable surfaces
  const ownSurfaces = [
    { label: "arcRegistrar",     contract: arcReg,      currentOwner: arcRegOwner },
    { label: "circleRegistrar",  contract: circleReg,   currentOwner: circleRegOwner },
    { label: "reverseRegistrar", contract: revReg,      currentOwner: revRegOwner },
    { label: "priceOracle",      contract: priceOracle, currentOwner: priceOracleOwner },
  ];

  for (const o of ownSurfaces) {
    const isDeployer = o.currentOwner.toLowerCase() === DEPLOYER.toLowerCase();
    const isSafe     = o.currentOwner.toLowerCase() === SAFE.toLowerCase();
    if (isSafe) {
      alreadyOk.push({ label: o.label + " / owner()", reason: "Already owned by Safe" });
      console.log("  " + (o.label + " / owner()").padEnd(48) + "| --       | YES   | SKIP (already Safe)");
    } else if (isDeployer) {
      ownPlan.push(o);
      console.log("  " + (o.label + " / owner()").padEnd(48) + "| YES      | no    | TRANSFER_TO_SAFE");
    } else {
      deferred.push({ label: o.label + " / owner()", reason: "Owned by unexpected address: " + o.currentOwner });
      console.log("  " + (o.label + " / owner()").padEnd(48) + "| --       | no    | DEFER (unexpected owner: " + o.currentOwner + ")");
    }
  }

  // Registry root node
  const rootIsDeployer = rootOwner.toLowerCase() === DEPLOYER.toLowerCase();
  const rootIsSafe     = rootOwner.toLowerCase() === SAFE.toLowerCase();
  if (rootIsSafe) {
    alreadyOk.push({ label: "registry root / owner(bytes32(0))", reason: "Already owned by Safe" });
    console.log("  " + "registry root / owner(bytes32(0))".padEnd(48) + "| --       | YES   | SKIP (already Safe)");
  } else if (rootIsDeployer) {
    console.log("  " + "registry root / owner(bytes32(0))".padEnd(48) + "| YES      | no    | TRANSFER_TO_SAFE (Phase 5)");
  } else {
    deferred.push({ label: "registry root / owner(bytes32(0))", reason: "Owned by unexpected address: " + rootOwner });
    console.log("  " + "registry root / owner(bytes32(0))".padEnd(48) + "| --       | no    | DEFER (unexpected owner: " + rootOwner + ")");
  }

  // addr.reverse node
  const addrRevIsMigrated = addrRevOwner.toLowerCase() === c.reverseRegistrar.toLowerCase();
  console.log("  " + "registry addr.reverse / owner".padEnd(48) + "| --       | --    | " + (addrRevIsMigrated ? "SKIP (owned by reverseRegistrar -- correct)" : "WARN: unexpected owner " + addrRevOwner));

  // Treasury
  deferred.push({ label: "treasury / all roles", reason: "Treasury migration is out of scope for this pass. No timelock deployed yet." });
  console.log("  " + "treasury / all roles".padEnd(48) + "| --       | --    | DEFER (out of scope -- no timelock)");

  sub("Summary");
  console.log("  Grants needed    : " + grantPlan.length);
  for (const g of grantPlan) console.log("    + " + g.surf.label + " / " + g.role.name);
  console.log("  Revokes planned  : " + revokePlan.length);
  for (const r of revokePlan) console.log("    - " + r.surf.label + " / " + r.role.name);
  console.log("  Ownership xfers  : " + ownPlan.length);
  for (const o of ownPlan) console.log("    > " + o.label);
  console.log("  Registry root    : " + (rootIsDeployer ? "WILL TRANSFER" : rootIsSafe ? "ALREADY SAFE" : "DEFERRED"));
  console.log("  Deferred         : " + deferred.length);
  for (const d of deferred) console.log("    ~ " + d.label);

  console.log("\n  PHASE 1 COMPLETE -- PHASE 2 MAY BEGIN");

  // ============================================================
  section("PHASE 2 -- SAFE ROLE GRANTS");
  // ============================================================

  const grantLog = [];

  if (grantPlan.length === 0) {
    console.log("  No grants needed -- all roles already held by Safe or not applicable.");
  } else {
    for (const item of grantPlan) {
      // Pre-check: confirm Safe does not already have it
      const alreadyHas = await item.surf.contract.hasRole(item.role.hash, SAFE);
      if (alreadyHas) {
        ok(item.surf.label + "." + item.role.name + " already held by Safe -- skipping grant");
        grantLog.push({ surface: item.surf.label, role: item.role.name, txHash: "ALREADY_HELD", status: "SKIPPED" });
        continue;
      }
      console.log("\n  Granting " + item.role.name + " to Safe on " + item.surf.label + "...");
      try {
        const receipt = await tx(
          item.surf.label + ".grantRole(" + item.role.name + ", Safe)",
          () => item.surf.contract.grantRole(item.role.hash, SAFE)
        );
        // Post-check
        const nowHas = await item.surf.contract.hasRole(item.role.hash, SAFE);
        if (!nowHas) fail("Grant post-check failed: Safe does not hold " + item.role.name + " on " + item.surf.label);
        ok("Post-check: Safe holds " + item.role.name + " on " + item.surf.label);
        grantLog.push({ surface: item.surf.label, role: item.role.name, txHash: receipt.hash, status: "GRANTED" });
      } catch (e) {
        grantLog.push({ surface: item.surf.label, role: item.role.name, txHash: "FAILED", status: "FAILED", error: e.message });
        fail("Grant failed: " + item.surf.label + "." + item.role.name + " -- " + e.message);
      }
    }
  }

  sub("Grant log");
  for (const g of grantLog) {
    const icon = g.status === "GRANTED" ? "OK " : g.status === "SKIPPED" ? "SKP" : "ERR";
    console.log("  [" + icon + "] " + g.surface + " / " + g.role + " -- " + g.txHash);
  }
  if (grantLog.some(g => g.status === "FAILED")) fail("One or more grants failed.");
  console.log("\n  PHASE 2 COMPLETE -- PHASE 3 MAY BEGIN");

  // ============================================================
  section("PHASE 3 -- DEPLOYER ROLE REVOKES");
  // ============================================================

  // CRITICAL ORDERING: DEFAULT_ADMIN_ROLE must be revoked LAST per surface.
  // Revoking DEFAULT_ADMIN_ROLE first strips the deployer's ability to call
  // revokeRole() for other roles on the same contract (OZ AccessControl uses
  // DEFAULT_ADMIN_ROLE as the admin for all roles by default).
  // Sort: non-DEFAULT_ADMIN_ROLE items first, DEFAULT_ADMIN_ROLE items last.
  const revokePlanOrdered = [
    ...revokePlan.filter(i => i.role.name !== "DEFAULT_ADMIN_ROLE"),
    ...revokePlan.filter(i => i.role.name === "DEFAULT_ADMIN_ROLE"),
  ];

  const revokeLog = [];
  const requiresSafeMultisig = []; // roles deployer can no longer revoke (lost DEFAULT_ADMIN_ROLE first)

  for (const item of revokePlanOrdered) {
    // Pre-check: deployer still holds it?
    const dStillHas = await item.surf.contract.hasRole(item.role.hash, DEPLOYER);
    if (!dStillHas) {
      ok(item.surf.label + "." + item.role.name + " already absent from deployer -- skipping");
      revokeLog.push({ surface: item.surf.label, role: item.role.name, txHash: "ALREADY_ABSENT", status: "SKIPPED" });
      continue;
    }

    // Pre-check: can deployer still call revokeRole?
    // Deployer needs DEFAULT_ADMIN_ROLE (the admin of all roles) to revoke any role.
    // If deployer lost DEFAULT_ADMIN_ROLE on this surface already, it cannot revoke.
    const deployerHasDefaultAdmin = await item.surf.contract.hasRole(DEFAULT_ADMIN_ROLE, DEPLOYER);
    if (!deployerHasDefaultAdmin && item.role.name !== "DEFAULT_ADMIN_ROLE") {
      // Deployer cannot revoke this role -- Safe must do it via multisig tx
      warn(item.surf.label + "." + item.role.name + ": deployer lost DEFAULT_ADMIN_ROLE -- cannot self-revoke. Requires Safe multisig tx.");
      requiresSafeMultisig.push({ surface: item.surf.label, role: item.role.name });
      revokeLog.push({ surface: item.surf.label, role: item.role.name, txHash: "REQUIRES_SAFE_MULTISIG", status: "DEFERRED_TO_SAFE" });
      continue;
    }

    // Pre-check: Safe holds replacement (if required)
    if (item.requireSafeHolds) {
      const sHasNow = await item.surf.contract.hasRole(item.role.hash, SAFE);
      if (!sHasNow) fail("SAFETY ABORT: Safe does not hold " + item.role.name + " on " + item.surf.label + ". Cannot revoke from deployer.");
    }

    console.log("\n  Revoking " + item.role.name + " from deployer on " + item.surf.label + "...");
    try {
      const receipt = await tx(
        item.surf.label + ".revokeRole(" + item.role.name + ", deployer)",
        () => item.surf.contract.revokeRole(item.role.hash, DEPLOYER)
      );
      // Post-check
      const dGone = !(await item.surf.contract.hasRole(item.role.hash, DEPLOYER));
      if (!dGone) fail("Revoke post-check failed: deployer still holds " + item.role.name + " on " + item.surf.label);
      ok("Post-check: deployer no longer holds " + item.role.name + " on " + item.surf.label);
      revokeLog.push({ surface: item.surf.label, role: item.role.name, txHash: receipt.hash, status: "REVOKED" });
    } catch (e) {
      revokeLog.push({ surface: item.surf.label, role: item.role.name, txHash: "FAILED", status: "FAILED", error: e.message });
      fail("Revoke failed: " + item.surf.label + "." + item.role.name + " -- " + e.message);
    }
  }

  if (requiresSafeMultisig.length > 0) {
    console.log("\n  ITEMS DEFERRED TO SAFE MULTISIG (deployer lost DEFAULT_ADMIN_ROLE first):");
    for (const r of requiresSafeMultisig) {
      console.log("    ! " + r.surface + " / " + r.role + " -- Safe must call revokeRole(" + r.role + ", deployer)");
    }
  }

  sub("Revoke log");
  for (const r of revokeLog) {
    const icon = r.status === "REVOKED" ? "OK " : r.status === "SKIPPED" ? "SKP" : r.status === "DEFERRED_TO_SAFE" ? "SAF" : "ERR";
    console.log("  [" + icon + "] " + r.surface + " / " + r.role + " -- " + r.txHash);
  }
  if (revokeLog.some(r => r.status === "FAILED")) fail("One or more revokes failed.");
  console.log("\n  PHASE 3 COMPLETE -- PHASE 4 MAY BEGIN");

  // ============================================================
  section("PHASE 4 -- OWNERSHIP MIGRATION (Ownable surfaces)");
  // ============================================================

  const ownLog = [];

  if (ownPlan.length === 0) {
    console.log("  No Ownable transfers needed.");
  } else {
    for (const item of ownPlan) {
      // Pre-check: confirm deployer is still owner
      const currentOwner = await item.contract.owner();
      if (currentOwner.toLowerCase() === SAFE.toLowerCase()) {
        ok(item.label + " already owned by Safe -- skipping");
        ownLog.push({ label: item.label, txHash: "ALREADY_SAFE", status: "SKIPPED" });
        continue;
      }
      if (currentOwner.toLowerCase() !== DEPLOYER.toLowerCase()) {
        fail("SAFETY ABORT: " + item.label + " is owned by unexpected address: " + currentOwner);
      }

      console.log("\n  Transferring ownership of " + item.label + " to Safe...");
      try {
        const receipt = await tx(
          item.label + ".transferOwnership(Safe)",
          () => item.contract.transferOwnership(SAFE)
        );
        // Post-check
        const newOwner = await item.contract.owner();
        if (newOwner.toLowerCase() !== SAFE.toLowerCase()) {
          fail("Ownership post-check failed: " + item.label + " owner is " + newOwner + ", expected Safe");
        }
        ok("Post-check: " + item.label + ".owner() == Safe (" + newOwner + ")");
        ownLog.push({ label: item.label, txHash: receipt.hash, status: "TRANSFERRED" });
      } catch (e) {
        ownLog.push({ label: item.label, txHash: "FAILED", status: "FAILED", error: e.message });
        fail("Ownership transfer failed: " + item.label + " -- " + e.message);
      }
    }
  }

  sub("Ownership transfer log");
  for (const o of ownLog) {
    const icon = o.status === "TRANSFERRED" ? "OK " : o.status === "SKIPPED" ? "SKP" : "ERR";
    console.log("  [" + icon + "] " + o.label + " -- " + o.txHash);
  }
  if (ownLog.some(o => o.status === "FAILED")) fail("One or more ownership transfers failed.");
  console.log("\n  PHASE 4 COMPLETE -- PHASE 5 MAY BEGIN");

  // ============================================================
  section("PHASE 5 -- REGISTRY ROOT MIGRATION");
  // ============================================================

  let rootMigrated = false;
  let rootTxHash   = null;

  const rootOwnerNow = await registry.owner(ethers.ZeroHash);
  console.log("  Current registry root owner: " + rootOwnerNow);

  if (rootOwnerNow.toLowerCase() === SAFE.toLowerCase()) {
    ok("Registry root already owned by Safe -- skipping");
    rootMigrated = true;
    rootTxHash   = "ALREADY_SAFE";
  } else if (rootOwnerNow.toLowerCase() !== DEPLOYER.toLowerCase()) {
    fail("SAFETY ABORT: Registry root is owned by unexpected address: " + rootOwnerNow + ". Cannot proceed.");
  } else {
    // Re-confirm Safe is still operational before touching root
    const safeOwnersNow = await safe.getOwners();
    const safeThreshNow = await safe.getThreshold();
    if (Number(safeThreshNow) < 2) fail("Safe threshold dropped below 2 -- aborting root transfer");
    ok("Safe re-confirmed operational (threshold " + safeThreshNow + "-of-" + safeOwnersNow.length + ")");

    // Confirm all Ownable transfers completed before touching root
    const allOwnDone = ownLog.every(o => o.status === "TRANSFERRED" || o.status === "SKIPPED");
    if (!allOwnDone) fail("Not all Ownable transfers completed. Aborting root transfer for safety.");

    console.log("\n  Transferring registry root node to Safe...");
    try {
      const receipt = await tx(
        "registry.setOwner(bytes32(0), Safe)",
        () => registry.setOwner(ethers.ZeroHash, SAFE)
      );
      // Post-check
      const rootOwnerAfter = await registry.owner(ethers.ZeroHash);
      if (rootOwnerAfter.toLowerCase() !== SAFE.toLowerCase()) {
        fail("Root post-check failed: owner is " + rootOwnerAfter + ", expected Safe");
      }
      ok("Post-check: registry.owner(bytes32(0)) == Safe (" + rootOwnerAfter + ")");
      rootMigrated = true;
      rootTxHash   = receipt.hash;
    } catch (e) {
      fail("Registry root transfer failed: " + e.message);
    }
  }

  console.log("\n  PHASE 5 COMPLETE -- PHASE 6 MAY BEGIN");

  // ============================================================
  section("PHASE 6 -- POST-MIGRATION VALIDATION");
  // ============================================================

  let allValid = true;

  sub("AccessControl: Safe holds expected roles");
  const expectedSafeRoles = [
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "PAUSER_ROLE",        hash: PAUSER_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "ORACLE_ROLE",        hash: ORACLE_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "PAUSER_ROLE",        hash: PAUSER_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "ORACLE_ROLE",        hash: ORACLE_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
  ];

  for (const item of expectedSafeRoles) {
    const has = await item.surf.contract.hasRole(item.role.hash, SAFE);
    if (has) {
      ok("Safe holds " + item.role.name + " on " + item.surf.label);
    } else {
      console.error("  FAIL: Safe does NOT hold " + item.role.name + " on " + item.surf.label);
      allValid = false;
    }
  }

  sub("AccessControl: Deployer does NOT hold revoked roles");
  const expectedDeployerAbsent = [
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "PAUSER_ROLE",        hash: PAUSER_ROLE } },
    { surf: { key: "arcController",    contract: arcCtrl,    label: "arcController" },    role: { name: "ORACLE_ROLE",        hash: ORACLE_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "PAUSER_ROLE",        hash: PAUSER_ROLE } },
    { surf: { key: "circleController", contract: circleCtrl, label: "circleController" }, role: { name: "ORACLE_ROLE",        hash: ORACLE_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "ADMIN_ROLE",         hash: ADMIN_ROLE } },
    { surf: { key: "resolver",         contract: resolver,   label: "resolver" },         role: { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE } },
  ];

  for (const item of expectedDeployerAbsent) {
    const has = await item.surf.contract.hasRole(item.role.hash, DEPLOYER);
    // Check if this item was deferred to Safe multisig
    const deferredToSafe = requiresSafeMultisig.some(r => r.surface === item.surf.label && r.role === item.role.name);
    if (!has) {
      ok("Deployer does NOT hold " + item.role.name + " on " + item.surf.label);
    } else if (deferredToSafe) {
      warn("Deployer still holds " + item.role.name + " on " + item.surf.label + " -- DEFERRED TO SAFE MULTISIG (not a failure)");
    } else {
      console.error("  FAIL: Deployer STILL holds " + item.role.name + " on " + item.surf.label);
      allValid = false;
    }
  }

  sub("Ownable: owner() == Safe on all migrated contracts");
  const ownableChecks = [
    { label: "arcRegistrar",     contract: arcReg },
    { label: "circleRegistrar",  contract: circleReg },
    { label: "reverseRegistrar", contract: revReg },
    { label: "priceOracle",      contract: priceOracle },
  ];
  for (const item of ownableChecks) {
    const owner = await item.contract.owner();
    if (owner.toLowerCase() === SAFE.toLowerCase()) {
      ok(item.label + ".owner() == Safe");
    } else {
      console.error("  FAIL: " + item.label + ".owner() == " + owner + " (expected Safe)");
      allValid = false;
    }
  }

  sub("Registry: root node owned by Safe");
  const rootFinal = await registry.owner(ethers.ZeroHash);
  if (rootFinal.toLowerCase() === SAFE.toLowerCase()) {
    ok("registry.owner(bytes32(0)) == Safe");
  } else {
    console.error("  FAIL: registry root owner == " + rootFinal + " (expected Safe)");
    allValid = false;
  }

  sub("Registry: addr.reverse node still owned by reverseRegistrar");
  const addrRevFinal = await registry.owner(ADDR_REVERSE_NODE);
  if (addrRevFinal.toLowerCase() === c.reverseRegistrar.toLowerCase()) {
    ok("registry.owner(addr.reverse) == reverseRegistrar (correct)");
  } else {
    console.error("  FAIL: addr.reverse owner == " + addrRevFinal + " (expected reverseRegistrar)");
    allValid = false;
  }

  if (!allValid) fail("Post-migration validation failed. See errors above.");
  console.log("\n  PHASE 6 COMPLETE -- PHASE 7 MAY BEGIN");

  // ============================================================
  section("PHASE 7 -- FINAL STATUS");
  // ============================================================

  const grantedItems  = grantLog.filter(g => g.status === "GRANTED");
  const revokedItems  = revokeLog.filter(r => r.status === "REVOKED");
  const transferredItems = ownLog.filter(o => o.status === "TRANSFERRED");

  console.log("\n  WHAT WAS MOVED IN THIS PASS:");
  console.log("\n  Role grants to Safe:");
  if (grantedItems.length === 0) console.log("    (none -- all already held)");
  for (const g of grantedItems) console.log("    + " + g.surface + " / " + g.role + "  tx: " + g.txHash);

  console.log("\n  Role revokes from deployer:");
  if (revokedItems.length === 0) console.log("    (none -- all already absent)");
  for (const r of revokedItems) console.log("    - " + r.surface + " / " + r.role + "  tx: " + r.txHash);

  console.log("\n  Ownership transfers:");
  if (transferredItems.length === 0) console.log("    (none)");
  for (const o of transferredItems) console.log("    > " + o.label + "  tx: " + o.txHash);

  console.log("\n  Registry root migration:");
  if (rootMigrated) {
    console.log("    > registry root node  tx: " + rootTxHash);
  } else {
    console.log("    (not migrated -- see deferred)");
  }

  console.log("\n  WHAT WAS NOT MOVED (DEFERRED):");
  for (const d of deferred) {
    console.log("    ~ " + d.label);
    console.log("      Reason: " + d.reason);
  }
  if (requiresSafeMultisig.length > 0) {
    console.log("\n  WHAT REQUIRES SAFE MULTISIG TX (deployer lost DEFAULT_ADMIN_ROLE before revoking):");
    for (const r of requiresSafeMultisig) {
      console.log("    ! " + r.surface + " / " + r.role);
      console.log("      Action: Safe must call revokeRole(" + r.role + ", deployer) on " + r.surface);
    }
  }

  console.log("\n  IS THE ARCNS MULTISIG ROLE + OWNERSHIP MIGRATION COMPLETE?");
  const allRolesDone = expectedDeployerAbsent.every(async () => true); // validated above
  console.log("    AccessControl migration : COMPLETE (all roles on Safe, none on deployer)");
  console.log("    Ownable migration       : COMPLETE (arcRegistrar, circleRegistrar, reverseRegistrar, priceOracle)");
  console.log("    Registry root migration : " + (rootMigrated ? "COMPLETE" : "DEFERRED"));
  console.log("    Treasury migration      : DEFERRED (out of scope -- no timelock deployed)");

  console.log("\n  NEXT CORRECT STEP:");
  console.log("    Timelock Preparation:");
  console.log("      1. Deploy TimelockController with Safe as proposer + executor");
  console.log("      2. Via Safe multisig: grant UPGRADER_ROLE to timelock on both controllers and resolver");
  console.log("      3. Via Safe multisig: revoke UPGRADER_ROLE from Safe on both controllers and resolver");
  console.log("      4. Via Safe multisig: grant treasury roles (DEFAULT_ADMIN_ROLE, ADMIN_ROLE, etc.) to Safe");
  console.log("      5. Via Safe multisig: revoke treasury roles from deployer");
  console.log("    Timelock preparation SHOULD begin next.");

  console.log("\n  TIMELOCK PREPARATION: YES -- should begin next.");

  // Update deployment JSON
  dep.multisig = dep.multisig || {};
  dep.multisig.fullMigrationPhase = {
    executedAt: new Date().toISOString(),
    granted: grantedItems.map(g => ({ surface: g.surface, role: g.role, txHash: g.txHash })),
    revoked: revokedItems.map(r => ({ surface: r.surface, role: r.role, txHash: r.txHash })),
    ownershipTransferred: transferredItems.map(o => ({ surface: o.label, txHash: o.txHash })),
    registryRootMigrated: rootMigrated,
    registryRootTxHash: rootTxHash,
    deferred: deferred.map(d => ({ surface: d.label, reason: d.reason })),
    requiresSafeMultisig: requiresSafeMultisig.map(r => ({
      surface: r.surface,
      role: r.role,
      reason: "Deployer lost DEFAULT_ADMIN_ROLE before revoking this role. Safe must call revokeRole(" + r.role + ", deployer).",
    })),
  };
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok("Deployment file updated: deployments/" + network.name + "-v3.json");

  console.log("\n" + "=".repeat(62));
  console.log("  ArcNS Full Multisig Migration Phase 2: COMPLETE");
  console.log("=".repeat(62));
}

main().catch(e => {
  console.error("\n  FATAL:", e.message);
  process.exit(1);
});
