/**
 * Viem public client — used for read-only contract calls that don't need
 * a connected wallet. This bypasses wagmi's chain context requirement,
 * which causes useReadContract to silently not fire when no wallet is connected.
 */
import { createPublicClient, http } from "viem";
import { arcTestnet } from "./chains";

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http("https://rpc.testnet.arc.network", {
    timeout: 10_000,
    retryCount: 3,
    retryDelay: 1000,
  }),
});
