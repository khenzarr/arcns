/**
 * COMPATIBILITY PATH — NOT THE CANONICAL INTEGRATION SURFACE.
 *
 * This route exists for local frontend use only.
 * The canonical public adapter is at: /api/v1/resolve/address/[address]
 *
 * Gaps vs the v1 surface:
 *   - No forward-confirmation on reverse lookup
 *   - No `verified` field in response
 *   - No structured error codes
 *   - No CORS headers
 *   - No versioning
 *
 * Do not use this route for external integrations.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveAddress } from "../../../../../lib/graphql";

// Simple in-process cache — TTL 30s
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 30_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = decodeURIComponent(params.address).toLowerCase();
  if (!address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=30" },
    });
  }

  const result = await resolveAddress(address);
  const body = { address, ...result };
  cache.set(address, { data: body, ts: Date.now() });

  return NextResponse.json(body, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=30" },
  });
}
