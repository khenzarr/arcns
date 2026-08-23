import { describe, expect, it } from "vitest";
import { normalizeIndexedWalletAssets } from "../lib/walletAssets";

describe("normalizeIndexedWalletAssets", () => {
  it("keeps unique positive ERC-20 balances and checksums addresses", () => {
    const assets = normalizeIndexedWalletAssets({
      items: [
        { token: { address_hash: "0x3b7f0a06d8978562f2773d3468aa6457174dad31", reputation: "ok", type: "ERC-20" }, value: "10" },
        { token: { address_hash: "0x3B7F0A06D8978562f2773D3468Aa6457174dad31", reputation: "ok", type: "ERC-20" }, value: "20" },
        { token: { address_hash: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", reputation: "ok", type: "ERC-20" }, value: "1" },
      ],
    });

    expect(assets).toEqual([
      { address: "0x3B7F0A06D8978562f2773D3468Aa6457174dad31", indexedBalance: "10" },
      { address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", indexedBalance: "1" },
    ]);
  });

  it("drops NFTs, spam, zero balances, and malformed addresses", () => {
    const assets = normalizeIndexedWalletAssets({
      items: [
        { token: { address_hash: "0x3B7F0A06D8978562f2773D3468Aa6457174dad31", reputation: "ok", type: "ERC-721" }, value: "1" },
        { token: { address_hash: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a", reputation: "spam", type: "ERC-20" }, value: "1" },
        { token: { address_hash: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", reputation: "ok", type: "ERC-20" }, value: "0" },
        { token: { address_hash: "not-an-address", reputation: "ok", type: "ERC-20" }, value: "9" },
      ],
    });

    expect(assets).toEqual([]);
  });

  it("caps the response to the requested limit", () => {
    const items = [
      "0x3B7F0A06D8978562f2773D3468Aa6457174dad31",
      "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
      "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    ].map(address_hash => ({ token: { address_hash, reputation: "ok", type: "ERC-20" }, value: "1" }));

    expect(normalizeIndexedWalletAssets({ items }, 2)).toHaveLength(2);
  });
});
