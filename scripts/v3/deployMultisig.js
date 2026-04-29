/**
 * ArcNS — 2-of-3 Safe Multisig Deployment Script
 *
 * Deploys a Gnosis Safe 2-of-3 multisig on Arc Testnet.
 *
 * Arc Testnet (chainId 5042002) IS in the official Safe deployments registry.
 * The Safe v1.3.0 infrastructure contracts are already deployed at canonical
 * addresses — this script uses them directly without redeploying.
 *
 * Safe v1.3.0 addresses on Arc Testnet (chainId 5042002, eip155 deployment):
 *   GnosisSafe singleton       : 0x69f4D1788e39c87893C980c06EdF4b7f686e2938
 *   GnosisSafeProxyFactory     : 0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC
 *   CompatibilityFallbackHandler: 0x017062a1dE2FE6b99BE3d9d37841FeD19F573804
 *
 * Source: https://github.com/safe-global/safe-deployments/tree/main/src/assets/v1.3.0
 *
 * ─── Deployment sequence ──────────────────────────────────────────────────────
 *
 *   Phase 1 — Verify Safe infrastructure is live on-chain
 *     1a. Verify GnosisSafe singleton has bytecode
 *     1b. Verify GnosisSafeProxyFactory has bytecode
 *     1c. Verify CompatibilityFallbackHandler has bytecode
 *
 *   Phase 2 — Deploy Safe Proxy
 *     2a. Encode initializer calldata (setup owners, threshold, fallback handler)
 *     2b. Deploy GnosisSafeProxy via ProxyFactory.createProxyWithNonce
 *     2c. Verify: owners, threshold, nonce
 *
 *   Phase 3 — ArcNS Role Transfer (optional — MULTISIG_ONLY=0)
 *     3a. Grant ADMIN_ROLE on both controllers to Safe
 *     3b. Grant UPGRADER_ROLE on both controllers to Safe
 *     3c. Grant PAUSER_ROLE on both controllers to Safe
 *     3d. Revoke roles from deployer (optional — REVOKE_DEPLOYER=1)
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *
 *   # Deploy Safe only (no role transfer):
 *   npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
 *
 *   # Deploy Safe + grant roles to Safe:
 *   MULTISIG_ONLY=0 npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
 *
 *   # Deploy Safe + grant roles + revoke deployer roles:
 *   MULTISIG_ONLY=0 REVOKE_DEPLOYER=1 npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
 *
 * ─── Environment variables ────────────────────────────────────────────────────
 *
 *   PRIVATE_KEY          — deployer private key (from .env)
 *   ARC_RPC_URL          — RPC endpoint
 *   SAFE_OWNER_1         — first Safe owner address  (defaults to deployer)
 *   SAFE_OWNER_2         — second Safe owner address (REQUIRED)
 *   SAFE_OWNER_3         — third Safe owner address  (REQUIRED)
 *   SAFE_THRESHOLD       — required confirmations (default: 2)
 *   SAFE_NONCE           — CREATE2 salt nonce (default: 0)
 *   MULTISIG_ONLY        — "0" to also grant ArcNS roles to Safe (default: "1")
 *   REVOKE_DEPLOYER      — "1" to revoke deployer roles after granting to Safe (default: "0")
 *
 * ─── Prerequisites ────────────────────────────────────────────────────────────
 *
 *   - deployments/arc_testnet-v3.json must exist (from deployV3.js)
 *   - Deployer must hold ADMIN_ROLE, UPGRADER_ROLE, PAUSER_ROLE on both
 *     controller proxies (only required when MULTISIG_ONLY=0)
 *
 * ─── Output ───────────────────────────────────────────────────────────────────
 *
 *   Writes Safe addresses to deployments/arc_testnet-v3.json under:
 *     contracts.safe                  — Safe proxy address
 *     contracts.safeSingleton         — GnosisSafe implementation
 *     contracts.safeProxyFactory      — GnosisSafeProxyFactory
 *     contracts.safeFallbackHandler   — CompatibilityFallbackHandler
 */

"use strict";

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

