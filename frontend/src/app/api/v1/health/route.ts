/**
 * GET /api/v1/health
 *
 * ArcNS public adapter health endpoint.
 *
 * ─── Response schema ─────────────────────────────────────────────────────────
 *
 * HTTP 200:
 *   {
 *     status:    "ok" | "degraded",
 *     chainId:   5042002,
 *     network:   "arc_testnet",
 *     version:   "v1",
 *     timestamp: number   // Unix seconds
 *   }
 *
 * status "ok"      — adapter process is alive and configured correctly
 * status "degraded" — reserved for future use (e.g. RPC reachability check)
 *
 * This endpoint does not make RPC calls. It confirms the adapter process
 * is alive and returns the chain context it is configured for.
 *
 * For a deeper liveness check (RPC reachability), consumers should call
 * /api/v1/resolve/name/[known-name] and verify a non-error response.
 */

import { NextResponse } from "next/server";
import { v1Headers } from "../../../../lib/adapterHelpers";
import { DEPLOYED_CHAIN_ID, DEPLOYED_NETWORK } from "../../../../lib/generated-contracts";

export async function GET() {
  const body = {
    status:    "ok" as const,
    chainId:   DEPLOYED_CHAIN_ID,
    network:   DEPLOYED_NETWORK,
    version:   "v1" as const,
    timestamp: Math.floor(Date.now() / 1000),
  };

  return NextResponse.json(body, {
    headers: v1Headers(0), // no caching on health
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: v1Headers(0) });
}
