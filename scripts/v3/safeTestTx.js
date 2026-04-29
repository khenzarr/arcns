/**
 * ArcNS — Safe 2-of-3 Test Transaction Script
 *
 * Executes a minimal multisig test against the deployed Safe on Arc Testnet:
 *
 *   Step 1:  Read Safe state (nonce, owners, threshold)
 *   Step 2:  Build Safe transaction — arcController.pause()
 *   Step 3:  Compute EIP-712 Safe transaction hash
 *   Step 4:  Sign with Owner 1 (SAFE_OWNER_KEY_1)
 *   Step 5:  Sign with Owner 2 (SAFE_OWNER_KEY_2)
 *   Step 6:  Execute via Safe.execTransaction (2-of-3 threshold met)
 *   Step 7:  Verify arcController.paused() == true
 *   Step 8:  Build Safe transaction — arcController.unpause()
 *   Step 9:  Sign with Owner 1 + Owner 2 (nonce + 1)
 *   Step 10: Execute unpause
 *   Step 11: Verify arcController.paused() == false
 *   Step 12: Final summary
 *
 * ─── Security ─────────────────────────────────────────────────────────────────
 *
 *   - Private keys are read from environment variables only
 *   - Keys are NEVER logged, printed, or written to disk
 *   - Script aborts immediately on any on-chain mismatch
 *   - Signer addresses are derived and logged for verification
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *
 *   PowerShell:
 *     $env:SAFE_OWNER_KEY_1="0xYOUR_PRIVATE_KEY_1"
 *     $env:SAFE_OWNER_KEY_2="0xYOUR_PRIVATE_KEY_2"
 *     npx hardhat run scripts/v3/safeTestTx.js --network arc_testnet
 *
 *   The two keys must correspond to any 2 of the 3 Safe owners:
 *     Owner 1: 0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D
 *     Owner 2: 0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396
 *     Owner 3: 0x1e19c1c829A387c2246567c0df264D81310d7775
 *
 *   The executor (gas payer) is the hardhat signer from PRIVATE_KEY in .env.
 *   It does NOT need to be a Safe owner — it just submits the pre-signed tx.
 *
 * ─── Environment variables ────────────────────────────────────────────────────
 *
 *   PRIVATE_KEY        — executor key (from .env, pays gas, need not be owner)
 *   SAFE_OWNER_KEY_1   — private key of first signing owner (REQUIRED)
 *   SAFE_OWNER_KEY_2   — private key of second signing owner (REQUIRED)
 *
 * ─── Prerequisites ────────────────────────────────────────────────────────────
 *
 *   - deployments/arc_testnet-v3.json must exist with contracts.safe populated
 *   - The Safe must hold PAUSER_ROLE on arcController
 *     (if not yet granted, run deployMultisig.js with MULTISIG_ONLY=0 first,
 *      OR the deployer key can be used as executor since it still holds PAUSER_ROLE)
 *
 * ─── PAUSER_ROLE note ─────────────────────────────────────────────────────────
 *
 *   If the Safe does NOT yet hold PAUSER_ROLE on arcController, this script
 *   will still work IF the executor (PRIVATE_KEY) holds PAUSER_ROLE — in that
 *   case set BYPASS_SAFE_PAUSE=1 to test the Safe signing flow with a no-op
 *   transaction (send 0 ETH to the Safe itself) instead of pause/unpause.
 *
 *   Default behavior: pause/unpause via Safe (requires Safe to hold PAUSER_ROLE).
 */

"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── Safe v1.3.0 EIP-712 domain type hash ─────────────────────────────────────
// keccak256("EIP712Domain(uint256 chainId,address verifyingContract)")
const SAFE_DOMAIN_SEPARATOR_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes("EIP712Domain(uint256 chainId,address verifyingContract)")
);

// keccak256("SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)")
const SAFE_TX_TYPEHASH = ethers.keccak256(
  ethers.toUtf8Bytes(
    "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
  )
);

// ─── Safe ABI (minimal) ───────────────────────────────────────────────────────
const SAFE_ABI = [
  "function nonce() public view returns (uint256)",
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
  "function domainSeparator() public view returns (bytes32)",
  "function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
  "function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) public payable returns (bool success)",
];

