/**
 * ArcNS -- Timelock Deployment Script (PREPARATION ONLY)
 *
 * Phase 1: Deploy OZ TimelockController
 * Phase 2: Verify timelock on-chain
 * Phase 3: Grant UPGRADER_ROLE to timelock via Safe multisig (3 txs)
 * Phase 4: Revoke UPGRADER_ROLE from Safe via Safe multisig (3 txs)
 * Phase 5: Post-migration validation
 *
 * Design:
 *   delay     : 48 hours (172800 seconds)
 *   proposer  : Safe (0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3)
 *   executor  : Safe
 *   canceller : Safe (implicit -- proposers are cancellers in OZ v5)
 *   admin     : address(0) -- self-administered
 *
 * IMPORTANT: This script deploys the timelock and migrates UPGRADER_ROLE.
 * It does NOT execute any upgrade. Upgrades must be scheduled via the
 * timelock (48h delay) and executed by the Safe after the delay.
 *
 * Usage:
 *   Step 1 -- Deploy timelock only (no role migration):
 *     npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet
 *
 *   Step 2 -- Deploy + migrate UPGRADER_ROLE (requires Safe owner keys):
 *     $env:SAFE_OWNER_KEY_1="0xKEY1"
 *     $env:SAFE_OWNER_KEY_2="0xKEY2"
 *     $env:MIGRATE_UPGRADER_ROLE="1"
 *     npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet
 *
 * Environment variables:
 *   PRIVATE_KEY          -- executor key (gas payer, from .env)
 *   SAFE_OWNER_KEY_1     -- Safe owner key 1 (required for MIGRATE_UPGRADER_ROLE=1)
 *   SAFE_OWNER_KEY_2     -- Safe owner key 2 (required for MIGRATE_UPGRADER_ROLE=1)
 *   MIGRATE_UPGRADER_ROLE -- "1" to also migrate UPGRADER_ROLE to timelock (default: "0")
 *   TIMELOCK_DELAY       -- delay in seconds (default: 172800 = 48h)
 */

"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ---- Role hashes ----
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const UPGRADER_ROLE      = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));

// ---- OZ TimelockController ABI (minimal) ----
const TIMELOCK_ABI = [
  "function getMinDelay() external view returns (uint256)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function PROPOSER_ROLE() external view returns (bytes32)",
  "function EXECUTOR_ROLE() external view returns (bytes32)",
  "function CANCELLER_ROLE() external view returns (bytes32)",
  "function TIMELOCK_ADMIN_ROLE() external view returns (bytes32)",
];

// ---- Safe ABI (minimal) ----
const SAFE_ABI = [
  "function nonce() public view returns (uint256)",
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
  "function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
  "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool success)",
];

// ---- AccessControl ABI ----
const AC_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function grantRole(bytes32 role, address account) external",
  "function revokeRole(bytes32 role, address account) external",
];

// ---- Safe EIP-712 type hashes ----
const SAFE_DOMAIN_SEPARATOR_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes("EIP712Domain(uint256 chainId,address verifyingContract)")
);
const SAFE_TX_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  )
);

// ---- Helpers ----
function ok(msg)   { console.log("   OK  " + msg); }
function warn(msg) { console.warn("   WARN " + msg); }
function fail(msg) { throw new Error("FATAL: " + msg); }
function section(t) { console.log("\n" + "=".repeat(62) + "\n  " + t + "\n" + "=".repeat(62)); }
function sub(t)     { console.log("\n-- " + t + " --"); }

function computeSafeTxHash(chainId, safeAddress, tx) {
  const domainSeparator = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "address"],
      [SAFE_DOMAIN_SEPARATOR_TYPEHASH, chainId, safeAddress]
    )
  );
  const dataHash = ethers.keccak256(tx.data);
  const safeTxHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32","address","uint256","bytes32","uint8","uint256","uint256","uint256","address","address","uint256"],
      [SAFE_TX_TYPEHASH, tx.to, tx.value, dataHash, tx.operation,
       tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.nonce]
    )
  );
  const finalHash = ethers.keccak256(ethers.concat(["0x1901", domainSeparator, safeTxHash]));
  return { domainSeparator, safeTxHash, finalHash };
}

