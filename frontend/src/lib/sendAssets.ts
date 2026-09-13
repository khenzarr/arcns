import { formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { IS_MAINNET } from "./networkDisplay";
import { ADDR_USDC } from "./generated-contracts";

export type SendAsset = {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  provenance: "circle" | "detected" | "custom";
};

export const ARC_TESTNET_SEND_ASSETS: readonly SendAsset[] = [
  {
    address: "0x3600000000000000000000000000000000000000",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    provenance: "circle",
  },
  {
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    symbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
    provenance: "circle",
  },
  {
    address: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF",
    symbol: "cirBTC",
    name: "Circle Wrapped Bitcoin",
    decimals: 8,
    provenance: "circle",
  },
] as const;

/** Mainnet tokens beyond canonical USDC require verified addresses at release time. */
export const DEPLOYED_SEND_ASSETS: readonly SendAsset[] = IS_MAINNET
  ? [
      { address: ADDR_USDC, symbol: "USDC", name: "USD Coin", decimals: 6, provenance: "circle" },
      ...([
        [process.env.NEXT_PUBLIC_MAINNET_EURC_ADDRESS, "EURC", "Euro Coin", 6],
        [process.env.NEXT_PUBLIC_MAINNET_CIRBTC_ADDRESS, "cirBTC", "Circle Wrapped Bitcoin", 8],
      ] as const).filter(([address]) => address && isAddress(address)).map(([address, symbol, name, decimals]) => ({
        address: getAddress(address!) as `0x${string}`, symbol, name, decimals, provenance: "circle" as const,
      })),
    ]
  : ARC_TESTNET_SEND_ASSETS;

export type ResolutionResult = {
  input: string;
  address: `0x${string}`;
  resolvedName: string | null;
  source: "address" | "subgraph" | "rpc";
};

type FetchLike = typeof fetch;

export function isArcNSName(value: string): boolean {
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

  if (!isArcNSName(input)) {
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
    throw new Error(body.hint || "This ArcNS name does not have a receiving address.");
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
