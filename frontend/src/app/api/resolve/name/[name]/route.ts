/**
 * COMPATIBILITY PATH — NOT THE CANONICAL INTEGRATION SURFACE.
 *
 * This route exists for local frontend use only.
 * The canonical public adapter is at: /api/v1/resolve/name/[name]
 *
 * Gaps vs the v1 surface:
 *   - No name normalization or TLD validation
 *   - No structured error codes
 *   - No CORS headers
 *   - No versioning
 *
 * Do not use this route for external integrations.
 */
import { NextRequest, NextResponse } from "next/server";
import { resolveName } from "../../../../../lib/graphql";

// Simple in-process cache — TTL 30s
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 30_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const name = decodeURIComponent(params.name).toLowerCase();
  if (!name || name.length < 3) {
    return NextResponse.json({ error: "invalid name" }, { status: 400 });
  }

  const cached = cache.get(name);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, max-age=30" },
    });
  }

  const result = await resolveName(name);
  const body = { name, ...result };
  cache.set(name, { data: body, ts: Date.now() });

  return NextResponse.json(body, {
    headers: { "X-Cache": "MISS", "Cache-Control": "public, max-age=30" },
  });
}
