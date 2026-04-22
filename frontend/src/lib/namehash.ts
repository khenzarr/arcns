import { keccak256, stringToBytes, concat } from "viem";

/// ENS-compatible namehash implementation
export function namehash(name: string): `0x${string}` {
  let node = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
  if (name === "") return node;

  const labels = name.split(".").reverse();
  for (const label of labels) {
    const labelHash = keccak256(stringToBytes(label));
    node = keccak256(concat([node, labelHash]));
  }
  return node;
}

/// Returns the label hash (keccak256 of the label string)
export function labelHash(label: string): `0x${string}` {
  return keccak256(stringToBytes(label));
}

/// Returns the token ID (uint256 of label hash) for a given label
export function labelToTokenId(label: string): bigint {
  return BigInt(labelHash(label));
}

/// Detect TLD from a domain string
export function getTLD(domain: string): "arc" | "circle" | null {
  const parts = domain.split(".");
  const tld = parts[parts.length - 1];
  if (tld === "arc") return "arc";
  if (tld === "circle") return "circle";
  return null;
}

// isValidLabel is the authoritative version in lib/domain.ts
// Re-exported here for backwards compatibility with any legacy imports
export { isValidLabel } from "./domain";

/// Format USDC amount (6 decimals) to human-readable string
export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/// Parse USDC string to bigint (6 decimals)
export function parseUSDC(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 1_000_000));
}

/// Duration options
export const DURATION_OPTIONS = [
  { label: "1 year",  seconds: 365 * 24 * 60 * 60 },
  { label: "2 years", seconds: 2 * 365 * 24 * 60 * 60 },
  { label: "3 years", seconds: 3 * 365 * 24 * 60 * 60 },
  { label: "5 years", seconds: 5 * 365 * 24 * 60 * 60 },
];

// ─── Phase 24: Expiry state helpers ──────────────────────────────────────────

export type ExpiryState = "active" | "expiring-soon" | "grace" | "expired";

export function getExpiryState(expiryTimestamp: bigint): ExpiryState {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const GRACE = BigInt(90 * 24 * 60 * 60); // 90 days
  const WARN  = BigInt(7  * 24 * 60 * 60); // 7 days

  if (expiryTimestamp === 0n) return "expired";
  if (now > expiryTimestamp + GRACE) return "expired";
  if (now > expiryTimestamp) return "grace";
  if (expiryTimestamp - now <= WARN) return "expiring-soon";
  return "active";
}

export function expiryBadge(state: ExpiryState): { label: string; className: string } {
  switch (state) {
    case "active":        return { label: "Active",         className: "bg-green-100 text-green-700" };
    case "expiring-soon": return { label: "Expiring Soon",  className: "bg-amber-100 text-amber-700" };
    case "grace":         return { label: "Grace Period",   className: "bg-orange-100 text-orange-700" };
    case "expired":       return { label: "Expired",        className: "bg-red-100 text-red-700" };
  }
}

export function formatExpiry(expiryTimestamp: bigint): string {
  if (!expiryTimestamp) return "—";
  const d = new Date(Number(expiryTimestamp) * 1000);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntilExpiry(expiryTimestamp: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor((Number(expiryTimestamp) - now) / 86400);
}

// ─── Phase 20: Pricing table (mirrors deployed ArcNSPriceOracle) ─────────────

export const PRICING_TABLE = [
  { len: "5+ characters", price: "$2.00 / year",   annual: 2_000_000n },
  { len: "4 characters",  price: "$10.00 / year",  annual: 10_000_000n },
  { len: "3 characters",  price: "$40.00 / year",  annual: 40_000_000n },
  { len: "2 characters",  price: "$160.00 / year", annual: 160_000_000n },
  { len: "1 character",   price: "$640.00 / year", annual: 640_000_000n },
];
