"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const SOURCES = Object.freeze({
  ArcController: "arcController",
  CircleController: "circleController",
  ArcRegistrar: "arcRegistrar",
  CircleRegistrar: "circleRegistrar",
  Resolver: "resolver",
  Registry: "registry",
  ReverseRegistrar: "reverseRegistrar",
  DiscountRegistry: "discountRegistry",
});

function loadConfig(env = process.env) {
  if (!env.DEPLOYMENT_ARTIFACT_PATH) throw new Error("DEPLOYMENT_ARTIFACT_PATH is required");
  if (!env.GRAPH_MAINNET_NETWORK) throw new Error("GRAPH_MAINNET_NETWORK is required and must match the selected indexer provider's Arc mainnet slug");
  if (!/^[a-zA-Z0-9_-]+$/.test(env.GRAPH_MAINNET_NETWORK)) throw new Error("GRAPH_MAINNET_NETWORK contains invalid characters");
  const artifactPath = path.resolve(env.DEPLOYMENT_ARTIFACT_PATH);
  const deployment = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  if (deployment.network !== "arc_mainnet" || Number(deployment.chainId) !== 5042) throw new Error("Deployment artifact must target Arc mainnet 5042");
  for (const key of Object.values(SOURCES)) {
    if (!ethers.isAddress(deployment.contracts?.[key]) || deployment.contracts[key] === ethers.ZeroAddress) throw new Error(`Missing ${key} address`);
    const record = deployment.deploymentRecords?.[key];
    if (!record || !Number.isSafeInteger(record.blockNumber) || record.blockNumber <= 0 || !ethers.isHexString(record.blockHash, 32)) {
      throw new Error(`Missing reconciled deployment record for ${key}`);
    }
  }
  return Object.freeze({
    deployment,
    graphNetwork: env.GRAPH_MAINNET_NETWORK,
    templatePath: path.resolve(env.SUBGRAPH_TEMPLATE_PATH || path.join(__dirname, "../../indexer/subgraph.yaml")),
    outputPath: path.resolve(env.MAINNET_SUBGRAPH_OUTPUT_PATH || path.join(__dirname, "../../indexer/subgraph.mainnet.yaml")),
  });
}

function replaceSource(manifest, sourceName, address, startBlock) {
  const marker = `    name: ${sourceName}`;
  const start = manifest.indexOf(marker);
  if (start < 0) throw new Error(`Subgraph template is missing ${sourceName}`);
  const next = manifest.indexOf("\n  - kind: ethereum", start + marker.length);
  const end = next < 0 ? manifest.length : next;
  const block = manifest.slice(start, end);
  const sourceStart = block.indexOf("    source:\n");
  if (sourceStart < 0) throw new Error(`${sourceName} source section is missing`);
  let updated = block;
  if (/      address:/.test(updated)) updated = updated.replace(/      address:.*\n/, `      address: "${ethers.getAddress(address)}"\n`);
  else updated = updated.replace("    source:\n", `    source:\n      address: "${ethers.getAddress(address)}"\n`);
  if (/      startBlock:/.test(updated)) updated = updated.replace(/      startBlock:.*\n/, `      startBlock: ${startBlock}\n`);
  else updated = updated.replace(/(    source:\n(?:      address:.*\n)?      abi:.*\n)/, `$1      startBlock: ${startBlock}\n`);
  return manifest.slice(0, start) + updated + manifest.slice(end);
}

function generateManifest(config) {
  if (fs.existsSync(config.outputPath)) throw new Error(`Refusing to overwrite existing output: ${config.outputPath}`);
  let manifest = fs.readFileSync(config.templatePath, "utf8")
    .replace(/\r\n/g, "\n")
    .replaceAll("network: arc-testnet", `network: ${config.graphNetwork}`);
  manifest = manifest.replace(/^templates:\r?\n/m, "# DiscountRegistry is a concrete mainnet data source below.\n");
  for (const [sourceName, key] of Object.entries(SOURCES)) {
    const record = config.deployment.deploymentRecords[key];
    manifest = replaceSource(manifest, sourceName, config.deployment.contracts[key], record.blockNumber);
  }
  fs.writeFileSync(config.outputPath, manifest, { flag: "wx" });
  return config.outputPath;
}

function main() {
  const config = loadConfig();
  console.log(`PASS: generated ${generateManifest(config)}`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(`FAIL: ${error.message}`); process.exit(1); }
}
module.exports = { SOURCES, generateManifest, loadConfig, replaceSource };
