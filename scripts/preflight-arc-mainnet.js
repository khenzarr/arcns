"use strict";

const { ethers, network } = require("hardhat");

const EXPECTED_CHAIN_ID = 5042n;
const EXPECTED_USDC = "0x3600000000000000000000000000000000000000";

async function main() {
  const chain = await ethers.provider.getNetwork();
  if (chain.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Expected eth_chainId 5042, received ${chain.chainId}`);
  }

  const code = await ethers.provider.getCode(EXPECTED_USDC);
  if (code === "0x") throw new Error(`No bytecode at Arc mainnet USDC ${EXPECTED_USDC}`);

  const usdc = new ethers.Contract(EXPECTED_USDC, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], ethers.provider);
  const [symbol, decimals] = await Promise.all([usdc.symbol(), usdc.decimals()]);
  if (symbol !== "USDC") throw new Error(`Expected USDC symbol, received ${symbol}`);
  if (decimals !== 6) throw new Error(`Expected USDC decimals 6, received ${decimals}`);
  console.log(`ARC mainnet preflight passed (${network.name}): chainId=5042 USDC=${EXPECTED_USDC} symbol=${symbol} decimals=${decimals}`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });