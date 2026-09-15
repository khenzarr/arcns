import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("portfolio subgraph routing", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    delete process.env.NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL;
    delete process.env.NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the canonical Arc testnet index when no local env file exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { domains: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ARC_TESTNET_SUBGRAPH_URL, getDomainsByOwnerResult } = await import("../lib/graphql");
    const result = await getDomainsByOwnerResult("0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD");

    expect(fetchMock).toHaveBeenCalledWith(
      ARC_TESTNET_SUBGRAPH_URL,
      expect.objectContaining({ method: "POST" })
    );
    expect(result).toEqual({ domains: [], indexAvailable: true });
  });

  it("distinguishes an unavailable index from a valid empty portfolio", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { getDomainsByOwnerResult } = await import("../lib/graphql");
    const result = await getDomainsByOwnerResult("0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD");

    expect(result).toEqual({ domains: [], indexAvailable: false });
  });
});
