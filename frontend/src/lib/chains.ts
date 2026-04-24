import { defineChain } from "viem";

export const ARC_TESTNET_CHAIN_ID = 5042002;
export const ARC_TESTNET_RUNTIME_MODE = "arc-testnet" as const;

export const ARC_TESTNET_RPCS = {
  primary: {
    key: "primary",
    name: "Arc Official RPC",
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
