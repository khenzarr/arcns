/**
 * adapterHelpers.ts — shared helpers for the ArcNS public resolution adapter.
 *
 * Used exclusively by the /api/v1/resolve/* routes.
 * Not used by the frontend UI directly — those use graphql.ts + hooks.
 *
 * ─── v1 Response Schema ───────────────────────────────────────────────────────
 *
 * Every v1 response has a top-level `status` field:
 *   "ok"       — request succeeded; result fields are populated
 *   "not_found" — request was valid but no on-chain result exists
 *   "error"    — request failed; `code` and `hint` describe the failure
 *
 * HTTP status codes:
 *   200 — status: "ok" or "not_found"
 *   400 — status: "error", code: input validation failure
 *   503 — status: "error", code: "UPSTREAM_UNAVAILABLE"
 *   500 — status: "error", code: "INTERNAL_ERROR"
 *
 * ─── Error Codes ─────────────────────────────────────────────────────────────
 *
 *   INVALID_NAME          — name fails normalization or label validation
 *   INVALID_ADDRESS       — address is not a valid 0x hex string
 *   UNSUPPORTED_TLD       — TLD is not .arc or .circle
 *   MALFORMED_INPUT       — input is missing or wrong type
 *   NOT_FOUND             — name exists but has no addr record (forward)
 *                           or address has no verified primary name (reverse)
 *   VERIFICATION_FAILED   — reverse record exists but forward-confirmation failed
 *   UPSTREAM_UNAVAILABLE  — RPC or subgraph is unreachable
 *   INTERNAL_ERROR        — unexpected adapter-level failure
 */

import {
  normalizeLabel,
  validateLabel,
  SUPPORTED_TLDS,
  type SupportedTLD,
  type ValidationErrorCode,
} from "./normalization";

// ─── Error codes ──────────────────────────────────────────────────────────────

export type AdapterErrorCode =
  | "INVALID_NAME"
  | "INVALID_ADDRESS"
  | "UNSUPPORTED_TLD"
  | "MALFORMED_INPUT"
  | "NOT_FOUND"
  | "VERIFICATION_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

// ─── Response types ───────────────────────────────────────────────────────────

/** Returned when status is "error" */
export interface AdapterError {
  status: "error";
  code:   AdapterErrorCode;
  hint:   string;
}

/** Returned when status is "not_found" */
export interface AdapterNotFound {
  status: "not_found";
  hint:   string;
}

/** Returned by /api/v1/resolve/name/[name] when status is "ok" */
export interface NameResolveSuccess {
  status:  "ok";
  name:    string;          // normalized full name e.g. "alice.arc"
  address: string;          // resolved EVM address (checksummed)
  owner:   string | null;   // current ERC-721 owner, or null
  expiry:  number | null;   // Unix timestamp, or null
  source:  "subgraph" | "rpc";
}

/** Returned by /api/v1/resolve/address/[address] when status is "ok" */
export interface AddressResolveSuccess {
  status:   "ok";
  address:  string;          // lowercased input address
  name:     string;          // verified primary name
  verified: true;            // always true when status is "ok"
  source:   "subgraph" | "rpc";
}

/** Returned by /api/v1/resolve/address/[address] when no verified name exists */
export interface AddressResolveNotFound {
  status:   "not_found";
  address:  string;
  name:     null;
  verified: false;
  hint:     string;
}

/** Returned by /api/v1/health */
export interface HealthResponse {
  status:    "ok" | "degraded";
  chainId:   number;
  network:   string;
  version:   "v1";
  timestamp: number;
}

// ─── Internal parse result (not returned to consumers) ───────────────────────

export interface ParsedName {
  label:          string;
  tld:            SupportedTLD;
  normalizedName: string;
}

// ─── Name parsing ─────────────────────────────────────────────────────────────

/**
 * Parse and validate a full ArcNS name string.
 * Returns ParsedName on success, AdapterError on failure.
 */
