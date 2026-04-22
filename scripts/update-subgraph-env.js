/**
 * ArcNS — Subgraph env sync script
 * Usage: node scripts/update-subgraph-env.js
 * Or:    npm run sync:subgraph
 *
 * Reads GRAPH_STUDIO_ID from .env and writes NEXT_PUBLIC_SUBGRAPH_URL
 * to frontend/.env.local. Falls back gracefully if ID is missing.
 */

const fs   = require("fs");
const path = require("path");

// ─── Config ───────────────────────────────────────────────────────────────────

const SUBGRAPH_SLUG    = "arcns";
const SUBGRAPH_VERSION = "version/latest";
const ENV_ROOT         = path.join(__dirname, "../.env");
const ENV_FRONTEND     = path.join(__dirname, "../frontend/.env.local");

// ─── Read .env ────────────────────────────────────────────────────────────────

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = val;
  }
  return result;
}

// ─── Write / update a single key in an env file ───────────────────────────────

function upsertEnvKey(filePath, key, value) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const regex = new RegExp(`^${key}=.*$`, "m");
  const line  = `${key}=${value}`;

  if (regex.test(content)) {
    content = content.replace(regex, line);
  } else {
    content = content.trimEnd() + "\n" + line + "\n";
  }
  fs.writeFileSync(filePath, content, "utf8");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const rootEnv     = readEnvFile(ENV_ROOT);
  const frontendEnv = readEnvFile(ENV_FRONTEND);

  // Look for Graph Studio ID in root .env or frontend .env.local
  const studioId =
    rootEnv.GRAPH_STUDIO_ID ||
    frontendEnv.GRAPH_STUDIO_ID ||
    process.env.GRAPH_STUDIO_ID;

  if (!studioId) {
    console.warn("⚠  GRAPH_STUDIO_ID not found in .env — subgraph URL not updated.");
    console.warn("   Add GRAPH_STUDIO_ID=<your-id> to arcns/.env and re-run.");
    console.warn("   App will use RPC-only fallback (no indexer).");
    return;
  }

  const url = `https://api.studio.thegraph.com/query/${studioId}/${SUBGRAPH_SLUG}/${SUBGRAPH_VERSION}`;

  upsertEnvKey(ENV_FRONTEND, "NEXT_PUBLIC_SUBGRAPH_URL", url);

  console.log("✓ NEXT_PUBLIC_SUBGRAPH_URL updated in frontend/.env.local");
  console.log("  →", url);
}

main();
