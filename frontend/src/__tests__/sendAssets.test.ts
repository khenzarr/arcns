import { describe, expect, it, vi } from "vitest";
import { formatAssetBalance, parseSendAmount, resolveSendRecipient } from "../lib/sendAssets";

describe("send asset helpers", () => {
  it("accepts and checksums a direct EVM recipient", async () => {
    const result = await resolveSendRecipient("0x000000000000000000000000000000000000dEaD");
    expect(result.address).toBe("0x000000000000000000000000000000000000dEaD");
    expect(result.source).toBe("address");
  });

  it("resolves an ArcNS name through the public adapter", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: "ok",
      address: "0x000000000000000000000000000000000000dEaD",
      source: "rpc",
    }), { status: 200 })) as typeof fetch;

    const result = await resolveSendRecipient("Alice.ARC", fetcher);
    expect(fetcher).toHaveBeenCalledWith("/api/v1/resolve/name/alice.arc");
    expect(result.resolvedName).toBe("alice.arc");
    expect(result.source).toBe("rpc");
  });

  it("rejects names without a receiving address", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      status: "not_found",
      hint: "Name has no address record set.",
    }), { status: 200 })) as typeof fetch;

    await expect(resolveSendRecipient("unset.circle", fetcher)).rejects.toThrow("no address record");
  });

  it("parses decimal amounts and enforces the balance", () => {
    expect(parseSendAmount("1.25", 6, 2_000_000n)).toBe(1_250_000n);
    expect(() => parseSendAmount("2.01", 6, 2_000_000n)).toThrow("exceeds");
    expect(() => parseSendAmount("0", 6)).toThrow("greater than zero");
  });

  it("formats balances without noisy trailing precision", () => {
    expect(formatAssetBalance(1_234_567n, 6)).toBe("1.234567");
    expect(formatAssetBalance(12_000_000n, 6)).toBe("12");
  });
});
