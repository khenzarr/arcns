/**
 * ArcNS — Residual ORACLE_ROLE Revoke via Safe Multisig
 *
 * Executes the final residual revoke that could not be done by the deployer EOA:
 *
 *   arcController.revokeRole(ORACLE_ROLE, deployer)
 *
 * Why this is needed:
 *   During migrateFullOwnership.js, the deployer lost DEFAULT_ADMIN_ROLE on
 *   arcController before ORACLE_ROLE was revoked. Since DEFAULT_ADMIN_ROLE is
 *   the admin of ORACLE_ROLE in OZ AccessControl, the deployer can no longer
 *   self-revoke. The Safe now holds DEFAULT_ADMIN_ROLE and must execute this
 *   revoke as a multisig transaction.
 *
 * Addresses (Arc Testnet, chainId 5042002):
 *   Safe            : 0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3
 *   arcController   : 0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46
 *   deployer        : 0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D
 *
 * Execution flow:
 *   Phase 1 — Eligibility check (confirm ORACLE_ROLE still on deployer, Safe has authority)
 *   Phase 2 — Build + sign + execute Safe multisig tx
 *   Phase 3 — Post-revoke validation
 *   Phase 4 — Update deployment JSON
 *
 * Usage:
 *   PowerShell:
 *     $env:SAFE_OWNER_KEY_1="0xYOUR_KEY_1"
 *     $env:SAFE_OWNER_KEY_2="0xYOUR_KEY_2"
 *     npx hardhat run scripts/v3/revokeOracleRoleViaSafe.js --network arc_testnet
 *
 *   The two keys must correspond to any 2 of the 3 Safe owners:
 *     Owner 1: 0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D
 *     Owner 2: 0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396
 *     Owner 3: 0x1e19c1c829A387c2246567c0df264D81310d7775
 *
 *   PRIVATE_KEY in .env is the executor (gas payer). It does NOT need to be a
 *   Safe owner — it just submits the pre-signed transaction.
 *
 * Security:
 *   - Private keys are read from environment variables only
 *   - Keys are NEVER logged, printed, or written to disk
 *   - Script aborts immediately on any on-chain mismatch
 *   - Pre-checks and post-checks are enforced at every step
 */

"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── Safe v1.3.0 EIP-712 type hashes ─────────────────────────────────────────
const SAFE_DOMAIN_SEPARATOR_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes("EIP712Domain(uint256 chainId,address verifyingContract)")
);
const SAFE_TX_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  )
);

// ─── Role hashes ──────────────────────────────────────────────────────────────
const DEFAULT_ADMIN_ROLE = ethers.ZeroHash;
const ORACLE_ROLE        = ethers.keccak256(ethers.toUtf8Bytes("ORACLE_ROLE"));

// ─── ABIs ─────────────────────────────────────────────────────────────────────
const SAFE_ABI = [
  "function nonce() public view returns (uint256)",
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
  "function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
  "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool success)",
];

const ACCESS_CONTROL_ABI = [
  "function hasRole(bytes32 role, address account) external view returns (bool)",
  "function revokeRole(bytes32 role, address account) external",
  "function getRoleAdmin(bytes32 role) external view returns (bytes32)",
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

/**
 * Compute the EIP-712 Safe transaction hash locally.
 * Must match Safe.getTransactionHash() on-chain.
 */
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
      [
        "bytes32",
        "address", "uint256", "bytes32", "uint8",
        "uint256", "uint256", "uint256", "address", "address",
        "uint256",
      ],
      [
        SAFE_TX_TYPEHASH,
        tx.to, tx.value, dataHash, tx.operation,
        tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver,
        tx.nonce,
      ]
    )
  );
  const finalHash = ethers.keccak256(
    ethers.concat(["0x1901", domainSeparator, safeTxHash])
  );
  return { domainSeparator, safeTxHash, finalHash };
}

/**
 * Sign a Safe transaction hash with a private key (EIP-712 direct signing).
 * v = 27 or 28 for direct EOA signing of the EIP-712 final hash.
 */
async function signSafeTxHash(txHash, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  const sig = wallet.signingKey.sign(txHash);
  return {
    r: sig.r,
    s: sig.s,
    v: sig.v,
    address: wallet.address,
    signature: ethers.concat([sig.r, sig.s, ethers.toBeHex(sig.v, 1)]),
  };
}