async function signSafeTxHash(txHash, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sig = wallet.signingKey.sign(txHash);
  return {
    r: sig.r, s: sig.s, v: sig.v,
    address: wallet.address,
    signature: ethers.concat([sig.r, sig.s, ethers.toBeHex(sig.v, 1)]),
  };
}

function packSignatures(sig1, sig2) {
  const sorted = [sig1, sig2].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );
  return ethers.concat([sorted[0].signature, sorted[1].signature]);
}

async function confirmTxWithRetry(label, txFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const t = await txFn();
      const r = await t.wait();
      ok(label + " -- tx: " + r.hash);
      return r;
    } catch (e) {
      const msg = e.message || "";
      if ((msg.includes("txpool is full") || msg.includes("nonce too low")) && attempt < maxRetries) {
        warn(label + ": attempt " + attempt + " failed, retrying in 6s...");
        await new Promise(r => setTimeout(r, 6000));
      } else throw e;
    }
  }
}

async function executeSafeTx(safe, executor, chainId, safeAddress, ownerKey1, ownerKey2, label, txParams) {
  const currentNonce = await safe.nonce();
  const tx = {
    to: txParams.to, value: 0n, data: txParams.data,
    operation: 0, safeTxGas: 0n, baseGas: 0n, gasPrice: 0n,
    gasToken: ethers.ZeroAddress, refundReceiver: ethers.ZeroAddress,
    nonce: currentNonce,
  };

  const { finalHash } = computeSafeTxHash(chainId, safeAddress, tx);
  const onChainHash = await safe.getTransactionHash(
    tx.to, tx.value, tx.data, tx.operation,
    tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, tx.nonce
  );
  if (finalHash.toLowerCase() !== onChainHash.toLowerCase()) {
    fail("EIP-712 hash mismatch for " + label);
  }

  const sig1 = await signSafeTxHash(finalHash, ownerKey1);
  const sig2 = await signSafeTxHash(finalHash, ownerKey2);
  const packedSigs = packSignatures(sig1, sig2);

  const receipt = await confirmTxWithRetry(
    "Safe.execTransaction (" + label + ")",
    () => safe.connect(executor).execTransaction(
      tx.to, tx.value, tx.data, tx.operation,
      tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, packedSigs
    )
  );

  const execFailureTopic = ethers.id("ExecutionFailure(bytes32,uint256)");
  if (receipt.logs.find(l => l.topics[0] === execFailureTopic)) {
    fail("Safe emitted ExecutionFailure for: " + label);
  }
  return receipt;
}

