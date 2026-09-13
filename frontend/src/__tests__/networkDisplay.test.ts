import { describe, expect, it } from "vitest";
import { networkDisplayFor } from "../lib/networkDisplay";

describe("network-aware public labels", () => {
  it("retains explicit testnet context on chain 5042002", () => {
    expect(networkDisplayFor(5042002)).toMatchObject({
      networkDisplayName: "Arc Testnet",
      chainIdLabel: "Chain ID 5042002",
      currencyDisplayName: "Testnet USDC",
    });
  });

  it("does not leak testnet or a chain-id badge into mainnet copy", () => {
    const labels = networkDisplayFor(5042);
    expect(labels.networkDisplayName).toBe("Arc");
    expect(labels.chainIdLabel).toBe("");
    expect(JSON.stringify(labels).toLowerCase()).not.toContain("testnet");
  });
});
