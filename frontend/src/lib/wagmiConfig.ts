import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { arcTestnet } from "./chains";

/**
 * Wagmi config — connectors:
 *   1. injected  — MetaMask browser extension (no SDK, no RN deps)
 *   2. walletConnect — all WC-compatible wallets (Rainbow, Trust, etc.)
 *
 * Deliberately avoids @metamask/sdk to prevent:
 *   - @react-native-async-storage/async-storage build errors
 *   - pino-pretty missing module errors
 */
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
    [arcTestnet.id]: http("https://rpc.testnet.arc.network"),
  },
  ssr: true,
});
