import { defineChain } from "viem";

/// Arc Testnet chain definition for wagmi/viem
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    decimals: 6,
    name: "USD Coin",
    symbol: "USDC",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.arc.network"],
      webSocket: ["wss://rpc.testnet.arc.network"],
    },
    public: {
      http: [
        "https://rpc.testnet.arc.network",
        "https://rpc.blockdaemon.testnet.arc.network",
        "https://rpc.quicknode.testnet.arc.network",
      ],
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
