/**
 * normalization.ts — canonical ArcNS name normalization pipeline.
 *
 * Single source of truth for all name validation, normalization, and
 * pricing-length basis. Used by contracts (via Solidity mirror), frontend,
 * and subgraph. No hashing logic lives here — see namehash.ts.
 *
 * Pipeline: input → normalize (case-fold) → validate → pricing-length
 *
 * v3 name rules:
 *   Allowed characters: a-z, 0-9, Unicode letters/digits, emoji, hyphen (-), underscore (_)
 *   Case-insensitive: uppercase folds to lowercase before any processing
 *   Hyphen rules:
 *     - cannot begin with hyphen
 *     - cannot end with hyphen
 *     - characters at index 2 and 3 (0-indexed) cannot both be hyphen (double-hyphen rule)
 *   Underscore: allowed, including as first character
 *   Invalid: empty, whitespace-only
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportedTLD = "arc" | "circle";
export const SUPPORTED_TLDS: readonly SupportedTLD[] = ["arc", "circle"];

export type NameState = "INVALID" | "CHECKING" | "AVAILABLE" | "TAKEN";

export interface NormalizeResult {
  ok:    true;
  label: string;   // normalized label (lowercase, trimmed)
  tld:   SupportedTLD;
}

export interface NormalizeError {
  ok:    false;
  code:  ValidationErrorCode;
  hint:  string;
}

export type ValidationErrorCode =
  | "EMPTY"
  | "WHITESPACE_ONLY"
  | "LEADING_HYPHEN"
  | "TRAILING_HYPHEN"
  | "DOUBLE_HYPHEN"
  | "INVALID_CHARACTERS";

// ─── Pricing tiers ────────────────────────────────────────────────────────────
// Canonical pricing by normalized Unicode codepoint length.
// Mirrors ArcNSPriceOracle.sol exactly.

export const PRICE_TIERS = [
  { chars: 1, label: "1 character",   annualUSDC: 50_000_000n, display: "$50.00/yr"  },
  { chars: 2, label: "2 characters",  annualUSDC: 25_000_000n, display: "$25.00/yr"  },
  { chars: 3, label: "3 characters",  annualUSDC: 15_000_000n, display: "$15.00/yr"  },
  { chars: 4, label: "4 characters",  annualUSDC: 10_000_000n, display: "$10.00/yr"  },
  { chars: 5, label: "5+ characters", annualUSDC:  2_000_000n, display:  "$2.00/yr"  },
] as const;

export const PRICING_TABLE = [
  { len: "5+ characters", price: "$2.00 / year",  annual:  2_000_000n },
  { len: "4 characters",  price: "$10.00 / year", annual: 10_000_000n },
  { len: "3 characters",  price: "$15.00 / year", annual: 15_000_000n },
  { len: "2 characters",  price: "$25.00 / year", annual: 25_000_000n },
  { len: "1 character",   price: "$50.00 / year", annual: 50_000_000n },
] as const;

// ─── Unicode codepoint length ─────────────────────────────────────────────────

/**
 * Count Unicode codepoints (not bytes, not JS .length).
 * Emoji and multi-byte characters each count as 1.
 * This is the pricing-length basis — mirrors _strlen() in ArcNSPriceOracle.sol.
 */
export function codepointLength(s: string): number {
  return [...s].length;
}

/**
 * Returns the canonical price tier for a normalized label.
 */
