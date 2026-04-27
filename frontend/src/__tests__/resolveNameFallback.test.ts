/**
 * resolveNameFallback.test.ts
 *
 * Tests for the subgraph-lag RPC fallback fix in resolveName() (graphql.ts).
 *
 * Bug: when the subgraph returns a domain entity with a null addr field,
 * resolveName() was returning { address: null, source: "subgraph" } immediately
 * without consulting the chain. The fix makes it fall through to the RPC path.
 *
 * Two test suites:
 *
 * 1. "routing decision logic" — pure inline tests of the exact conditional
 *    introduced by the fix. No async, no mocks, fast and reliable.
 *
 * 2. "integration via resetModules" — full resolveName() path using
 *    vi.resetModules() + dynamic import so the module is re-evaluated with
 *    the fetch stub and dynamic-import mocks in place.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Constants ────────────────────────────────────────────────────────────────

const RPC_ADDRESS      = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const SUBGRAPH_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ZERO_ADDRESS     = "0x0000000000000000000000000000000000000000";
const FAKE_RESOLVER    = "0x1111111111111111111111111111111111111111";

// ─── Routing decision logic unit tests ───────────────────────────────────────
// These test the exact conditional logic introduced by the fix in isolation.
// They mirror the fixed resolveName() branch verbatim and need no mocks.

describe("resolveName routing decision logic", () => {
  /**
   * Mirrors the exact logic in the fixed resolveName():
   *
   *   if (domain) {
   *     const address = domain.resolvedAddress ?? domain.resolverRecord?.addr ?? null;
   *     if (address) { return "subgraph" }   ← fast path (preserved)
   *     // else fall through to RPC          ← the fix
   *   }
   *   return "rpc"
   */
  function routingDecision(domain: {
    resolvedAddress: string | null;
    resolverRecord:  { addr: string | null } | null;
  } | null): "subgraph" | "rpc" {
    if (domain) {
      const address = domain.resolvedAddress ?? domain.resolverRecord?.addr ?? null;
      if (address) return "subgraph";
    }
    return "rpc";
  }

  it("null domain → rpc (existing fallback preserved)", () => {
    expect(routingDecision(null)).toBe("rpc");
  });

  it("domain with non-null resolvedAddress → subgraph (fast path preserved)", () => {
    expect(routingDecision({ resolvedAddress: RPC_ADDRESS, resolverRecord: null })).toBe("subgraph");
  });

  it("domain with null resolvedAddress but non-null resolverRecord.addr → subgraph (fast path preserved)", () => {
    expect(routingDecision({ resolvedAddress: null, resolverRecord: { addr: RPC_ADDRESS } })).toBe("subgraph");
  });

  it("domain with null resolvedAddress and null resolverRecord → rpc (the bug condition, now fixed)", () => {
    expect(routingDecision({ resolvedAddress: null, resolverRecord: null })).toBe("rpc");
  });

  it("domain with null resolvedAddress and resolverRecord.addr null → rpc (the bug condition, now fixed)", () => {
    expect(routingDecision({ resolvedAddress: null, resolverRecord: { addr: null } })).toBe("rpc");
  });

  it("domain with empty string resolvedAddress → rpc (falsy address falls through to RPC)", () => {
    expect(routingDecision({ resolvedAddress: "", resolverRecord: null })).toBe("rpc");
  });
});

// ─── Integration tests via resetModules ──────────────────────────────────────
// Uses vi.resetModules() so graphql.ts is re-evaluated with fetch stubbed,
// allowing SUBGRAPH_ENABLED to be true and getDomainByName to return our data.

