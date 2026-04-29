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
      hardfork: "cancun",
      // Fork Arc Testnet when ARC_FORK=1 is set
      ...(process.env.ARC_FORK === "1" && {
        forking: {
          url: process.env.ARC_RPC_URL || "https://rpc.testnet.arc.network",
          blockNumber: process.env.ARC_FORK_BLOCK ? parseInt(process.env.ARC_FORK_BLOCK) : undefined,
        },
      }),
      // Tell Hardhat that Arc Testnet (5042002) uses cancun from block 0
      chains: {
        5042002: {
          hardforkHistory: {
            cancun: 0,
          },
        },
      },    },
    // Fork network — connects to a running `npx hardhat node --fork` instance.
    // Used for dry-run execution against forked Arc Testnet state.
    fork: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    arc_testnet: {
      url: process.env.ARC_RPC_URL_2 || process.env.ARC_RPC_URL || "https://arc-testnet.drpc.org",
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
