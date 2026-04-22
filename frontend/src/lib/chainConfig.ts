/**
 * chainConfig.ts — Multi-chain abstraction layer
 *
 * All chain-specific addresses and parameters live here.
 * Add new chains by extending the CHAIN_CONFIGS map.
 * No deployment needed — structure only.
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  fallbackRpcUrls: string[];
  blockExplorer: string;
  contracts: {
    registry: `0x${string}`;
    arcController: `0x${string}`;
    circleController: `0x${string}`;
    resolver: `0x${string}`;
    reverseRegistrar: `0x${string}`;
    priceOracle: `0x${string}`;
    usdc: `0x${string}`;
    arcRegistrar: `0x${string}`;
    circleRegistrar: `0x${string}`;
    treasury: `0x${string}`;
  };
  subgraphUrl: string;
  minCommitmentAge: number; // seconds
  maxCommitmentAge: number; // seconds
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // ── Arc Testnet ────────────────────────────────────────────────────────────
  5042002: {
    chainId: 5042002,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.testnet.arc.network",
    fallbackRpcUrls: [
      "https://rpc.blockdaemon.testnet.arc.network",
      "https://rpc.quicknode.testnet.arc.network",
    ],
    blockExplorer: "https://testnet.arcscan.app",
    contracts: {
      registry:         "0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a",
      arcController:    "0x1bd377A2762510c00dd0ec2142E42829e7053C80",
      circleController: "0xfBFE553633AB91b6B32A0E6296341000Bf03DB95",
      resolver:         "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350",
      reverseRegistrar: "0x97DEf95ADE4b67cD877725282d872d1eD2b4D489",
      priceOracle:      "0x18EE0175504e033D72486235F8A2552038EF4ce6",
      usdc:             "0x3600000000000000000000000000000000000000",
      arcRegistrar:     "0xb156d9726661E92C541e3a267ee8710Fdcd24969",
      circleRegistrar:  "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e",
      treasury:         "0xbbDF5bC7D63B1b7223556d4899905d56589A682d",
    },
    subgraphUrl: "https://api.studio.thegraph.com/query/1748590/arcns/v0.2.2",
    minCommitmentAge: 60,
    maxCommitmentAge: 86400,
  },

  // ── Arc Mainnet (placeholder — not deployed yet) ───────────────────────────
  // 5042001: {
  //   chainId: 5042001,
  //   name: "Arc Mainnet",
  //   rpcUrl: "https://rpc.arc.network",
  //   blockExplorer: "https://arcscan.app",
  //   contracts: { ... },
  //   subgraphUrl: "...",
  //   minCommitmentAge: 60,
  //   maxCommitmentAge: 86400,
  // },
};

/** Get config for the active chain, falling back to Arc Testnet */
export function getChainConfig(chainId?: number): ChainConfig {
  const id = chainId ?? 5042002;
  return CHAIN_CONFIGS[id] ?? CHAIN_CONFIGS[5042002];
}

/** Active chain ID from env */
export const ACTIVE_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID ?? "5042002",
  10
);

export const activeConfig = getChainConfig(ACTIVE_CHAIN_ID);
