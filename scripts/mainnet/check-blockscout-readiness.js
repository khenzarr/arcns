"use strict";

const PLACEHOLDERS = ["", "undefined", "null", "<api_url>", "<tbd>", "your_api_url"];

function getApiUrl(env = process.env) {
  const value = String(env.ARC_MAINNET_EXPLORER_API_URL || "").trim();
  const normalized = value.toLowerCase();
  if (PLACEHOLDERS.includes(normalized) || normalized.includes("<") || normalized.includes("example")) throw new Error("ARC_MAINNET_EXPLORER_API_URL must be a real endpoint, not an empty or placeholder value");
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("ARC_MAINNET_EXPLORER_API_URL must be a valid HTTPS URL"); }
  if (parsed.protocol !== "https:") throw new Error("ARC_MAINNET_EXPLORER_API_URL must use HTTPS");
  return value;
}

function maskedUrl(value) {
  const parsed = new URL(value);
  parsed.username = parsed.username ? "***" : "";
  parsed.password = parsed.password ? "***" : "";
  if (parsed.pathname !== "/") parsed.pathname = "/***";
  if ([...parsed.searchParams.keys()].length) parsed.search = "?***=masked";
  return parsed.toString().replace(/\/$/, "");
}

function safeErrorMessage(error) {
  return String(error?.message || error || "unknown error").replace(/https:\/\/[^\s)\]}]+/gi, "[masked URL]");
}

async function main() {
  const url = getApiUrl();
  const response = await fetch(url, { method: "GET", headers: { accept: "application/json" } });
  const contentType = response.headers.get("content-type") || "";
  const body = await response.text();
  let ready = false;
  if (!contentType.toLowerCase().includes("json") || /^\s*<!doctype html|^\s*<html/i.test(body)) {
    console.log(`UNRESOLVED: endpoint reachable but did not return JSON (${response.status})`);
  } else {
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = null; }
    const blockscout = /blockscout/i.test(body);
    const etherscan = parsed && (Object.prototype.hasOwnProperty.call(parsed, "status") || Object.prototype.hasOwnProperty.call(parsed, "message"));
    const classification = blockscout ? "Blockscout-compatible" : etherscan ? "Etherscan-compatible" : "unresolved";
    ready = response.ok && classification !== "unresolved";
    console.log(`${ready ? "PASS" : "UNRESOLVED"}: endpoint returned JSON; classification: ${classification} (reachability only, no verification request)`);
  }
  console.log(`Endpoint: ${maskedUrl(url)}`);
  if (!ready) process.exitCode = 1;
}

if (require.main === module) main().catch((error) => { console.error(`FAIL: ${safeErrorMessage(error)}`); process.exit(1); });
module.exports = { getApiUrl, maskedUrl, safeErrorMessage, main };