/**
 * Pack two signatures sorted by signer address (Safe requirement).
 */
function packSignatures(sig1, sig2) {
  const sorted = [sig1, sig2].sort((a, b) =>
    a.address.toLowerCase() < b.address.toLowerCase() ? -1 : 1
  );
  console.log(`   Signature order (ascending address):`);
  console.log(`     [0] ${sorted[0].address}`);
  console.log(`     [1] ${sorted[1].address}`);
  return ethers.concat([sorted[0].signature, sorted[1].signature]);
}

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
  // ── Load signing keys from environment ───────────────────────────────────────
  const ownerKey1 = process.env.SAFE_OWNER_KEY_1;
  const ownerKey2 = process.env.SAFE_OWNER_KEY_2;

  if (!ownerKey1 || !ownerKey2) {
    fail(
      "SAFE_OWNER_KEY_1 and SAFE_OWNER_KEY_2 must be set.\n\n" +
      "  PowerShell:\n" +
      "    $env:SAFE_OWNER_KEY_1='0xYOUR_KEY_1'\n" +
      "    $env:SAFE_OWNER_KEY_2='0xYOUR_KEY_2'\n" +
      "    npx hardhat run scripts/v3/revokeOracleRoleViaSafe.js --network arc_testnet\n\n" +
      "  Keys must correspond to 2 of the 3 Safe owners:\n" +
      "    0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D\n" +
      "    0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396\n" +
      "    0x1e19c1c829A387c2246567c0df264D81310d7775"
    );
  }

  // Derive signer addresses WITHOUT printing keys
  const signer1 = new ethers.Wallet(ownerKey1);
  const signer2 = new ethers.Wallet(ownerKey2);

  const [executor] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("\n" + "=".repeat(62));
  console.log("  ArcNS -- Residual ORACLE_ROLE Revoke via Safe Multisig");
  console.log("=".repeat(62));
  console.log(`Network   : ${network.name}`);
  console.log(`Chain ID  : ${chainId}`);
  console.log(`Executor  : ${executor.address}  (gas payer)`);
  console.log(`Signer 1  : ${signer1.address}`);
  console.log(`Signer 2  : ${signer2.address}`);

  // ── Load deployment ──────────────────────────────────────────────────────────
  const depPath = path.join(__dirname, `../../deployments/${network.name}-v3.json`);
  if (!fs.existsSync(depPath)) fail(`Deployment file not found: ${depPath}`);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const SAFE_ADDRESS    = c.safe;
  const ARC_CONTROLLER  = c.arcController;
  const DEPLOYER_ADDR   = dep.deployer;

  if (!SAFE_ADDRESS)   fail("contracts.safe not found in deployment file.");
  if (!ARC_CONTROLLER) fail("contracts.arcController not found in deployment file.");
  if (!DEPLOYER_ADDR)  fail("deployer not found in deployment file.");

  console.log(`\nSafe           : ${SAFE_ADDRESS}`);
  console.log(`arcController  : ${ARC_CONTROLLER}`);
  console.log(`Deployer       : ${DEPLOYER_ADDR}`);

  // ── Attach contracts ─────────────────────────────────────────────────────────
  const safe       = new ethers.Contract(SAFE_ADDRESS,   SAFE_ABI,           executor);
  const arcCtrl    = new ethers.Contract(ARC_CONTROLLER, ACCESS_CONTROL_ABI, executor);

  // ============================================================
  section("PHASE 1 -- RESIDUAL REVOKE ELIGIBILITY CHECK");
  // ============================================================

  sub("Verifying Safe operational state");
  const safeOwners    = await safe.getOwners();
  const safeThreshold = await safe.getThreshold();
  const safeNonce     = await safe.nonce();
  console.log(`   Safe owners    : ${safeOwners.join(", ")}`);
  console.log(`   Safe threshold : ${safeThreshold}`);
  console.log(`   Safe nonce     : ${safeNonce}`);
  if (Number(safeThreshold) < 2) fail("Safe threshold is below 2 -- not safe to proceed");
  ok("Safe threshold >= 2 confirmed");

  // Verify both signers are Safe owners
  for (const [i, signer] of [[1, signer1], [2, signer2]]) {
    const isOwner = await safe.isOwner(signer.address);
    if (!isOwner) {
      fail(
        `SAFE_OWNER_KEY_${i} derives address ${signer.address} which is NOT a Safe owner.\n` +
        `Safe owners: ${safeOwners.join(", ")}`
      );
    }
    ok(`Signer ${i} (${signer.address}) is a Safe owner`);
  }

  sub("Checking ORACLE_ROLE state on arcController");

  const deployerHasOracleRole = await arcCtrl.hasRole(ORACLE_ROLE, DEPLOYER_ADDR);
  const safeHasDefaultAdmin   = await arcCtrl.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  const oracleRoleAdmin       = await arcCtrl.getRoleAdmin(ORACLE_ROLE);
  const deployerHasDefaultAdmin = await arcCtrl.hasRole(DEFAULT_ADMIN_ROLE, DEPLOYER_ADDR);

  console.log(`   deployer has ORACLE_ROLE          : ${deployerHasOracleRole}`);
  console.log(`   Safe has DEFAULT_ADMIN_ROLE        : ${safeHasDefaultAdmin}`);
  console.log(`   deployer has DEFAULT_ADMIN_ROLE    : ${deployerHasDefaultAdmin}`);
  console.log(`   ORACLE_ROLE admin role             : ${oracleRoleAdmin}`);
  console.log(`   DEFAULT_ADMIN_ROLE                 : ${DEFAULT_ADMIN_ROLE}`);
  console.log(`   ORACLE_ROLE admin == DEFAULT_ADMIN : ${oracleRoleAdmin === DEFAULT_ADMIN_ROLE}`);

  if (!deployerHasOracleRole) {
    console.log("\n  ORACLE_ROLE is already absent from deployer -- nothing to revoke.");
    console.log("  PHASE 1 COMPLETE -- residual revoke already done.");
    console.log("  PHASE 2 SKIPPED -- no action needed.");
    console.log("  PHASE 3 MAY BEGIN (validation only).");

    // Still run validation
    await runFinalValidation(arcCtrl, DEPLOYER_ADDR, SAFE_ADDRESS, dep, depPath, null, true);
    return;
  }

  if (!safeHasDefaultAdmin) {
    fail(
      "SAFETY ABORT: Safe does NOT hold DEFAULT_ADMIN_ROLE on arcController.\n" +
      "Safe cannot execute revokeRole(ORACLE_ROLE, deployer).\n" +
      "This is an unexpected state -- investigate before proceeding."
    );
  }

  if (oracleRoleAdmin !== DEFAULT_ADMIN_ROLE) {
    fail(
      `SAFETY ABORT: ORACLE_ROLE admin is ${oracleRoleAdmin}, expected DEFAULT_ADMIN_ROLE (${DEFAULT_ADMIN_ROLE}).\n` +
      "Cannot proceed -- role admin structure is unexpected."
    );
  }

  ok("ORACLE_ROLE confirmed on deployer");
  ok("Safe holds DEFAULT_ADMIN_ROLE -- authority confirmed");
  ok("ORACLE_ROLE admin is DEFAULT_ADMIN_ROLE -- Safe can revoke");
  console.log("\n  PHASE 1 COMPLETE -- PHASE 2 MAY BEGIN");

  // ============================================================
  section("PHASE 2 -- RESIDUAL REVOKE EXECUTION (Safe Multisig)");
  // ============================================================

  sub("Building Safe transaction: arcController.revokeRole(ORACLE_ROLE, deployer)");

  // Encode the revokeRole calldata
  const arcCtrlInterface = new ethers.Interface(ACCESS_CONTROL_ABI);
  const revokeCalldata = arcCtrlInterface.encodeFunctionData("revokeRole", [ORACLE_ROLE, DEPLOYER_ADDR]);

  console.log(`   Target contract : ${ARC_CONTROLLER}`);
  console.log(`   Calldata        : ${revokeCalldata}`);
  console.log(`   Role            : ORACLE_ROLE (${ORACLE_ROLE})`);
  console.log(`   Account         : ${DEPLOYER_ADDR}`);

  const safeTxParams = {
    to:             ARC_CONTROLLER,
    value:          0n,
    data:           revokeCalldata,
    operation:      0,   // CALL
    safeTxGas:      0n,
    baseGas:        0n,
    gasPrice:       0n,
    gasToken:       ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce:          safeNonce,
  };

  sub("Computing EIP-712 Safe transaction hash");
  const { domainSeparator, safeTxHash, finalHash } = computeSafeTxHash(chainId, SAFE_ADDRESS, safeTxParams);
  console.log(`   domainSeparator : ${domainSeparator}`);
  console.log(`   safeTxHash      : ${safeTxHash}`);
  console.log(`   finalHash       : ${finalHash}`);

  // Cross-check against on-chain getTransactionHash
  const onChainHash = await safe.getTransactionHash(
    safeTxParams.to,
    safeTxParams.value,
    safeTxParams.data,
    safeTxParams.operation,
    safeTxParams.safeTxGas,
    safeTxParams.baseGas,
    safeTxParams.gasPrice,
    safeTxParams.gasToken,
    safeTxParams.refundReceiver,
    safeTxParams.nonce
  );
  console.log(`   on-chain hash   : ${onChainHash}`);

  if (finalHash.toLowerCase() !== onChainHash.toLowerCase()) {
    fail(
      `EIP-712 hash mismatch!\n` +
      `  local   : ${finalHash}\n` +
      `  on-chain: ${onChainHash}\n` +
      `This indicates an encoding error. Aborting.`
    );
  }
  ok("EIP-712 hash verified: local == on-chain");

  sub("Signing with Owner 1 and Owner 2");
  console.log(`   Signing with Owner 1 (${signer1.address})...`);
  const sig1 = await signSafeTxHash(finalHash, ownerKey1);
  ok(`Owner 1 signed: r=${sig1.r.slice(0, 10)}... v=${sig1.v}`);

  console.log(`   Signing with Owner 2 (${signer2.address})...`);
  const sig2 = await signSafeTxHash(finalHash, ownerKey2);
  ok(`Owner 2 signed: r=${sig2.r.slice(0, 10)}... v=${sig2.v}`);

  const packedSigs = packSignatures(sig1, sig2);
  console.log(`   Packed signatures: ${packedSigs.slice(0, 20)}... (${(packedSigs.length - 2) / 2} bytes)`);

  sub("Executing Safe transaction");
  let execReceipt;
  try {
    execReceipt = await confirmTxWithRetry(
      "Safe.execTransaction (revokeRole ORACLE_ROLE from deployer)",
      () => safe.connect(executor).execTransaction(
        safeTxParams.to,
        safeTxParams.value,
        safeTxParams.data,
        safeTxParams.operation,
        safeTxParams.safeTxGas,
        safeTxParams.baseGas,
        safeTxParams.gasPrice,
        safeTxParams.gasToken,
        safeTxParams.refundReceiver,
        packedSigs
      )
    );
  } catch (e) {
    fail(`Safe.execTransaction failed: ${e.message}`);
  }

  // Check for ExecutionSuccess / ExecutionFailure events
  const execSuccessTopic = ethers.id("ExecutionSuccess(bytes32,uint256)");
  const execFailureTopic = ethers.id("ExecutionFailure(bytes32,uint256)");
  const successLog = execReceipt.logs.find(l => l.topics[0] === execSuccessTopic);
  const failureLog = execReceipt.logs.find(l => l.topics[0] === execFailureTopic);

  if (failureLog) {
    fail(
      `Safe emitted ExecutionFailure. The inner revokeRole call reverted.\n` +
      `tx: ${execReceipt.hash}\n` +
      `This may mean the Safe no longer holds DEFAULT_ADMIN_ROLE, or the role was already absent.`
    );
  }
  if (!successLog) {
    warn("ExecutionSuccess event not found -- checking tx status");
    if (execReceipt.status !== 1) fail(`Transaction reverted: ${execReceipt.hash}`);
    warn("Transaction succeeded but ExecutionSuccess event not found -- proceeding to post-check");
  } else {
    ok("ExecutionSuccess event confirmed");
  }

  const revokeTxHash = execReceipt.hash;
  console.log(`\n  REVOKE TX HASH: ${revokeTxHash}`);
  console.log(`  Role    : ORACLE_ROLE`);
  console.log(`  Contract: arcController (${ARC_CONTROLLER})`);
  console.log(`  Account : ${DEPLOYER_ADDR}`);

  console.log("\n  PHASE 2 COMPLETE -- PHASE 3 MAY BEGIN");

  // ============================================================
  section("PHASE 3 -- POST-REVOKE VALIDATION");
  // ============================================================

  await runFinalValidation(arcCtrl, DEPLOYER_ADDR, SAFE_ADDRESS, dep, depPath, revokeTxHash, false);
}