describe("resolveName — subgraph-lag RPC fallback (integration)", () => {
  // Mutable RPC state — tests set these before calling resolveName
  const rpc = {
    addrResult:  RPC_ADDRESS,
    ownerResult: RPC_ADDRESS,
  };

  beforeEach(() => {
    rpc.addrResult  = RPC_ADDRESS;
    rpc.ownerResult = RPC_ADDRESS;

    vi.resetModules();

    // Stub fetch BEFORE the module is imported so SUBGRAPH_ENABLED is true
    vi.stubGlobal("fetch", vi.fn());

    // Set env so SUBGRAPH_ENABLED evaluates to true on re-import
    process.env.NEXT_PUBLIC_SUBGRAPH_URL = "https://fake-subgraph.example.com/graphql";

    // Mock the dynamic imports used by the RPC path
    vi.doMock("../lib/publicClient", () => ({
      publicClient: {
        readContract: vi.fn(({ functionName }: { functionName: string }) => {
          if (functionName === "resolver") return Promise.resolve(FAKE_RESOLVER);
          if (functionName === "owner")    return Promise.resolve(rpc.ownerResult);
          if (functionName === "addr")     return Promise.resolve(rpc.addrResult);
          return Promise.resolve(null);
        }),
      },
    }));

    vi.doMock("../lib/namehash", () => ({
      namehash:       vi.fn(() => "0xdeadbeef"),
      reverseNodeFor: vi.fn(() => "0xdeadbeef"),
    }));

    vi.doMock("../lib/contracts", () => ({
      ADDR_REGISTRY: "0x2222222222222222222222222222222222222222",
      ADDR_RESOLVER: "0x3333333333333333333333333333333333333333",
      REGISTRY_ABI:  [],
      RESOLVER_ABI:  [],
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    vi.doUnmock("../lib/publicClient");
    vi.doUnmock("../lib/namehash");
    vi.doUnmock("../lib/contracts");
  });

  function stubSubgraph(domain: {
    resolvedAddress: string | null;
    resolverRecord:  { addr: string | null } | null;
  } | null) {
    const domains = domain === null ? [] : [{
      id:               "0xabc",
      name:             "alice.arc",
      labelName:        "alice",
      owner:            { id: "0xowner" },
      resolver:         null,
      createdAt:        "1700000000",
      expiry:           "1800000000",
      lastCost:         null,
      resolvedAddress:  domain.resolvedAddress,
      registrationType: "ARC",
      resolverRecord:   domain.resolverRecord,
    }];

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok:   true,
      json: () => Promise.resolve({ data: { domains } }),
    });
  }

  // ── Property 1: Bug Condition ───────────────────────────────────────────────

  it("subgraph has domain entity with null addr, RPC has address → returns rpc address", async () => {
    stubSubgraph({ resolvedAddress: null, resolverRecord: null });
    rpc.addrResult = RPC_ADDRESS;

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("alice.arc");

    expect(result.source).toBe("rpc");
    expect(result.address).toBe(RPC_ADDRESS);
  });

  it("subgraph has domain entity with resolverRecord.addr null, RPC has address → returns rpc address", async () => {
    stubSubgraph({ resolvedAddress: null, resolverRecord: { addr: null } });
    rpc.addrResult = RPC_ADDRESS;

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("alice.arc");

    expect(result.source).toBe("rpc");
    expect(result.address).toBe(RPC_ADDRESS);
  });

  it("subgraph has domain entity with null addr, RPC also has zero addr → returns null with source rpc", async () => {
    stubSubgraph({ resolvedAddress: null, resolverRecord: null });
    rpc.addrResult = ZERO_ADDRESS;

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("carol.arc");

    expect(result.source).toBe("rpc");
    expect(result.address).toBeNull();
  });

  // ── Property 2: Preservation ────────────────────────────────────────────────

  it("subgraph has domain entity with non-null resolvedAddress → returns subgraph result (fast path preserved)", async () => {
    stubSubgraph({ resolvedAddress: SUBGRAPH_ADDRESS, resolverRecord: null });

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("dave.arc");

    expect(result.source).toBe("subgraph");
    expect(result.address).toBe(SUBGRAPH_ADDRESS);
  });

  it("subgraph has domain entity with non-null resolverRecord.addr → returns subgraph result (fast path preserved)", async () => {
    stubSubgraph({ resolvedAddress: null, resolverRecord: { addr: SUBGRAPH_ADDRESS } });

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("dave.arc");

    expect(result.source).toBe("subgraph");
    expect(result.address).toBe(SUBGRAPH_ADDRESS);
  });

  it("subgraph returns null domain, RPC has address → existing fallback preserved", async () => {
    stubSubgraph(null);
    rpc.addrResult = RPC_ADDRESS;

    const { resolveName } = await import("../lib/graphql");
    const result = await resolveName("eve.arc");

    expect(result.source).toBe("rpc");
    expect(result.address).toBe(RPC_ADDRESS);
  });
});
