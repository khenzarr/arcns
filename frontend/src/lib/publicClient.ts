/**
 * Viem public client — used for read-only contract calls that don't need
 * a connected wallet. This bypasses wagmi's chain context requirement,
 * which causes useReadContract to silently not fire when no wallet is connected.
 *
 * Uses fallback transport: primary → secondary → tertiary RPC.
 * Resolution NEVER fails due to a single RPC outage.
 */
import { createPublicClient, http, fallback } from "viem";
import { arcTestnet } from "./chains";

const RPC_TIMEOUT = 10_000;
const RPC_RETRY   = 3;
const RPC_DELAY   = 1_000;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback([
    http("https://rpc.testnet.arc.network", {
      timeout: RPC_TIMEOUT,
      retryCount: RPC_RETRY,
      retryDelay: RPC_DELAY,
    }),
    http("https://rpc.blockdaemon.testnet.arc.network", {
      timeout: RPC_TIMEOUT,
      retryCount: 2,
      retryDelay: RPC_DELAY,
    }),
    http("https://rpc.quicknode.testnet.arc.network", {
      timeout: RPC_TIMEOUT,
      retryCount: 2,
      retryDelay: RPC_DELAY,
    }),
  ], { rank: false }),
});