export function parseName(raw: string): ParsedName | AdapterError {
  if (!raw || typeof raw !== "string") {
    return { status: "error", code: "MALFORMED_INPUT", hint: "Name must be a non-empty string." };
  }

  const trimmed = raw.trim().toLowerCase();

  const dotIndex = trimmed.indexOf(".");
  if (dotIndex === -1) {
    return {
      status: "error",
      code:   "INVALID_NAME",
      hint:   "Name must include a TLD. ArcNS supports: .arc, .circle",
    };
  }

  const label = trimmed.slice(0, dotIndex);
  const tld   = trimmed.slice(dotIndex + 1);

  if (!(SUPPORTED_TLDS as readonly string[]).includes(tld)) {
    return {
      status: "error",
      code:   "UNSUPPORTED_TLD",
      hint:   `Unsupported TLD ".${tld}". ArcNS supports: .arc, .circle`,
    };
  }

  const normalizedLabel = normalizeLabel(label);
  const validationError = validateLabel(normalizedLabel);

  if (validationError) {
    return {
      status: "error",
      code:   "INVALID_NAME",
      hint:   labelValidationHint(validationError),
    };
  }

  return {
    label:          normalizedLabel,
    tld:            tld as SupportedTLD,
    normalizedName: `${normalizedLabel}.${tld}`,
  };
}

/**
 * Validate a raw EVM address string.
 * Returns the lowercased address on success, AdapterError on failure.
 */
export function parseAddress(raw: string): string | AdapterError {
  if (!raw || typeof raw !== "string") {
    return { status: "error", code: "INVALID_ADDRESS", hint: "Address must be a non-empty string." };
  }
  const addr = raw.trim().toLowerCase();
  if (!addr.startsWith("0x") || addr.length !== 42) {
    return {
      status: "error",
      code:   "INVALID_ADDRESS",
      hint:   "Address must be a 0x-prefixed 42-character hex string.",
    };
  }
  if (!/^0x[0-9a-f]{40}$/.test(addr)) {
    return {
      status: "error",
      code:   "INVALID_ADDRESS",
      hint:   "Address contains invalid characters.",
    };
  }
  return addr;
}

// ─── Response builders ────────────────────────────────────────────────────────

/** Build a canonical error response body. HTTP status is set by the caller. */
export function makeError(code: AdapterErrorCode, hint: string): AdapterError {
  return { status: "error", code, hint };
}

/** Build a canonical not-found response body. Always HTTP 200. */
export function makeNotFound(hint: string): AdapterNotFound {
  return { status: "not_found", hint };
}

/** Canonical CORS + cache headers for all v1 public API responses. */
export function v1Headers(cacheMaxAge = 30): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control":                `public, max-age=${cacheMaxAge}`,
    "X-ArcNS-Version":              "v1",
  };
}

/**
 * HTTP status code for a given AdapterErrorCode.
 *
 *   400 — input validation failures
 *   503 — upstream unavailable
 *   500 — internal error
 */
export function httpStatusForError(code: AdapterErrorCode): number {
  switch (code) {
    case "UPSTREAM_UNAVAILABLE": return 503;
    case "INTERNAL_ERROR":       return 500;
    case "RATE_LIMITED":         return 429;
    default:                     return 400;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function labelValidationHint(code: ValidationErrorCode): string {
  switch (code) {
    case "EMPTY":              return "Name label cannot be empty.";
    case "WHITESPACE_ONLY":    return "Name label cannot be whitespace only.";
    case "LEADING_HYPHEN":     return "Name cannot start with a hyphen.";
    case "TRAILING_HYPHEN":    return "Name cannot end with a hyphen.";
    case "DOUBLE_HYPHEN":      return "Name cannot have two consecutive hyphens at positions 3–4.";
    case "INVALID_CHARACTERS": return "Name contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.";
  }
}

// Legacy export — kept for any existing callers; prefer makeError()
export function errorBody(code: AdapterErrorCode, hint: string): AdapterError {
  return makeError(code, hint);
}

// Legacy type alias — kept for backward compat with Tier 1B/1C imports
export type { AdapterError as AdapterErrorLegacy };
