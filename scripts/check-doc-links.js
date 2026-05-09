#!/usr/bin/env node
/**
 * check-doc-links.js — Checks relative markdown links in docs/ and README.md.
 *
 * Usage:
 *   node scripts/check-doc-links.js
 *
 * Reports broken relative links (links to files that do not exist).
 * Does not check external URLs.
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const SCAN_PATHS = [
  path.join(REPO_ROOT, "README.md"),
  path.join(REPO_ROOT, "docs"),
];

// Regex to match markdown links: [text](target)
// Captures the target (href). Skips http/https/mailto/# anchors.
const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

let totalLinks = 0;
let brokenLinks = 0;
const broken = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const dir = path.dirname(filePath);
  let match;
  LINK_RE.lastIndex = 0;

  while ((match = LINK_RE.exec(content)) !== null) {
    const href = match[2].split("#")[0].trim(); // strip anchor fragment
    if (!href) continue; // pure anchor link
    if (/^https?:\/\//.test(href)) continue; // external URL
    if (/^mailto:/.test(href)) continue; // mailto
    if (/^kiro-spec:\/\//.test(href)) continue; // kiro spec links

    totalLinks++;
    const resolved = path.resolve(dir, href);
    if (!fs.existsSync(resolved)) {
      brokenLinks++;
      broken.push({ file: path.relative(REPO_ROOT, filePath), href, resolved: path.relative(REPO_ROOT, resolved) });
    }
  }
}

function scanDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .git
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      scanDir(full);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      checkFile(full);
    }
  }
}

for (const p of SCAN_PATHS) {
  if (fs.statSync(p).isDirectory()) {
    scanDir(p);
  } else {
    checkFile(p);
  }
}

console.log(`\nDocs link check — scanned ${totalLinks} relative links\n`);

if (broken.length === 0) {
  console.log("✅ All relative links resolve.\n");
} else {
  console.log(`❌ ${brokenLinks} broken link(s) found:\n`);
  for (const b of broken) {
    console.log(`  File:   ${b.file}`);
    console.log(`  Link:   ${b.href}`);
    console.log(`  Resolves to: ${b.resolved} (NOT FOUND)`);
    console.log();
  }
  process.exit(1);
}
