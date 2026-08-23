import { getAddress, isAddress } from "viem";

export type IndexedWalletAsset = {
  address: `0x${string}`;
  indexedBalance: string;
};

type ExplorerTokenHolding = {
  token?: {
    address_hash?: unknown;
    reputation?: unknown;
    type?: unknown;
  };
  value?: unknown;
};

export function normalizeIndexedWalletAssets(payload: unknown, limit = 24): IndexedWalletAsset[] {
  if (!payload || typeof payload !== "object" || !("items" in payload)) return [];
  const items = (payload as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  const assets: IndexedWalletAsset[] = [];

  for (const item of items as ExplorerTokenHolding[]) {
    const token = item?.token;
    const rawAddress = token?.address_hash;
    const rawValue = item?.value;

    if (token?.type !== "ERC-20") continue;
    if (token?.reputation === "spam") continue;
    if (typeof rawAddress !== "string" || !isAddress(rawAddress)) continue;
    if (typeof rawValue !== "string" || !/^\d+$/.test(rawValue) || BigInt(rawValue) <= 0n) continue;

    const address = getAddress(rawAddress);
    const key = address.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    assets.push({ address, indexedBalance: rawValue });
    if (assets.length >= limit) break;
  }

  return assets;
}
