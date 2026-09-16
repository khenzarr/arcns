import { describe, expect, it } from "vitest";
import { NETWORK_DISPLAY, RUNTIME_NETWORK_DISPLAY, networkDisplayFor } from "../lib/networkDisplay";
import { mainnetPriceTierFor } from "../lib/normalization";

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

  it("uses launch presentation while preserving the deployed runtime identity", () => {
    expect(NETWORK_DISPLAY.networkDisplayName).toBe("Arc");
    expect(NETWORK_DISPLAY.chainIdLabel).toBe("");
    expect(RUNTIME_NETWORK_DISPLAY.networkDisplayName).toBe("Arc");
    expect(RUNTIME_NETWORK_DISPLAY.chainIdLabel).toBe("");
  });

  it("uses the launch price schedule on discovery surfaces", () => {
    expect(mainnetPriceTierFor("a").annualUSDC).toBe(100_000_000n);
    expect(mainnetPriceTierFor("ab").annualUSDC).toBe(50_000_000n);
    expect(mainnetPriceTierFor("abc").annualUSDC).toBe(25_000_000n);
    expect(mainnetPriceTierFor("abcd").annualUSDC).toBe(15_000_000n);
    expect(mainnetPriceTierFor("alice").annualUSDC).toBe(5_000_000n);
  });
});
