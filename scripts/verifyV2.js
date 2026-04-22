/**
 * ArcNS V2 Contract Verification on ArcScan
 * Verifies both proxy contracts and their implementations
 */
const { run, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function verify(name, address, args, contract) {
  try {
    process.stdout.write(`Verifying ${name} at ${address}... `);
    await run("verify:verify", {
      address,
      constructorArguments: args || [],
      contract,
    });
    console.log("✅");
  } catch (err) {
    if (err.message.includes("Already Verified") || err.message.includes("already verified")) {
      console.log("⚠️  already verified");
    } else {
      console.log("❌", err.message.slice(0, 80));
    }
  }
}

async function main() {
  const deploymentPath = path.join(__dirname, `../deployments/${network.name}-v2.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No V2 deployment found for: ${network.name}`);
  }

  const dep = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const c = dep.contracts;

  console.log("\n🔍 Verifying ArcNS V2 on ArcScan...\n");

  // Non-upgradeable contracts
  await verify("ArcNSRegistry",        c.registry,         []);
  await verify("ArcNSBaseRegistrar (.arc)",    c.arcRegistrar,    [c.registry, dep.namehashes.arc, "arc"],    "contracts/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  await verify("ArcNSBaseRegistrar (.circle)", c.circleRegistrar, [c.registry, dep.namehashes.circle, "circle"], "contracts/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar");
  await verify("ArcNSReverseRegistrar", c.reverseRegistrar, [c.registry, c.resolver]);

  // UUPS implementation contracts (verify the impl, not the proxy)
  await verify("ArcNSResolverV2 (impl)",         c.resolverImpl, []);
  await verify("ArcNSPriceOracleV2 (proxy)",     c.priceOracle,  []);
  await verify("ArcNSTreasury (proxy)",           c.treasury,     []);
  await verify("ArcNSRegistrarControllerV2 (.arc proxy)",    c.arcController,    []);
  await verify("ArcNSRegistrarControllerV2 (.circle proxy)", c.circleController, []);

  console.log("\n✅ Verification complete!");
  console.log("🔗 View on ArcScan: https://testnet.arcscan.app/address/" + c.registry);
}

main().catch(e => { console.error(e); process.exit(1); });
