/**
 * generate-frontend-config.js
 *
 * Reads the canonical v3 deployment JSON and writes
 * frontend/src/lib/generated-contracts.ts.
 *
 * Usage:
 *   node scripts/generate-frontend-config.js
 *   node scripts/generate-frontend-config.js --network arc_testnet
 *
 * The generated file is the single source of truth for deployed contract
 * addresses in the frontend. Never hand-edit generated-contracts.ts.
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const network = process.argv.includes("--network")
  ? process.argv[process.argv.indexOf("--network") + 1]
  : "arc_testnet";

const deploymentPath = path.join(__dirname, `../deployments/${network}-v3.json`);

if (!fs.existsSync(deploymentPath)) {
  console.error(`[generate-frontend-config] Deployment file not found: ${deploymentPath}`);
  console.error(`Run: npx hardhat run scripts/v3/deployV3.js --network ${network}`);
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
const { contracts, chainId, version, deployedAt, namehashes } = deployment;

const required = [
  "usdc", "registry", "resolver", "resolverImpl",
  "priceOracle", "arcRegistrar", "circleRegistrar",
  "reverseRegistrar", "treasury",
  "arcController", "arcControllerImpl",
  "circleController", "circleControllerImpl",
];

for (const key of required) {
  if (!contracts[key]) {
    console.error(`[generate-frontend-config] Missing contract address: ${key}`);
    process.exit(1);
  }
}

const output = `/**
 * generated-contracts.ts — AUTO-GENERATED. DO NOT HAND-EDIT.
 *
 * Generated from: deployments/${network}-v3.json
 * Network:        ${network}
 * Chain ID:       ${chainId}
 * Version:        ${version}
 * Deployed at:    ${deployedAt}
 *
 * To regenerate: node scripts/generate-frontend-config.js --network ${network}
 */

// ─── Chain truth ──────────────────────────────────────────────────────────────

export const DEPLOYED_CHAIN_ID   = ${chainId} as const;
export const DEPLOYED_NETWORK    = "${network}" as const;
export const DEPLOYED_VERSION    = "${version}" as const;
export const DEPLOYED_AT         = "${deployedAt}" as const;

// ─── Contract addresses ───────────────────────────────────────────────────────

export const ADDR_USDC               = "${contracts.usdc}"               as \`0x\${string}\`;
export const ADDR_REGISTRY           = "${contracts.registry}"           as \`0x\${string}\`;
export const ADDR_RESOLVER           = "${contracts.resolver}"           as \`0x\${string}\`;
export const ADDR_RESOLVER_IMPL      = "${contracts.resolverImpl}"       as \`0x\${string}\`;
export const ADDR_PRICE_ORACLE       = "${contracts.priceOracle}"        as \`0x\${string}\`;
export const ADDR_ARC_REGISTRAR      = "${contracts.arcRegistrar}"       as \`0x\${string}\`;
export const ADDR_CIRCLE_REGISTRAR   = "${contracts.circleRegistrar}"    as \`0x\${string}\`;
export const ADDR_REVERSE_REGISTRAR  = "${contracts.reverseRegistrar}"   as \`0x\${string}\`;
export const ADDR_TREASURY           = "${contracts.treasury}"           as \`0x\${string}\`;
export const ADDR_ARC_CONTROLLER     = "${contracts.arcController}"      as \`0x\${string}\`;
export const ADDR_ARC_CTRL_IMPL      = "${contracts.arcControllerImpl}"  as \`0x\${string}\`;
export const ADDR_CIRCLE_CONTROLLER  = "${contracts.circleController}"   as \`0x\${string}\`;
export const ADDR_CIRCLE_CTRL_IMPL   = "${contracts.circleControllerImpl}" as \`0x\${string}\`;

// ─── Canonical namehashes ─────────────────────────────────────────────────────

export const NAMEHASH_ARC          = "${namehashes.arc}"          as \`0x\${string}\`;
export const NAMEHASH_CIRCLE       = "${namehashes.circle}"       as \`0x\${string}\`;
export const NAMEHASH_ADDR_REVERSE = "${namehashes.addrReverse}"  as \`0x\${string}\`;
`;

const outDir  = path.join(__dirname, "../frontend/src/lib");
const outFile = path.join(outDir, "generated-contracts.ts");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, output, "utf8");

console.log(`[generate-frontend-config] Written: frontend/src/lib/generated-contracts.ts`);
console.log(`  Network:  ${network}`);
console.log(`  Chain ID: ${chainId}`);
console.log(`  Version:  ${version}`);
