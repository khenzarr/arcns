"use strict";

const { ethers, network } = require("hardhat");

const EXPECTED_CHAIN_ID = 5042;
const EXPECTED_USDC = "0x3600000000000000000000000000000000000000";

async function main() {
  const networkInfo = await ethers.provider.getNetwork();
  const chainId = Number(networkInfo.chainId);
  if (chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Expected eth_chainId ${EXPECTED_CHAIN_ID}, received ${networkInfo.chainId}`);
  }

  const [latestBlock, codeRaw] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getCode(EXPECTED_USDC),
  ]);
  const code = String(codeRaw);
  if (code === "0x") throw new Error(`No bytecode at Arc mainnet USDC ${EXPECTED_USDC}`);

  const usdc = new ethers.Contract(EXPECTED_USDC, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], ethers.provider);
  const [symbolRaw, decimalsRaw] = await Promise.all([usdc.symbol(), usdc.decimals()]);
  const symbol = String(symbolRaw);
  const decimals = Number(decimalsRaw);
  if (symbol !== "USDC") throw new Error(`Expected USDC symbol, received ${symbol}`);
  if (decimals !== 6) throw new Error(`Expected USDC decimals 6, received ${decimals}`);

  console.log("Arc mainnet preflight passed");
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Latest block: ${latestBlock}`);
  console.log(`USDC address: ${EXPECTED_USDC}`);
  console.log("USDC bytecode present: yes");
  console.log(`USDC symbol: ${symbol}`);
  console.log(`USDC decimals: ${decimals}`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
