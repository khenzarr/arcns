/**
 * ArcNS v3 — Contract Verification Script
 * Verifies all v3 deployed contracts on ArcScan (Blockscout-based)
 *
 * Usage:
 *   npx hardhat run scripts/v3/verifyV3.js --network arc_testnet
 */

"use strict";

const { run, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function verify(name, address, constructorArguments, contract) {
  process.stdout.write(`Verifying ${name} at ${address}... `);
  try {
    await run("verify:verify", { address, constructorArguments, contract });
    console.log("✅ verified");
  } catch (err) {
    const msg = err.message || "";
    if (msg.toLowerCase().includes("already verified") || msg.toLowerCase().includes("already been verified")) {
      console.log("⚠️  already verified");
    } else {
      console.log("❌ FAILED:", msg.slice(0, 120));
      throw err;
    }
  }
}

async function main() {
  const depPath = path.join(__dirname, "../../deployments/arc_testnet-v3.json");
  if (!fs.existsSync(depPath)) throw new Error("Deployment file not found: " + depPath);

  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c   = dep.contracts;
  const nh  = dep.namehashes;

  console.log(`\n🔍 Verifying ArcNS v3 on ArcScan (${network.name})...\n`);

  // ── Standalone contracts ───────────────────────────────────────────────────

  await verify(
    "ArcNSRegistry",
    c.registry,
    [],
    "contracts/v3/registry/ArcNSRegistry.sol:ArcNSRegistry"
  );

  await verify(
    "ArcNSPriceOracle",
    c.priceOracle,
    [],
    "contracts/v3/registrar/ArcNSPriceOracle.sol:ArcNSPriceOracle"
  );

  await verify(
    "ArcNSBaseRegistrar (.arc)",
    c.arcRegistrar,
    [c.registry, nh.arc, "arc"],
    "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"
  );

  await verify(
    "ArcNSBaseRegistrar (.circle)",
    c.circleRegistrar,
    [c.registry, nh.circle, "circle"],
    "contracts/v3/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar"
  );

  await verify(
    "ArcNSReverseRegistrar",
    c.reverseRegistrar,
    [c.registry, c.resolver],
    "contracts/v3/registrar/ArcNSReverseRegistrar.sol:ArcNSReverseRegistrar"
  );

  // ── UUPS proxies — verify the implementation address (no constructor args) ─

  await verify(
    "ArcNSResolver (impl)",
    c.resolverImpl,
    [],
    "contracts/v3/resolver/ArcNSResolver.sol:ArcNSResolver"
  );

  await verify(
    "ArcNSController (.arc impl)",
    c.arcControllerImpl,
    [],
    "contracts/v3/controller/ArcNSController.sol:ArcNSController"
  );

  // circleControllerImpl is the same bytecode/address as arcControllerImpl
  if (c.circleControllerImpl && c.circleControllerImpl !== c.arcControllerImpl) {
    await verify(
      "ArcNSController (.circle impl)",
      c.circleControllerImpl,
      [],
      "contracts/v3/controller/ArcNSController.sol:ArcNSController"
    );
  }

  console.log("\n✅ Verification pass complete.");
  console.log(`🔗 ArcScan: https://testnet.arcscan.app/address/${c.arcRegistrar}`);
}

main().catch(e => { console.error("\n❌ Fatal:", e.message); process.exit(1); });
