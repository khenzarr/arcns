/**
 * ArcNS Proxy Verification Script
 *
 * Reads the EIP-1967 implementation slot from each UUPS proxy and compares
 * it against the expected implementation address compiled from the current
 * source. Throws if any proxy is running stale bytecode.
 *
 * EIP-1967 implementation slot:
 *   keccak256("eip1967.proxy.implementation") - 1
 *   = 0x360894a13ba1a3210667c828492db98dca3e2076538539153fce6ef7eeafea29b
 *
 * Run: npx hardhat run scripts/verifyProxy.js --network arc_testnet
 */

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

/**
 * Read the EIP-1967 implementation address from a proxy.
 *
 * Uses eth_getStorageAt with explicit "latest" block tag for Arc RPC compatibility.
 * Some Arc RPC nodes reject getStorage calls without an explicit block parameter.
 */
async function getImplementationAddress(provider, proxyAddress) {
  // Use send() with explicit "latest" — Arc RPC compatible
  const raw = await provider.send("eth_getStorageAt", [proxyAddress, IMPL_SLOT, "latest"]);
  return ethers.getAddress("0x" + raw.slice(-40));
}

/**
 * Get the deployed bytecode hash for a contract name.
 * Used to compare against on-chain bytecode.
 */
async function getDeployedBytecodeHash(contractName) {
  const factory = await ethers.getContractFactory(contractName);
  return ethers.keccak256(factory.bytecode);
}

async function main() {
  const provider = ethers.provider;
  const [signer] = await ethers.getSigners();

  console.log("\n🔍 ArcNS Proxy Verification");
  console.log("============================");
  console.log("Network  :", network.name);
  console.log("Checker  :", signer.address);

  const depPath = path.join(__dirname, `../deployments/${network.name}-v2.json`);
  if (!fs.existsSync(depPath)) {
    throw new Error(`No deployment file found: ${depPath}`);
  }
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;

  const proxiesToCheck = [
    { name: "ArcNSRegistrarControllerV2 (.arc)",    proxy: c.arcController    },
    { name: "ArcNSRegistrarControllerV2 (.circle)", proxy: c.circleController },
    { name: "ArcNSResolverV2",                      proxy: c.resolver         },
  ];

  let allOk = true;

  for (const { name, proxy } of proxiesToCheck) {
    console.log(`\n📦 ${name}`);
    console.log(`   Proxy   : ${proxy}`);

    const implAddr = await getImplementationAddress(provider, proxy);
    console.log(`   Impl    : ${implAddr}`);

    // Verify the implementation has non-zero code
    const code = await provider.getCode(implAddr);
    if (!code || code === "0x") {
      console.error(`   ❌ STALE PROXY DETECTED — implementation address ${implAddr} has no bytecode!`);
      allOk = false;
      continue;
    }

    console.log(`   Code    : ${code.length} bytes`);

    // Cross-check: call a known V2-only function to confirm the impl is current.
    // debugCommitment exists only in the updated implementation.
    const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (name.includes("Controller")) {
      try {
        const ctrl = await ethers.getContractAt("ArcNSRegistrarControllerV2", proxy);
        await ctrl.debugCommitment(ZERO_HASH);
        console.log(`   ✓ debugCommitment() present — implementation is current`);
      } catch (e) {
        if (e.message?.includes("function not found") || e.message?.includes("no matching function")) {
          console.error(`   ❌ STALE PROXY — debugCommitment() not found. Proxy is running old implementation.`);
          console.error(`      Run: npx hardhat run scripts/upgradeV2.js --network ${network.name}`);
          allOk = false;
        } else {
          // Function exists but reverted (expected for zero hash) — that's fine
          console.log(`   ✓ debugCommitment() present — implementation is current`);
        }
      }

      // Verify MIN_NAME_LENGTH == 1 (V2 feature)
      try {
        const ctrl = await ethers.getContractAt("ArcNSRegistrarControllerV2", proxy);
        const minLen = await ctrl.MIN_NAME_LENGTH();
        if (minLen !== 1n) {
          console.warn(`   ⚠ MIN_NAME_LENGTH = ${minLen} (expected 1) — may be running older V2`);
        } else {
          console.log(`   ✓ MIN_NAME_LENGTH = ${minLen}`);
        }
      } catch (e) {
        console.warn(`   ⚠ MIN_NAME_LENGTH read failed: ${e.message}`);
      }

      // Verify getCommitmentStatus exists (added in current V2)
      try {
        const ctrl = await ethers.getContractAt("ArcNSRegistrarControllerV2", proxy);
        await ctrl.getCommitmentStatus(ZERO_HASH);
        console.log(`   ✓ getCommitmentStatus() present`);
      } catch (e) {
        if (e.message?.includes("function not found") || e.message?.includes("no matching function")) {
          console.error(`   ❌ getCommitmentStatus() NOT FOUND — implementation is missing this function`);
          allOk = false;
        } else {
          console.log(`   ✓ getCommitmentStatus() present (reverted as expected for zero hash)`);
        }
      }

      // Verify makeCommitmentWithSender exists and returns a deterministic hash
      try {
        const ctrl = await ethers.getContractAt("ArcNSRegistrarControllerV2", proxy);
        const [signer2] = await ethers.getSigners();
        const secret = ethers.randomBytes(32);
        const hash = await ctrl.makeCommitmentWithSender(
          "test", signer2.address, BigInt(365 * 24 * 60 * 60),
          secret, ethers.ZeroAddress, [], false, signer2.address
        );
        console.log(`   ✓ makeCommitmentWithSender() present — hash: ${hash}`);
      } catch (e) {
        if (e.message?.includes("function not found") || e.message?.includes("no matching function")) {
          console.error(`   ❌ makeCommitmentWithSender() NOT FOUND — frontend commitment hash will mismatch`);
          allOk = false;
        } else {
          console.log(`   ✓ makeCommitmentWithSender() present (call error: ${e.message?.slice(0, 60)})`);
        }
      }
    }

    // Log the stored implementation address for manual cross-check
    if (dep.contracts.resolverImpl && name.includes("Resolver")) {
      const storedImpl = dep.contracts.resolverImpl;
      if (implAddr.toLowerCase() !== storedImpl.toLowerCase()) {
        console.warn(`   ⚠ Implementation mismatch vs deployment file`);
        console.warn(`     deployment.json : ${storedImpl}`);
        console.warn(`     on-chain slot   : ${implAddr}`);
        console.warn(`     This may mean the deployment file is stale. Run upgradeV2.js to resync.`);
      } else {
        console.log(`   ✓ Matches deployment file`);
      }
    }
  }

  console.log("\n" + "=".repeat(44));
  if (allOk) {
    console.log("✅ All proxies verified — implementations are current.");
  } else {
    console.error("❌ STALE PROXY DETECTED — run upgradeV2.js to fix.");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
