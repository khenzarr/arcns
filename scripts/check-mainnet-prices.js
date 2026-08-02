"use strict";

const { ethers, network } = require("hardhat");

const EXPECTED = [100_000_000n, 50_000_000n, 25_000_000n, 15_000_000n, 5_000_000n];
const ORACLE_ABI = [
  "function price1Char() view returns (uint256)",
  "function price2Char() view returns (uint256)",
  "function price3Char() view returns (uint256)",
  "function price4Char() view returns (uint256)",
  "function price5Plus() view returns (uint256)",
];

async function main() {
  const address = process.env.PRICE_ORACLE_ADDRESS;
  if (!address) throw new Error("PRICE_ORACLE_ADDRESS is required; read-only validation only.");
  const oracle = new ethers.Contract(address, ORACLE_ABI, ethers.provider);
  const actual = await Promise.all([
    oracle.price1Char(), oracle.price2Char(), oracle.price3Char(), oracle.price4Char(), oracle.price5Plus(),
  ]);
  actual.forEach((value, index) => {
    if (value !== EXPECTED[index]) {
      throw new Error(`Price mismatch p${index + 1}: expected ${EXPECTED[index]}, received ${value}`);
    }
  });
  console.log(`Price oracle validation passed on ${network.name}: p1/p2/p3/p4/p5 = ${actual.join("/")}`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });