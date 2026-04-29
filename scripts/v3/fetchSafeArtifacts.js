/**
 * ArcNS — Fetch Safe v1.3.0 Artifacts
 *
 * Downloads the canonical GnosisSafe v1.3.0 contract artifacts from the
 * official safe-smart-account GitHub release and saves them to
 * scripts/v3/safe-artifacts/ for use by deployMultisig.js.
 *
 * This script only needs to be run once. The artifacts are committed to the
 * repository so they don't need to be re-fetched on each deployment.
 *
 * Usage:
 *   node scripts/v3/fetchSafeArtifacts.js
 *
 * Output:
 *   scripts/v3/safe-artifacts/GnosisSafe.json
 *   scripts/v3/safe-artifacts/GnosisSafeProxyFactory.json
 *   scripts/v3/safe-artifacts/CompatibilityFallbackHandler.json
 */

"use strict";

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const OUT_DIR = path.join(__dirname, "safe-artifacts");

// Safe v1.3.0 artifact sources from the official @safe-global/safe-deployments package
// via unpkg CDN — these files contain the canonical ABI for each contract.
const ARTIFACTS = [
  {
    name: "GnosisSafe",
    url: "https://unpkg.com/@safe-global/safe-deployments/src/assets/v1.3.0/gnosis_safe.json",
    outputFile: "GnosisSafe.json",
  },
  {
    name: "GnosisSafeProxyFactory",
    url: "https://unpkg.com/@safe-global/safe-deployments/src/assets/v1.3.0/proxy_factory.json",
    outputFile: "GnosisSafeProxyFactory.json",
  },
  {
    name: "CompatibilityFallbackHandler",
    url: "https://unpkg.com/@safe-global/safe-deployments/src/assets/v1.3.0/compatibility_fallback_handler.json",
    outputFile: "CompatibilityFallbackHandler.json",
  },
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "arcns-deploy/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    }).on("error", reject);
  });
}

async function main() {
  console.log("Fetching Safe v1.3.0 artifacts...\n");

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUT_DIR}`);
  }

  for (const artifact of ARTIFACTS) {
    const outPath = path.join(OUT_DIR, artifact.outputFile);

    if (fs.existsSync(outPath)) {
      console.log(`✓ ${artifact.name} — already exists, skipping`);
      continue;
    }

    console.log(`Fetching ${artifact.name}...`);
    try {
      const data = await fetchJson(artifact.url);

      // Validate that we got an ABI
      // Note: safe-deployments format has top-level `abi` but no `bytecode` field.
      if (!data.abi || !Array.isArray(data.abi)) {
        throw new Error(`No ABI in artifact for ${artifact.name}`);
      }

      // Write minimal artifact (abi only — safe-deployments format has no bytecode)
      const minimal = {
        contractName: artifact.name,
        abi: data.abi,
      };

      fs.writeFileSync(outPath, JSON.stringify(minimal, null, 2));
      console.log(`✓ ${artifact.name} — saved to ${outPath}`);
      console.log(`  abi entries: ${data.abi.length}`);
    } catch (e) {
      console.error(`✗ ${artifact.name} — FAILED: ${e.message}`);
      console.error(`  URL: ${artifact.url}`);
      console.error(`  Fallback: manually download from https://unpkg.com/browse/@safe-global/safe-deployments/src/assets/v1.3.0/`);
      process.exit(1);
    }
  }

  console.log("\n✅ All Safe artifacts fetched successfully.");
  console.log(`   Location: ${OUT_DIR}`);
  console.log("\nYou can now run:");
  console.log("   SAFE_OWNER_2=0x... SAFE_OWNER_3=0x... npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet");
}

main().catch(e => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
