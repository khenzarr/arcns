/**
 * ArcNS Domain Validation & State Machine
 * Single source of truth for all domain name logic.
 *
 * State machine:
 *   INVALID   — empty, bad characters, or leading/trailing hyphen
 *   CHECKING  — valid label, RPC call in-flight
 *   AVAILABLE — on-chain: available === true
 *   TAKEN     — on-chain: available === false
 *
 * LENGTH POLICY:
 *   MIN_NAME_LENGTH = 1
 *   1-char and 2-char names are VALID — they carry premium pricing on-chain.
 *   The frontend MUST NOT block them. Length alone never makes a name INVALID.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Minimum label length. Set to 1 — the on-chain controller accepts 1-char names
 * (they are priced at the premium tier). The frontend must not add extra restrictions.
 */
export const MIN_NAME_LENGTH = 1;

/** Supported TLDs */
export const SUPPORTED_TLDS = ["arc", "circle"] as const;
export type SupportedTLD = typeof SUPPORTED_TLDS[number];

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * The four public states a domain can be in.
 * ERROR is intentionally absent — RPC failures silently fall back to CHECKING.
 * Users never see a network error state; the UI stays responsive.
 */
export type NameState = "INVALID" | "CHECKING" | "AVAILABLE" | "TAKEN";

/**
 * Compute the canonical state for a domain label.
 *
 * Priority order:
 *  1. Fails character/format validation → INVALID   (length is NOT a reason)
 *  2. RPC error (any)                   → CHECKING  (silent retry — never block UI)
 *  3. available === undefined / loading → CHECKING
 *  4. available === true                → AVAILABLE
 *  5. available === false               → TAKEN
 *
 * RULE: isError MUST map to CHECKING, not INVALID and not a visible error state.
 * An RPC failure means "we don't know yet" — keep the UI in the waiting state
 * and let react-query retry silently in the background.
 */
export function getNameState(
  label: string,
  available: boolean | undefined,
  isLoading: boolean,
  isError: boolean,
  /** When true and no data exists yet, assume AVAILABLE (optimistic default) */
  optimistic = true
): NameState {
  // Format validation only — no chain dependency
  if (!isValidLabel(label)) return "INVALID";

  // RPC error → CHECKING (silent background retry, UI stays responsive)
  if (isError) return "CHECKING";

  // Definitive on-chain answer
  if (available !== undefined) return available ? "AVAILABLE" : "TAKEN";

  // No data yet: optimistic default = AVAILABLE (name service behavior)
  // The RPC will correct this if the name is actually taken
  if (optimistic && !isLoading) return "AVAILABLE";

  // Loading or no response yet → CHECKING
  return "CHECKING";
}

// ─── Badge config ─────────────────────────────────────────────────────────────

export interface StateBadge {
  label: string;
  className: string;
  pulse: boolean;
}

export const STATE_BADGES: Record<NameState, StateBadge> = {
  AVAILABLE: {
    label: "Available",
    className: "bg-green-100 text-green-700 border border-green-200",
    pulse: false,
  },
  TAKEN: {
    label: "Taken",
    className: "bg-red-100 text-red-700 border border-red-200",
    pulse: false,
  },
  INVALID: {
    label: "Invalid",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
    pulse: false,
  },
  CHECKING: {
    label: "Checking...",
    className: "bg-blue-50 text-blue-500 border border-blue-100",
    pulse: true,
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a domain label (the part before the dot).
 *
 * A label is INVALID only if:
 *  - it is empty
 *  - it contains characters other than a-z, 0-9, hyphen
 *  - it starts or ends with a hyphen
 *
 * LENGTH IS NOT A VALIDATION CRITERION.
 * 1-char and 2-char names are valid — they are priced at premium tiers.
 */
export function isValidLabel(label: string): boolean {
  if (!label || label.length === 0) return false;
  if (!/^[a-z0-9-]+$/.test(label)) return false;
  if (label.startsWith("-") || label.endsWith("-")) return false;
  return true;
}

/**
 * Normalise raw search input into a clean label + TLD pair.
 * Strips the TLD suffix if present, lowercases, trims whitespace.
 * Returns null only if the result fails character/format validation.
 */
export function parseSearchInput(
  raw: string,
  tld: SupportedTLD
): { label: string; tld: SupportedTLD } | null {
  const clean = raw
    .trim()
    .toLowerCase()
    .replace(new RegExp(`\\.(${SUPPORTED_TLDS.join("|")})$`), "");

  if (!isValidLabel(clean)) return null;
  return { label: clean, tld };
}

/**
 * Validation hint shown below the search input.
 * Returns null when no hint is needed (input is valid or empty).
 *
 * NOTE: does NOT mention a minimum length — length is not a restriction.
 */
export function getValidationHint(raw: string): string | null {
  if (!raw || raw.length === 0) return null;

  const clean = raw.trim().toLowerCase().replace(/\.(arc|circle)$/, "");
  if (clean.length === 0) return null;

  // Only flag character/format errors
  if (/[^a-z0-9-]/.test(clean)) {
    return "Only lowercase letters (a–z), numbers (0–9), and hyphens are allowed.";
  }
  if (clean.startsWith("-") || clean.endsWith("-")) {
    return "Name cannot start or end with a hyphen.";
  }

  return null; // valid
}
