/**
 * GET /api/v1/resolve/address/[address]
 *
 * Canonical ArcNS public resolution adapter — reverse resolution.
 * Resolves an EVM address to its verified primary ArcNS name.
 *
 * ─── Response schema ─────────────────────────────────────────────────────────
 *
 * Success (HTTP 200, verified primary name exists):
 *   {
 *     status:   "ok",
 *     address:  "0x...",
 *     name:     "alice.arc",
 *     verified: true,
 *     source:   "subgraph" | "rpc"
 *   }
 *
 * Not found (HTTP 200, no verified primary name):
 *   {
 *     status:   "not_found",
 *     address:  "0x...",
 *     name:     null,
 *     verified: false,
 *     hint:     "No verified primary name for this address."
 *   }
 *
 * Input error (HTTP 400):
 *   {
 *     status: "error",
 *     code:   "INVALID_ADDRESS" | "MALFORMED_INPUT",
 *     hint:   "..."
 *   }
 *
 * Upstream unavailable (HTTP 503):
 *   {
 *     status: "error",
 *     code:   "UPSTREAM_UNAVAILABLE",
 *     hint:   "..."
 *   }
 *
 * ─── Correctness model ───────────────────────────────────────────────────────
 *
 * `verified: true` requires BOTH:
 *   1. Resolver.name(reverseNode) returns a non-empty name
 *   2. Resolver.addr(namehash(name)) === address  (forward-confirmation via RPC)
 *
 * A reverse record that fails forward-confirmation is treated as not_found.
 * Consumers MUST check `verified: true` before displaying a primary name.
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveAddressWithVerification } from "../../../../../../lib/graphql";
import {
  parseAddress,
  makeError,
  v1Headers,
  httpStatusForError,
} from "../../../../../../lib/adapterHelpers";

// In-process cache — TTL 30s
// A cached verified:true result may become stale within the TTL window if the
// name is transferred. Acceptable for display latency; document for consumers.
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL   = 30_000;

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const headers = v1Headers(30);

  // ── Parse and validate ────────────────────────────────────────────────────
  const raw    = decodeURIComponent(params.address ?? "");
  const parsed = parseAddress(raw);

  if (typeof parsed !== "string") {
    return NextResponse.json(parsed, {
      status: httpStatusForError(parsed.code),
      headers,
    });
  }

  const address = parsed; // lowercased, validated

  // ── Cache check ───────────────────────────────────────────────────────────
  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { ...headers, "X-Cache": "HIT" },
    });
  }

  // ── Resolve with forward-confirmation ─────────────────────────────────────
  let result: Awaited<ReturnType<typeof resolveAddressWithVerification>>;
  try {
    result = await resolveAddressWithVerification(address);
  } catch {
    const body = makeError("UPSTREAM_UNAVAILABLE", "Resolution service is temporarily unavailable.");
    return NextResponse.json(body, { status: 503, headers });
  }

  // Upstream failure: source null + no name
  if (result.source === null && result.name === null && !result.verified) {
    // Could be: no primary name set, stale record, or RPC unavailable.
    // We cannot distinguish RPC failure from "no name" without a deeper probe.
    // Return not_found — the safe consumer-facing state.
    // Consumers that need to distinguish should retry or use direct RPC.
    const body = {
      status:   "not_found" as const,
      address,
      name:     null,
      verified: false as const,
      hint:     "No verified primary name for this address.",
    };
    cache.set(address, { data: body, ts: Date.now() });
    return NextResponse.json(body, { headers: { ...headers, "X-Cache": "MISS" } });
  }

  // Verified primary name found
  if (result.verified && result.name) {
    const body = {
      status:   "ok" as const,
      address,
      name:     result.name,
      verified: true as const,
      source:   result.source as "subgraph" | "rpc",
    };
    cache.set(address, { data: body, ts: Date.now() });
    return NextResponse.json(body, { headers: { ...headers, "X-Cache": "MISS" } });
  }

  // No verified name (no primary name set, or stale record)
  const body = {
    status:   "not_found" as const,
    address,
    name:     null,
    verified: false as const,
    hint:     "No verified primary name for this address.",
  };
  cache.set(address, { data: body, ts: Date.now() });
  return NextResponse.json(body, { headers: { ...headers, "X-Cache": "MISS" } });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: v1Headers(0) });
}
