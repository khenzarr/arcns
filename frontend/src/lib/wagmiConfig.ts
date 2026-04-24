/**
 * Wagmi config — connectors:
 *   1. injected     — MetaMask and other browser extension wallets
 *   2. walletConnect — all WC-compatible wallets (Rainbow, Trust, etc.)
 *
 * Transport:
 *   Wagmi public transport for Arc Testnet is intentionally pinned to the
 *   primary RPC so read topology is deterministic. Optional secondary RPCs are
 *   used by detached fallback clients elsewhere for non-critical reads only.
 */
import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { ARC_TESTNET_PRIMARY_RPC_URL, arcTestnet } from "./chains";

export const wagmiConfig = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({ shimDisconnect: true }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "b6d7afb94938b1fd9d9a72f7364fb905",
      metadata: {
        name: "Arc Name Service",
        description: "Decentralized naming on Arc Testnet",
        url: "https://arcns.app",
        icons: ["https://arcns.app/favicon.ico"],
      },
      showQrModal: true,
    }),
  ],
  transports: {
    [arcTestnet.id]: http(ARC_TESTNET_PRIMARY_RPC_URL, {
      timeout: 10_000,
      retryCount: 2,
      retryDelay: 1_000,
    }),
  },
  ssr: true,
});