// ─── Safe v1.3.0 canonical addresses on Arc Testnet (chainId 5042002) ─────────
// Source: safe-global/safe-deployments — eip155 deployment variant
// Verified: "5042002": ["eip155", "canonical"] in all three deployment JSONs
const SAFE_ADDRESSES = {
  singleton:       "0x69f4D1788e39c87893C980c06EdF4b7f686e2938",
  proxyFactory:    "0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC",
  fallbackHandler: "0x017062a1dE2FE6b99BE3d9d37841FeD19F573804",
};

// ─── Safe v1.3.0 ABIs (minimal — only what we need) ──────────────────────────

const SAFE_SINGLETON_ABI = [
  "function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver) external",
  "function getOwners() public view returns (address[] memory)",
  "function getThreshold() public view returns (uint256)",
  "function nonce() public view returns (uint256)",
  "function isOwner(address owner) public view returns (bool)",
  "function VERSION() public view returns (string memory)",
];

const PROXY_FACTORY_ABI = [
  "function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) public returns (address proxy)",
  "function proxyCreationCode() public pure returns (bytes memory)",
  "event ProxyCreation(address proxy, address singleton)",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(msg)   { console.log(`   ✓ ${msg}`); }
function warn(msg) { console.warn(`   ⚠ ${msg}`); }
function fail(msg) { throw new Error(`FATAL: ${msg}`); }

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
        console.warn(`   ⚠ ${label}: attempt ${attempt} failed (${msg.slice(0, 80)}), retrying in 6s...`);
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

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   ArcNS — 2-of-3 Safe Multisig Deployment               ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`Network  : ${network.name}`);
  console.log(`Chain ID : ${chainId}`);
  console.log(`Deployer : ${deployer.address}\n`);

  // ── Configuration ────────────────────────────────────────────────────────────
  const owner1    = process.env.SAFE_OWNER_1 || deployer.address;
  const owner2    = process.env.SAFE_OWNER_2;
  const owner3    = process.env.SAFE_OWNER_3;
  const threshold = parseInt(process.env.SAFE_THRESHOLD || "2", 10);
  const saltNonce = BigInt(process.env.SAFE_NONCE || "0");
  const multisigOnly   = (process.env.MULTISIG_ONLY  || "1") !== "0";
  const revokeDeployer = (process.env.REVOKE_DEPLOYER || "0") === "1";

  if (!owner2 || !owner3) {
    fail(
      "SAFE_OWNER_2 and SAFE_OWNER_3 must be set.\n" +
      "  PowerShell example:\n" +
      "    $env:SAFE_OWNER_2='0xABC...'; $env:SAFE_OWNER_3='0xDEF...'\n" +
      "    npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet"
    );
  }

  const owners = [owner1, owner2, owner3];

  for (const [i, addr] of owners.entries()) {
    if (!ethers.isAddress(addr)) fail(`SAFE_OWNER_${i + 1} is not a valid address: ${addr}`);
  }
  if (new Set(owners.map(a => a.toLowerCase())).size !== 3) {
    fail("All three Safe owners must be distinct addresses.");
  }
  if (threshold < 1 || threshold > owners.length) {
    fail(`SAFE_THRESHOLD must be between 1 and ${owners.length}, got: ${threshold}`);
  }

  console.log("📋 Safe configuration:");
  console.log(`   Owner 1   : ${owners[0]}`);
  console.log(`   Owner 2   : ${owners[1]}`);
  console.log(`   Owner 3   : ${owners[2]}`);
  console.log(`   Threshold : ${threshold}-of-${owners.length}`);
  console.log(`   Salt nonce: ${saltNonce}`);
  console.log(`   Mode      : ${multisigOnly ? "Safe deploy only" : "Safe deploy + ArcNS role transfer"}`);
  if (!multisigOnly && revokeDeployer) {
    console.log(`   Revoke deployer roles: YES ⚠`);
  }

  // ── Load deployment ──────────────────────────────────────────────────────────
  const depPath = path.join(__dirname, `../../deployments/${network.name}-v3.json`);
  if (!fs.existsSync(depPath)) {
    fail(`Deployment file not found: ${depPath}\nRun deployV3.js first.`);
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  console.log("\n📋 Loaded ArcNS deployment:");
  console.log(`   arcController    : ${c.arcController}`);
  console.log(`   circleController : ${c.circleController}`);

  // ── Phase 1: Verify Safe infrastructure ──────────────────────────────────────
  console.log("\n── Phase 1: Verify Safe v1.3.0 Infrastructure ──");
  console.log("   (Arc Testnet is in the official Safe deployments registry)");

  const infra = {
    singleton:       c.safeSingleton       || SAFE_ADDRESSES.singleton,
    proxyFactory:    c.safeProxyFactory    || SAFE_ADDRESSES.proxyFactory,
    fallbackHandler: c.safeFallbackHandler || SAFE_ADDRESSES.fallbackHandler,
  };

  for (const [label, addr] of Object.entries(infra)) {
    const code = await ethers.provider.getCode(addr);
    if (!code || code === "0x") {
      fail(
        `Safe infrastructure contract not found on-chain: ${label} at ${addr}\n` +
        `Chain ID ${chainId} may not have Safe v1.3.0 deployed at the expected addresses.\n` +
        `Check: https://github.com/safe-global/safe-deployments/tree/main/src/assets/v1.3.0`
      );
    }
    ok(`${label} verified: ${addr} (${Math.floor(code.length / 2 - 1)} bytes)`);
  }

  // ── Phase 2: Deploy Safe Proxy ────────────────────────────────────────────────
  console.log("\n── Phase 2: Deploy Safe Proxy ──");

  // Encode setup() initializer calldata
  const safeInterface = new ethers.Interface(SAFE_SINGLETON_ABI);
  const initializerData = safeInterface.encodeFunctionData("setup", [
    owners,
    threshold,
    ethers.ZeroAddress,       // to: no delegate call on setup
    "0x",                     // data: empty
    infra.fallbackHandler,
    ethers.ZeroAddress,       // paymentToken: no payment
    0,                        // payment: 0
    ethers.ZeroAddress,       // paymentReceiver: none
  ]);

  console.log(`   Singleton        : ${infra.singleton}`);
  console.log(`   ProxyFactory     : ${infra.proxyFactory}`);
  console.log(`   FallbackHandler  : ${infra.fallbackHandler}`);
  console.log(`   Initializer      : ${initializerData.slice(0, 66)}...`);

  // Check if Safe already deployed (idempotent)
  let safeAddress = c.safe;
  if (safeAddress) {
    const code = await ethers.provider.getCode(safeAddress);
    if (code && code !== "0x") {
      console.log(`\n   ✓ Safe proxy already deployed: ${safeAddress} — skipping`);
    } else {
      console.log(`   ⚠ Safe address in deployment file has no bytecode — redeploying`);
      safeAddress = null;
    }
  }

  if (!safeAddress) {
    const proxyFactory = new ethers.Contract(infra.proxyFactory, PROXY_FACTORY_ABI, deployer);

    console.log(`\n   Calling ProxyFactory.createProxyWithNonce...`);
    console.log(`   Salt nonce: ${saltNonce}`);

    let safeDeployReceipt;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const tx = await proxyFactory.createProxyWithNonce(
          infra.singleton,
          initializerData,
          saltNonce
        );
        safeDeployReceipt = await tx.wait();
        ok(`createProxyWithNonce — tx: ${safeDeployReceipt.hash}`);
        break;
      } catch (e) {
        const msg = e.message || "";
        if (msg.includes("txpool is full") && attempt < 3) {
          console.warn(`   ⚠ attempt ${attempt} failed (txpool full), retrying in 8s...`);
          await new Promise(r => setTimeout(r, 8000));
        } else {
          throw e;
        }
      }
    }

    // Extract Safe address from ProxyCreation event
    // ProxyCreation(address proxy, address singleton) — both are non-indexed in v1.3.0
    const proxyCreationTopic = ethers.id("ProxyCreation(address,address)");
    const proxyCreationLog = safeDeployReceipt.logs.find(
      log => log.topics[0] === proxyCreationTopic
    );

    if (proxyCreationLog) {
      // Non-indexed event params — decode from data
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ["address", "address"],
        proxyCreationLog.data
      );
      safeAddress = ethers.getAddress(decoded[0]);
    } else {
      // Fallback: scan all logs for a contract address that has bytecode
      console.warn("   ⚠ ProxyCreation event not found via topic — scanning logs for proxy address");
      for (const log of safeDeployReceipt.logs) {
        if (log.address && log.address.toLowerCase() !== infra.proxyFactory.toLowerCase()) {
          const code = await ethers.provider.getCode(log.address);
          if (code && code !== "0x") {
            safeAddress = ethers.getAddress(log.address);
            console.warn(`   ⚠ Using log.address as Safe address: ${safeAddress}`);
            break;
          }
        }
      }
      if (!safeAddress) {
        fail(
          "Could not determine Safe address from deployment receipt.\n" +
          `Check tx on ArcScan: https://testnet.arcscan.app/tx/${safeDeployReceipt.hash}`
        );
      }
    }

    ok(`Safe proxy deployed: ${safeAddress}`);
  }

  // ── Phase 2 Verification ──────────────────────────────────────────────────────
  console.log("\n── Phase 2 Verification ──");
  const safe = new ethers.Contract(safeAddress, SAFE_SINGLETON_ABI, ethers.provider);

  let onChainOwners, onChainThreshold, onChainNonce;
  try {
    onChainOwners    = await safe.getOwners();
    onChainThreshold = await safe.getThreshold();
    onChainNonce     = await safe.nonce();
  } catch (e) {
    fail(`Failed to read Safe state at ${safeAddress}: ${e.message}`);
  }

  console.log(`   Safe address  : ${safeAddress}`);
  console.log(`   Owners        : ${onChainOwners.join(", ")}`);
  console.log(`   Threshold     : ${onChainThreshold}-of-${onChainOwners.length}`);
  console.log(`   Nonce         : ${onChainNonce}`);

  const expectedOwnerSet = new Set(owners.map(a => a.toLowerCase()));
  const actualOwnerSet   = new Set(onChainOwners.map(a => a.toLowerCase()));
  for (const o of expectedOwnerSet) {
    if (!actualOwnerSet.has(o)) fail(`Expected owner ${o} not found in Safe owners`);
  }
  if (Number(onChainThreshold) !== threshold) {
    fail(`Threshold mismatch: expected ${threshold}, got ${onChainThreshold}`);
  }
  ok(`All ${owners.length} owners confirmed on-chain`);
  ok(`Threshold ${threshold}-of-${owners.length} confirmed`);

  // ── Phase 3: ArcNS Role Transfer (optional) ───────────────────────────────────
  if (!multisigOnly) {
    console.log("\n── Phase 3: ArcNS Role Transfer to Safe ──");

    const ADMIN_ROLE    = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
    const PAUSER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

    const controllerAbi = [
      "function grantRole(bytes32 role, address account) external",
      "function revokeRole(bytes32 role, address account) external",
      "function hasRole(bytes32 role, address account) external view returns (bool)",
    ];

    const arcController    = new ethers.Contract(c.arcController,    controllerAbi, deployer);
    const circleController = new ethers.Contract(c.circleController, controllerAbi, deployer);

    const rolesToGrant = [
      { name: "ADMIN_ROLE",    hash: ADMIN_ROLE },
      { name: "UPGRADER_ROLE", hash: UPGRADER_ROLE },
      { name: "PAUSER_ROLE",   hash: PAUSER_ROLE },
    ];

    for (const { name, hash } of rolesToGrant) {
      const arcHas = await arcController.hasRole(hash, safeAddress);
      if (arcHas) {
        console.log(`   ✓ arcController.${name} already granted to Safe — skipping`);
      } else {
        await confirmTxWithRetry(
          `arcController.grantRole(${name}, Safe)`,
          () => arcController.grantRole(hash, safeAddress)
        );
      }

      const circleHas = await circleController.hasRole(hash, safeAddress);
      if (circleHas) {
        console.log(`   ✓ circleController.${name} already granted to Safe — skipping`);
      } else {
        await confirmTxWithRetry(
          `circleController.grantRole(${name}, Safe)`,
          () => circleController.grantRole(hash, safeAddress)
        );
      }
    }

    ok("All roles granted to Safe on both controllers");

    if (revokeDeployer) {
      console.log("\n── Phase 3b: Revoke Deployer Roles ──");
      console.warn("   ⚠ WARNING: This is irreversible. Deployer will lose all admin access.");
      console.warn(`   ⚠ Deployer: ${deployer.address}`);
      console.warn(`   ⚠ Safe    : ${safeAddress}`);

      for (const { name, hash } of rolesToGrant) {
        const arcHas = await arcController.hasRole(hash, deployer.address);
        if (!arcHas) {
          console.log(`   ✓ arcController.${name} already absent from deployer — skipping`);
        } else {
          await confirmTxWithRetry(
            `arcController.revokeRole(${name}, deployer)`,
            () => arcController.revokeRole(hash, deployer.address)
          );
        }

        const circleHas = await circleController.hasRole(hash, deployer.address);
        if (!circleHas) {
          console.log(`   ✓ circleController.${name} already absent from deployer — skipping`);
        } else {
          await confirmTxWithRetry(
            `circleController.revokeRole(${name}, deployer)`,
            () => circleController.revokeRole(hash, deployer.address)
          );
        }
      }

      ok("Deployer roles revoked from both controllers");
    }
  } else {
    console.log("\n── Phase 3: Skipped (MULTISIG_ONLY=1) ──");
    console.log("   To grant ArcNS roles to Safe, re-run with MULTISIG_ONLY=0");
  }

  // ── Update deployment file ────────────────────────────────────────────────────
  c.safe                = safeAddress;
  c.safeSingleton       = infra.singleton;
  c.safeProxyFactory    = infra.proxyFactory;
  c.safeFallbackHandler = infra.fallbackHandler;

  dep.multisig = {
    safe:            safeAddress,
    owners,
    threshold,
    saltNonce:       saltNonce.toString(),
    deployedAt:      new Date().toISOString(),
    deployedBy:      deployer.address,
    rolesGranted:    !multisigOnly,
    deployerRevoked: !multisigOnly && revokeDeployer,
    infrastructure: {
      singleton:       infra.singleton,
      proxyFactory:    infra.proxyFactory,
      fallbackHandler: infra.fallbackHandler,
      source:          "safe-global/safe-deployments v1.3.0 eip155",
    },
  };

  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  ok(`Deployment file updated: deployments/${network.name}-v3.json`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(62));
  console.log("✅ Safe Multisig Deployment Complete");
  console.log("═".repeat(62));
  console.log(`   Safe address          : ${safeAddress}`);
  console.log(`   Owners                : ${owners.join(", ")}`);
  console.log(`   Threshold             : ${threshold}-of-${owners.length}`);
  console.log(`   GnosisSafe singleton  : ${infra.singleton}`);
  console.log(`   ProxyFactory          : ${infra.proxyFactory}`);
  console.log(`   FallbackHandler       : ${infra.fallbackHandler}`);
  console.log("═".repeat(62));

  console.log("\n📋 Next steps:");
  console.log(`   1. Verify Safe on ArcScan:`);
  console.log(`      https://testnet.arcscan.app/address/${safeAddress}`);
  if (multisigOnly) {
    console.log(`   2. Grant ArcNS roles to Safe:`);
    console.log(`      $env:MULTISIG_ONLY='0'; npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet`);
    console.log(`   3. After verifying Safe works, revoke deployer roles:`);
    console.log(`      $env:MULTISIG_ONLY='0'; $env:REVOKE_DEPLOYER='1'; npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet`);
  } else {
    console.log(`   2. Test a multisig transaction (e.g., pause/unpause a controller)`);
    if (!revokeDeployer) {
      console.log(`   3. When ready, revoke deployer roles:`);
      console.log(`      $env:MULTISIG_ONLY='0'; $env:REVOKE_DEPLOYER='1'; npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet`);
    }
  }

  return { safeAddress, owners, threshold };
}

main().catch(e => {
  console.error("\n❌ FATAL:", e.message);
  process.exit(1);
});
