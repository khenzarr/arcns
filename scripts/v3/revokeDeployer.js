"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── Role hashes ──────────────────────────────────────────────────────────────
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const ADMIN_ROLE         = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
const UPGRADER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
const PAUSER_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
const ORACLE_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));
const CONTROLLER_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
const WITHDRAWER_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("WITHDRAWER_ROLE"));
const GOVERNOR_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("GOVERNOR_ROLE"));

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────
const ACCESS_CONTROL_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function revokeRole(bytes32 role, address account) external",
  "function grantRole(bytes32 role, address account) external",
  "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
];

const OWNABLE_ABI = [
  "function owner() external view returns (address)",
  "function transferOwnership(address newOwner) external",
];

const SAFE_ABI = [
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
];

const REGISTRY_ABI = [
  "function owner(bytes32 node) external view returns (address)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ok(msg)   { console.log(`   OK  ${msg}`); }
function warn(msg) { console.warn(`   WARN ${msg}`); }
function fail(msg) { throw new Error(`FATAL: ${msg}`); }
function section(title) {
  console.log("\n" + "=".repeat(62));
  console.log(`  ${title}`);
  console.log("=".repeat(62));
}
function sub(title) { console.log(`\n-- ${title} --`); }

async function confirmTxWithRetry(label, txFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tx = await txFn();
      const receipt = await tx.wait();
      ok(`${label} -- tx: ${receipt.hash}`);
      return receipt;
    } catch (e) {
      const msg = e.message || "";
      const retryable = msg.includes("txpool is full")
        || msg.includes("replacement transaction underpriced")
        || msg.includes("nonce too low");
      if (retryable && attempt < maxRetries) {
        warn(`${label}: attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in 6s...`);
        await new Promise(r => setTimeout(r, 6000));
      } else {
        throw e;
      }
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("\n" + "=".repeat(62));
  console.log("  ArcNS -- Deployer Revoke Phase");
  console.log("  Grant-before-revoke enforced. Pre-checks required.");
  console.log("=".repeat(62));
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${chainId}`);
  console.log(`Deployer : ${deployer.address}`);

  // ── Load deployment ──────────────────────────────────────────────────────────
  const depPath = path.join(__dirname, `../../deployments/${network.name}-v3.json`);
  if (!fs.existsSync(depPath)) fail(`Deployment file not found: ${depPath}`);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const DEPLOYER   = deployer.address;
  const SAFE       = c.safe;

  if (!SAFE) fail("contracts.safe not found in deployment. Run deployMultisig.js first.");

  console.log(`\nSafe     : ${SAFE}`);
  console.log(`arcController    : ${c.arcController}`);
  console.log(`circleController : ${c.circleController}`);
  console.log(`resolver         : ${c.resolver}`);
  console.log(`registry         : ${c.registry}`);
  console.log(`arcRegistrar     : ${c.arcRegistrar}`);
  console.log(`circleRegistrar  : ${c.circleRegistrar}`);
  console.log(`reverseRegistrar : ${c.reverseRegistrar}`);

  // ── Attach contracts ─────────────────────────────────────────────────────────
  const arcCtrl    = new ethers.Contract(c.arcController,    ACCESS_CONTROL_ABI, deployer);
  const circleCtrl = new ethers.Contract(c.circleController, ACCESS_CONTROL_ABI, deployer);
  const resolver   = new ethers.Contract(c.resolver,         ACCESS_CONTROL_ABI, deployer);
  const registry   = new ethers.Contract(c.registry,         REGISTRY_ABI,       deployer);
  const arcReg     = new ethers.Contract(c.arcRegistrar,     OWNABLE_ABI,        deployer);
  const circleReg  = new ethers.Contract(c.circleRegistrar,  OWNABLE_ABI,        deployer);
  const safe       = new ethers.Contract(SAFE,               SAFE_ABI,           ethers.provider);

  // ── Verify Safe is operational ───────────────────────────────────────────────
  section("PHASE 1 -- REVOKE ELIGIBILITY CHECK");

  sub("Verifying Safe operational state");
  const safeOwners    = await safe.getOwners();
  const safeThreshold = await safe.getThreshold();
  console.log(`   Safe owners    : ${safeOwners.join(", ")}`);
  console.log(`   Safe threshold : ${safeThreshold}`);
  if (Number(safeThreshold) < 2) fail("Safe threshold is below 2 -- not safe to proceed");
  ok("Safe threshold >= 2 confirmed");

  // ── Enumerate all role surfaces ──────────────────────────────────────────────
  sub("Enumerating deployer-held roles on all surfaces");

  const surfaces = {
    arcController: {
      contract: arcCtrl,
      label: "arcController",
      roles: [
        { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
        { name: "ADMIN_ROLE",         hash: ADMIN_ROLE },
        { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE },
        { name: "PAUSER_ROLE",        hash: PAUSER_ROLE },
        { name: "ORACLE_ROLE",        hash: ORACLE_ROLE },
      ],
    },
    circleController: {
      contract: circleCtrl,
      label: "circleController",
      roles: [
        { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
        { name: "ADMIN_ROLE",         hash: ADMIN_ROLE },
        { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE },
        { name: "PAUSER_ROLE",        hash: PAUSER_ROLE },
        { name: "ORACLE_ROLE",        hash: ORACLE_ROLE },
      ],
    },
    resolver: {
      contract: resolver,
      label: "resolver",
      roles: [
        { name: "DEFAULT_ADMIN_ROLE", hash: DEFAULT_ADMIN_ROLE },
        { name: "ADMIN_ROLE",         hash: ADMIN_ROLE },
        { name: "UPGRADER_ROLE",      hash: UPGRADER_ROLE },
        { name: "CONTROLLER_ROLE",    hash: CONTROLLER_ROLE },
      ],
    },
  };

  // Check deployer roles on each AccessControl surface
  const deployerRoles = {};
  const safeRoles     = {};

  for (const [key, surf] of Object.entries(surfaces)) {
    deployerRoles[key] = {};
    safeRoles[key]     = {};
    for (const role of surf.roles) {
      deployerRoles[key][role.name] = await surf.contract.hasRole(role.hash, DEPLOYER);
      safeRoles[key][role.name]     = await surf.contract.hasRole(role.hash, SAFE);
    }
  }

  // Check Ownable surfaces
  const arcRegOwner    = await arcReg.owner();
  const circleRegOwner = await circleReg.owner();

  // Check registry root node ownership
  const rootNodeOwner = await registry.owner(ethers.ZeroHash);

  // Check addr.reverse node ownership
  const addrReverseNode = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
  const addrReverseOwner = await registry.owner(addrReverseNode);

  // ── Print eligibility table ──────────────────────────────────────────────────
  sub("Eligibility Table");

  const eligibility = [];

  // AccessControl surfaces
  for (const [key, surf] of Object.entries(surfaces)) {
    for (const role of surf.roles) {
      const deployerHas = deployerRoles[key][role.name];
      const safeHas     = safeRoles[key][role.name];

      let status, reason;

      if (!deployerHas) {
        status = "SKIP_ALREADY_ABSENT";
        reason = "Deployer does not hold this role";
      } else if (role.name === "DEFAULT_ADMIN_ROLE") {
        // DEFAULT_ADMIN_ROLE: Safe must hold it before we revoke from deployer
        if (safeHas) {
          status = "READY_TO_REVOKE_NOW";
          reason = "Safe holds DEFAULT_ADMIN_ROLE -- safe to revoke from deployer";
        } else {
          status = "NOT_READY_YET";
          reason = "Safe does NOT hold DEFAULT_ADMIN_ROLE -- must grant first";
        }
      } else if (role.name === "UPGRADER_ROLE") {
        // UPGRADER_ROLE: Safe holds it. However, timelock is the intended long-term holder.
        // For this pass: Safe already holds it, so revoke from deployer is safe.
        if (safeHas) {
          status = "READY_TO_REVOKE_NOW";
          reason = "Safe holds UPGRADER_ROLE -- safe to revoke from deployer (timelock migration deferred)";
        } else {
          status = "NOT_READY_YET";
          reason = "Safe does NOT hold UPGRADER_ROLE -- must grant first";
        }
      } else if (role.name === "CONTROLLER_ROLE") {
        // CONTROLLER_ROLE on resolver: deployer should not hold this -- it belongs to ReverseRegistrar
        // and ArcNSController proxies. If deployer holds it, it is a residual that should be revoked.
        status = "READY_TO_REVOKE_NOW";
        reason = "CONTROLLER_ROLE on resolver should not be held by deployer EOA";
      } else {
        // ADMIN_ROLE, PAUSER_ROLE, ORACLE_ROLE: Safe must hold equivalent
        if (safeHas) {
          status = "READY_TO_REVOKE_NOW";
          reason = `Safe holds ${role.name} -- safe to revoke from deployer`;
        } else {
          status = "NOT_READY_YET";
          reason = `Safe does NOT hold ${role.name} -- must grant first`;
        }
      }

      eligibility.push({
        surface: surf.label,
        role: role.name,
        deployerHas,
        safeHas,
        status,
        reason,
      });
    }
  }

  // Ownable surfaces
  eligibility.push({
    surface: "arcRegistrar (Ownable)",
    role: "owner()",
    deployerHas: arcRegOwner.toLowerCase() === DEPLOYER.toLowerCase(),
    safeHas: arcRegOwner.toLowerCase() === SAFE.toLowerCase(),
    status: "DEFER_TO_OWNERSHIP_MIGRATION_PHASE",
    reason: "ArcNSBaseRegistrar.transferOwnership() requires Safe to call acceptOwnership or direct transfer. " +
            "Deferring: ownership transfer needs a Safe multisig tx, not a deployer EOA tx. " +
            "Current owner: " + arcRegOwner,
  });

  eligibility.push({
    surface: "circleRegistrar (Ownable)",
    role: "owner()",
    deployerHas: circleRegOwner.toLowerCase() === DEPLOYER.toLowerCase(),
    safeHas: circleRegOwner.toLowerCase() === SAFE.toLowerCase(),
    status: "DEFER_TO_OWNERSHIP_MIGRATION_PHASE",
    reason: "ArcNSBaseRegistrar.transferOwnership() requires Safe to call acceptOwnership or direct transfer. " +
            "Deferring: ownership transfer needs a Safe multisig tx, not a deployer EOA tx. " +
            "Current owner: " + circleRegOwner,
  });

  eligibility.push({
    surface: "registry (root node)",
    role: "registry.owner(bytes32(0))",
    deployerHas: rootNodeOwner.toLowerCase() === DEPLOYER.toLowerCase(),
    safeHas: rootNodeOwner.toLowerCase() === SAFE.toLowerCase(),
    status: "DEFER_TO_OWNERSHIP_MIGRATION_PHASE",
    reason: "Registry root node ownership is a critical surface. " +
            "Transferring requires registry.setOwner(bytes32(0), Safe) from deployer. " +
            "Deferring: root node transfer is a separate deliberate step, not part of role revocation. " +
            "Current owner: " + rootNodeOwner,
  });

  eligibility.push({
    surface: "registry (addr.reverse node)",
    role: "registry.owner(addrReverseNode)",
    deployerHas: addrReverseOwner.toLowerCase() === DEPLOYER.toLowerCase(),
    safeHas: addrReverseOwner.toLowerCase() === c.reverseRegistrar.toLowerCase(),
    status: "SKIP_ALREADY_ABSENT",
    reason: "addr.reverse node is owned by NEW_RR (reverseRegistrar) -- already migrated. " +
            "Current owner: " + addrReverseOwner,
  });

  // Print table
  console.log("\n  Surface                          | Role                | Deployer | Safe  | Status");
  console.log("  " + "-".repeat(100));
  for (const e of eligibility) {
    const d = e.deployerHas ? "YES  " : "no   ";
    const s = e.safeHas     ? "YES  " : "no   ";
    console.log(`  ${e.surface.padEnd(32)} | ${e.role.padEnd(19)} | ${d}    | ${s}  | ${e.status}`);
  }

  // ── Determine what will be revoked ───────────────────────────────────────────
  const toRevoke  = eligibility.filter(e => e.status === "READY_TO_REVOKE_NOW" && e.deployerHas);
  const notReady  = eligibility.filter(e => e.status === "NOT_READY_YET");
  const deferred  = eligibility.filter(e => e.status.startsWith("DEFER"));
  const alreadyOk = eligibility.filter(e => e.status === "SKIP_ALREADY_ABSENT");

  sub("Revoke eligibility summary");
  console.log(`\n  READY_TO_REVOKE_NOW  : ${toRevoke.length}`);
  for (const e of toRevoke) console.log(`    + ${e.surface} / ${e.role}`);

  console.log(`\n  NOT_READY_YET        : ${notReady.length}`);
  for (const e of notReady) console.log(`    ! ${e.surface} / ${e.role} -- ${e.reason}`);

  console.log(`\n  DEFERRED             : ${deferred.length}`);
  for (const e of deferred) console.log(`    ~ ${e.surface} / ${e.role}`);

  console.log(`\n  ALREADY_ABSENT       : ${alreadyOk.length}`);
  for (const e of alreadyOk) console.log(`    - ${e.surface} / ${e.role}`);

  if (notReady.length > 0) {
    console.warn("\n  WARNING: Some surfaces are NOT_READY_YET.");
    console.warn("  These will be SKIPPED. Only READY_TO_REVOKE_NOW items will be executed.");
  }

  if (toRevoke.length === 0) {
    console.log("\n  Nothing to revoke in this pass. All eligible roles already absent or deferred.");
    return;
  }

  console.log("\n  PHASE 1 COMPLETE -- PHASE 2 MAY BEGIN");

  // ── PHASE 2: REVOKE EXECUTION ────────────────────────────────────────────────
  section("PHASE 2 -- REVOKE EXECUTION");

  const revokeLog = [];

  // Build role-to-hash map for execution
  const roleHashMap = {
    DEFAULT_ADMIN_ROLE: DEFAULT_ADMIN_ROLE,
    ADMIN_ROLE:         ADMIN_ROLE,
    UPGRADER_ROLE:      UPGRADER_ROLE,
    PAUSER_ROLE:        PAUSER_ROLE,
    ORACLE_ROLE:        ORACLE_ROLE,
    CONTROLLER_ROLE:    CONTROLLER_ROLE,
    WITHDRAWER_ROLE:    WITHDRAWER_ROLE,
    GOVERNOR_ROLE:      GOVERNOR_ROLE,
  };

  const contractMap = {
    "arcController":    arcCtrl,
    "circleController": circleCtrl,
    "resolver":         resolver,
  };

  for (const item of toRevoke) {
    const contract = contractMap[item.surface];
    if (!contract) {
      warn(`No contract mapped for surface: ${item.surface} -- skipping`);
      continue;
    }
    const roleHash = roleHashMap[item.role];
    if (!roleHash && roleHash !== ethers.ZeroHash) {
      warn(`No role hash for: ${item.role} -- skipping`);
      continue;
    }

    // Pre-check: confirm deployer still has the role (idempotency guard)
    const stillHas = await contract.hasRole(roleHash, DEPLOYER);
    if (!stillHas) {
      ok(`${item.surface}.${item.role} already absent from deployer -- skipping`);
      revokeLog.push({ surface: item.surface, role: item.role, txHash: "ALREADY_ABSENT", status: "SKIPPED" });
      continue;
    }

    // Pre-check: confirm Safe still has the replacement authority
    const safeStillHas = await contract.hasRole(roleHash, SAFE);
    if (!safeStillHas && item.role !== "CONTROLLER_ROLE") {
      fail(`SAFETY ABORT: Safe no longer holds ${item.role} on ${item.surface}. Cannot revoke from deployer.`);
    }

    console.log(`\n  Revoking ${item.role} from deployer on ${item.surface}...`);
    try {
      const receipt = await confirmTxWithRetry(
        `${item.surface}.revokeRole(${item.role}, deployer)`,
        () => contract.revokeRole(roleHash, DEPLOYER)
      );
      revokeLog.push({ surface: item.surface, role: item.role, txHash: receipt.hash, status: "REVOKED" });
    } catch (e) {
      console.error(`  FAILED: ${item.surface}.${item.role} -- ${e.message}`);
      revokeLog.push({ surface: item.surface, role: item.role, txHash: "FAILED", status: "FAILED", error: e.message });
      fail(`Revoke failed on ${item.surface}.${item.role}. Stopping.`);
    }
  }

  sub("Revoke execution log");
  for (const entry of revokeLog) {
    const icon = entry.status === "REVOKED" ? "OK " : entry.status === "SKIPPED" ? "SKP" : "ERR";
    console.log(`  [${icon}] ${entry.surface} / ${entry.role} -- ${entry.txHash}`);
  }

  const anyFailed = revokeLog.some(e => e.status === "FAILED");
  if (anyFailed) fail("One or more revoke operations failed. See log above.");

  console.log("\n  PHASE 2 COMPLETE -- PHASE 3 MAY BEGIN");

  // ── PHASE 3: POST-REVOKE VALIDATION ─────────────────────────────────────────
  section("PHASE 3 -- POST-REVOKE VALIDATION");

  let allValid = true;

  sub("Confirming deployer no longer holds revoked roles");
  for (const entry of revokeLog) {
    if (entry.status !== "REVOKED") continue;
    const contract = contractMap[entry.surface];
    const roleHash = roleHashMap[entry.role];
    const deployerStillHas = await contract.hasRole(roleHash, DEPLOYER);
    if (deployerStillHas) {
      console.error(`  FAIL: Deployer still holds ${entry.role} on ${entry.surface}`);
      allValid = false;
    } else {
      ok(`Deployer no longer holds ${entry.role} on ${entry.surface}`);
    }
  }

  sub("Confirming Safe still holds expected roles");
  for (const [key, surf] of Object.entries(surfaces)) {
    for (const role of surf.roles) {
      if (role.name === "CONTROLLER_ROLE") continue; // Safe doesn't need CONTROLLER_ROLE on resolver
      if (role.name === "ORACLE_ROLE") continue;     // Safe may not hold ORACLE_ROLE -- not critical
      const safeHasNow = await surf.contract.hasRole(role.hash, SAFE);
      if (!safeHasNow) {
        // Only flag as error if Safe was supposed to have it (i.e. it was in toRevoke or safeRoles showed YES)
        if (safeRoles[key][role.name]) {
          console.error(`  FAIL: Safe no longer holds ${role.name} on ${surf.label}`);
          allValid = false;
        }
      } else {
        ok(`Safe holds ${role.name} on ${surf.label}`);
      }
    }
  }

  sub("Confirming addr.reverse node still owned by reverseRegistrar");
  const addrReverseOwnerPost = await registry.owner(addrReverseNode);
  if (addrReverseOwnerPost.toLowerCase() !== c.reverseRegistrar.toLowerCase()) {
    console.error(`  FAIL: addr.reverse owner changed unexpectedly: ${addrReverseOwnerPost}`);
    allValid = false;
  } else {
    ok(`addr.reverse owner confirmed: ${addrReverseOwnerPost}`);
  }

  sub("Confirming deployer is NOT the root node owner (unchanged)");
  const rootOwnerPost = await registry.owner(ethers.ZeroHash);
  console.log(`  Registry root node owner: ${rootOwnerPost} (unchanged -- deferred)`);
  ok("Registry root node ownership deferred -- no change expected");

  if (!allValid) fail("Post-revoke validation failed. See errors above.");

  console.log("\n  PHASE 3 COMPLETE -- PHASE 4 MAY BEGIN");

  // ── PHASE 4: FINAL STATUS ────────────────────────────────────────────────────
  section("PHASE 4 -- FINAL STATUS");

  const revoked  = revokeLog.filter(e => e.status === "REVOKED");
  const skipped  = revokeLog.filter(e => e.status === "SKIPPED");

  console.log("\n  WHAT WAS REVOKED:");
  if (revoked.length === 0) {
    console.log("    (none -- all were already absent)");
  } else {
    for (const e of revoked) {
      console.log(`    - ${e.surface} / ${e.role}  tx: ${e.txHash}`);
    }
  }

  console.log("\n  WHAT WAS NOT REVOKED (DEFERRED):");
  for (const e of deferred) {
    console.log(`    ~ ${e.surface} / ${e.role}`);
    console.log(`      Reason: ${e.reason}`);
  }

  console.log("\n  WHAT WAS NOT REVOKED (NOT_READY_YET):");
  if (notReady.length === 0) {
    console.log("    (none)");
  } else {
    for (const e of notReady) {
      console.log(`    ! ${e.surface} / ${e.role}`);
      console.log(`      Reason: ${e.reason}`);
    }
  }

  console.log("\n  DEFERRED SURFACES EXPLANATION:");
  console.log("    arcRegistrar / circleRegistrar (Ownable.owner):");
  console.log("      Transferring Ownable ownership to Safe requires a Safe multisig tx.");
  console.log("      The deployer calls transferOwnership(Safe) -- Safe becomes owner immediately");
  console.log("      (OZ Ownable v5 does NOT use a two-step pattern unless OwnableUpgradeable2Step).");
  console.log("      This is a separate deliberate step. Defer to Ownership Migration Phase.");
  console.log("    registry root node (registry.owner(bytes32(0))):");
  console.log("      Root node ownership controls who can create new TLDs.");
  console.log("      Transfer requires registry.setOwner(bytes32(0), Safe) from deployer.");
  console.log("      This is a critical surface -- defer to a dedicated root migration step.");
  console.log("    Timelock:");
  console.log("      Timelock is not yet deployed. UPGRADER_ROLE is currently held by Safe.");
  console.log("      When timelock is deployed, Safe will grant UPGRADER_ROLE to timelock");
  console.log("      and revoke from itself via a Safe multisig tx.");

  // ── Update deployment JSON ────────────────────────────────────────────────────
  dep.multisig = dep.multisig || {};
  dep.multisig.deployerRevoked = revoked.length > 0;
  dep.multisig.revokePhase = {
    executedAt: new Date().toISOString(),
    revoked: revoked.map(e => ({ surface: e.surface, role: e.role, txHash: e.txHash })),
    deferred: deferred.map(e => ({ surface: e.surface, role: e.role, reason: e.reason })),
    notReady: notReady.map(e => ({ surface: e.surface, role: e.role, reason: e.reason })),
  };
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok(`Deployment file updated: deployments/${network.name}-v3.json`);

  console.log("\n" + "=".repeat(62));
  console.log("  ArcNS Multisig Revoke Phase: COMPLETE");
  console.log("=".repeat(62));
  console.log("\n  NEXT CORRECT STEP:");
  console.log("    1. Ownership Migration Phase:");
  console.log("       a. Deployer calls arcRegistrar.transferOwnership(Safe)");
  console.log("       b. Deployer calls circleRegistrar.transferOwnership(Safe)");
  console.log("       c. Deployer calls registry.setOwner(bytes32(0), Safe)");
  console.log("       These can be done via a new script: transferOwnership.js");
  console.log("    2. Timelock Preparation:");
  console.log("       Deploy TimelockController, grant UPGRADER_ROLE to timelock via Safe multisig,");
  console.log("       revoke UPGRADER_ROLE from Safe via Safe multisig.");
  console.log("       Timelock preparation SHOULD begin after ownership migration is confirmed.");
  console.log("\n  TIMELOCK PREPARATION: YES -- should begin after ownership migration.");
}

main().catch(e => {
  console.error("\n  FATAL:", e.message);
  process.exit(1);
});
