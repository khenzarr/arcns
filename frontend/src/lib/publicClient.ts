/**
 * Viem public client — used for read-only contract calls that bypass wagmi's
 * chain context (which requires a connected wallet).
 *
 * Transport: fallback across three RPC endpoints so reads never fail due to
 * a single node outage or txpool congestion.
 */
import { createPublicClient, http, fallback } from "viem";
import { DEPLOYED_FALLBACK_RPC_URLS, deployedChain } from "./chains";

const TIMEOUT_MS = 10_000;

export const publicClient = createPublicClient({
  chain: deployedChain,
  transport: fallback(DEPLOYED_FALLBACK_RPC_URLS.map((rpc, index) => http(rpc, {
    timeout: TIMEOUT_MS,
    retryCount: index === 0 ? 3 : 2,
    retryDelay: 1_000,
  })), { rank: false }),
});
