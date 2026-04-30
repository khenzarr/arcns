/**
 * errors.ts — ArcNS error classification and user-facing message mapping.
 *
 * Responsibilities:
 *   - Error code constants (no ENS wording)
 *   - Infra failure vs semantic failure separation
 *   - User-facing message mapping (clean, actionable, ArcNS-branded)
 *   - Error classification helpers
 *
 * Two failure categories:
 *   INFRA_FAILURE  — transient infrastructure issue; retry is appropriate
 *   SEMANTIC_FAILURE — on-chain state or user config issue; retry will not help
 *   USER_REJECTION — user cancelled in wallet; return to idle silently
 */

// ─── Error codes ──────────────────────────────────────────────────────────────

export const ARC_ERR = {
  // ── Infra failures (retry eligible) ────────────────────────────────────────
  TXPOOL_FULL:                    "TXPOOL_FULL",
  MEMPOOL_PROPAGATION_FAILURE:    "MEMPOOL_PROPAGATION_FAILURE",
  RPC_SUBMISSION_FAILED:          "RPC_SUBMISSION_FAILED",
  RPC_RESOURCE_NOT_AVAILABLE:     "RPC_RESOURCE_NOT_AVAILABLE",
  RECEIPT_TIMEOUT:                "RECEIPT_TIMEOUT",
  TX_NOT_VISIBLE_AFTER_SUBMISSION:"TX_NOT_VISIBLE_AFTER_SUBMISSION",
  TX_DROPPED:                     "TX_DROPPED",
  NONCE_CONFLICT:                 "NONCE_CONFLICT",
  UNDERPRICED_REPLACEMENT:        "UNDERPRICED_REPLACEMENT",
  GAS_ESTIMATION_FAILED:          "GAS_ESTIMATION_FAILED",
  MATURITY_WAIT_TIMEOUT:          "MATURITY_WAIT_TIMEOUT",
  SIMULATION_TIMEOUT:             "SIMULATION_TIMEOUT",

  // ── Semantic failures (no retry) ────────────────────────────────────────────
  COMMITMENT_TOO_NEW:             "COMMITMENT_TOO_NEW",
  COMMITMENT_EXPIRED:             "COMMITMENT_EXPIRED",
  COMMITMENT_NOT_FOUND:           "COMMITMENT_NOT_FOUND",
  COMMITMENT_ALREADY_USED:        "COMMITMENT_ALREADY_USED",
  COMMITMENT_HASH_MISMATCH:       "COMMITMENT_HASH_MISMATCH",
  INVALID_NAME:                   "INVALID_NAME",
  DURATION_TOO_SHORT:             "DURATION_TOO_SHORT",
  RESOLVER_NOT_APPROVED:          "RESOLVER_NOT_APPROVED",
  PRICE_EXCEEDS_MAX_COST:         "PRICE_EXCEEDS_MAX_COST",
  INSUFFICIENT_FUNDS:             "INSUFFICIENT_FUNDS",
  CHAIN_MISMATCH:                 "CHAIN_MISMATCH",
  NAME_NOT_AVAILABLE:             "NAME_NOT_AVAILABLE",
  REGISTER_SIMULATION_FAILED:     "REGISTER_SIMULATION_FAILED",
  UNAUTHORIZED_NODE_OWNER:        "UNAUTHORIZED_NODE_OWNER",
  NOT_NAME_OWNER:                 "NOT_NAME_OWNER",

  // ── User rejection (return to idle) ─────────────────────────────────────────
  USER_REJECTED:                  "USER_REJECTED",
  WALLET_CONFIRMATION_TIMEOUT:    "WALLET_CONFIRMATION_TIMEOUT",
} as const;

export type ArcErrorCode = typeof ARC_ERR[keyof typeof ARC_ERR];

// ─── Failure categories ───────────────────────────────────────────────────────

export type FailureCategory = "INFRA_FAILURE" | "SEMANTIC_FAILURE" | "USER_REJECTION";

const INFRA_CODES = new Set<ArcErrorCode>([
  ARC_ERR.TXPOOL_FULL,
  ARC_ERR.MEMPOOL_PROPAGATION_FAILURE,
  ARC_ERR.RPC_SUBMISSION_FAILED,
  ARC_ERR.RPC_RESOURCE_NOT_AVAILABLE,
  ARC_ERR.RECEIPT_TIMEOUT,
  ARC_ERR.TX_NOT_VISIBLE_AFTER_SUBMISSION,
  ARC_ERR.TX_DROPPED,
  ARC_ERR.NONCE_CONFLICT,
  ARC_ERR.UNDERPRICED_REPLACEMENT,
  ARC_ERR.GAS_ESTIMATION_FAILED,
  ARC_ERR.MATURITY_WAIT_TIMEOUT,
  ARC_ERR.SIMULATION_TIMEOUT,
]);

