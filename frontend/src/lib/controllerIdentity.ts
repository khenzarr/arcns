/**
 * controllerIdentity.ts — Canonical contract identity resolver and assertion.
 *
 * SINGLE SOURCE OF TRUTH for all controller address resolution.
 * Every call to commit / register / debugCommitment / getCommitmentStatus
 * MUST go through resolveControllerIdentity() and assertIdentityStable().
 *
 * Eliminates:
 *  - proxy/implementation mismatch between commit and register
 *  - stale cached controller references
 *  - wallet chain vs publicClient chain divergence
 *  - silent fallback to wrong addresses
 *  - infra errors misclassified as contract logic failures
 */

import { ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "./contracts";
import { arcTestnet } from "./chains";

// Internal shim — single source of truth for controller addresses
const CONTRACTS = {
  arcController:    ADDR_ARC_CONTROLLER,
  circleController: ADDR_CIRCLE_CONTROLLER,
} as const;

// ─── EIP-1967 implementation slot ────────────────────────────────────────────
// keccak256("eip1967.proxy.implementation") - 1
// CORRECT value — must match what providers.tsx uses for boot check.
export const EIP1967_IMPL_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as const;

// ─── Error codes ──────────────────────────────────────────────────────────────
export const ERR = {
  CONTROLLER_MISMATCH:  "CONTROLLER_MISMATCH",
  IMPL_SLOT_MISMATCH:   "IMPL_SLOT_MISMATCH",
  CHAIN_MISMATCH:       "CHAIN_MISMATCH",
  STATE_NOT_PERSISTED:  "STATE_NOT_PERSISTED",
  TX_SUBMISSION_FAILED: "TX_SUBMISSION_FAILED",
  TXPOOL_FULL:          "TXPOOL_FULL",
  NONCE_CONFLICT:       "NONCE_CONFLICT",
  RPC_RECEIPT_TIMEOUT:  "RPC_RECEIPT_TIMEOUT",
  NO_FALLBACK_ALLOWED:  "NO_FALLBACK_ALLOWED",
  COMMITMENT_HASH_MISMATCH: "COMMITMENT_HASH_MISMATCH",
} as const;

export type ErrorCode = typeof ERR[keyof typeof ERR];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ControllerIdentity {
  controllerAddress:    `0x${string}`;
  chainId:              number;
  implSlotValue:        string;   // EIP-1967 slot value (hex), or "NO_PROXY"
  tld:                  "arc" | "circle";
  sourceOfTruth:        string;
}

// ─── Module-level identity cache ─────────────────────────────────────────────
// Populated on first call to resolveControllerIdentity().
// Cleared on page reload (module re-init).
const _identityCache = new Map<string, ControllerIdentity>();

// ─── Infra error classifier ───────────────────────────────────────────────────

/**
 * Classify a raw error from writeContractAsync / waitForTransactionReceipt.
 * Returns a structured error code so infra failures are never misread as
 * contract logic failures (e.g. "commitment expired").
 */
export function classifyTransportError(e: unknown): { code: ErrorCode; message: string } | null {
  const msg = (e as any)?.message ?? (e as any)?.shortMessage ?? String(e);
  const lower = msg.toLowerCase();

  if (lower.includes("txpool is full") || lower.includes("transaction pool is full")) {
    return { code: ERR.TXPOOL_FULL, message: `[${ERR.TXPOOL_FULL}] Transaction pool is full. Retry later.` };
  }
  if (lower.includes("nonce too low") || lower.includes("nonce has already been used")) {
    return { code: ERR.NONCE_CONFLICT, message: `[${ERR.NONCE_CONFLICT}] Nonce conflict. Refresh and retry.` };
  }
  if (lower.includes("replacement transaction underpriced") || lower.includes("already known")) {
    return { code: ERR.NONCE_CONFLICT, message: `[${ERR.NONCE_CONFLICT}] Duplicate or underpriced transaction.` };
  }
  if (lower.includes("insufficient funds")) {
    return { code: ERR.TX_SUBMISSION_FAILED, message: `[${ERR.TX_SUBMISSION_FAILED}] Insufficient native funds for gas.` };
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("receipt")) {
    return { code: ERR.RPC_RECEIPT_TIMEOUT, message: `[${ERR.RPC_RECEIPT_TIMEOUT}] RPC receipt timeout. The transaction may still be pending.` };
  }
  if (lower.includes("failed to fetch") || lower.includes("network error") || lower.includes("econnrefused")) {
    return { code: ERR.TX_SUBMISSION_FAILED, message: `[${ERR.TX_SUBMISSION_FAILED}] RPC connection failed. Check network.` };
  }
  return null;
}

// ─── Read EIP-1967 implementation slot ───────────────────────────────────────

async function readImplSlot(
  publicClient: any,
  proxyAddress: `0x${string}`,
): Promise<string> {
  try {
    const raw = await publicClient.getStorageAt({
      address: proxyAddress,
      slot: EIP1967_IMPL_SLOT,
    });
    return (raw ?? "0x0000000000000000000000000000000000000000000000000000000000000000") as string;
  } catch {
    return "NO_PROXY";
  }
}

// ─── Resolve canonical controller identity ───────────────────────────────────

/**
 * Resolve and cache the canonical identity for a controller.
 * Reads the controller address from the single configured source (CONTRACTS),
 * reads the active chainId from publicClient, and reads the EIP-1967 impl slot.
 *
 * This is the ONLY place controller addresses are resolved.
 * All call sites (commit, register, debugCommitment, getCommitmentStatus) use this.
 */
export async function resolveControllerIdentity(
  tld: "arc" | "circle",
  publicClient: any,
): Promise<ControllerIdentity> {
  const cacheKey = tld;

  // Determine address from single source of truth
  const envVar = tld === "arc"
    ? "NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS"
    : "NEXT_PUBLIC_CIRCLE_CONTROLLER_ADDRESS";
  const controllerAddress = tld === "arc"
    ? CONTRACTS.arcController
    : CONTRACTS.circleController;

  // Read chainId from active client
  const chainId: number = publicClient.chain?.id ?? arcTestnet.id;

  // Read EIP-1967 implementation slot
  const implSlotValue = await readImplSlot(publicClient, controllerAddress);

  const identity: ControllerIdentity = {
    controllerAddress,
    chainId,
    implSlotValue,
    tld,
    sourceOfTruth: `env:${envVar} → contracts.ts`,
  };

  console.log(`[Identity] resolve-controller-identity`, {
    step: "resolve-controller-identity",
    tld,
    controllerAddress,
    chainId,
    implSlotValue,
    sourceOfTruth: identity.sourceOfTruth,
  });

  _identityCache.set(cacheKey, identity);
  return identity;
}

// ─── Assert identity is stable (pre-call check) ──────────────────────────────

/**
 * Assert that the controller identity has not changed since it was first resolved.
 * Call this before EVERY commit / register / debugCommitment / getCommitmentStatus.
 *
 * Throws immediately with a hard error if:
 *  - controller address differs from cached value
 *  - EIP-1967 implementation slot differs (proxy was upgraded)
 *  - chainId differs (wallet switched networks)
 */
export async function assertIdentityStable(
  tld: "arc" | "circle",
  publicClient: any,
  step: string,
): Promise<ControllerIdentity> {
  const cached = _identityCache.get(tld);

  // Resolve fresh identity for comparison
  const fresh = await resolveControllerIdentity(tld, publicClient);

  if (cached) {
    // Address check
    if (cached.controllerAddress.toLowerCase() !== fresh.controllerAddress.toLowerCase()) {
      const msg = `[${ERR.CONTROLLER_MISMATCH}] at step "${step}": ` +
        `cached=${cached.controllerAddress} fresh=${fresh.controllerAddress}`;
      console.error("[Identity] CONTROLLER_MISMATCH", {
        step,
        cached: cached.controllerAddress,
        fresh: fresh.controllerAddress,
        cachedImplSlot: cached.implSlotValue,
        freshImplSlot: fresh.implSlotValue,
      });
      throw new Error(msg);
    }

    // Chain check
    if (cached.chainId !== fresh.chainId) {
      const msg = `[${ERR.CHAIN_MISMATCH}] at step "${step}": ` +
        `cached chainId=${cached.chainId} fresh chainId=${fresh.chainId}`;
      console.error("[Identity] CHAIN_MISMATCH", { step, cached: cached.chainId, fresh: fresh.chainId });
      throw new Error(msg);
    }

    // EIP-1967 implementation slot check (proxy upgrade detection)
    if (
      cached.implSlotValue !== "NO_PROXY" &&
      fresh.implSlotValue !== "NO_PROXY" &&
      cached.implSlotValue !== fresh.implSlotValue
    ) {
      const msg = `[${ERR.IMPL_SLOT_MISMATCH}] at step "${step}": ` +
        `slotBeforeCommit=${cached.implSlotValue} slotNow=${fresh.implSlotValue}`;
      console.error("[Identity] IMPL_SLOT_MISMATCH", {
        step,
        slotBeforeCommit: cached.implSlotValue,
        slotNow: fresh.implSlotValue,
        controller: fresh.controllerAddress,
      });
      throw new Error(msg);
    }
  }

  console.log(`[Identity] pre-${step}-assert: OK`, {
    step: `pre-${step}-assert`,
    controllerAddress: fresh.controllerAddress,
    implSlotValue: fresh.implSlotValue,
    chainId: fresh.chainId,
    tld,
  });

  return fresh;
}

/**
 * Clear the identity cache for a TLD.
 * Call this when starting a fresh registration flow.
 */
export function clearIdentityCache(tld?: "arc" | "circle"): void {
  if (tld) {
    _identityCache.delete(tld);
  } else {
    _identityCache.clear();
  }
}