export function priceTierFor(normalizedLabel: string) {
  const len = codepointLength(normalizedLabel);
  if (len === 1) return PRICE_TIERS[0];
  if (len === 2) return PRICE_TIERS[1];
  if (len === 3) return PRICE_TIERS[2];
  if (len === 4) return PRICE_TIERS[3];
  return PRICE_TIERS[4];
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalize a raw label string to its canonical form.
 * Applies case-folding only — does not validate.
 * Returns the normalized string.
 */
export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase();
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a normalized label against v3 name rules.
 * Input must already be normalized (lowercase, trimmed).
 *
 * Returns null if valid, or a ValidationErrorCode if invalid.
 */
export function validateLabel(label: string): ValidationErrorCode | null {
  if (label.length === 0) return "EMPTY";

  // Whitespace-only check
  if (/^\s+$/.test(label)) return "WHITESPACE_ONLY";

  // Leading hyphen
  if (label.startsWith("-")) return "LEADING_HYPHEN";

  // Trailing hyphen
  if (label.endsWith("-")) return "TRAILING_HYPHEN";

  // Double-hyphen at positions 2-3 (0-indexed) — e.g. "ab--cd"
  if (label.length >= 4 && label[2] === "-" && label[3] === "-") return "DOUBLE_HYPHEN";

  // Character validation: allow a-z, 0-9, Unicode letters/digits, emoji, hyphen, underscore
  // We use a permissive approach: reject only ASCII control chars and known-bad ASCII symbols.
  // Unicode letters, digits, and emoji pass through.
  for (const char of label) {
    const cp = char.codePointAt(0)!;
    // ASCII range: only allow a-z (97-122), 0-9 (48-57), hyphen (45), underscore (95)
    if (cp < 128) {
      const isLower   = cp >= 97  && cp <= 122;
      const isDigit   = cp >= 48  && cp <= 57;
      const isHyphen  = cp === 45;
      const isUnderscore = cp === 95;
      if (!isLower && !isDigit && !isHyphen && !isUnderscore) return "INVALID_CHARACTERS";
    }
    // Non-ASCII: allow Unicode letters, digits, emoji (codepoint > 127)
    // Reject ASCII control characters (already handled above)
  }

  return null; // valid
}

/**
 * Full pipeline: normalize then validate.
 * Returns the normalized label if valid, or an error code.
 */
export function normalizeAndValidate(
  raw: string,
  tld: SupportedTLD,
): NormalizeResult | NormalizeError {
  const label = normalizeLabel(raw);
  const error = validateLabel(label);

  if (error) {
    return { ok: false, code: error, hint: validationHint(error) };
  }

  return { ok: true, label, tld };
}

/**
 * Convenience: returns true if the label is valid after normalization.
 */
export function isValidLabel(raw: string): boolean {
  const label = normalizeLabel(raw);
  return validateLabel(label) === null;
}

// ─── Validation hints ─────────────────────────────────────────────────────────

export function validationHint(code: ValidationErrorCode): string {
  switch (code) {
    case "EMPTY":              return "Enter a name to search.";
    case "WHITESPACE_ONLY":    return "Name cannot be whitespace only.";
    case "LEADING_HYPHEN":     return "Name cannot start with a hyphen.";
    case "TRAILING_HYPHEN":    return "Name cannot end with a hyphen.";
    case "DOUBLE_HYPHEN":      return "Name cannot have two consecutive hyphens at positions 3–4.";
    case "INVALID_CHARACTERS": return "Only letters, numbers, hyphens, and underscores are allowed.";
  }
}

// ─── Domain parsing helpers ───────────────────────────────────────────────────

/**
 * Parse raw search input into a normalized label + TLD pair.
 * Strips the TLD suffix if present, normalizes, validates.
 * Returns null if the result is invalid.
 */
export function parseSearchInput(
  raw: string,
  tld: SupportedTLD,
): NormalizeResult | NormalizeError {
  const stripped = raw
    .trim()
    .toLowerCase()
    .replace(new RegExp(`\\.(${SUPPORTED_TLDS.join("|")})$`), "");

  return normalizeAndValidate(stripped, tld);
}

/**
 * Returns the full domain name string (e.g. "alice.arc").
 */
export function fullDomainName(label: string, tld: SupportedTLD): string {
  return `${label}.${tld}`;
}

/**
 * Splits a full domain name into label + TLD.
 * Returns null if the TLD is not supported.
 */
export function splitDomain(domain: string): { label: string; tld: SupportedTLD } | null {
  const parts = domain.split(".");
  if (parts.length < 2) return null;
  const tld = parts[parts.length - 1] as SupportedTLD;
  if (!SUPPORTED_TLDS.includes(tld)) return null;
  const label = parts.slice(0, -1).join(".");
  return { label, tld };
}

// ─── Name state helpers ───────────────────────────────────────────────────────

export interface StateBadge {
  label:     string;
  className: string;
  pulse:     boolean;
}

export const STATE_BADGES: Record<NameState, StateBadge> = {
  AVAILABLE: { label: "Available",   className: "bg-green-100 text-green-700 border border-green-200",  pulse: false },
  TAKEN:     { label: "Taken",       className: "bg-red-100 text-red-700 border border-red-200",        pulse: false },
  INVALID:   { label: "Invalid",     className: "bg-gray-100 text-gray-500 border border-gray-200",     pulse: false },
  CHECKING:  { label: "Checking…",   className: "bg-blue-50 text-blue-500 border border-blue-100",      pulse: true  },
};

// ─── Expiry helpers ───────────────────────────────────────────────────────────

export type ExpiryState = "active" | "expiring-soon" | "grace" | "expired";

const GRACE_SECONDS = BigInt(90 * 24 * 60 * 60);
const WARN_SECONDS  = BigInt(30 * 24 * 60 * 60);

export function getExpiryState(expiryTimestamp: bigint): ExpiryState {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (expiryTimestamp === 0n)                          return "expired";
  if (now > expiryTimestamp + GRACE_SECONDS)           return "expired";
  if (now > expiryTimestamp)                           return "grace";
  if (expiryTimestamp - now <= WARN_SECONDS)           return "expiring-soon";
  return "active";
}

export function expiryBadge(state: ExpiryState): StateBadge {
  switch (state) {
    case "active":        return { label: "Active",        className: "bg-green-100 text-green-700",  pulse: false };
    case "expiring-soon": return { label: "Expiring Soon", className: "bg-amber-100 text-amber-700",  pulse: false };
    case "grace":         return { label: "Grace Period",  className: "bg-orange-100 text-orange-700", pulse: false };
    case "expired":       return { label: "Expired",       className: "bg-red-100 text-red-700",      pulse: false };
  }
}

export function formatExpiry(expiryTimestamp: bigint): string {
  if (!expiryTimestamp || expiryTimestamp === 0n) return "—";
  return new Date(Number(expiryTimestamp) * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function daysUntilExpiry(expiryTimestamp: bigint): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.floor((Number(expiryTimestamp) - now) / 86400);
}

// ─── USDC formatting ──────────────────────────────────────────────────────────

export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return dollars.toLocaleString("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2,
  });
}

export function parseUSDC(amount: string): bigint {
  return BigInt(Math.round(parseFloat(amount) * 1_000_000));
}

// ─── Duration helpers ─────────────────────────────────────────────────────────

export const DURATION_OPTIONS = [
  { label: "1 year",  seconds: 365 * 24 * 60 * 60 },
  { label: "2 years", seconds: 2 * 365 * 24 * 60 * 60 },
  { label: "3 years", seconds: 3 * 365 * 24 * 60 * 60 },
  { label: "5 years", seconds: 5 * 365 * 24 * 60 * 60 },
] as const;

export function withSlippage(amount: bigint, bps = 500n): bigint {
  return amount + (amount * bps) / 10_000n;
}
