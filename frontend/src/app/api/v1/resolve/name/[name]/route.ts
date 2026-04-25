/**
 * GET /api/v1/resolve/name/[name]
 *
 * Canonical ArcNS public resolution adapter — forward resolution.
 * Resolves a full ArcNS name (e.g. "alice.arc") to its EVM address record.
 *
 * ─── Response schema ─────────────────────────────────────────────────────────
 *
 * Success (HTTP 200, address record exists):
 *   {
 *     status:  "ok",
 *     name:    "alice.arc",
 *     address: "0x...",
 *     owner:   "0x..." | null,
 *     expiry:  1800000000 | null,
 *     source:  "subgraph" | "rpc"
 *   }
 *
 * Not found (HTTP 200, name valid but no address record):
 *   {
 *     status: "not_found",
 *     hint:   "Name has no address record set."
 *   }
 *
 * Input error (HTTP 400):
 *   {
 *     status: "error",
 *     code:   "INVALID_NAME" | "UNSUPPORTED_TLD" | "MALFORMED_INPUT",
 *     hint:   "..."
 *   }
 *
 * Upstream unavailable (HTTP 503):
 *   {
 *     status: "error",
 *     code:   "UPSTREAM_UNAVAILABLE",
 *     hint:   "..."
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveName } from "../../../../../../lib/graphql";
import {
  parseName,
  makeError,
  makeNotFound,
  v1Headers,
  httpStatusForError,
} from "../../../../../../lib/adapterHelpers";

// In-process cache — TTL 30s, keyed by normalized name
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL   = 30_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  const headers = v1Headers(30);

  // ── Parse and validate ────────────────────────────────────────────────────
  const raw    = decodeURIComponent(params.name ?? "");
  const parsed = parseName(raw);

  if ("code" in parsed) {
    return NextResponse.json(parsed, {
      status: httpStatusForError(parsed.code),
      headers,
    });
  }

  const { normalizedName } = parsed;

  // ── Cache check ───────────────────────────────────────────────────────────
  const cached = cache.get(normalizedName);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { ...headers, "X-Cache": "HIT" },
    });
  }

  // ── Resolve ───────────────────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof resolveName>>;
  try {
    result = await resolveName(normalizedName);
  } catch {
    const body = makeError("UPSTREAM_UNAVAILABLE", "Resolution service is temporarily unavailable.");
    return NextResponse.json(body, { status: 503, headers });
  }

  // source: null means both subgraph and RPC failed
  if (result.source === null && result.address === null) {
    const body = makeError("UPSTREAM_UNAVAILABLE", "Resolution service is temporarily unavailable.");
    return NextResponse.json(body, { status: 503, headers });
  }

  // No address record set — valid name, no result
  if (!result.address) {
    const body = makeNotFound("Name has no address record set.");
    cache.set(normalizedName, { data: body, ts: Date.now() });
    return NextResponse.json(body, { headers: { ...headers, "X-Cache": "MISS" } });
  }

  // Success
  const body = {
    status:  "ok" as const,
    name:    normalizedName,
    address: result.address,
    owner:   result.owner,
    expiry:  result.expiry ? Number(result.expiry) : null,
    source:  result.source as "subgraph" | "rpc",
  };

  cache.set(normalizedName, { data: body, ts: Date.now() });

  return NextResponse.json(body, {
    headers: { ...headers, "X-Cache": "MISS" },
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: v1Headers(0) });
}