// ---- Main ----
async function main() {
  const ownerKey1 = process.env.SAFE_OWNER_KEY_1;
  const ownerKey2 = process.env.SAFE_OWNER_KEY_2;
  const migrateUpgraderRole = (process.env.MIGRATE_UPGRADER_ROLE || "0") === "1";
  const timelockDelay = BigInt(process.env.TIMELOCK_DELAY || "172800"); // 48h default

  const [executor] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  section("ArcNS -- Timelock Deployment");
  console.log("Network  : " + network.name);
  console.log("Chain ID : " + chainId);
  console.log("Executor : " + executor.address);
  console.log("Delay    : " + timelockDelay + "s (" + (Number(timelockDelay) / 3600) + "h)");
  console.log("Mode     : " + (migrateUpgraderRole ? "DEPLOY + MIGRATE UPGRADER_ROLE" : "DEPLOY ONLY"));

  if (migrateUpgraderRole && (!ownerKey1 || !ownerKey2)) {
    fail(
      "SAFE_OWNER_KEY_1 and SAFE_OWNER_KEY_2 required for MIGRATE_UPGRADER_ROLE=1.\n" +
      "  $env:SAFE_OWNER_KEY_1='0xKEY1'\n" +
      "  $env:SAFE_OWNER_KEY_2='0xKEY2'"
    );
  }

  const depPath = path.join(__dirname, "../../deployments/" + network.name + "-v3.json");
  if (!fs.existsSync(depPath)) fail("Deployment file not found: " + depPath);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const SAFE_ADDRESS = c.safe;
  if (!SAFE_ADDRESS) fail("contracts.safe not found");

  console.log("\nSafe             : " + SAFE_ADDRESS);
  console.log("arcController    : " + c.arcController);
  console.log("circleController : " + c.circleController);
  console.log("resolver         : " + c.resolver);

  // ============================================================
  section("PHASE 1 -- DEPLOY TIMELOCK");
  // ============================================================

  let timelockAddress = c.timelock;

  if (timelockAddress) {
    const code = await ethers.provider.getCode(timelockAddress);
    if (code && code !== "0x") {
      console.log("  Timelock already deployed: " + timelockAddress + " -- skipping");
    } else {
      console.log("  Timelock address in deployment has no bytecode -- redeploying");
      timelockAddress = null;
    }
  }

  if (!timelockAddress) {
    // OZ TimelockController constructor:
    //   constructor(uint256 minDelay, address[] proposers, address[] executors, address admin)
    // admin = address(0) => self-administered
    const TimelockFactory = await ethers.getContractFactory(
      "contracts/v3/governance/ArcNSTimelock.sol:ArcNSTimelock",
      executor
    );

    console.log("  Deploying TimelockController...");
    console.log("  proposers : [" + SAFE_ADDRESS + "]");
    console.log("  executors : [" + SAFE_ADDRESS + "]");
    console.log("  admin     : address(0) (self-administered)");
    console.log("  delay     : " + timelockDelay + "s");

    let timelock;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        timelock = await TimelockFactory.deploy(
          timelockDelay,
          [SAFE_ADDRESS],   // proposers
          [SAFE_ADDRESS],   // executors
          ethers.ZeroAddress // admin = self
        );
        await timelock.waitForDeployment();
        break;
      } catch (e) {
        const msg = e.message || "";
        if (msg.includes("txpool is full") && attempt < 3) {
          warn("Deploy attempt " + attempt + " failed (txpool full), retrying in 8s...");
          await new Promise(r => setTimeout(r, 8000));
        } else throw e;
      }
    }

    timelockAddress = await timelock.getAddress();
    ok("TimelockController deployed: " + timelockAddress);
  }

  // ============================================================
  section("PHASE 2 -- VERIFY TIMELOCK");
  // ============================================================

  const timelock = new ethers.Contract(timelockAddress, TIMELOCK_ABI, ethers.provider);

  const minDelay       = await timelock.getMinDelay();
  const PROPOSER_ROLE  = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE  = await timelock.EXECUTOR_ROLE();
  const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

  const safeIsProposer  = await timelock.hasRole(PROPOSER_ROLE,  SAFE_ADDRESS);
  const safeIsExecutor  = await timelock.hasRole(EXECUTOR_ROLE,  SAFE_ADDRESS);
  const safeIsCanceller = await timelock.hasRole(CANCELLER_ROLE, SAFE_ADDRESS);
  const timelockIsAdmin = await timelock.hasRole(DEFAULT_ADMIN_ROLE, timelockAddress);
  const executorIsAdmin = await timelock.hasRole(DEFAULT_ADMIN_ROLE, executor.address);
  const safeIsAdmin     = await timelock.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);

  console.log("  Timelock address  : " + timelockAddress);
  console.log("  minDelay          : " + minDelay + "s (" + (Number(minDelay) / 3600) + "h)");
  console.log("  Safe is proposer  : " + safeIsProposer);
  console.log("  Safe is executor  : " + safeIsExecutor);
  console.log("  Safe is canceller : " + safeIsCanceller);
  console.log("  Timelock is admin : " + timelockIsAdmin);
  console.log("  Executor is admin : " + executorIsAdmin);
  console.log("  Safe is admin     : " + safeIsAdmin);

  if (!safeIsProposer)  fail("Safe is NOT proposer on timelock");
  if (!safeIsExecutor)  fail("Safe is NOT executor on timelock");
  if (!safeIsCanceller) fail("Safe is NOT canceller on timelock");
  if (executorIsAdmin)  fail("Executor EOA has admin on timelock -- unsafe");
  if (safeIsAdmin)      warn("Safe has admin on timelock -- expected only if admin was set to Safe");

  ok("Timelock verified: Safe is proposer + executor + canceller");
  ok("Timelock is self-administered (no external admin)");

  // Update deployment file with timelock address
  c.timelock = timelockAddress;
  dep.governance = dep.governance || {};
  dep.governance.timelock = {
    address:   timelockAddress,
    delay:     timelockDelay.toString(),
    proposer:  SAFE_ADDRESS,
    executor:  SAFE_ADDRESS,
    canceller: SAFE_ADDRESS,
    admin:     "address(0)",
    deployedAt: new Date().toISOString(),
    deployedBy: executor.address,
  };
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok("Deployment file updated with timelock address");

  if (!migrateUpgraderRole) {
    console.log("\n" + "=".repeat(62));
    console.log("  TIMELOCK DEPLOYED AND VERIFIED");
    console.log("  UPGRADER_ROLE migration NOT executed (MIGRATE_UPGRADER_ROLE=0)");
    console.log("  To migrate UPGRADER_ROLE, re-run with:");
    console.log("    $env:MIGRATE_UPGRADER_ROLE='1'");
    console.log("    $env:SAFE_OWNER_KEY_1='0xKEY1'");
    console.log("    $env:SAFE_OWNER_KEY_2='0xKEY2'");
    console.log("    npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet");
    console.log("=".repeat(62));
    return;
  }

  // ============================================================
  section("PHASE 3 -- GRANT UPGRADER_ROLE TO TIMELOCK (via Safe)");
  // ============================================================

  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, executor);
  const acInterface = new ethers.Interface(AC_ABI);

  const upgradeTargets = [
    { label: "arcController",    address: c.arcController },
    { label: "circleController", address: c.circleController },
    { label: "resolver",         address: c.resolver },
  ];

  const grantLog = [];

  for (const target of upgradeTargets) {
    const ac = new ethers.Contract(target.address, AC_ABI, ethers.provider);
    const timelockAlreadyHas = await ac.hasRole(UPGRADER_ROLE, timelockAddress);
    if (timelockAlreadyHas) {
      ok(target.label + ": timelock already holds UPGRADER_ROLE -- skipping grant");
      grantLog.push({ label: target.label, txHash: "ALREADY_HELD", status: "SKIPPED" });
      continue;
    }

    const calldata = acInterface.encodeFunctionData("grantRole", [UPGRADER_ROLE, timelockAddress]);
    const receipt = await executeSafeTx(
      safe, executor, chainId, SAFE_ADDRESS, ownerKey1, ownerKey2,
      target.label + ".grantRole(UPGRADER_ROLE, timelock)",
      { to: target.address, data: calldata }
    );

    // Post-check
    const nowHas = await ac.hasRole(UPGRADER_ROLE, timelockAddress);
    if (!nowHas) fail("Post-check failed: timelock does not hold UPGRADER_ROLE on " + target.label);
    ok("Post-check: timelock holds UPGRADER_ROLE on " + target.label);
    grantLog.push({ label: target.label, txHash: receipt.hash, status: "GRANTED" });
  }

  if (grantLog.some(g => g.status === "FAILED")) fail("One or more UPGRADER_ROLE grants failed.");
  console.log("\n  PHASE 3 COMPLETE -- PHASE 4 MAY BEGIN");

  // ============================================================
  section("PHASE 4 -- REVOKE UPGRADER_ROLE FROM SAFE (via Safe)");
  // ============================================================

  const revokeLog = [];

  for (const target of upgradeTargets) {
    const ac = new ethers.Contract(target.address, AC_ABI, ethers.provider);
    const safeStillHas = await ac.hasRole(UPGRADER_ROLE, SAFE_ADDRESS);
    if (!safeStillHas) {
      ok(target.label + ": Safe no longer holds UPGRADER_ROLE -- skipping revoke");
      revokeLog.push({ label: target.label, txHash: "ALREADY_ABSENT", status: "SKIPPED" });
      continue;
    }

    // Safety: confirm timelock holds UPGRADER_ROLE before revoking from Safe
    const timelockHas = await ac.hasRole(UPGRADER_ROLE, timelockAddress);
    if (!timelockHas) {
      fail("SAFETY ABORT: Timelock does not hold UPGRADER_ROLE on " + target.label + ". Cannot revoke from Safe.");
    }

    const calldata = acInterface.encodeFunctionData("revokeRole", [UPGRADER_ROLE, SAFE_ADDRESS]);
    const receipt = await executeSafeTx(
      safe, executor, chainId, SAFE_ADDRESS, ownerKey1, ownerKey2,
      target.label + ".revokeRole(UPGRADER_ROLE, Safe)",
      { to: target.address, data: calldata }
    );

    // Post-check
    const safeGone = !(await ac.hasRole(UPGRADER_ROLE, SAFE_ADDRESS));
    if (!safeGone) fail("Post-check failed: Safe still holds UPGRADER_ROLE on " + target.label);
    ok("Post-check: Safe no longer holds UPGRADER_ROLE on " + target.label);
    revokeLog.push({ label: target.label, txHash: receipt.hash, status: "REVOKED" });
  }

  if (revokeLog.some(r => r.status === "FAILED")) fail("One or more UPGRADER_ROLE revokes failed.");
  console.log("\n  PHASE 4 COMPLETE -- PHASE 5 MAY BEGIN");

  // ============================================================
  section("PHASE 5 -- POST-MIGRATION VALIDATION");
  // ============================================================

  let allValid = true;

  for (const target of upgradeTargets) {
    const ac = new ethers.Contract(target.address, AC_ABI, ethers.provider);
    const timelockHas = await ac.hasRole(UPGRADER_ROLE, timelockAddress);
    const safeHas     = await ac.hasRole(UPGRADER_ROLE, SAFE_ADDRESS);

    if (timelockHas) {
      ok(target.label + ": timelock holds UPGRADER_ROLE -- CONFIRMED");
    } else {
      console.error("  FAIL: timelock does NOT hold UPGRADER_ROLE on " + target.label);
      allValid = false;
    }
    if (!safeHas) {
      ok(target.label + ": Safe does NOT hold UPGRADER_ROLE -- CONFIRMED");
    } else {
      console.error("  FAIL: Safe still holds UPGRADER_ROLE on " + target.label);
      allValid = false;
    }
  }

  if (!allValid) fail("Post-migration validation failed.");

  // Update deployment file
  dep.governance.timelockMigration = {
    executedAt: new Date().toISOString(),
    granted: grantLog.filter(g => g.status === "GRANTED").map(g => ({ surface: g.label, txHash: g.txHash })),
    revoked: revokeLog.filter(r => r.status === "REVOKED").map(r => ({ surface: r.label, txHash: r.txHash })),
    upgraderRoleOnTimelock: upgradeTargets.map(t => t.label),
    upgraderRoleRevokedFromSafe: upgradeTargets.map(t => t.label),
  };
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok("Deployment file updated with timelock migration record");

  console.log("\n" + "=".repeat(62));
  console.log("  TIMELOCK MIGRATION COMPLETE");
  console.log("=".repeat(62));
  console.log("  Timelock : " + timelockAddress);
  console.log("  Delay    : " + minDelay + "s (" + (Number(minDelay) / 3600) + "h)");
  console.log("  UPGRADER_ROLE now held by timelock on:");
  for (const t of upgradeTargets) console.log("    - " + t.label + " (" + t.address + ")");
  console.log("\n  To execute an upgrade:");
  console.log("    1. Safe schedules via timelock.schedule(proxy, 0, upgradeCalldata, 0, salt, 48h)");
  console.log("    2. Wait 48 hours");
  console.log("    3. Safe executes via timelock.execute(proxy, 0, upgradeCalldata, 0, salt)");
}

main().catch(e => {
  console.error("\n  FATAL:", e.message);
  process.exit(1);
});
