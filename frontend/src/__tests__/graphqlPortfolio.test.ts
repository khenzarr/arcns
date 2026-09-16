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
    vi.unstubAllEnvs();
  });

  it("uses the configured canonical mainnet index", async () => {
    const endpoint = "https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-mainnet/1.0.0/gn";
    vi.stubEnv("NEXT_PUBLIC_SUBGRAPH_URL", endpoint);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { domains: [] } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { getDomainsByOwnerResult } = await import("../lib/graphql");
    const result = await getDomainsByOwnerResult("0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD");

    expect(fetchMock).toHaveBeenCalledWith(
      endpoint,
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
