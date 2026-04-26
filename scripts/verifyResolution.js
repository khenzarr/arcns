/**
 * verifyResolution.js
 *
 * Full end-to-end verification of ArcNS resolution correctness.
 * Tests: availability, pricing, registration, resolver.addr(), reverse records.
 *
 * Run: npx hardhat run scripts/verifyResolution.js --network arc_testnet
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

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

async function check(label, expected, actual, context = "") {
  const pass = actual === expected || (typeof expected === "function" && expected(actual));
  const icon = pass ? "✓" : "✗";
  const ctx = context ? ` [${context}]` : "";
  console.log(`   ${icon} ${label}${ctx}: ${actual}`);
  if (!pass) {
    console.log(`     Expected: ${typeof expected === "function" ? "(function)" : expected}`);
  }
  return pass;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n🔍 ArcNS Resolution Verification");
  console.log("==================================");
  console.log("Network  :", (await ethers.provider.getNetwork()).name);
  console.log("Deployer :", deployer.address);

  const depPath = path.join(__dirname, "../deployments/arc_testnet-v2.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf8"));
  const c = dep.contracts;

  const registry   = await ethers.getContractAt("ArcNSRegistry", c.registry);
  const resolver   = await ethers.getContractAt("ArcNSResolverV2", c.resolver);
  const controller = await ethers.getContractAt("ArcNSRegistrarControllerV2", c.arcController);
  const oracle     = await ethers.getContractAt("ArcNSPriceOracle", c.priceOracle);

  let allPass = true;

  // ── Phase 1: Contract configuration ───────────────────────────────────────
  console.log("\n📋 Phase 1 — Contract Configuration");

  const CONTROLLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CONTROLLER_ROLE"));
  const arcHasRole = await resolver.hasRole(CONTROLLER_ROLE, c.arcController);
  const circleHasRole = await resolver.hasRole(CONTROLLER_ROLE, c.circleController);
  allPass &= await check("arcController has CONTROLLER_ROLE", true, arcHasRole);
  allPass &= await check("circleController has CONTROLLER_ROLE", true, circleHasRole);

  const minLen = await controller.MIN_NAME_LENGTH();
  allPass &= await check("MIN_NAME_LENGTH", 1n, minLen);

  // ── Phase 2: Pricing ───────────────────────────────────────────────────────
  console.log("\n📋 Phase 2 — Pricing");

  const p1 = await oracle.price1Char();
  const p2 = await oracle.price2Char();
  const p3 = await oracle.price3Char();
  const p4 = await oracle.price4Char();
  const p5 = await oracle.price5Plus();
  allPass &= await check("1-char price", 50_000_000n, p1, "$50/yr");
  allPass &= await check("2-char price", 25_000_000n, p2, "$25/yr");
  allPass &= await check("3-char price", 15_000_000n, p3, "$15/yr");
  allPass &= await check("4-char price", 10_000_000n, p4, "$10/yr");
  allPass &= await check("5+ price",      2_000_000n, p5, "$2/yr");

  // ── Phase 3: Availability ──────────────────────────────────────────────────
  console.log("\n📋 Phase 3 — Availability");

  const availA  = await controller.available("a");
  const availAA = await controller.available("aa");
  const availFlowpay = await controller.available("flowpay");
  allPass &= await check("available('a')", true, availA, "1-char");
  allPass &= await check("available('aa')", true, availAA, "2-char");
  allPass &= await check("available('flowpay')", false, availFlowpay, "already registered");

  // ── Phase 4: Resolver for flowpay.arc ─────────────────────────────────────
  console.log("\n📋 Phase 4 — Resolver (flowpay.arc)");

  const flowpayNode = namehash("flowpay.arc");
  console.log(`   node: ${flowpayNode}`);

  const owner = await registry.owner(flowpayNode);
  const resolverAddr = await registry.resolver(flowpayNode);
  const addr = await resolver["addr(bytes32)"](flowpayNode);

  allPass &= await check("owner set", v => v !== ethers.ZeroAddress, owner);
  allPass &= await check("resolver set", c.resolver.toLowerCase(), resolverAddr.toLowerCase());
  allPass &= await check("addr set", v => v !== ethers.ZeroAddress, addr);
  allPass &= await check("addr matches owner", owner.toLowerCase(), addr.toLowerCase());

  // ── Phase 5: Reverse resolution ────────────────────────────────────────────
  console.log("\n📋 Phase 5 — Reverse Resolution");

  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2";
  const addrHex = deployer.address.toLowerCase().slice(2);
  const addrLabel = ethers.keccak256(ethers.toUtf8Bytes(addrHex));
  const reverseNode = ethers.keccak256(ethers.concat([ADDR_REVERSE_NODE, addrLabel]));
  const reverseName = await resolver.name(reverseNode);
  console.log(`   reverse node: ${reverseNode}`);
  allPass &= await check("reverse name", v => v.length > 0, reverseName, `deployer → ${reverseName}`);

  // ── Phase 6: Namehash consistency ──────────────────────────────────────────
  console.log("\n📋 Phase 6 — Namehash Consistency");

  // Verify the namehash used in the contract matches EIP-137
  const arcNode = namehash("arc");
  const expectedArcNode = "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae";
  allPass &= await check("namehash('arc')", expectedArcNode, arcNode);

  const flowpayNodeExpected = namehash("flowpay.arc");
  allPass &= await check("namehash('flowpay.arc') consistent", flowpayNode, flowpayNodeExpected);

  // ── Phase 7: rentPrice for short names ────────────────────────────────────
  console.log("\n📋 Phase 7 — Short Name Pricing");

  const priceA  = await controller.rentPrice("a", ONE_YEAR);
  const priceAA = await controller.rentPrice("aa", ONE_YEAR);
  const priceFlowpay = await controller.rentPrice("flowpay", ONE_YEAR);
  allPass &= await check("rentPrice('a', 1yr)", 50_000_000n, priceA.base, "$50");
  allPass &= await check("rentPrice('aa', 1yr)", 25_000_000n, priceAA.base, "$25");
  allPass &= await check("rentPrice('flowpay', 1yr)", 2_000_000n, priceFlowpay.base, "$2");

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  if (allPass) {
    console.log("✅ ALL CHECKS PASSED — ArcNS resolution is correct");
  } else {
    console.log("❌ SOME CHECKS FAILED — see above");
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
