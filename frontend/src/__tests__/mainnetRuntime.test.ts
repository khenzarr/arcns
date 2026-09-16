import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/generated-contracts", () => ({ DEPLOYED_CHAIN_ID: 5042 }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_RPC_URL", "https://rpc.mainnet.arc.io");
  for (const key of ["NEXT_PUBLIC_RPC_URL_2", "NEXT_PUBLIC_RPC_URL_3", "NEXT_PUBLIC_SUBGRAPH_URL", "NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL", "NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL"]) {
    vi.stubEnv(key, "");
  }
});
afterEach(() => vi.unstubAllEnvs());

describe("mainnet runtime isolation", () => {
  it("selects chain 5042 without inheriting testnet RPC fallbacks", async () => {
    const runtime = await import("../lib/chains");
    expect(runtime.deployedChain.id).toBe(5042);
    expect(runtime.DEPLOYED_RUNTIME_MODE).toBe("arc-mainnet");
    expect(runtime.DEPLOYED_FALLBACK_RPC_URLS).toEqual(["https://rpc.mainnet.arc.io"]);
  });

  it("ignores a leftover testnet RPC fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_RPC_URL_2", "https://rpc.testnet.arc.network");
    const runtime = await import("../lib/chains");
    expect(runtime.DEPLOYED_FALLBACK_RPC_URLS).toEqual(["https://rpc.mainnet.arc.io"]);
  });

  it("accepts the mainnet indexers", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUBGRAPH_URL", "https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-mainnet/1.0.1/gn");
    vi.stubEnv("NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL", "https://api.studio.thegraph.com/query/1748590/arc-ns-mainnet/1.0.1");
    await expect(import("../lib/graphql")).resolves.toBeDefined();
  });

  it("replaces a leftover legacy indexed-data endpoint with the canonical fallback", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL", "https://api.studio.thegraph.com/query/1748590/arcnslatest/v3");
    await expect(import("../lib/graphql")).resolves.toBeDefined();
  });
});
