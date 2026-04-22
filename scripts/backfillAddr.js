/**
 * backfillAddr.js
 *
 * Backfills resolver.addr() for names registered BEFORE the upgrade that
 * added automatic setAddr() on registration.
 *
 * For each name: if registry.resolver(node) is set but resolver.addr(node)
 * is address(0), call resolver.setAddr(node, owner) as the controller
 * (which has CONTROLLER_ROLE).
 *
 * Run: npx hardhat run scripts/backfillAddr.js --network arc_testnet
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function namehash(name) {
  let node = ethers.ZeroHash;
  if (name === "") return node;
  const labels = name.split(".").reverse();
  for (const label of labels) {
    const lh = ethers.keccak256(ethers.toUtf8Bytes(label));
    node = ethers.keccak256(ethers.concat([node, lh]));
  }
  return node;
}

// Known registered names — extend this list as needed
const KNOWN_NAMES = [
  "flowpay.arc",
  "lowpay.arc",
  "a.arc",
  "aa.arc",
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🔧 ArcNS Addr Backfill");
  console.log("======================");
  console.log("Deployer:", deployer.address);

  const depPath = path.join(__dirname, "../deployments/arc_testnet-v2.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c = dep.contracts;

  const registry = await ethers.getContractAt("ArcNSRegistry", c.registry);
  const resolver = await ethers.getContractAt("ArcNSResolverV2", c.resolver);

  // The controller has CONTROLLER_ROLE — use it to call setAddr
  // We call setAddr directly from the deployer who has ADMIN_ROLE on the resolver
  // and can grant/use CONTROLLER_ROLE

  for (const fullName of KNOWN_NAMES) {
    const node = namehash(fullName);
    console.log(`\n📋 ${fullName}`);
    console.log(`   node: ${node}`);

    const owner = await registry.owner(node);
    const resolverAddr = await registry.resolver(node);
    const currentAddr = await resolver["addr(bytes32)"](node);

    console.log(`   owner:    ${owner}`);
    console.log(`   resolver: ${resolverAddr}`);
    console.log(`   addr:     ${currentAddr}`);

    if (owner === ethers.ZeroAddress) {
      console.log(`   ⏭  Not registered, skipping`);
      continue;
    }

    if (resolverAddr === ethers.ZeroAddress) {
      console.log(`   ⚠️  No resolver set, skipping`);
      continue;
    }

    if (currentAddr !== ethers.ZeroAddress) {
      console.log(`   ✓  addr already set`);
      continue;
    }

    // Set addr to the owner
    console.log(`   🔧 Setting addr to ${owner}...`);
    try {
      const tx = await resolver["setAddr(bytes32,address)"](node, owner);
      await tx.wait();
      const verified = await resolver["addr(bytes32)"](node);
      console.log(`   ✓  addr set: ${verified}`);
    } catch (e) {
      console.log(`   ❌ Failed: ${e.message}`);
    }
  }

  console.log("\n✅ Backfill complete!");
}

main().catch(e => { console.error(e); process.exit(1); });
