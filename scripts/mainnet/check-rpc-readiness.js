"use strict";

const { ethers } = require("ethers");

const EXPECTED_CHAIN_ID = 5042;
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const READ_ATTEMPTS = 3;
const PLACEHOLDERS = ["", "undefined", "null", "<rpc_url>", "<tbd>", "your_rpc_url"];

function getRpcUrl(env = process.env) {
  const value = String(env.ARC_MAINNET_RPC_URL || "").trim();
  const normalized = value.toLowerCase();
  if (PLACEHOLDERS.includes(normalized) || normalized.includes("<") || normalized.includes("example")) {
    throw new Error("ARC_MAINNET_RPC_URL must be a real HTTPS endpoint, not an empty or placeholder value");
  }
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error("ARC_MAINNET_RPC_URL must be a valid HTTPS URL"); }
  if (parsed.protocol !== "https:") throw new Error("ARC_MAINNET_RPC_URL must use HTTPS");
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

async function repeat(label, operation) {
  const values = [];
  for (let i = 0; i < READ_ATTEMPTS; i += 1) values.push(await operation());
  const serialized = values.map((value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item));
  if (serialized.some((value) => value !== serialized[0])) throw new Error(`${label} was not stable across ${READ_ATTEMPTS} attempts`);
  return values[0];
}

async function repeatLatestBlocks(provider) {
  const blocks = [];
  for (let i = 0; i < READ_ATTEMPTS; i += 1) {
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    if (!block || block.number !== blockNumber || !block.hash) throw new Error(`Latest block attempt ${i + 1} returned invalid data`);
    blocks.push(block);
  }
  for (let i = 1; i < blocks.length; i += 1) {
    if (blocks[i].number < blocks[i - 1].number) throw new Error("Latest block number moved backwards across attempts");
    if (blocks[i].number === blocks[i - 1].number && blocks[i].hash !== blocks[i - 1].hash) throw new Error("Latest block hash was inconsistent across attempts");
  }
  return blocks.at(-1);
}

async function repeatValid(label, operation, validate) {
  const values = [];
  for (let i = 0; i < READ_ATTEMPTS; i += 1) {
    const value = await operation();
    if (!validate(value)) throw new Error(`${label} attempt ${i + 1} returned invalid data`);
    values.push(value);
  }
  return values.at(-1);
}

async function main() {
  const url = getRpcUrl();
  const provider = new ethers.JsonRpcProvider(url, EXPECTED_CHAIN_ID, { staticNetwork: true, batchMaxCount: 1 });
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== EXPECTED_CHAIN_ID) throw new Error(`Expected chain ID ${EXPECTED_CHAIN_ID}, received ${network.chainId}`);
  const block = await repeatLatestBlocks(provider);
  const code = await repeat("USDC bytecode", () => provider.getCode(USDC_ADDRESS));
  if (code === "0x") throw new Error("Arc mainnet USDC has no bytecode");
  const usdc = new ethers.Contract(USDC_ADDRESS, ["function symbol() view returns (string)", "function decimals() view returns (uint8)"], provider);
  if (await repeat("USDC symbol", () => usdc.symbol()) !== "USDC") throw new Error("USDC symbol check failed");
  if (Number(await repeat("USDC decimals", () => usdc.decimals())) !== 6) throw new Error("USDC decimals check failed");
  await repeatValid("gas price", () => provider.send("eth_gasPrice", []), (value) => /^0x[0-9a-f]+$/i.test(value) && BigInt(value) > 0n);
  let feeHistory = "unsupported";
  try { feeHistory = await repeatValid("fee history", () => provider.send("eth_feeHistory", ["0x3", "latest", [25, 50, 75]]), (value) => value && Array.isArray(value.baseFeePerGas)); } catch (error) { console.log(`INFO: eth_feeHistory unsupported or unavailable (${safeErrorMessage(error)})`); }
  const feeData = await repeatValid("provider fee data", () => provider.getFeeData(), (value) => value && (value.gasPrice !== null || value.maxFeePerGas !== null));
  if (!feeData || (!feeData.gasPrice && !feeData.maxFeePerGas)) throw new Error("Provider fee data is unavailable");
  console.log("PASS: RPC readiness-passed (read-only checks only; not automatic deploy-RPC approval)");
  console.log(`Endpoint: ${maskedUrl(url)}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(`Latest block: ${block.number}`);
  console.log(`USDC bytecode/symbol/decimals: present / USDC / 6`);
  console.log(`Fee data: gasPrice / ${feeHistory === "unsupported" ? "feeHistory unsupported" : "feeHistory supported"} / provider fee data`);
}

if (require.main === module) main().catch((error) => { console.error(`FAIL: ${safeErrorMessage(error)}`); process.exit(1); });
module.exports = { getRpcUrl, maskedUrl, safeErrorMessage, main, repeat, repeatLatestBlocks, repeatValid };