import { formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { ADDR_USDC } from "./generated-contracts";

export type SendAsset = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  provenance: "circle" | "detected" | "custom";
};

const configuredCircleAssets: SendAsset[] = [
  {
    address: ADDR_USDC,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    provenance: "circle",
  },
];

const optionalCircleAssets = [
  { address: process.env.NEXT_PUBLIC_EURC_ADDRESS, symbol: "EURC", name: "Euro Coin", decimals: 6 },
  { address: process.env.NEXT_PUBLIC_CIRBTC_ADDRESS, symbol: "cirBTC", name: "Circle Wrapped Bitcoin", decimals: 8 },
] as const;

for (const asset of optionalCircleAssets) {
  if (asset.address && isAddress(asset.address)) {
    configuredCircleAssets.push({
      ...asset,
      address: getAddress(asset.address),
      provenance: "circle",
    });
  }
}

export const DEFAULT_SEND_ASSETS: readonly SendAsset[] = configuredCircleAssets;

export type ResolutionResult = {
  input: string;
  address: `0x${string}`;
  resolvedName: string | null;
  source: "address" | "subgraph" | "rpc";
};

type FetchLike = typeof fetch;

export function isFlashNamesName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.endsWith(".arc") || normalized.endsWith(".circle");
}

export async function resolveSendRecipient(
  rawInput: string,
  fetcher: FetchLike = fetch,
): Promise<ResolutionResult> {
  const input = rawInput.trim();

  if (isAddress(input)) {
    return {
      input,
      address: getAddress(input),
      resolvedName: null,
      source: "address",
    };
  }

  if (!isFlashNamesName(input)) {
    throw new Error("Enter a valid 0x address, .arc name, or .circle name.");
  }

  const normalizedName = input.toLowerCase();
  const response = await fetcher(`/api/v1/resolve/name/${encodeURIComponent(normalizedName)}`);
  const body = await response.json() as {
    status?: string;
    address?: string;
    source?: "subgraph" | "rpc";
    hint?: string;
  };

  if (!response.ok || body.status !== "ok" || !body.address || !isAddress(body.address)) {
    throw new Error(body.hint || "This FlashNames name does not have a receiving address.");
  }

  return {
    input,
    address: getAddress(body.address),
    resolvedName: normalizedName,
    source: body.source === "rpc" ? "rpc" : "subgraph",
  };
}

export function parseSendAmount(amount: string, decimals: number, balance?: bigint): bigint {
  const normalized = amount.trim();
  if (!/^(?:\d+)(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid token amount.");
  }

  let parsed: bigint;
  try {
    parsed = parseUnits(normalized, decimals);
  } catch {
    throw new Error(`This token supports up to ${decimals} decimal places.`);
  }

  if (parsed <= 0n) throw new Error("Amount must be greater than zero.");
  if (balance !== undefined && parsed > balance) throw new Error("Amount exceeds your available balance.");
  return parsed;
}

export function formatAssetBalance(balance: bigint | undefined, decimals: number): string {
  if (balance === undefined) return "--";
  const formatted = formatUnits(balance, decimals);
  const [whole, fraction = ""] = formatted.split(".");
  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}
