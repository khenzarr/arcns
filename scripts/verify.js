/**
 * ArcNS Contract Verification Script
 * Verifies all deployed contracts on ArcScan
 */

const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deploymentPath = path.join(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network: ${network.name}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const { contracts } = deployment;

  console.log("\n🔍 Verifying ArcNS contracts on ArcScan...\n");

  const verifications = [
    {
      name: "MockUSDC",
      address: contracts.usdc,
      args: [],
    },
    {
      name: "ArcNSRegistry",
      address: contracts.registry,
      args: [],
    },
    {
      name: "ArcNSResolver",
      address: contracts.resolver,
      args: [contracts.registry],
    },
    {
      name: "ArcNSPriceOracle",
      address: contracts.priceOracle,
      args: [],
    },
    {
      name: "ArcNSBaseRegistrar (.arc)",
      address: contracts.arcRegistrar,
      args: [contracts.registry, deployment.namehashes.arc, "arc"],
      contract: "contracts/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar",
    },
    {
      name: "ArcNSBaseRegistrar (.circle)",
      address: contracts.circleRegistrar,
      args: [contracts.registry, deployment.namehashes.circle, "circle"],
      contract: "contracts/registrar/ArcNSBaseRegistrar.sol:ArcNSBaseRegistrar",
    },
    {
      name: "ArcNSReverseRegistrar",
      address: contracts.reverseRegistrar,
      args: [contracts.registry, contracts.resolver],
    },
    {
      name: "ArcNSRegistrarController (.arc)",
      address: contracts.arcController,
      args: [
        contracts.arcRegistrar,
        contracts.priceOracle,
        contracts.usdc,
        contracts.registry,
        contracts.resolver,
        deployment.treasury,
      ],
      contract: "contracts/registrar/ArcNSRegistrarController.sol:ArcNSRegistrarController",
    },
    {
      name: "ArcNSRegistrarController (.circle)",
      address: contracts.circleController,
      args: [
        contracts.circleRegistrar,
        contracts.priceOracle,
        contracts.usdc,
        contracts.registry,
        contracts.resolver,
        deployment.treasury,
      ],
      contract: "contracts/registrar/ArcNSRegistrarController.sol:ArcNSRegistrarController",
    },
  ];

  for (const v of verifications) {
    try {
      console.log(`Verifying ${v.name} at ${v.address}...`);
      await run("verify:verify", {
        address: v.address,
        constructorArguments: v.args,
        contract: v.contract,
      });
      console.log(`   ✅ ${v.name} verified\n`);
    } catch (err) {
      if (err.message.includes("Already Verified")) {
        console.log(`   ⚠️  ${v.name} already verified\n`);
      } else {
        console.error(`   ❌ ${v.name} failed:`, err.message, "\n");
      }
    }
  }

  console.log("✅ Verification complete!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
