/**
 * Viem public client — used for read-only contract calls that bypass wagmi's
 * chain context (which requires a connected wallet).
 *
 * Transport: fallback across three RPC endpoints so reads never fail due to
 * a single node outage or txpool congestion.
 */
import { createPublicClient, http, fallback } from "viem";
import { arcTestnet } from "./chains";

const PRIMARY_RPC   = process.env.NEXT_PUBLIC_RPC_URL          ?? "https://rpc.testnet.arc.network";
const SECONDARY_RPC = process.env.NEXT_PUBLIC_RPC_URL_2        ?? "https://rpc.blockdaemon.testnet.arc.network";
const TERTIARY_RPC  = process.env.NEXT_PUBLIC_RPC_URL_3        ?? "https://rpc.quicknode.testnet.arc.network";

const TIMEOUT_MS = 10_000;

export const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: fallback([
    http(PRIMARY_RPC,   { timeout: TIMEOUT_MS, retryCount: 3, retryDelay: 1_000 }),
    http(SECONDARY_RPC, { timeout: TIMEOUT_MS, retryCount: 2, retryDelay: 1_000 }),
    http(TERTIARY_RPC,  { timeout: TIMEOUT_MS, retryCount: 2, retryDelay: 1_000 }),
  ], { rank: false }),
});
