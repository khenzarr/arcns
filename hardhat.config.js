require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x" + "0".repeat(64);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    arc_testnet: {
      url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: [PRIVATE_KEY],
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      arc_testnet: process.env.ARCSCAN_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "arc_testnet",
        chainId: 5042002,
        urls: {
          apiURL: "https://testnet.arcscan.app/api",
          browserURL: "https://testnet.arcscan.app",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
