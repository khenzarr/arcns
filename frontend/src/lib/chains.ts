import { defineChain } from "viem";
import { DEPLOYED_CHAIN_ID } from "./generated-contracts";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_MAINNET_CHAIN_ID = 5042;
export const ARC_TESTNET_RUNTIME_MODE = "arc-testnet" as const;
export const ARC_MAINNET_RUNTIME_MODE = "arc-mainnet" as const;
export const ARC_MAINNET_PRIMARY_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
  ?? "https://rpc.blockdaemon.mainnet.arc.io";

export const ARC_TESTNET_RPCS = {
  primary: {
    key: "primary",
    name: "Arc Testnet RPC",
    url: process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.testnet.arc.network",
  },
  secondary: [
    {
      key: "secondary-blockdaemon",
      name: "Blockdaemon Arc Testnet RPC",
      url: process.env.NEXT_PUBLIC_RPC_URL_2 ?? "https://rpc.blockdaemon.testnet.arc.network",
    },
    {
      key: "secondary-quicknode",
      name: "QuickNode Arc Testnet RPC",
      url: process.env.NEXT_PUBLIC_RPC_URL_3 ?? "https://rpc.quicknode.testnet.arc.network",
    },
  ],
} as const;

export const ARC_TESTNET_PRIMARY_RPC_URL = ARC_TESTNET_RPCS.primary.url;
export const ARC_TESTNET_SECONDARY_RPC_URLS = ARC_TESTNET_RPCS.secondary.map((rpc) => rpc.url);
export const ARC_TESTNET_ALL_RPC_URLS = [
  ARC_TESTNET_PRIMARY_RPC_URL,
  ...ARC_TESTNET_SECONDARY_RPC_URLS,
] as const;

/// Arc Testnet chain definition for wagmi/viem
export const arcTestnet = defineChain({
  id: ARC_TESTNET_CHAIN_ID,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET_PRIMARY_RPC_URL],
      webSocket: [ARC_TESTNET_PRIMARY_RPC_URL.replace("https://", "wss://")],
    },
    public: {
      http: [...ARC_TESTNET_ALL_RPC_URLS],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
  testnet: true,
});

export const arcMainnet = defineChain({
  id: ARC_MAINNET_CHAIN_ID,
  name: "Arc",
  nativeCurrency: { decimals: 6, name: "USD Coin", symbol: "USDC" },
  rpcUrls: {
    default: { http: [ARC_MAINNET_PRIMARY_RPC_URL] },
    public: { http: [ARC_MAINNET_PRIMARY_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://arc-mainnet.cloud.blockscout.com" },
  },
});

const runtimeChainId: number = DEPLOYED_CHAIN_ID;

export const deployedChain = runtimeChainId === ARC_MAINNET_CHAIN_ID ? arcMainnet : arcTestnet;
export const DEPLOYED_RUNTIME_MODE = runtimeChainId === ARC_MAINNET_CHAIN_ID
  ? ARC_MAINNET_RUNTIME_MODE
  : ARC_TESTNET_RUNTIME_MODE;
export const DEPLOYED_PRIMARY_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL
  ?? (runtimeChainId === ARC_MAINNET_CHAIN_ID
    ? ARC_MAINNET_PRIMARY_RPC_URL
    : ARC_TESTNET_PRIMARY_RPC_URL);
export const DEPLOYED_FALLBACK_RPC_URLS = [
  DEPLOYED_PRIMARY_RPC_URL,
  process.env.NEXT_PUBLIC_RPC_URL_2,
  process.env.NEXT_PUBLIC_RPC_URL_3,
].filter((value): value is string => Boolean(value));