// ─── Post-revoke validation ───────────────────────────────────────────────────
async function runFinalValidation(arcCtrl, DEPLOYER_ADDR, SAFE_ADDRESS, dep, depPath, revokeTxHash, wasAlreadyAbsent) {
  const section = (title) => {
    console.log("\n" + "=".repeat(62));
    console.log(`  ${title}`);
    console.log("=".repeat(62));
  };
  const sub = (title) => console.log(`\n-- ${title} --`);
  const ok  = (msg) => console.log(`   OK  ${msg}`);

  section("PHASE 3 -- POST-REVOKE VALIDATION");

  let allValid = true;

  sub("Confirming deployer no longer holds ORACLE_ROLE on arcController");
  const deployerHasOracleNow = await arcCtrl.hasRole(ORACLE_ROLE, DEPLOYER_ADDR);
  if (deployerHasOracleNow) {
    console.error(`   FAIL: Deployer still holds ORACLE_ROLE on arcController`);
    allValid = false;
  } else {
    ok("Deployer does NOT hold ORACLE_ROLE on arcController -- CONFIRMED");
  }

  sub("Confirming Safe still holds DEFAULT_ADMIN_ROLE on arcController");
  const safeHasDefaultAdminNow = await arcCtrl.hasRole(DEFAULT_ADMIN_ROLE, SAFE_ADDRESS);
  if (!safeHasDefaultAdminNow) {
    console.error(`   FAIL: Safe no longer holds DEFAULT_ADMIN_ROLE on arcController`);
    allValid = false;
  } else {
    ok("Safe holds DEFAULT_ADMIN_ROLE on arcController -- CONFIRMED");
  }

  if (!allValid) {
    throw new Error("FATAL: Post-revoke validation failed. See errors above.");
  }

  ok("All post-revoke checks passed");
  console.log("\n  PHASE 3 COMPLETE");

  // ── Update deployment JSON ────────────────────────────────────────────────────
  section("PHASE 4 -- UPDATE DEPLOYMENT JSON");

  dep.multisig = dep.multisig || {};
  dep.multisig.oracleRoleRevoke = {
    executedAt:       new Date().toISOString(),
    surface:          "arcController",
    role:             "ORACLE_ROLE",
    account:          DEPLOYER_ADDR,
    txHash:           wasAlreadyAbsent ? "ALREADY_ABSENT" : revokeTxHash,
    status:           wasAlreadyAbsent ? "ALREADY_ABSENT" : "REVOKED",
    executedViaSafe:  !wasAlreadyAbsent,
    multisigComplete: true,
  };

  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok(`Deployment file updated: deployments/${network.name || "arc_testnet"}-v3.json`);

  // ── Final summary ─────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(62));
  console.log("  RESIDUAL REVOKE COMPLETE");
  console.log("=".repeat(62));
  console.log(`\n  Role    : ORACLE_ROLE`);
  console.log(`  Contract: arcController`);
  console.log(`  Account : ${DEPLOYER_ADDR}`);
  console.log(`  Status  : ${wasAlreadyAbsent ? "ALREADY_ABSENT (no action needed)" : "REVOKED via Safe multisig"}`);
  if (!wasAlreadyAbsent && revokeTxHash) {
    console.log(`  Tx hash : ${revokeTxHash}`);
  }
  console.log("\n  ArcNS multisig migration is now FULLY COMPLETE.");
  console.log("  No deployer-held privileged surfaces remain on controller/resolver/admin.");
  console.log("\n  NEXT CORRECT STEP:");
  console.log("    Timelock preparation and deployment.");
  console.log("    Run: npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet");
  console.log("    (after reviewing the timelock design in docs/governance/timelock-design.md)");
}

main().catch(e => {
  console.error("\n  FATAL:", e.message);
  process.exit(1);
});