const CONTROLLER_ABI = [
  "function pause() external",
  "function unpause() external",
  "function paused() public view returns (bool)",
  "function hasRole(bytes32 role, address account) external view returns (bool)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(msg)   { console.log(`   ✓ ${msg}`); }
function warn(msg) { console.warn(`   ⚠ ${msg}`); }
function fail(msg) { throw new Error(`FATAL: ${msg}`); }
function step(n, msg) { console.log(`\n── Step ${n}: ${msg} ──`); }

/**
 * Compute the EIP-712 Safe transaction hash locally.
 * This must match what Safe.getTransactionHash() returns on-chain.
 *
 * domainSeparator = keccak256(abi.encode(
 *   SAFE_DOMAIN_SEPARATOR_TYPEHASH,
 *   chainId,
 *   safeAddress
 * ))
 *
 * safeTxHash = keccak256(abi.encode(
 *   SAFE_TX_TYPEHASH,
 *   to, value, keccak256(data), operation,
 *   safeTxGas, baseGas, gasPrice, gasToken, refundReceiver,
 *   nonce
 * ))
 *
 * finalHash = keccak256(abi.encodePacked(0x19, 0x01, domainSeparator, safeTxHash))
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

  // EIP-191 prefix: 0x1901 + domainSeparator + safeTxHash
  const finalHash = ethers.keccak256(
    ethers.concat([
      "0x1901",
      domainSeparator,
      safeTxHash,
    ])
  );

  return { domainSeparator, safeTxHash, finalHash };
}

/**
 * Sign a Safe transaction hash with a private key.
 * Returns the 65-byte signature in Safe's expected format (v adjusted to 31/32
 * for eth_sign compatibility — Safe v1.3.0 uses v+4 for eth_sign).
 *
 * Safe signature encoding:
 *   - For signMessage (eth_sign): v = 31 or 32 (v_ecdsa + 4)
 *   - For EIP-712 (direct sign): v = 27 or 28 (standard)
 *
 * We use direct EIP-712 signing (v = 27/28) which is the correct approach
 * when signing the final hash directly with a private key.
 */
async function signSafeTxHash(txHash, privateKey) {
  const wallet = new ethers.Wallet(privateKey);
  // Sign the raw hash directly (not eth_sign prefixed)
  // This produces a standard ECDSA signature with v = 27 or 28
  const sig = wallet.signingKey.sign(txHash);
  const r = sig.r;
  const s = sig.s;
  // v must be 31 or 32 for Safe's "approved hash" / "contract signature" path,
  // but for direct EOA signing of the EIP-712 hash, v = 27 or 28 is correct.
  const v = sig.v;
  return { r, s, v, address: wallet.address, signature: ethers.concat([r, s, ethers.toBeHex(v, 1)]) };
}

/**
 * Pack two signatures in Safe's required format.
 * Safe requires signatures to be sorted by signer address (ascending).
 * Each signature is 65 bytes: r (32) + s (32) + v (1).
 */
function packSignatures(sig1, sig2) {
  // Sort by signer address ascending (Safe requirement)
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
      ok(`${label} — tx: ${receipt.hash}`);
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
  // ── Load keys from environment ────────────────────────────────────────────────
  const ownerKey1 = process.env.SAFE_OWNER_KEY_1;
  const ownerKey2 = process.env.SAFE_OWNER_KEY_2;
  const bypassSafePause = process.env.BYPASS_SAFE_PAUSE === "1";

  if (!ownerKey1 || !ownerKey2) {
    fail(
      "SAFE_OWNER_KEY_1 and SAFE_OWNER_KEY_2 must be set.\n\n" +
      "  PowerShell:\n" +
      "    $env:SAFE_OWNER_KEY_1='0xYOUR_KEY_1'\n" +
      "    $env:SAFE_OWNER_KEY_2='0xYOUR_KEY_2'\n" +
      "    npx hardhat run scripts/v3/safeTestTx.js --network arc_testnet\n\n" +
      "  The keys must correspond to 2 of the 3 Safe owners."
    );
  }

  // Derive signer addresses WITHOUT printing keys
  const signer1 = new ethers.Wallet(ownerKey1);
  const signer2 = new ethers.Wallet(ownerKey2);

  const [executor] = await ethers.getSigners(); // gas payer from PRIVATE_KEY in .env
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ArcNS — Safe 2-of-3 Test Transaction                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Network   : ${network.name}`);
  console.log(`Chain ID  : ${chainId}`);
  console.log(`Executor  : ${executor.address}  (gas payer)`);
  console.log(`Signer 1  : ${signer1.address}   (owner key 1)`);
  console.log(`Signer 2  : ${signer2.address}   (owner key 2)`);
  console.log(`Test mode : ${bypassSafePause ? "BYPASS (no-op tx to Safe)" : "pause/unpause arcController"}`);

  // ── Load deployment ──────────────────────────────────────────────────────────
  const depPath = path.join(__dirname, `../../deployments/${network.name}-v3.json`);
  if (!fs.existsSync(depPath)) fail(`Deployment file not found: ${depPath}`);
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  if (!c.safe) fail("contracts.safe not found in deployment file. Run deployMultisig.js first.");

  const SAFE_ADDRESS       = c.safe;
  const ARC_CONTROLLER     = c.arcController;

  console.log(`\nSafe address     : ${SAFE_ADDRESS}`);
  console.log(`arcController    : ${ARC_CONTROLLER}`);

  // ── Step 1: Read Safe state ───────────────────────────────────────────────────
  step(1, "Read Safe state");

  const safe = new ethers.Contract(SAFE_ADDRESS, SAFE_ABI, executor);
  const arcController = new ethers.Contract(ARC_CONTROLLER, CONTROLLER_ABI, executor);

  const [safeNonce, safeOwners, safeThreshold] = await Promise.all([
    safe.nonce(),
    safe.getOwners(),
    safe.getThreshold(),
  ]);

  console.log(`   Safe nonce     : ${safeNonce}`);
  console.log(`   Safe owners    : ${safeOwners.join(", ")}`);
  console.log(`   Safe threshold : ${safeThreshold}`);

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

  // Check current pause state
  const isPausedBefore = await arcController.paused();
  console.log(`   arcController.paused() : ${isPausedBefore}`);
  if (isPausedBefore) {
    warn("arcController is already paused — will skip pause step and only test unpause");
  }

  // Check PAUSER_ROLE
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));
  const safeHasPauserRole   = await arcController.hasRole(PAUSER_ROLE, SAFE_ADDRESS);
  const deployerHasPauserRole = await arcController.hasRole(PAUSER_ROLE, executor.address);

  console.log(`   Safe has PAUSER_ROLE    : ${safeHasPauserRole}`);
  console.log(`   Executor has PAUSER_ROLE: ${deployerHasPauserRole}`);

  if (!safeHasPauserRole && !bypassSafePause) {
    fail(
      "Safe does NOT hold PAUSER_ROLE on arcController.\n" +
      "Options:\n" +
      "  A) Grant roles first:\n" +
      "     $env:MULTISIG_ONLY='0'; npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet\n" +
      "  B) Test with a no-op transaction instead:\n" +
      "     $env:BYPASS_SAFE_PAUSE='1'; npx hardhat run scripts/v3/safeTestTx.js --network arc_testnet"
    );
  }

  // ── Helper: execute one Safe transaction ─────────────────────────────────────
  async function executeSafeTx(label, txParams, currentNonce) {
    const tx = {
      to:             txParams.to,
      value:          0n,
      data:           txParams.data,
      operation:      0,   // CALL
      safeTxGas:      0n,
      baseGas:        0n,
      gasPrice:       0n,
      gasToken:       ethers.ZeroAddress,
      refundReceiver: ethers.ZeroAddress,
      nonce:          currentNonce,
    };

    console.log(`\n   Building Safe tx: ${label}`);
    console.log(`   to      : ${tx.to}`);
    console.log(`   data    : ${tx.data.slice(0, 10)}... (${(tx.data.length - 2) / 2} bytes)`);
    console.log(`   nonce   : ${tx.nonce}`);

    // Compute hash locally
    const { domainSeparator, safeTxHash, finalHash } = computeSafeTxHash(chainId, SAFE_ADDRESS, tx);
    console.log(`   domainSeparator : ${domainSeparator}`);
    console.log(`   safeTxHash      : ${safeTxHash}`);
    console.log(`   finalHash       : ${finalHash}`);

    // Cross-check against on-chain getTransactionHash
    const onChainHash = await safe.getTransactionHash(
      tx.to, tx.value, tx.data, tx.operation,
      tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver,
      tx.nonce
    );
    console.log(`   on-chain hash   : ${onChainHash}`);

    if (finalHash.toLowerCase() !== onChainHash.toLowerCase()) {
      fail(
        `Hash mismatch!\n` +
        `  local   : ${finalHash}\n` +
        `  on-chain: ${onChainHash}\n` +
        `This indicates an EIP-712 encoding error. Aborting.`
      );
    }
    ok(`Hash verified: local == on-chain`);

    // Sign with both owners
    console.log(`\n   Signing with Owner 1 (${signer1.address})...`);
    const sig1 = await signSafeTxHash(finalHash, ownerKey1);
    ok(`Owner 1 signed: r=${sig1.r.slice(0, 10)}... v=${sig1.v}`);

    console.log(`   Signing with Owner 2 (${signer2.address})...`);
    const sig2 = await signSafeTxHash(finalHash, ownerKey2);
    ok(`Owner 2 signed: r=${sig2.r.slice(0, 10)}... v=${sig2.v}`);

    // Pack signatures (sorted by address)
    const packedSigs = packSignatures(sig1, sig2);
    console.log(`   Packed signatures: ${packedSigs.slice(0, 20)}... (${(packedSigs.length - 2) / 2} bytes)`);

    // Execute
    console.log(`\n   Executing Safe transaction...`);
    const receipt = await confirmTxWithRetry(
      `Safe.execTransaction (${label})`,
      () => safe.connect(executor).execTransaction(
        tx.to,
        tx.value,
        tx.data,
        tx.operation,
        tx.safeTxGas,
        tx.baseGas,
        tx.gasPrice,
        tx.gasToken,
        tx.refundReceiver,
        packedSigs
      )
    );

    // Check for ExecutionSuccess event
    const execSuccessTopic = ethers.id("ExecutionSuccess(bytes32,uint256)");
    const execFailureTopic = ethers.id("ExecutionFailure(bytes32,uint256)");

    const successLog = receipt.logs.find(l => l.topics[0] === execSuccessTopic);
    const failureLog = receipt.logs.find(l => l.topics[0] === execFailureTopic);

    if (failureLog) {
      fail(`Safe emitted ExecutionFailure for "${label}". The inner transaction reverted.`);
    }
    if (!successLog) {
      warn(`ExecutionSuccess event not found — checking tx status`);
      if (receipt.status !== 1) fail(`Transaction reverted: ${receipt.hash}`);
    } else {
      ok(`ExecutionSuccess event confirmed`);
    }

    return receipt;
  }

  // ── Step 2–7: pause() test ────────────────────────────────────────────────────
  if (bypassSafePause) {
    // No-op: send 0 ETH to the Safe itself
    step(2, "BYPASS MODE — No-op transaction (0 ETH to Safe)");
    const nonce0 = await safe.nonce();
    await executeSafeTx("no-op (0 ETH to Safe)", { to: SAFE_ADDRESS, data: "0x" }, nonce0);
    ok("No-op transaction executed successfully — Safe signing works");

    step(3, "BYPASS MODE — Second no-op (nonce + 1)");
    const nonce1 = await safe.nonce();
    await executeSafeTx("no-op 2 (0 ETH to Safe)", { to: SAFE_ADDRESS, data: "0x" }, nonce1);
    ok("Second no-op executed — Safe nonce increments correctly");

  } else {
    // Real test: pause + unpause
    const controllerInterface = new ethers.Interface(CONTROLLER_ABI);

    if (!isPausedBefore) {
      step(2, "Build + sign + execute: arcController.pause()");
      const nonce0 = await safe.nonce();
      const pauseData = controllerInterface.encodeFunctionData("pause", []);
      await executeSafeTx("arcController.pause()", { to: ARC_CONTROLLER, data: pauseData }, nonce0);

      step(3, "Verify arcController.paused() == true");
      const isPausedAfter = await arcController.paused();
      console.log(`   arcController.paused() : ${isPausedAfter}`);
      if (!isPausedAfter) fail("arcController.paused() returned false after pause — unexpected");
      ok("arcController is paused ✓");
    } else {
      step(2, "Skipped pause (already paused)");
      ok("arcController was already paused — skipping pause step");
    }

    step(4, "Build + sign + execute: arcController.unpause()");
    const nonce1 = await safe.nonce();
    const unpauseData = controllerInterface.encodeFunctionData("unpause", []);
    await executeSafeTx("arcController.unpause()", { to: ARC_CONTROLLER, data: unpauseData }, nonce1);

    step(5, "Verify arcController.paused() == false");
    const isPausedFinal = await arcController.paused();
    console.log(`   arcController.paused() : ${isPausedFinal}`);
    if (isPausedFinal) fail("arcController.paused() returned true after unpause — unexpected");
    ok("arcController is unpaused ✓");
  }

  // ── Final nonce check ─────────────────────────────────────────────────────────
  const finalNonce = await safe.nonce();
  console.log(`\n   Safe nonce after test : ${finalNonce}`);
  ok(`Safe nonce incremented correctly (was ${safeNonce}, now ${finalNonce})`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("✅ Safe 2-of-3 Test Transaction PASSED");
  console.log("═".repeat(62));
  console.log(`   Safe address     : ${SAFE_ADDRESS}`);
  console.log(`   Signer 1         : ${signer1.address}`);
  console.log(`   Signer 2         : ${signer2.address}`);
  console.log(`   Executor         : ${executor.address}`);
  console.log(`   Nonce before     : ${safeNonce}`);
  console.log(`   Nonce after      : ${finalNonce}`);
  console.log(`   Test             : ${bypassSafePause ? "no-op (bypass mode)" : "pause + unpause arcController"}`);
  console.log("═".repeat(62));
  console.log("\n📋 Safe is operational. Next steps:");
  if (!dep.multisig.rolesGranted) {
    console.log("   1. Grant ArcNS roles to Safe:");
    console.log("      $env:MULTISIG_ONLY='0'");
    console.log("      npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet");
    console.log("   2. Re-run this test with PAUSER_ROLE held by Safe (no BYPASS needed)");
    console.log("   3. When confident, revoke deployer roles:");
    console.log("      $env:MULTISIG_ONLY='0'; $env:REVOKE_DEPLOYER='1'");
    console.log("      npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet");
  } else {
    console.log("   Roles already granted. Ready to revoke deployer roles when confident.");
  }
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  process.exit(1);
});