const USER_REJECTION_CODES = new Set<ArcErrorCode>([
  ARC_ERR.USER_REJECTED,
  ARC_ERR.WALLET_CONFIRMATION_TIMEOUT,
]);

export function classifyError(code: ArcErrorCode): FailureCategory {
  if (USER_REJECTION_CODES.has(code)) return "USER_REJECTION";
  if (INFRA_CODES.has(code))          return "INFRA_FAILURE";
  return "SEMANTIC_FAILURE";
}

export function isRetryable(code: ArcErrorCode): boolean {
  return classifyError(code) === "INFRA_FAILURE";
}

// ─── Error extraction from thrown values ─────────────────────────────────────

/**
 * Extracts the ARC_ERR code from an error message if present.
 * Error messages are expected to contain [CODE] prefixes.
 */
export function extractErrorCode(message: string): ArcErrorCode | null {
  const match = message.match(/\[([A-Z_]+)\]/);
  if (!match) return null;
  const code = match[1] as ArcErrorCode;
  return Object.values(ARC_ERR).includes(code) ? code : null;
}

/**
 * Classifies a raw thrown error into a failure category.
 * Inspects message content for known patterns.
 * Also inspects viem's custom error structure (errorName in cause chain).
 */
export function classifyRawError(e: unknown): { code: ArcErrorCode; category: FailureCategory } {
  // Extract the error name from viem's custom error structure.
  // For custom Solidity errors, viem puts the error name in:
  //   e.cause?.data?.errorName  OR  e.cause?.cause?.data?.errorName
  // The shortMessage for custom errors is just "The contract function X reverted."
  // so we must inspect the cause chain to get the actual error name.
  const errorName: string = (
    (e as any)?.cause?.data?.errorName ??
    (e as any)?.cause?.cause?.data?.errorName ??
    (e as any)?.data?.errorName ??
    ""
  ).toLowerCase();

  const msg = ((e as any)?.shortMessage ?? (e as any)?.message ?? String(e)).toLowerCase();

  // Combine both sources for pattern matching
  const combined = `${msg} ${errorName}`;

  // User rejection
  if (combined.includes("user rejected") || combined.includes("user denied") || combined.includes("cancelled")) {
    return { code: ARC_ERR.USER_REJECTED, category: "USER_REJECTION" };
  }

  // Infra patterns
  if (combined.includes("txpool is full") || combined.includes("transaction pool is full")) {
    return { code: ARC_ERR.TXPOOL_FULL, category: "INFRA_FAILURE" };
  }
  if (combined.includes("replacement transaction underpriced")) {
    return { code: ARC_ERR.UNDERPRICED_REPLACEMENT, category: "INFRA_FAILURE" };
  }
  if (combined.includes("nonce too low") || combined.includes("already known")) {
    return { code: ARC_ERR.NONCE_CONFLICT, category: "INFRA_FAILURE" };
  }
  if (combined.includes("requested resource not available")) {
    return { code: ARC_ERR.RPC_RESOURCE_NOT_AVAILABLE, category: "INFRA_FAILURE" };
  }
  if (combined.includes("failed to fetch") || combined.includes("econnrefused") || combined.includes("network error")) {
    return { code: ARC_ERR.RPC_SUBMISSION_FAILED, category: "INFRA_FAILURE" };
  }
  if (combined.includes("estimate gas") || combined.includes("gas required exceeds")) {
    return { code: ARC_ERR.GAS_ESTIMATION_FAILED, category: "INFRA_FAILURE" };
  }

  // Semantic patterns — custom Solidity errors (errorName) and string reverts
  if (combined.includes("insufficient funds")) {
    return { code: ARC_ERR.INSUFFICIENT_FUNDS, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("commitmenttoonew") || combined.includes("commitment too new")) {
    return { code: ARC_ERR.COMMITMENT_TOO_NEW, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("commitmentexpired") || combined.includes("commitment expired")) {
    return { code: ARC_ERR.COMMITMENT_EXPIRED, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("commitmentnotfound") || combined.includes("commitment not found")) {
    return { code: ARC_ERR.COMMITMENT_NOT_FOUND, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("commitmentalreadyused") || combined.includes("commitment already used")) {
    return { code: ARC_ERR.COMMITMENT_ALREADY_USED, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("commitmentalreadyexists") || combined.includes("commitment already exists")) {
    return { code: ARC_ERR.COMMITMENT_ALREADY_USED, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("priceexceedsmaxcost") || combined.includes("price exceeds maxcost")) {
    return { code: ARC_ERR.PRICE_EXCEEDS_MAX_COST, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("resolvernotapproved") || combined.includes("resolver not approved")) {
    return { code: ARC_ERR.RESOLVER_NOT_APPROVED, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("invalidname") || combined.includes("invalid name")) {
    return { code: ARC_ERR.INVALID_NAME, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("namenotavailable") || combined.includes("name not available")) {
    return { code: ARC_ERR.NAME_NOT_AVAILABLE, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("durationtooshort") || combined.includes("duration too short")) {
    return { code: ARC_ERR.DURATION_TOO_SHORT, category: "SEMANTIC_FAILURE" };
  }
  if (combined.includes("chain") && combined.includes("mismatch")) {
    return { code: ARC_ERR.CHAIN_MISMATCH, category: "SEMANTIC_FAILURE" };
  }

  // Default: unknown revert — log the raw error for diagnostics
  return { code: ARC_ERR.REGISTER_SIMULATION_FAILED, category: "SEMANTIC_FAILURE" };
}

// ─── User-facing messages ─────────────────────────────────────────────────────

/**
 * Returns a clean, actionable, ArcNS-branded user-facing message for an error code.
 * No ENS wording. No raw Solidity revert strings.
 */
export function userFacingMessage(code: ArcErrorCode): string {
  switch (code) {
    case ARC_ERR.USER_REJECTED:
    case ARC_ERR.WALLET_CONFIRMATION_TIMEOUT:
      return "Transaction cancelled.";

    case ARC_ERR.TXPOOL_FULL:
      return "Arc Testnet is busy — transaction pool is full. Wait a moment and try again.";

    case ARC_ERR.RECEIPT_TIMEOUT:
      return "Transaction submitted but confirmation is taking longer than expected. Check ArcScan for your transaction, then retry if needed.";

    case ARC_ERR.TX_NOT_VISIBLE_AFTER_SUBMISSION:
      return "Transaction was not accepted by the network. This may be a temporary provider issue — please retry.";

    case ARC_ERR.TX_DROPPED:
      return "Transaction was dropped from the mempool. Please retry — this is a temporary network condition.";

    case ARC_ERR.NONCE_CONFLICT:
    case ARC_ERR.UNDERPRICED_REPLACEMENT:
      return "Wallet nonce conflict detected. Refresh the page and try again.";

    case ARC_ERR.INSUFFICIENT_FUNDS:
      return "Insufficient USDC balance. Please fund your wallet on Arc Testnet.";

    case ARC_ERR.RPC_SUBMISSION_FAILED:
    case ARC_ERR.RPC_RESOURCE_NOT_AVAILABLE:
    case ARC_ERR.MEMPOOL_PROPAGATION_FAILURE:
      return "Arc Testnet RPC is temporarily unavailable. Try again in a moment.";

    case ARC_ERR.GAS_ESTIMATION_FAILED:
      return "Transaction could not be estimated. The Arc Testnet RPC may be slow — please retry.";

    case ARC_ERR.CHAIN_MISMATCH:
      return "Wrong network — please switch your wallet to Arc Testnet (Chain ID 5042002).";

    case ARC_ERR.COMMITMENT_TOO_NEW:
      return "Commitment is not yet mature. Please wait a moment and retry.";

    case ARC_ERR.COMMITMENT_EXPIRED:
      return "Commitment expired (older than 24 hours). Please start a new registration.";

    case ARC_ERR.COMMITMENT_NOT_FOUND:
      return "Commitment not found on-chain. Please start a new registration.";

    case ARC_ERR.COMMITMENT_ALREADY_USED:
      return "This commitment has already been used. Please start a new registration.";

    case ARC_ERR.COMMITMENT_HASH_MISMATCH:
      return "Internal commitment mismatch. Please refresh and start a new registration.";

    case ARC_ERR.PRICE_EXCEEDS_MAX_COST:
      return "The registration price changed. Please refresh to get the current price and try again.";

    case ARC_ERR.RESOLVER_NOT_APPROVED:
      return "The resolver address is not approved on this controller. Try registering without a resolver.";

    case ARC_ERR.INVALID_NAME:
      return "This name is not valid. Please check the name and try again.";

    case ARC_ERR.DURATION_TOO_SHORT:
      return "Minimum registration duration is 28 days.";

    case ARC_ERR.NAME_NOT_AVAILABLE:
      return "This name is no longer available. Please search again.";

    case ARC_ERR.MATURITY_WAIT_TIMEOUT:
      return "Commitment maturity check timed out. The commitment may still be valid — check ArcScan and retry.";

    case ARC_ERR.SIMULATION_TIMEOUT:
      return "Registration simulation timed out. Arc RPC may be slow — please retry.";

    case ARC_ERR.REGISTER_SIMULATION_FAILED:
      return "Registration pre-check failed. Please refresh and retry.";

    case ARC_ERR.UNAUTHORIZED_NODE_OWNER:
      return "You are not the owner of this name. Only the owner can update the receiving address.";

    case ARC_ERR.NOT_NAME_OWNER:
      return "This name is owned by another wallet — only the owner can renew.";

    default:
      return "Something went wrong. Please refresh and try again.";
  }
}

/**
 * Convenience: classify a raw error and return the user-facing message.
 */
export function toUserMessage(e: unknown): string {
  const { code } = classifyRawError(e);
  return userFacingMessage(code);
}
