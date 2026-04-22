import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";

/// Wagmi + RainbowKit config with WalletConnect multi-wallet support
export const wagmiConfig = getDefaultConfig({
  appName: "Arc Name Service",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [arcTestnet],
  ssr: true,
});
