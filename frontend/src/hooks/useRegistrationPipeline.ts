"use client";
/**
 * useRegistrationPipeline — THE single registration orchestrator for ArcNS.
 *
 * CLIENT TOPOLOGY (critical):
 *   CURRENT: tx visibility, receipt waits, critical post-commit reads, and
 *   simulate(register) use the active connector provider extended with viem
 *   public actions. Detached fallback reads are limited to optional/pre-commit
 *   diagnostics below.
 *   WRITE: writeContractAsync (wagmi) via wallet injected provider
 *   READ (receipt polling): senderAuthorityClient, no detached fallback
 *   READ (optional/pre-commit): ctx.fallbackClient multi-RPC fallback
 *
 * TX LIFECYCLE PROOF:
 *   After writeContractAsync returns a hash, we immediately call getTransaction(hash)
 *   with bounded retries to prove the tx is visible on the network before entering
 *   the receipt wait. If not visible → TX_NOT_VISIBLE_AFTER_SUBMISSION → stop.
 *
 * ARC-SPECIFIC:
 *   Arc uses USDC as native gas. We validate gas estimation before commit.
 *   If estimation fails → GAS_ESTIMATION_FAILED → stop before submission.
 *
 * STATE MACHINE:
 *   IDLE → COMMITTING → COMMITTED → WAITING → READY → REGISTERING → SUCCESS / FAILED
 */

import { getConnectorClient } from "@wagmi/core";
import { useWriteContract, useAccount, useChainId, useConfig } from "wagmi";
import { useState, useCallback, useRef } from "react";
import {
  encodeFunctionData,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  WaitForTransactionReceiptTimeoutError,
} from "viem";
import { CONTRACTS, CONTROLLER_ABI, ERC20_ABI } from "../lib/contracts";
import { ARC_TESTNET_CHAIN_ID, ARC_TESTNET_RUNTIME_MODE } from "../lib/chains";
import { makeCommitmentHash } from "../lib/namehash";
import { cacheInvalidate } from "../lib/nameCache";
import { bindSenderAuthority, resolveExecutionContext } from "../lib/runtimeClient";

// ─── Error codes ──────────────────────────────────────────────────────────────

export const PIPELINE_ERR = {
  WALLET_CONFIRMATION_TIMEOUT:    "WALLET_CONFIRMATION_TIMEOUT",
  RECEIPT_TIMEOUT:                "RECEIPT_TIMEOUT",
  TX_NOT_VISIBLE_AFTER_SUBMISSION:"TX_NOT_VISIBLE_AFTER_SUBMISSION",
  TX_DROPPED:                     "TX_DROPPED",
  TX_REPLACED:                    "TX_REPLACED",
  MEMPOOL_PROPAGATION_FAILURE:    "MEMPOOL_PROPAGATION_FAILURE",
  MATURITY_WAIT_TIMEOUT:          "MATURITY_WAIT_TIMEOUT",
  SIMULATION_TIMEOUT:             "SIMULATION_TIMEOUT",
  REGISTER_LOCK_STUCK:            "REGISTER_LOCK_STUCK",
  RPC_STALE_READ:                 "RPC_STALE_READ",
  COMMITMENT_HASH_MISMATCH:       "COMMITMENT_HASH_MISMATCH",
  REGISTER_ARGS_MISMATCH:         "REGISTER_ARGS_MISMATCH",
  CHAIN_MISMATCH:                 "CHAIN_MISMATCH",
  ACCOUNT_DRIFT:                  "ACCOUNT_DRIFT",
  STATE_NOT_PERSISTED:            "STATE_NOT_PERSISTED",
  GAS_ESTIMATION_FAILED:          "GAS_ESTIMATION_FAILED",
  TXPOOL_FULL:                    "TXPOOL_FULL",
  NONCE_CONFLICT:                 "NONCE_CONFLICT",
  UNDERPRICED_REPLACEMENT:        "UNDERPRICED_REPLACEMENT",
  TX_SUBMISSION_FAILED:           "TX_SUBMISSION_FAILED",
  RPC_SUBMISSION_FAILED:          "RPC_SUBMISSION_FAILED",
  INSUFFICIENT_FUNDS:             "INSUFFICIENT_FUNDS",
  COMMITMENT_TOO_NEW:             "COMMITMENT_TOO_NEW",
  COMMITMENT_EXPIRED_ONCHAIN:     "COMMITMENT_EXPIRED_ONCHAIN",
  ABI_SIGNATURE_MISMATCH:         "ABI_SIGNATURE_MISMATCH",
  REGISTER_SIMULATION_SEMANTIC_MISMATCH: "REGISTER_SIMULATION_SEMANTIC_MISMATCH",
  COMMITMENT_PROOF_RPC_FAILURE:    "COMMITMENT_PROOF_RPC_FAILURE",
  IMPLEMENTATION_MISMATCH:         "IMPLEMENTATION_MISMATCH",
  COMMITMENT_PROOF_UNAVAILABLE:    "COMMITMENT_PROOF_UNAVAILABLE",
  RPC_RESOURCE_NOT_AVAILABLE:      "RPC_RESOURCE_NOT_AVAILABLE",
  REGISTER_PAYMENT_NOT_READY:      "REGISTER_PAYMENT_NOT_READY",
  REGISTER_REGISTRAR_STATE_MISMATCH: "REGISTER_REGISTRAR_STATE_MISMATCH",
  REGISTER_CONTROLLER_NOT_AUTHORIZED: "REGISTER_CONTROLLER_NOT_AUTHORIZED",
  REGISTER_BASE_REGISTRAR_SEMANTIC_MISMATCH: "REGISTER_BASE_REGISTRAR_SEMANTIC_MISMATCH",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineStep =
  | "idle"
  | "approving"
  | "committing"
  | "tx-hash-returned"
  | "tx-visible-on-network"
  | "committed"
  | "waiting"
  | "ready"
  | "registering"
  | "success"
  | "failed";

export type PipelinePhase =
  | "idle"
  | "validating-environment"
  | "awaiting-wallet-confirmation"
  | "commit-submitting"
  | "commit-submitted"
  | "commit-visible"
  | "commit-confirmed"
  | "commitment-maturing"
  | "pre-register-proof"
  | "register-simulating"
  | "register-submitting"
  | "register-confirmed"
  | "failed";

export interface PipelineResult {
  txHash:  `0x${string}`;
  name:    string;
  expires: bigint;
  cost:    bigint;
}

type CommitmentStatus = {
  timestamp: bigint;
  exists: boolean;
  matured: boolean;
  expired: boolean;
};

// ─── Global execution lock ────────────────────────────────────────────────────

let GLOBAL_REGISTER_LOCK = false;

// ─── Timeout / retry constants ────────────────────────────────────────────────

const TIMEOUT = {
  WALLET_PROMPT_MS:        120_000,  // 2 min
  TX_VISIBILITY_MS:         20_000,  // 20s — getTransaction retry window
  TX_VISIBILITY_POLL_MS:     2_000,  // 2s between getTransaction polls
  RECEIPT_MS:              180_000,  // 3 min — generous for Arc public RPC
  MATURITY_TOTAL_MS:       180_000,  // 3 min
  SIMULATE_MS:              30_000,  // 30s
  REGISTER_SEND_MS:        120_000,  // 2 min
  REGISTER_RECEIPT_MS:     180_000,  // 3 min
  RPC_READ_MS:              15_000,  // 15s per individual read
  GAS_ESTIMATE_MS:          10_000,  // 10s
} as const;

const COMMIT_CONFIRMATIONS = 1; // Arc has sub-second deterministic finality

// ─── Helpers ──────────────────────────────────────────────────────────────────

function withSlippage(a: bigint): bigint { return a + (a * 500n) / 10_000n; }

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as `0x${string}`;

function normalizeResolverArgs(
  resolverAddr: `0x${string}` | undefined,
  data: `0x${string}`[],
  reverseRecord: boolean,
): {
  resolver: `0x${string}`;
  resolverMode: "zero-resolver" | "explicit-resolver";
  data: `0x${string}`[];
} {
  if (data.length === 0 && reverseRecord === false) {
    return {
      resolver: ZERO_ADDRESS,
      resolverMode: "zero-resolver",
      data,
    };
  }

  return {
    resolver: resolverAddr ?? ZERO_ADDRESS,
    resolverMode: "explicit-resolver",
    data,
  };
}

function randomSecret(): `0x${string}` {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return `0x${Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("")}`;
}

function withTimeout<T>(p: Promise<T>, ms: number, code: string, ctx: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`[${code}] Timeout after ${ms}ms: ${ctx}`)), ms);
    p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); });
  });
}

type SubmissionFailure = {
  code:
    | typeof PIPELINE_ERR.TXPOOL_FULL
    | typeof PIPELINE_ERR.NONCE_CONFLICT
    | typeof PIPELINE_ERR.UNDERPRICED_REPLACEMENT
    | typeof PIPELINE_ERR.INSUFFICIENT_FUNDS
    | typeof PIPELINE_ERR.GAS_ESTIMATION_FAILED
    | typeof PIPELINE_ERR.RPC_SUBMISSION_FAILED;
  message: string;
  retryable: boolean;
  nextActionCategory: "retry" | "refresh-wallet" | "fund-gas" | "check-rpc-health";
};

type DiagnosticSummary = {
  layer: "provider" | "transport" | "wallet" | "contract" | "semantic";
  code: string;
  step: string;
  retryable: boolean;
  chainId: number;
  controllerAddress: `0x${string}`;
  txType: "commit" | "register" | "none";
  txHash: `0x${string}` | null;
};

const SUBMISSION_RETRY_DELAYS_MS = [1_250, 2_500] as const;

function classifySubmissionFailure(e: unknown): SubmissionFailure | null {
  const m = ((e as any)?.message ?? (e as any)?.shortMessage ?? String(e)).toLowerCase();

  if (m.includes("txpool is full") || m.includes("transaction pool is full"))
    return {
      code: PIPELINE_ERR.TXPOOL_FULL,
      message: `[${PIPELINE_ERR.TXPOOL_FULL}] Transaction pool is full. Retry later.`,
      retryable: true,
      nextActionCategory: "retry",
    };
  if (m.includes("replacement transaction underpriced"))
    return {
      code: PIPELINE_ERR.UNDERPRICED_REPLACEMENT,
      message: `[${PIPELINE_ERR.UNDERPRICED_REPLACEMENT}] Replacement transaction is underpriced. Retry with a fresh wallet submission.`,
      retryable: true,
      nextActionCategory: "refresh-wallet",
    };
  if (m.includes("nonce too low") || m.includes("already known"))
    return {
      code: PIPELINE_ERR.NONCE_CONFLICT,
      message: `[${PIPELINE_ERR.NONCE_CONFLICT}] Nonce conflict. Refresh and retry.`,
      retryable: true,
      nextActionCategory: "refresh-wallet",
    };
  if (m.includes("insufficient funds"))
    return {
      code: PIPELINE_ERR.INSUFFICIENT_FUNDS,
      message: `[${PIPELINE_ERR.INSUFFICIENT_FUNDS}] Insufficient USDC balance for gas.`,
      retryable: false,
      nextActionCategory: "fund-gas",
    };
  if (
    m.includes("estimate gas") ||
    m.includes("gas required exceeds allowance") ||
    m.includes("intrinsic gas too low")
  )
    return {
      code: PIPELINE_ERR.GAS_ESTIMATION_FAILED,
      message: `[${PIPELINE_ERR.GAS_ESTIMATION_FAILED}] Transaction could not be submitted because gas estimation failed.`,
      retryable: false,
      nextActionCategory: "check-rpc-health",
    };
  if (
    m.includes("failed to fetch") ||
    m.includes("econnrefused") ||
    m.includes("network error") ||
    m.includes("rpc") ||
    m.includes("internal json-rpc error")
  )
    return {
      code: PIPELINE_ERR.RPC_SUBMISSION_FAILED,
      message: `[${PIPELINE_ERR.RPC_SUBMISSION_FAILED}] RPC submission failed. Check provider health and retry.`,
      retryable: true,
      nextActionCategory: "check-rpc-health",
    };
  if (m.includes("requested resource not available"))
    return {
      code: PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE,
      message: `[${PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE}] Arc provider could not serve the requested resource. Retry or switch RPC/provider.`,
      retryable: true,
      nextActionCategory: "check-rpc-health",
    };
  return null;
}

function classifyTransport(e: unknown): string | null {
  return classifySubmissionFailure(e)?.message ?? null;
}

function isExecutionRevertedError(e: unknown): boolean {
  const message = ((e as any)?.message ?? (e as any)?.shortMessage ?? String(e)).toLowerCase();
  return message.includes("execution reverted") || message.includes("reverted");
}

function logSubmissionFailure(
  step: string,
  txType: "commit" | "register",
  chainId: number,
  account: `0x${string}`,
  controllerAddress: `0x${string}`,
  e: unknown,
): SubmissionFailure | null {
  const classified = classifySubmissionFailure(e);
  log("submission-failure", {
    step,
    txType,
    chainId,
    account,
    controllerAddress,
    classification: classified?.code ?? null,
    classificationMessage: classified?.message ?? null,
    retryable: classified?.retryable ?? null,
    nextActionCategory: classified?.nextActionCategory ?? null,
    ...errorDiagnostics(e),
  });
  return classified;
}

function extractErrorCode(message: string): string {
  const match = message.match(/\[([A-Z_]+)\]/);
  return match?.[1] ?? "UNKNOWN";
}

function failureLayerForCode(code: string): DiagnosticSummary["layer"] {
  switch (code) {
    case PIPELINE_ERR.TXPOOL_FULL:
    case PIPELINE_ERR.NONCE_CONFLICT:
    case PIPELINE_ERR.UNDERPRICED_REPLACEMENT:
    case PIPELINE_ERR.GAS_ESTIMATION_FAILED:
    case PIPELINE_ERR.MEMPOOL_PROPAGATION_FAILURE:
    case PIPELINE_ERR.RECEIPT_TIMEOUT:
    case PIPELINE_ERR.TX_NOT_VISIBLE_AFTER_SUBMISSION:
      return "provider";
    case PIPELINE_ERR.RPC_SUBMISSION_FAILED:
      return "transport";
    case PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE:
      return "transport";
    case PIPELINE_ERR.INSUFFICIENT_FUNDS:
    case PIPELINE_ERR.WALLET_CONFIRMATION_TIMEOUT:
    case PIPELINE_ERR.CHAIN_MISMATCH:
    case PIPELINE_ERR.ACCOUNT_DRIFT:
      return "wallet";
    case PIPELINE_ERR.ABI_SIGNATURE_MISMATCH:
    case PIPELINE_ERR.STATE_NOT_PERSISTED:
    case PIPELINE_ERR.COMMITMENT_HASH_MISMATCH:
    case PIPELINE_ERR.COMMITMENT_TOO_NEW:
    case PIPELINE_ERR.COMMITMENT_EXPIRED_ONCHAIN:
    case PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH:
      return "semantic";
    default:
      return "contract";
  }
}

function retryableForCode(code: string): boolean {
  return [
    PIPELINE_ERR.TXPOOL_FULL,
    PIPELINE_ERR.MEMPOOL_PROPAGATION_FAILURE,
    PIPELINE_ERR.RPC_SUBMISSION_FAILED,
    PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE,
    PIPELINE_ERR.NONCE_CONFLICT,
    PIPELINE_ERR.UNDERPRICED_REPLACEMENT,
  ].includes(code as any);
}

function buildDiagnosticSummary(
  message: string,
  step: string,
  chainId: number,
  controllerAddress: `0x${string}`,
  txType: DiagnosticSummary["txType"],
  txHash: `0x${string}` | null,
): DiagnosticSummary {
  const code = extractErrorCode(message);
  return {
    layer: failureLayerForCode(code),
    code,
    step,
    retryable: retryableForCode(code),
    chainId,
    controllerAddress,
    txType,
    txHash,
  };
}

function shouldRetrySubmissionFailure(code: string, attemptIndex: number): boolean {
  return (
    (
      code === PIPELINE_ERR.TXPOOL_FULL ||
      code === PIPELINE_ERR.MEMPOOL_PROPAGATION_FAILURE ||
      code === PIPELINE_ERR.RPC_SUBMISSION_FAILED ||
      code === PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE
    ) &&
    attemptIndex < SUBMISSION_RETRY_DELAYS_MS.length
  );
}

function classifySenderAuthorityResolution(e: unknown): string {
  const name = (e as any)?.name ?? "";
  const message = (e as any)?.shortMessage ?? (e as any)?.message ?? String(e);
  const transport = classifyTransport(e);

  if (name === "ConnectorChainMismatchError")
    return `[${PIPELINE_ERR.CHAIN_MISMATCH}] Wallet connector chain mismatch while resolving sender authority. ${message}`;
  if (name === "ConnectorNotConnectedError")
    return `[${PIPELINE_ERR.TX_SUBMISSION_FAILED}] Wallet connector is not connected.`;
  if (transport) return transport;

  return `[${PIPELINE_ERR.TX_SUBMISSION_FAILED}] Unable to resolve sender authority. ${message}`;
}

function classifyReceiptWaitFailure(
  e: unknown,
  txHash: `0x${string}`,
  chainId: number,
  authoritySource: string,
  phase: "commit" | "register" = "commit",
): Error {
  const message = (e as any)?.message ?? (e as any)?.shortMessage ?? String(e);
  const txLabel = phase === "register" ? "register tx" : "tx";

  if (message.includes(PIPELINE_ERR.RECEIPT_TIMEOUT)) {
    return new Error(message);
  }

  if (e instanceof WaitForTransactionReceiptTimeoutError || (e as any)?.name === "WaitForTransactionReceiptTimeoutError") {
    return new Error(
      `[${PIPELINE_ERR.RECEIPT_TIMEOUT}] Receipt not received for ${txLabel}: ${txHash} chain=${chainId} authority=${authoritySource}`
    );
  }

  if (e instanceof TransactionReceiptNotFoundError || (e as any)?.name === "TransactionReceiptNotFoundError") {
    return new Error(
      `[${PIPELINE_ERR.RECEIPT_TIMEOUT}] Receipt not yet available from sender authority for ${txLabel}: ` +
      `${txHash} chain=${chainId} authority=${authoritySource}`
    );
  }

  if (e instanceof TransactionNotFoundError || (e as any)?.name === "TransactionNotFoundError") {
    return new Error(
      `[${PIPELINE_ERR.TX_DROPPED}] Sender authority no longer sees ${txLabel} ${txHash} during receipt wait. ` +
      `chain=${chainId} authority=${authoritySource}`
    );
  }

  const transport = classifyTransport(e);
  if (transport) return new Error(transport);

  // Arc-specific: "Requested resource not available" from provider
  const rawMsg = (e as any)?.message ?? (e as any)?.shortMessage ?? String(e);
  if (rawMsg.toLowerCase().includes("requested resource not available")) {
    return new Error(
      `[${PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE}] Arc provider could not serve the requested resource during receipt wait. ` +
      `txHash=${txHash} chain=${chainId} authority=${authoritySource}`
    );
  }

  return new Error(
    `[${PIPELINE_ERR.RPC_STALE_READ}] Receipt wait failed for ${txLabel} ${txHash} on chain=${chainId}. ` +
    `authority=${authoritySource}. cause=${message}`
  );
}

function errorDiagnostics(e: unknown): Record<string, unknown> {
  return {
    name: (e as any)?.name ?? null,
    shortMessage: (e as any)?.shortMessage ?? null,
    message: (e as any)?.message ?? String(e),
    details: (e as any)?.details ?? null,
    causeName: (e as any)?.cause?.name ?? null,
    causeMessage: (e as any)?.cause?.message ?? null,
  };
}

type ControllerAbiFunction = {
  type: "function";
  name: string;
  inputs: Array<{ name?: string; type: string }>;
};

function isControllerAbiFunction(entry: any, name: string): entry is ControllerAbiFunction {
  return entry?.type === "function" && entry?.name === name && Array.isArray(entry?.inputs);
}

function functionSignature(entry: ControllerAbiFunction): string {
  return `${entry.name}(${entry.inputs.map(input => input.type).join(",")})`;
}

function resolveControllerSemanticProof(): {
  registerAbi: ControllerAbiFunction;
  registerSignature: string;
  registerArgCount: number;
  registerHasMaxCost: boolean;
  commitmentBuilderAbi: ControllerAbiFunction;
  commitmentBuilderSignature: string;
} {
  const registerEntries = CONTROLLER_ABI.filter((entry: any) => isControllerAbiFunction(entry, "register"));
  const commitmentBuilderEntries = CONTROLLER_ABI.filter((entry: any) => isControllerAbiFunction(entry, "makeCommitmentWithSender"));

  if (registerEntries.length !== 1) {
    throw new Error(
      `[${PIPELINE_ERR.ABI_SIGNATURE_MISMATCH}] Expected exactly 1 register overload in controller ABI, found ${registerEntries.length}.`
    );
  }
  if (commitmentBuilderEntries.length !== 1) {
    throw new Error(
      `[${PIPELINE_ERR.ABI_SIGNATURE_MISMATCH}] Expected exactly 1 makeCommitmentWithSender overload in controller ABI, found ${commitmentBuilderEntries.length}.`
    );
  }

  const registerAbi = registerEntries[0];
  const commitmentBuilderAbi = commitmentBuilderEntries[0];
  const registerSignature = functionSignature(registerAbi);
  const commitmentBuilderSignature = functionSignature(commitmentBuilderAbi);
  const registerArgCount = registerAbi.inputs.length;
  const registerHasMaxCost =
    registerAbi.inputs.length === 8 &&
    registerAbi.inputs[7]?.type === "uint256" &&
    registerAbi.inputs[7]?.name === "maxCost";

  if (registerSignature !== "register(string,address,uint256,bytes32,address,bytes[],bool,uint256)") {
    throw new Error(
      `[${PIPELINE_ERR.ABI_SIGNATURE_MISMATCH}] Unexpected register signature ${registerSignature}.`
    );
  }
  if (commitmentBuilderSignature !== "makeCommitmentWithSender(string,address,uint256,bytes32,address,bytes[],bool,address)") {
    throw new Error(
      `[${PIPELINE_ERR.ABI_SIGNATURE_MISMATCH}] Unexpected commitment builder signature ${commitmentBuilderSignature}.`
    );
  }
  if (!registerHasMaxCost) {
    throw new Error(
      `[${PIPELINE_ERR.ABI_SIGNATURE_MISMATCH}] register ABI does not end with maxCost:uint256 as required by the deployed controller version.`
    );
  }

  return {
    registerAbi,
    registerSignature,
    registerArgCount,
    registerHasMaxCost,
    commitmentBuilderAbi,
    commitmentBuilderSignature,
  };
}

function log(step: string, f: Record<string, unknown>): void {
  console.log(`[Pipeline:${step}]`, { step, lock: GLOBAL_REGISTER_LOCK, ts: Date.now(), ...f });
}

/**
 * Resolve a concise, demo-friendly user-facing error message.
 * Strips internal error codes and provides actionable next steps.
 */
function resolveUserFacingMessage(rawMessage: string, summary: DiagnosticSummary): string {
  if (rawMessage.includes("user rejected") || rawMessage.includes("Transaction cancelled")) {
    return "Transaction cancelled";
  }

  switch (summary.code) {
    case PIPELINE_ERR.TXPOOL_FULL:
      return "Arc Testnet is busy — transaction pool is full. Wait 10–30 seconds and try again.";
    case PIPELINE_ERR.RECEIPT_TIMEOUT:
      return "Transaction submitted but confirmation is taking longer than expected. Check ArcScan for your tx, then retry if needed.";
    case PIPELINE_ERR.TX_NOT_VISIBLE_AFTER_SUBMISSION:
      return "Transaction was not accepted by the network. This may be a temporary provider issue — please retry.";
    case PIPELINE_ERR.TX_DROPPED:
      return "Transaction was dropped from the mempool. Please retry — this is a temporary network condition.";
    case PIPELINE_ERR.NONCE_CONFLICT:
    case PIPELINE_ERR.UNDERPRICED_REPLACEMENT:
      return "Wallet nonce conflict detected. Refresh the page and try again.";
    case PIPELINE_ERR.INSUFFICIENT_FUNDS:
      return "Insufficient USDC balance for gas. Please fund your wallet on Arc Testnet.";
    case PIPELINE_ERR.RPC_SUBMISSION_FAILED:
    case PIPELINE_ERR.RPC_RESOURCE_NOT_AVAILABLE:
    case PIPELINE_ERR.MEMPOOL_PROPAGATION_FAILURE:
      return "Arc Testnet RPC is temporarily unavailable. Try switching to a different provider or retry in a moment.";
    case PIPELINE_ERR.CHAIN_MISMATCH:
      return "Wrong network — please switch your wallet to Arc Testnet (Chain ID 5042002).";
    case PIPELINE_ERR.WALLET_CONFIRMATION_TIMEOUT:
      return "Wallet confirmation timed out. Please check your wallet and retry.";
    case PIPELINE_ERR.STATE_NOT_PERSISTED:
      return "Commitment was not stored on-chain. This may be a temporary RPC issue — please retry.";
    case PIPELINE_ERR.MATURITY_WAIT_TIMEOUT:
      return "Commitment maturity check timed out. The commitment may still be valid — check ArcScan and retry.";
    case PIPELINE_ERR.SIMULATION_TIMEOUT:
      return "Register simulation timed out. Arc RPC may be slow — please retry.";
    case PIPELINE_ERR.COMMITMENT_HASH_MISMATCH:
    case PIPELINE_ERR.REGISTER_ARGS_MISMATCH:
      return "Internal commitment mismatch detected. Please refresh and start a new registration.";
    case PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH: {
      // Surface the specific category if present in the message
      const raw = rawMessage.toLowerCase();
      if (raw.includes("resolver-not-approved") || raw.includes("resolver not approved"))
        return "The resolver address is not approved on this controller. Please contact support or try with reverse record disabled.";
      if (raw.includes("price-exceeds-maxcost") || raw.includes("price exceeds maxcost"))
        return "The registration price changed. Please refresh the page to get the current price and try again.";
      return "Registration pre-check failed. Please refresh and retry.";
    }
    case PIPELINE_ERR.COMMITMENT_TOO_NEW:
      return "Commitment is not yet mature. Please wait a moment and retry.";
    case PIPELINE_ERR.COMMITMENT_EXPIRED_ONCHAIN:
      return "Commitment expired (>24h). Please start a new registration.";
    case "REGISTER_PAYMENT_NOT_READY":
      return "Insufficient USDC balance or allowance for registration. Please approve USDC and retry.";
    case "REGISTER_REGISTRAR_STATE_MISMATCH":
      return "This name is no longer available. Please search again.";
    case "REGISTER_CONTROLLER_NOT_AUTHORIZED":
      return "The registration controller is not authorized on the registrar. Please contact support.";
    case "REGISTER_BASE_REGISTRAR_SEMANTIC_MISMATCH":
      return "Registration failed at the base registrar level. All pre-checks passed — this may be a transient chain state issue. Please retry.";
    default:
      // For contract-layer errors, show a cleaned version of the message
      if (summary.layer === "contract" || summary.layer === "semantic") {
        const cleaned = rawMessage
          .replace(/\[[A-Z_]+\]\s*/g, "")
          .replace(/^Register simulation failed:\s*/i, "")
          .trim();
        return cleaned || "Registration failed. Please retry.";
      }
      return "Registration failed due to a network issue. Please retry.";
  }
}

function logCriticalReadClient(
  stepName: string,
  clientType: "sender-authority" | "fallback" | "primary-deterministic",
  source: string,
  chainId: number,
  extra: Record<string, unknown> = {},
): void {
  log("critical-read-client", {
    stepName,
    clientType,
    source,
    chainId,
    ...extra,
  });
}

/**
 * Post-submission visibility proof.
 * Polls getTransaction(hash) on the sender-bound authority client until the tx
 * is visible or the retry window expires. This proves the tx is visible from
 * the same runtime authority that submitted it before we enter receipt wait.
 *
 * If the tx is not visible after TX_VISIBILITY_MS → TX_NOT_VISIBLE_AFTER_SUBMISSION.
 * This catches: dropped txs, nonce conflicts, fee issues, wrong-chain submissions.
 */
async function proveTransactionVisible(
  authorityClient: any,
  txHash: `0x${string}`,
  walletChainId: number,
  readChainId: number,
  account: `0x${string}`,
  controller: `0x${string}`,
  authoritySource: string,
): Promise<void> {
  const deadline = Date.now() + TIMEOUT.TX_VISIBILITY_MS;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    try {
      const tx: any = await withTimeout(
        authorityClient.getTransaction({ hash: txHash }),
        TIMEOUT.TX_VISIBILITY_POLL_MS + 1_000,
        PIPELINE_ERR.RPC_STALE_READ,
        `getTransaction attempt ${attempt}`,
      );

      if (tx !== null && tx !== undefined) {
        log("tx-visible-on-network", {
          txHash, walletChainId, readChainId, account, controller,
          authoritySource, attempt,
          blockNumber: tx.blockNumber?.toString() ?? "pending",
          nonce: tx.nonce,
          from: tx.from,
          to: tx.to,
        });
        return; // tx is visible — proceed to receipt wait
      }
    } catch (e: any) {
      // getTransaction returning null/not-found is expected on first poll
      log("tx-visibility-poll", {
        txHash, attempt, elapsed: Date.now() - (deadline - TIMEOUT.TX_VISIBILITY_MS),
        error: e.message, authoritySource,
      });
    }

    await new Promise(r => setTimeout(r, TIMEOUT.TX_VISIBILITY_POLL_MS));
  }

  // Tx not visible after full retry window — classify and stop
  log("tx-not-visible", {
    txHash, walletChainId, readChainId, account, controller,
    authoritySource, attemptsTotal: attempt,
    diagnosis: "tx may be dropped, nonce-conflicted, or submitted to wrong provider",
  });

  throw new Error(
    `[${PIPELINE_ERR.TX_NOT_VISIBLE_AFTER_SUBMISSION}] ` +
    `Tx ${txHash} not visible on chain ${readChainId} after ${TIMEOUT.TX_VISIBILITY_MS}ms. ` +
    `Possible: tx dropped, nonce conflict, fee rejection, or provider propagation failure. ` +
    `authority=${authoritySource}`
  );
}

/**
 * Post-receipt-timeout forensics.
 * Called when waitForTransactionReceipt times out.
 * Gathers diagnostic data to classify the failure.
 */
async function receiptTimeoutForensics(
  authorityClient: any,
  txHash: `0x${string}`,
  account: `0x${string}`,
  walletChainId: number,
  authoritySource: string,
): Promise<void> {
  log("receipt-wait-timeout-forensics-start", { txHash, walletChainId, authoritySource });

  const [txResult, receiptResult, blockResult, nonceResult] = await Promise.allSettled([
    authorityClient.getTransaction({ hash: txHash }),
    authorityClient.getTransactionReceipt({ hash: txHash }),
    authorityClient.getBlockNumber(),
    authorityClient.getTransactionCount({ address: account, blockTag: "latest" }),
  ]);

  const tx      = txResult.status      === "fulfilled" ? txResult.value      : null;
  const receipt = receiptResult.status === "fulfilled" ? receiptResult.value  : null;
  const block   = blockResult.status   === "fulfilled" ? blockResult.value    : null;
  const nonce   = nonceResult.status   === "fulfilled" ? nonceResult.value    : null;

  let diagnosis = "unknown";
  if (receipt)                                    diagnosis = "receipt-exists-but-polling-missed-it";
  else if (tx && tx.blockNumber)                  diagnosis = "tx-mined-but-receipt-not-returned";
  else if (tx && !tx.blockNumber)                 diagnosis = "tx-pending-in-mempool";
  else if (!tx)                                   diagnosis = "tx-not-found-may-be-dropped";

  log("receipt-wait-timeout-forensics", {
    txHash, walletChainId, authoritySource,
    txFound:      tx !== null,
    txBlockNumber: tx?.blockNumber?.toString() ?? null,
    txNonce:      tx?.nonce ?? null,
    receiptFound: receipt !== null,
    receiptStatus: receipt?.status ?? null,
    latestBlock:  block?.toString() ?? null,
    accountNonce: nonce?.toString() ?? null,
    diagnosis,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRegistrationPipeline() {
  const config = useConfig();
  const { address } = useAccount();
  const walletChainId = useChainId();
  const { writeContractAsync } = useWriteContract();

  const [step, setStep]             = useState<PipelineStep>("idle");
  const [phase, setPhase]           = useState<PipelinePhase>("idle");
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<PipelineResult | null>(null);
  const [waitProgress, setProgress] = useState(0);
  const addrRef  = useRef<`0x${string}` | null>(null);
  const chainRef = useRef<number | null>(null);

  // ── Approve USDC ────────────────────────────────────────────────────────────
  const approveUsdc = useCallback(async (spender: `0x${string}`, amount: bigint): Promise<boolean> => {
    if (GLOBAL_REGISTER_LOCK) return false;
    setError(null);
    try {
      setStep("approving");
      await withTimeout(
        writeContractAsync({ address: CONTRACTS.usdc, abi: ERC20_ABI, functionName: "approve", args: [spender, amount] }),
        TIMEOUT.WALLET_PROMPT_MS, PIPELINE_ERR.WALLET_CONFIRMATION_TIMEOUT, "USDC approve",
      );
      await new Promise(r => setTimeout(r, 2000));
      return true;
    } catch (e: any) {
      const t = classifyTransport(e);
      const m = t ?? (e.shortMessage || e.message || "Approval failed");
      setError(m.includes("user rejected") ? "Transaction cancelled" : m);
      setStep("failed");
      return false;
    }
  }, [writeContractAsync]);

  const submitWithRetry = useCallback(async (
    txType: "commit" | "register",
    controller: `0x${string}`,
    submit: () => Promise<`0x${string}`>,
  ): Promise<`0x${string}`> => {
    for (let attempt = 0; attempt <= SUBMISSION_RETRY_DELAYS_MS.length; attempt++) {
      log("submission-attempt", {
        txType,
        attempt: attempt + 1,
        chainId: walletChainId,
        account: address,
        controller,
      });

      try {
        return await submit();
      } catch (e: any) {
        if (e.message?.includes("user rejected") || e.message?.includes("User rejected")) {
          throw new Error("Transaction cancelled");
        }

        const submissionFailure = logSubmissionFailure(
          `${txType}-submission`,
          txType,
          walletChainId,
          address!,
          controller,
          e,
        );

        if (!submissionFailure) throw e;

        const summary = buildDiagnosticSummary(
          submissionFailure.message,
          `${txType}-submission`,
          walletChainId,
          controller,
          txType,
          null,
        );
        log("diagnostic-summary", summary);

        if (shouldRetrySubmissionFailure(submissionFailure.code, attempt)) {
          const delayMs = SUBMISSION_RETRY_DELAYS_MS[attempt];
          log("submission-retry", {
            txType,
            attempt: attempt + 1,
            nextAttempt: attempt + 2,
            failureClass: submissionFailure.code,
            delayMs,
            chainId: walletChainId,
            controller,
          });
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        setProgress(0);
        setResult(null);
        setStep("failed");
        setPhase("failed");
        throw new Error(submissionFailure.message);
      }
    }

    throw new Error(`[${PIPELINE_ERR.RPC_SUBMISSION_FAILED}] Submission retry policy exhausted.`);
  }, [address, walletChainId]);

  // ── Register pipeline ────────────────────────────────────────────────────────
  const register = useCallback(async (
    label: string, tld: "arc" | "circle", duration: bigint,
    resolverAddr: `0x${string}`, setReverse: boolean, totalCost: bigint,
  ) => {
    if (!address) return;
    if (walletChainId !== ARC_TESTNET_CHAIN_ID) {
      setError(
        `[${PIPELINE_ERR.CHAIN_MISMATCH}] Arc Testnet only. activeChainId=${walletChainId} expected=${ARC_TESTNET_CHAIN_ID}`
      );
      setStep("failed");
      setPhase("failed");
      return;
    }
    if (GLOBAL_REGISTER_LOCK) {
      setError(`[${PIPELINE_ERR.REGISTER_LOCK_STUCK}] Registration already in progress.`);
      return;
    }
    GLOBAL_REGISTER_LOCK = true;
    addrRef.current  = address;
    chainRef.current = walletChainId;
    setError(null); setResult(null); setProgress(0);
    setPhase("validating-environment");

    const resolverData: `0x${string}`[] = [];
    const {
      resolver,
      resolverMode,
      data: normalizedResolverData,
    } = normalizeResolverArgs(resolverAddr, resolverData, setReverse);
    const maxCost  = withSlippage(totalCost);
    const secret   = randomSecret();

    // ── RESOLVE EXECUTION CONTEXT ──────────────────────────────────────────
    // senderAuthorityClient = active connector provider extended with public actions.
    // fallbackClient = detached multi-RPC fallback for optional/pre-commit reads.
    let ctx: ReturnType<typeof resolveExecutionContext>;
    try {
      ctx = resolveExecutionContext(walletChainId, address, tld);
    } catch (e: any) {
      GLOBAL_REGISTER_LOCK = false;
      addrRef.current = null;
      chainRef.current = null;
      setError(e.message); setStep("failed"); setPhase("failed"); return;
    }
    const {
      runtimeMode,
      chainName,
      primaryReadClient,
      primaryRpcSource,
      fallbackClient,
      controller,
      fallbackRpcSource,
      fallbackRpcSources,
      fallbackActive,
      senderAuthorityHint,
      writeAuthorityType,
      readClientType,
    } = ctx;

    let senderAuthorityClient: any;
    let senderAuthoritySource = senderAuthorityHint;
    let senderAuthorityChainId = ctx.readChainId;
    let senderAuthorityType = writeAuthorityType;
    let senderAuthorityBound = false;
    try {
      const connectorClient = await getConnectorClient(config, {
        account: address,
        chainId: walletChainId,
      });
      const senderAuthority = bindSenderAuthority(connectorClient, ctx.readChainId);
      senderAuthorityClient = senderAuthority.authorityClient;
      senderAuthoritySource = senderAuthority.authoritySource;
      senderAuthorityChainId = senderAuthority.authorityChainId;
      senderAuthorityType = senderAuthority.authorityType;
      senderAuthorityBound = senderAuthority.senderAuthorityBound;
      if (!senderAuthorityBound) {
        throw new Error(
          `[${PIPELINE_ERR.CHAIN_MISMATCH}] Sender authority resolved off Arc Testnet. ` +
          `authorityChainId=${senderAuthorityChainId} expected=${ARC_TESTNET_CHAIN_ID}`
        );
      }
    } catch (e: any) {
      GLOBAL_REGISTER_LOCK = false;
      addrRef.current = null;
      chainRef.current = null;
      setError(classifySenderAuthorityResolution(e));
      setStep("failed");
      setPhase("failed");
      return;
    }

    log("provider-topology", {
      runtimeMode,
      walletChainId,
      chainName,
      readChainId: ctx.readChainId,
      account: address,
      controllerAddress: controller,
      writeAuthorityType: senderAuthorityType,
      readClientType,
      senderAuthorityBound,
      senderAuthoritySource,
      primaryRpcSource,
      fallbackRpcSource,
      fallbackRpcSources,
      fallbackActive,
      isArcTestnetOnly: ctx.isArcTestnetOnly,
    });

    log("resolve-execution-context", {
      runtimeMode,
      walletChainId,
      chainName,
      readChainId: ctx.readChainId,
      senderAuthorityChainId,
      account: address,
      controller,
      senderAuthoritySource,
      primaryRpcSource,
      fallbackRpcSource,
      isArcTestnetOnly: ctx.isArcTestnetOnly,
    });

    const normalizedLabel = label.trim().toLowerCase();
    const commitment   = makeCommitmentHash(label, address, duration, secret, resolver, normalizedResolverData, setReverse, address);
    const registerArgs = [label, address, duration, secret, resolver, normalizedResolverData, setReverse, maxCost] as const;
    const controllerSemanticProof = resolveControllerSemanticProof();
    const selector = encodeFunctionData({
      abi: [controllerSemanticProof.registerAbi] as readonly any[],
      functionName: "register",
      args: registerArgs,
    }).slice(0, 10);
    const registerArgsForLog = [
      label,
      address,
      duration.toString(),
      secret,
      resolver,
      normalizedResolverData,
      setReverse,
      maxCost.toString(),
    ] as const;

    log("ui-click", {
      runtimeMode,
      label, tld, controller, walletChainId, readChainId: ctx.readChainId,
      account: address, commitment, resolver, reverseRecord: setReverse,
      resolverMode,
      dataLength: normalizedResolverData.length,
      normalizedLabel,
      duration: duration.toString(), maxCost: maxCost.toString(), selector,
      registerSignature: controllerSemanticProof.registerSignature,
      registerArgCount: controllerSemanticProof.registerArgCount,
      registerHasMaxCost: controllerSemanticProof.registerHasMaxCost,
      abiSource: ctx.abiSource,
      senderAuthoritySource, senderAuthorityChainId, fallbackRpcSource,
    });

    log("resolver-args-mode", {
      controller,
      account: address,
      resolverMode,
      resolver,
      dataLength: normalizedResolverData.length,
      reverseRecord: setReverse,
      rule: "if data.length===0 && reverseRecord===false, use ZERO_ADDRESS for resolver in commitment and register args",
    });

    let currentTxType: DiagnosticSummary["txType"] = "none";
    let currentTxHash: `0x${string}` | null = null;

    try {
      log("arc-readiness-start", {
      runtimeMode: ARC_TESTNET_RUNTIME_MODE,
      chainId: walletChainId,
      chainName,
      account: address,
      controllerAddress: controller,
      primaryRpcSource,
    });

    // Provider health snapshot — warn-only, never aborts the flow.
    // On Arc Testnet, gas estimation may fail due to USDC-native gas semantics
    // or RPC rate-limiting. We log the result but do not gate on it.
    let nativeBalDeterministic = 0n;
    let gasEstDeterministic = 0n;
    let estimatedGasCostDeterministic = 0n;
    let latestBlockNumber: bigint | null = null;
    let latestBlockAge: number | null = null;

    try {
      const [balResult, feesResult, blockResult] = await Promise.allSettled([
        withTimeout(primaryReadClient.getBalance({ address }), TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_SUBMISSION_FAILED, "getBalance"),
        withTimeout(primaryReadClient.estimateFeesPerGas(), TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_SUBMISSION_FAILED, "estimateFeesPerGas"),
        withTimeout(primaryReadClient.getBlock({ blockTag: "latest" }), TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_SUBMISSION_FAILED, "getBlock(latest)"),
      ]);

      nativeBalDeterministic = balResult.status === "fulfilled" ? balResult.value : 0n;
      const fees = feesResult.status === "fulfilled" ? feesResult.value : null;
      const latestBlock = blockResult.status === "fulfilled" ? blockResult.value : null;

      if (latestBlock) {
        latestBlockNumber = latestBlock.number ?? null;
        const blockAgeSeconds = Number(BigInt(Math.floor(Date.now() / 1000)) - latestBlock.timestamp);
        latestBlockAge = blockAgeSeconds;
      }

      const effectiveGasPrice = fees?.maxFeePerGas ?? (fees as any)?.gasPrice ?? 0n;

      try {
        gasEstDeterministic = await withTimeout(
          primaryReadClient.estimateGas({
            account: address,
            to: controller,
            data: encodeFunctionData({ abi: CONTROLLER_ABI, functionName: "commit", args: [commitment] }),
          }),
          TIMEOUT.GAS_ESTIMATE_MS, PIPELINE_ERR.GAS_ESTIMATION_FAILED, "estimateGas(commit)",
        );
        estimatedGasCostDeterministic = gasEstDeterministic * effectiveGasPrice;
      } catch (gasErr: any) {
        log("arc-readiness-gas-warn", {
          gasError: gasErr.message,
          note: "Arc USDC-native gas — estimation may fail; wallet handles fee negotiation",
        });
      }

      log("arc-readiness", {
        runtimeMode: ARC_TESTNET_RUNTIME_MODE,
        chainId: walletChainId,
        chainName,
        account: address,
        controllerAddress: controller,
        nativeBalance: nativeBalDeterministic.toString(),
        gasEstimate: gasEstDeterministic.toString(),
        maxFeePerGas: fees?.maxFeePerGas?.toString() ?? null,
        gasPrice: (fees as any)?.gasPrice?.toString() ?? null,
        estimatedGasCost: estimatedGasCostDeterministic.toString(),
        latestBlockNumber: latestBlockNumber?.toString() ?? null,
        latestBlockAgeSecs: latestBlockAge,
        blockFreshness: latestBlockAge !== null
          ? latestBlockAge < 5 ? "fresh" : latestBlockAge < 30 ? "acceptable" : "stale"
          : "unknown",
        primaryRpcSource,
        senderAuthoritySource,
      });

      // Hard gate only on zero balance — gas estimation failure is warn-only on Arc
      if (nativeBalDeterministic === 0n) {
        throw new Error(
          `[${PIPELINE_ERR.INSUFFICIENT_FUNDS}] Native USDC gas balance is zero. ` +
          `Please fund your wallet with USDC on Arc Testnet before registering.`
        );
      }
    } catch (readinessErr: any) {
      if (readinessErr.message?.includes(PIPELINE_ERR.INSUFFICIENT_FUNDS)) throw readinessErr;
      // All other readiness failures are warn-only — RPC may be slow but tx can still succeed
      log("arc-readiness-warn", {
        error: readinessErr.message,
        note: "Provider readiness check failed — proceeding anyway. Arc RPC may be rate-limited.",
        primaryRpcSource,
      });
    }

      // ── HASH EQUIVALENCE TRACE (diagnostic-only, non-blocking) ────────────
      // makeCommitmentWithSender is a pure view function but can revert on the
      // live Arc Testnet implementation. It is NOT a hard gate — the local
      // commitment hash is the source of truth for commit(). This call is
      // diagnostic only: if it succeeds and matches, great; if it fails for
      // any reason (revert, RPC error, timeout), log and continue.
      try {
        logCriticalReadClient("makeCommitmentWithSender", "primary-deterministic", primaryRpcSource, ctx.readChainId, {
          commitment,
          phase: "pre-commit-hash-equivalence",
        });
        const onChain = await withTimeout(
          primaryReadClient.readContract({
            address: controller, abi: CONTROLLER_ABI,
            functionName: "makeCommitmentWithSender",
            args: [label, address, duration, secret, resolver, normalizedResolverData, setReverse, address],
          }) as Promise<`0x${string}`>,
          TIMEOUT.RPC_READ_MS, PIPELINE_ERR.COMMITMENT_PROOF_RPC_FAILURE, "makeCommitmentWithSender",
        );
        if (onChain.toLowerCase() !== commitment.toLowerCase()) {
          // Hash mismatch from a successful call IS a hard gate — the args are wrong.
          throw new Error(`[${PIPELINE_ERR.COMMITMENT_HASH_MISMATCH}] local=${commitment} onChain=${onChain}`);
        }
        log("pre-commit", { hashVerified: true, commitment, onChain });
      } catch (he: any) {
        if (he.message?.includes(PIPELINE_ERR.COMMITMENT_HASH_MISMATCH)) throw he;
        // Any other failure (revert, RPC error, timeout) is COMMITMENT_PROOF_UNAVAILABLE.
        // The live implementation can revert makeCommitmentWithSender — this is not fatal.
        // We continue using the local commitment hash.
        log("commitment-proof-unavailable", {
          phase: "pre-commit-hash-equivalence",
          commitment,
          controller,
          readChainId: ctx.readChainId,
          clientSource: primaryRpcSource,
          isRevert: isExecutionRevertedError(he),
          note: "makeCommitmentWithSender unavailable — using local commitment hash for commit(). Non-fatal.",
          ...errorDiagnostics(he),
        });
      }

      // ── STEP 1: COMMIT ──────────────────────────────────────────────────
      setPhase("awaiting-wallet-confirmation");
      setStep("committing");
      log("commit-wallet-prompt", {
        controller,
        commitment,
        account: address,
        walletChainId,
        senderAuthoritySource,
      });

      let commitHash: `0x${string}`;
      try {
        currentTxType = "commit";
        setPhase("commit-submitting");
        commitHash = await submitWithRetry(
          "commit",
          controller,
          () => withTimeout(
            writeContractAsync({ address: controller, abi: CONTROLLER_ABI, functionName: "commit", args: [commitment] }),
            TIMEOUT.WALLET_PROMPT_MS, PIPELINE_ERR.WALLET_CONFIRMATION_TIMEOUT, "commit() wallet prompt",
          ),
        );
      } catch (e: any) {
        throw e;
      }

      currentTxHash = commitHash;
      setPhase("commit-submitted");
      setStep("tx-hash-returned");
      log("commit-submitted", {
        commitTxHash: commitHash,
        commitment,
        walletChainId,
        senderAuthoritySource,
      });

      // ── STEP 2: POST-SUBMISSION VISIBILITY PROOF ────────────────────────
      // Prove the tx is visible via sender authority before entering receipt wait.
      // This uses the active connector provider extended with public actions.
      // If not visible → TX_NOT_VISIBLE_AFTER_SUBMISSION → stop immediately.
      await proveTransactionVisible(
        senderAuthorityClient, commitHash, walletChainId, senderAuthorityChainId,
        address, controller, senderAuthoritySource,
      );
      setPhase("commit-visible");
      setStep("tx-visible-on-network");

      // ── STEP 3: RECEIPT WAIT ────────────────────────────────────────────
      // Uses the same sender authority that confirmed tx visibility.
      // Generous timeout: 3 min for Arc public RPC.
      log("receipt-wait-start", {
        commitTxHash: commitHash,
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
        confirmations: COMMIT_CONFIRMATIONS,
      });

      let receipt: any;
      try {
        receipt = await withTimeout(
          senderAuthorityClient.waitForTransactionReceipt({ hash: commitHash, confirmations: COMMIT_CONFIRMATIONS }),
          TIMEOUT.RECEIPT_MS, PIPELINE_ERR.RECEIPT_TIMEOUT,
          `waitForTransactionReceipt(${commitHash}) chain=${senderAuthorityChainId}`,
        );
      } catch (e: any) {
        log("receipt-wait-fail", {
          commitTxHash: commitHash,
          readChainId: senderAuthorityChainId,
          senderAuthoritySource,
          ...errorDiagnostics(e),
        });
        // Run forensics before re-throwing so the next run has full diagnostics
        await receiptTimeoutForensics(
          senderAuthorityClient,
          commitHash,
          address,
          walletChainId,
          senderAuthoritySource,
        );
        throw classifyReceiptWaitFailure(
          e,
          commitHash,
          senderAuthorityChainId,
          senderAuthoritySource,
        );
      }

      log("receipt-wait-success", {
        commitTxHash: commitHash,
        blockNumber: receipt.blockNumber.toString(),
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
        status: receipt.status,
      });
      setPhase("commit-confirmed");
      setStep("committed");

      // ── STEP 4: STORAGE CHECK ───────────────────────────────────────────
      let commitTs: bigint;
      try {
        logCriticalReadClient("commitments[hash]", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          commitment,
          phase: "post-commit-storage-check",
        });
        commitTs = await withTimeout(
          senderAuthorityClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "commitments",
            args: [commitment],
          }) as Promise<bigint>,
          TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "commitments[hash]",
        );
      } catch (e: any) {
        throw new Error(
          `[${PIPELINE_ERR.RPC_STALE_READ}] commitments read failed on sender authority (${senderAuthoritySource}): ${e.message}`
        );
      }
      log("post-commit-read", {
        controller, commitment, commitmentsValue: commitTs.toString(),
        exists: commitTs !== 0n, blockNumber: receipt.blockNumber.toString(),
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
      });
      if (commitTs === 0n) {
        throw new Error(
          `[${PIPELINE_ERR.STATE_NOT_PERSISTED}] commitments[${commitment}]=0 on ${controller}. ` +
          `Tx ${commitHash} mined at block ${receipt.blockNumber}. chain=${senderAuthorityChainId} authority=${senderAuthoritySource}`
        );
      }

      // ── STEP 5: MATURITY WAIT ───────────────────────────────────────────
      setPhase("commitment-maturing");
      setStep("waiting");
      const deadline = Date.now() + TIMEOUT.MATURITY_TOTAL_MS;

      while (true) {
        if (Date.now() > deadline) {
          throw new Error(`[${PIPELINE_ERR.MATURITY_WAIT_TIMEOUT}] Commitment did not mature within ${TIMEOUT.MATURITY_TOTAL_MS / 1000}s.`);
        }

        let status: { timestamp: bigint; exists: boolean; matured: boolean; expired: boolean };
        try {
          logCriticalReadClient("getCommitmentStatus", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
            commitment,
            phase: "maturity-loop",
          });
          status = await withTimeout(
            senderAuthorityClient.readContract({
              address: controller,
              abi: CONTROLLER_ABI,
              functionName: "getCommitmentStatus",
              args: [commitment],
            }) as Promise<typeof status>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "getCommitmentStatus",
          );
        } catch (statusError: any) {
          log("maturity-status-read-fail", {
            commitment,
            senderAuthoritySource,
            readChainId: senderAuthorityChainId,
            ...errorDiagnostics(statusError),
          });
          try {
            logCriticalReadClient("commitments[hash]", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
              commitment,
              phase: "maturity-loop-fallback-ts",
            });
            const ts = await withTimeout(
              senderAuthorityClient.readContract({
                address: controller,
                abi: CONTROLLER_ABI,
                functionName: "commitments",
                args: [commitment],
              }) as Promise<bigint>,
              TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "commitments fallback",
            );
            logCriticalReadClient("getBlock(latest)", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
              phase: "maturity-loop-fallback-block",
            });
            const blk = await senderAuthorityClient.getBlock({ blockTag: "latest" });
            const now = blk.timestamp;
            status = { timestamp: ts, exists: ts !== 0n, matured: ts !== 0n && now >= ts + 60n, expired: ts !== 0n && now > ts + 86_400n };
          } catch {
            await new Promise(r => setTimeout(r, 4_000));
            continue;
          }
        }

        logCriticalReadClient("getBlock(latest)", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          phase: "maturity-loop",
        });
        const blk = await senderAuthorityClient.getBlock({ blockTag: "latest" }).catch(() => null);
        const now = blk?.timestamp ?? 0n;
        const elapsed = status.timestamp > 0n ? now - status.timestamp : 0n;
        log("maturity-check-loop", {
          commitment, commitmentsValue: status.timestamp.toString(),
          chainNow: now.toString(), elapsed: elapsed.toString(),
          matured: status.matured, expired: status.expired,
          msLeft: deadline - Date.now(), readChainId: senderAuthorityChainId,
          senderAuthoritySource,
        });

        if (!status.exists) throw new Error(`[${PIPELINE_ERR.STATE_NOT_PERSISTED}] Commitment disappeared during maturity wait.`);
        if (status.expired) throw new Error("Commitment expired on-chain (>24h). Please start over.");
        if (status.matured) { setProgress(100); break; }
        setProgress(Math.min(99, Number(elapsed * 100n / 60n)));
        await new Promise(r => setTimeout(r, 4_000));
      }
      setStep("ready");

      // ── STEP 6: DRIFT CHECKS ────────────────────────────────────────────
      if (addrRef.current !== address) {
        throw new Error(`[${PIPELINE_ERR.ACCOUNT_DRIFT}] Account changed mid-flow. started=${addrRef.current} current=${address}`);
      }
      if (chainRef.current !== walletChainId) {
        throw new Error(`[${PIPELINE_ERR.CHAIN_MISMATCH}] Chain changed mid-flow. started=${chainRef.current} current=${walletChainId}`);
      }

      // ── STEP 7: ARG EQUIVALENCE ─────────────────────────────────────────
      const recomp = makeCommitmentHash(label, address, duration, secret, resolver, normalizedResolverData, setReverse, address);
      if (recomp.toLowerCase() !== commitment.toLowerCase()) {
        throw new Error(`[${PIPELINE_ERR.REGISTER_ARGS_MISMATCH}] Commitment recompute mismatch. original=${commitment} recomputed=${recomp}`);
      }

      setPhase("pre-register-proof");
      // Final status before simulate
      let finalStatus: CommitmentStatus | null = null;
      try {
        logCriticalReadClient("getCommitmentStatus", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          commitment,
          phase: "final-pre-simulate-diagnostic",
        });
        finalStatus = await withTimeout(
          senderAuthorityClient.readContract({ address: controller, abi: CONTROLLER_ABI, functionName: "getCommitmentStatus", args: [commitment] }) as Promise<CommitmentStatus>,
          TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "final getCommitmentStatus",
        );
      } catch (finalStatusError: any) {
        log("final-status-read-fail", {
          commitment,
          senderAuthoritySource,
          readChainId: senderAuthorityChainId,
          ...errorDiagnostics(finalStatusError),
        });
      }

      logCriticalReadClient("commitments[hash]", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
        commitment,
        phase: "final-pre-simulate-proof",
      });
      const commitmentValue = await withTimeout(
        senderAuthorityClient.readContract({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "commitments",
          args: [commitment],
        }) as Promise<bigint>,
        TIMEOUT.RPC_READ_MS,
        PIPELINE_ERR.RPC_STALE_READ,
        "final commitments[hash]",
      );

      logCriticalReadClient("getBlock(latest)", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
        phase: "final-pre-simulate-proof",
      });
      const latestBlock = await withTimeout(
        senderAuthorityClient.getBlock({ blockTag: "latest" }) as Promise<{ timestamp: bigint }>,
        TIMEOUT.RPC_READ_MS,
        PIPELINE_ERR.RPC_STALE_READ,
        "final getBlock(latest)",
      );

      logCriticalReadClient("MIN_COMMITMENT_AGE", "primary-deterministic", primaryRpcSource, ctx.readChainId, {
        phase: "final-pre-simulate-proof",
      });
      const minCommitmentAge = await withTimeout(
        primaryReadClient.readContract({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "MIN_COMMITMENT_AGE",
          args: [],
        }) as Promise<bigint>,
        TIMEOUT.RPC_READ_MS,
        PIPELINE_ERR.RPC_STALE_READ,
        "MIN_COMMITMENT_AGE",
      );

      logCriticalReadClient("MAX_COMMITMENT_AGE", "primary-deterministic", primaryRpcSource, ctx.readChainId, {
        phase: "final-pre-simulate-proof",
      });
      const maxCommitmentAge = await withTimeout(
        primaryReadClient.readContract({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "MAX_COMMITMENT_AGE",
          args: [],
        }) as Promise<bigint>,
        TIMEOUT.RPC_READ_MS,
        PIPELINE_ERR.RPC_STALE_READ,
        "MAX_COMMITMENT_AGE",
      );

      logCriticalReadClient("makeCommitmentWithSender", "primary-deterministic", primaryRpcSource, ctx.readChainId, {
        commitment,
        phase: "final-pre-simulate-proof",
      });
      // Diagnostic-only — non-blocking. See pre-commit note above.
      let onChainCommitmentHash: `0x${string}` | null = null;
      try {
        onChainCommitmentHash = await withTimeout(
          primaryReadClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "makeCommitmentWithSender",
            args: [label, address, duration, secret, resolver, normalizedResolverData, setReverse, address],
          }) as Promise<`0x${string}`>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.COMMITMENT_PROOF_RPC_FAILURE,
          "makeCommitmentWithSender(final)",
        );
      } catch (commitmentProofError: any) {
        // Any failure (revert, RPC error, timeout) is COMMITMENT_PROOF_UNAVAILABLE — non-fatal.
        log("commitment-proof-unavailable", {
          phase: "final-pre-simulate-proof",
          commitment,
          controller,
          readChainId: ctx.readChainId,
          clientSource: primaryRpcSource,
          isRevert: isExecutionRevertedError(commitmentProofError),
          note: "makeCommitmentWithSender unavailable before simulate — proof skipped. Non-fatal.",
          ...errorDiagnostics(commitmentProofError),
        });
      }

      const latestBlockTimestamp = latestBlock.timestamp;
      const computedAge = latestBlockTimestamp - commitmentValue;
      // hashMatchesCommitted is only meaningful when onChainCommitmentHash is non-null.
      // If the proof call was unavailable, we skip the hash gate and let simulation decide.
      const hashMatchesCommitted = onChainCommitmentHash !== null
        ? onChainCommitmentHash.toLowerCase() === commitment.toLowerCase()
        : null; // null = proof unavailable, not a mismatch
      const preSimulateForensics = {
        abiSource: ctx.abiSource,
        registerSignature: controllerSemanticProof.registerSignature,
        registerArgCount: controllerSemanticProof.registerArgCount,
        registerHasMaxCost: controllerSemanticProof.registerHasMaxCost,
        registerSelector: selector,
        commitmentBuilderSignature: controllerSemanticProof.commitmentBuilderSignature,
        commitmentHashCommitted: commitment,
        onChainCommitmentHash: onChainCommitmentHash ?? "proof-unavailable",
        hashMatchesCommitted,
        commitmentProofAvailable: onChainCommitmentHash !== null,
        commitmentsValue: commitmentValue.toString(),
        latestBlockTimestamp: latestBlockTimestamp.toString(),
        computedAge: computedAge.toString(),
        minCommitmentAge: minCommitmentAge.toString(),
        maxCommitmentAge: maxCommitmentAge.toString(),
        ageClassification:
          commitmentValue === 0n ? "state-not-persisted" :
          computedAge < minCommitmentAge ? "too-new" :
          computedAge > maxCommitmentAge ? "expired" :
          "valid",
        label,
        normalizedLabel,
        owner: address,
        duration: duration.toString(),
        secret,
        resolver,
        resolverMode,
        data: normalizedResolverData.map((item) => item),
        reverseRecord: setReverse,
        sender: address,
        account: address,
        exactRegisterArgs: registerArgsForLog,
        finalStatusTimestamp: finalStatus?.timestamp?.toString() ?? null,
        finalStatusExists: finalStatus?.exists ?? null,
        finalStatusMatured: finalStatus?.matured ?? null,
        finalStatusExpired: finalStatus?.expired ?? null,
        walletChainId,
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
      };

      log("pre-simulate-forensics", preSimulateForensics);

      if (commitmentValue === 0n) {
        throw new Error(
          `[${PIPELINE_ERR.STATE_NOT_PERSISTED}] commitments[${commitment}]=0 before simulate. ` +
          `chain=${senderAuthorityChainId} authority=${senderAuthoritySource}`
        );
      }
      if (!hashMatchesCommitted && hashMatchesCommitted !== null) {
        // Only hard-block if the proof call succeeded and returned a different hash.
        // hashMatchesCommitted === null means proof was unavailable — not a mismatch.
        throw new Error(
          `[${PIPELINE_ERR.COMMITMENT_HASH_MISMATCH}] committed=${commitment} recomputed=${onChainCommitmentHash} ` +
          `signature=${controllerSemanticProof.commitmentBuilderSignature}`
        );
      }
      if (computedAge < minCommitmentAge) {
        throw new Error(
          `[${PIPELINE_ERR.COMMITMENT_TOO_NEW}] commitment age ${computedAge}s is below min ${minCommitmentAge}s. ` +
          `commitments[hash]=${commitmentValue} latestBlockTimestamp=${latestBlockTimestamp}`
        );
      }
      if (computedAge > maxCommitmentAge) {
        throw new Error(
          `[${PIPELINE_ERR.COMMITMENT_EXPIRED_ONCHAIN}] commitment age ${computedAge}s exceeds max ${maxCommitmentAge}s. ` +
          `commitments[hash]=${commitmentValue} latestBlockTimestamp=${latestBlockTimestamp}`
        );
      }

      // ── STEP 8: PRE-SIMULATE SEMANTIC CHECKS ────────────────────────────
      // These checks surface the real failing branch BEFORE simulation so the
      // misleading "commitment expired" decode from Arc RPC never reaches the UI.
      //
      // The two most likely true causes when all commitment proof gates pass:
      //   A. resolver not approved  → "Controller: resolver not approved"
      //   B. price exceeds maxCost  → "Controller: price exceeds maxCost"
      // Both can be misreported as "commitment expired" by Arc RPC nodes.

      // A. Resolver approval check
      let preSimulatResolverApproved: boolean | null = null;
      if (resolver !== ZERO_ADDRESS) {
        try {
          const resolverApproved = await withTimeout(
            senderAuthorityClient.readContract({
              address: controller,
              abi: CONTROLLER_ABI,
              functionName: "approvedResolvers",
              args: [resolver],
            }) as Promise<boolean>,
            TIMEOUT.RPC_READ_MS,
            PIPELINE_ERR.RPC_STALE_READ,
            "approvedResolvers(resolver)",
          );
          preSimulatResolverApproved = resolverApproved;
          log("pre-simulate-resolver-check", {
            resolver, resolverApproved, controller, resolverMode,
            senderAuthoritySource,
          });
          if (!resolverApproved) {
            throw new Error(
              `[${PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH}] ` +
              `resolver ${resolver} is not approved on controller ${controller}. ` +
              `category=resolver-not-approved. ` +
              `Fix: call setApprovedResolver(${resolver}, true) as ADMIN_ROLE, ` +
              `or pass ZERO_ADDRESS as resolver (requires setReverse=false).`
            );
          }
        } catch (resolverCheckErr: any) {
          if (resolverCheckErr.message?.includes(PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH)) throw resolverCheckErr;
          // RPC failure on this check is non-fatal — let simulation surface the real error
          log("pre-simulate-resolver-check-warn", {
            resolver, controller, error: resolverCheckErr.message, note: "non-fatal, proceeding to simulate",
          });
        }
      }

      // B. Price / maxCost check
      let preSimulateLiveCost: bigint | null = null;
      try {
        const livePrice = await withTimeout(
          senderAuthorityClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "rentPrice",
            args: [label, duration],
          }) as Promise<{ base: bigint; premium: bigint }>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.RPC_STALE_READ,
          "rentPrice(label, duration)",
        );
        const liveCost = livePrice.base + livePrice.premium;
        preSimulateLiveCost = liveCost;
        log("pre-simulate-price-check", {
          label, duration: duration.toString(),
          liveBase: livePrice.base.toString(),
          livePremium: livePrice.premium.toString(),
          liveCost: liveCost.toString(),
          maxCost: maxCost.toString(),
          withinSlippage: liveCost <= maxCost,
          senderAuthoritySource,
        });
        if (liveCost > maxCost) {
          throw new Error(
            `[${PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH}] ` +
            `rentPrice(${label}) = ${liveCost} exceeds maxCost=${maxCost}. ` +
            `category=price-exceeds-maxcost. ` +
            `The price oracle returned a higher cost than the slippage-adjusted maxCost. ` +
            `Refresh the page to get the current price.`
          );
        }
      } catch (priceCheckErr: any) {
        if (priceCheckErr.message?.includes(PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH)) throw priceCheckErr;
        log("pre-simulate-price-check-warn", {
          label, error: priceCheckErr.message, note: "non-fatal, proceeding to simulate",
        });
      }

      // ── STEP 9: SIMULATE ────────────────────────────────────────────────
      setPhase("register-simulating");
      setStep("registering");

      // ── PRE-SIMULATE: debugCommitment + getCommitmentStatus ──────────────
      // Call the controller's own debug surface to expose the true commitment
      // state immediately before simulation. This distinguishes:
      //   - commitment-already-used  (usedCommitments[hash] = true, ts = 0)
      //   - commitment-not-found     (ts = 0, not used)
      //   - commitment-valid         (ts != 0, age in range)
      //   - rpc-misdecoded-revert    (status says valid but simulate reverts)
      let debugResult: { ts: bigint; exists: boolean } | null = null;
      let statusResult: { timestamp: bigint; exists: boolean; matured: boolean; expired: boolean } | null = null;
      let usedResult: boolean | null = null;

      try {
        debugResult = await withTimeout(
          senderAuthorityClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "debugCommitment",
            args: [commitment],
          }) as Promise<{ ts: bigint; exists: boolean }>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.RPC_STALE_READ,
          "debugCommitment",
        );
      } catch { /* non-fatal */ }

      try {
        statusResult = await withTimeout(
          senderAuthorityClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "getCommitmentStatus",
            args: [commitment],
          }) as Promise<{ timestamp: bigint; exists: boolean; matured: boolean; expired: boolean }>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.RPC_STALE_READ,
          "getCommitmentStatus(pre-simulate)",
        );
      } catch { /* non-fatal */ }

      try {
        usedResult = await withTimeout(
          senderAuthorityClient.readContract({
            address: controller,
            abi: CONTROLLER_ABI,
            functionName: "usedCommitments",
            args: [commitment],
          }) as Promise<boolean>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.RPC_STALE_READ,
          "usedCommitments",
        );
      } catch { /* non-fatal */ }

      // Classify the commitment state from debug surface
      const debugCategory =
        usedResult === true                          ? "commitment-already-used" :
        debugResult?.exists === false &&
          usedResult === false                       ? "commitment-not-found" :
        statusResult?.expired === true               ? "commitment-expired-onchain" :
        statusResult?.matured === false              ? "commitment-too-young" :
        statusResult?.matured === true &&
          statusResult?.exists === true              ? "commitment-valid-per-status" :
                                                       "commitment-state-unknown";

      console.error("[Pipeline:commitment-debug:FLAT]", JSON.stringify({
        commitment,
        controller,
        debugCommitmentTs:     debugResult?.ts?.toString()        ?? "unavailable",
        debugCommitmentExists: debugResult?.exists                 ?? "unavailable",
        statusTimestamp:       statusResult?.timestamp?.toString() ?? "unavailable",
        statusExists:          statusResult?.exists                ?? "unavailable",
        statusMatured:         statusResult?.matured               ?? "unavailable",
        statusExpired:         statusResult?.expired               ?? "unavailable",
        usedCommitment:        usedResult                          ?? "unavailable",
        commitmentsValue:      preSimulateForensics?.commitmentsValue ?? "unavailable",
        computedAge:           preSimulateForensics?.computedAge      ?? "unavailable",
        minCommitmentAge:      preSimulateForensics?.minCommitmentAge ?? "unavailable",
        maxCommitmentAge:      preSimulateForensics?.maxCommitmentAge ?? "unavailable",
        ageClassification:     preSimulateForensics?.ageClassification ?? "unavailable",
        debugCategory,
        resolver,
        resolverMode,
        resolverApproved:      preSimulatResolverApproved,
        reverseRecord:         setReverse,
        dataLength:            normalizedResolverData.length,
        maxCost:               maxCost.toString(),
        liveCost:              preSimulateLiveCost?.toString() ?? "unavailable",
        label,
        owner:                 address,
        duration:              duration.toString(),
        walletChainId,
        senderAuthoritySource,
        exactRegisterArgs: [
          label,
          address,
          duration.toString(),
          secret,
          resolver,
          JSON.stringify(normalizedResolverData),
          setReverse,
          maxCost.toString(),
        ],
      }));

      // ── PRE-SIMULATE: USDC payment path check ─────────────────────────────
      // Verify the account has sufficient USDC balance and allowance for the
      // actual cost. If not, the safeTransferFrom in register() will revert.
      let usdcBalance: bigint | null = null;
      let usdcAllowance: bigint | null = null;
      try {
        const [balResult, allowResult] = await Promise.allSettled([
          withTimeout(
            senderAuthorityClient.readContract({
              address: CONTRACTS.usdc,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address],
            }) as Promise<bigint>,
            TIMEOUT.RPC_READ_MS,
            PIPELINE_ERR.RPC_STALE_READ,
            "USDC balanceOf",
          ),
          withTimeout(
            senderAuthorityClient.readContract({
              address: CONTRACTS.usdc,
              abi: ERC20_ABI,
              functionName: "allowance",
              args: [address, controller],
            }) as Promise<bigint>,
            TIMEOUT.RPC_READ_MS,
            PIPELINE_ERR.RPC_STALE_READ,
            "USDC allowance",
          ),
        ]);
        usdcBalance   = balResult.status   === "fulfilled" ? balResult.value   : null;
        usdcAllowance = allowResult.status === "fulfilled" ? allowResult.value : null;
      } catch { /* non-fatal */ }

      const actualCost = preSimulateLiveCost ?? 0n;
      const paymentReady =
        usdcBalance !== null &&
        usdcAllowance !== null &&
        usdcBalance >= actualCost &&
        usdcAllowance >= actualCost;

      console.error("[Pipeline:register-economic-check:FLAT]", JSON.stringify({
        usdcBalance:   usdcBalance?.toString()   ?? "unavailable",
        usdcAllowance: usdcAllowance?.toString() ?? "unavailable",
        liveCost:      actualCost.toString(),
        maxCost:       maxCost.toString(),
        owner:         address,
        controller,
        usdcAddress:   CONTRACTS.usdc,
        paymentReady,
        balanceSufficient:   usdcBalance !== null ? usdcBalance >= actualCost : null,
        allowanceSufficient: usdcAllowance !== null ? usdcAllowance >= actualCost : null,
      }));

      if (!paymentReady && usdcBalance !== null && usdcAllowance !== null) {
        if (usdcBalance < actualCost) {
          throw new Error(
            `[REGISTER_PAYMENT_NOT_READY] USDC balance ${usdcBalance} < cost ${actualCost}. ` +
            `Insufficient balance for registration payment.`
          );
        }
        if (usdcAllowance < actualCost) {
          throw new Error(
            `[REGISTER_PAYMENT_NOT_READY] USDC allowance ${usdcAllowance} < cost ${actualCost}. ` +
            `Approval is insufficient. This should not occur after the approval step.`
          );
        }
      }

      // ── PRE-SIMULATE: base registrar state check ──────────────────────────
      // Verify the name is available from the registrar's perspective.
      // If not, the base.register() or base.registerWithResolver() call will revert.
      const registrar = tld === "arc" ? CONTRACTS.arcRegistrar : CONTRACTS.circleRegistrar;
      let registrarAvailable: boolean | null = null;
      try {
        // tokenId = uint256(keccak256(bytes(label))) — matches base.register() logic
        const { keccak256: viemKeccak256, stringToBytes } = await import("viem");
        const labelHash = viemKeccak256(stringToBytes(label));
        const tokenId   = BigInt(labelHash);
        registrarAvailable = await withTimeout(
          senderAuthorityClient.readContract({
            address: registrar,
            abi: [{ type: "function", name: "available", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }],
            functionName: "available",
            args: [tokenId],
          }) as Promise<boolean>,
          TIMEOUT.RPC_READ_MS,
          PIPELINE_ERR.RPC_STALE_READ,
          "registrar.available(tokenId)",
        );

        console.error("[Pipeline:register-registrar-check:FLAT]", JSON.stringify({
          label,
          tld,
          registrarAddress:  registrar,
          available:         registrarAvailable,
          controller,
          tokenId:           tokenId.toString(),
          labelHash,
          registrarReady:    registrarAvailable === true,
        }));
      } catch (regErr: any) {
        if (regErr.message?.includes("REGISTER_REGISTRAR_STATE_MISMATCH")) throw regErr;
        console.error("[Pipeline:register-registrar-check:FLAT]", JSON.stringify({
          label, tld, registrarAddress: registrar, available: "unavailable",
          controller, error: regErr.message,
        }));
      }

      if (registrarAvailable === false) {
        throw new Error(
          `[REGISTER_REGISTRAR_STATE_MISMATCH] registrar.available(${label}) = false. ` +
          `The name is not available from the registrar's perspective. ` +
          `registrar=${registrar} controller=${controller}`
        );
      }

      // ── PRE-SIMULATE: base registrar authority check ──────────────────────
      // Checks: controllers[controller], nameExpires[tokenId], registry.owner(baseNode)
      // These are the conditions guarded by onlyController and live() modifiers.
      // If any fail, base.register() will revert — not the commitment validation.
      {
        const { keccak256: viemKeccak256, stringToBytes } = await import("viem");
        const { namehash } = await import("../lib/namehash");
        const labelHash = viemKeccak256(stringToBytes(label));
        const tokenId   = BigInt(labelHash);
        const baseNodeHash = namehash(tld) as `0x${string}`;

        const [
          controllerAuthResult,
          nameExpiresResult,
          registryOwnerResult,
        ] = await Promise.allSettled([
          withTimeout(
            senderAuthorityClient.readContract({
              address: registrar,
              abi: [{ type: "function", name: "controllers", stateMutability: "view",
                inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] }],
              functionName: "controllers",
              args: [controller],
            }) as Promise<boolean>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "registrar.controllers(controller)",
          ),
          withTimeout(
            senderAuthorityClient.readContract({
              address: registrar,
              abi: [{ type: "function", name: "nameExpires", stateMutability: "view",
                inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] }],
              functionName: "nameExpires",
              args: [tokenId],
            }) as Promise<bigint>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "registrar.nameExpires(tokenId)",
          ),
          withTimeout(
            senderAuthorityClient.readContract({
              address: CONTRACTS.registry,
              abi: [{ type: "function", name: "owner", stateMutability: "view",
                inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] }],
              functionName: "owner",
              args: [baseNodeHash],
            }) as Promise<`0x${string}`>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "registry.owner(baseNode)",
          ),
        ]);

        const controllerAuthorized = controllerAuthResult.status === "fulfilled" ? controllerAuthResult.value : null;
        const nameExpiry           = nameExpiresResult.status   === "fulfilled" ? nameExpiresResult.value   : null;
        const baseNodeOwner        = registryOwnerResult.status === "fulfilled" ? registryOwnerResult.value : null;
        const registrarIsLive      = baseNodeOwner !== null
          ? baseNodeOwner.toLowerCase() === registrar.toLowerCase()
          : null;

        console.error("[Pipeline:register-authority-check:FLAT]", JSON.stringify({
          controller,
          registrarAddress:          registrar,
          controllerAuthorizedOnRegistrar: controllerAuthorized,
          tokenId:                   tokenId.toString(),
          labelHash,
          available:                 registrarAvailable,
          nameExpires:               nameExpiry?.toString() ?? "unavailable",
          baseNodeOwner:             baseNodeOwner ?? "unavailable",
          registrarIsLive,
          registryAddress:           CONTRACTS.registry,
          tld,
          label,
          walletChainId,
          senderAuthoritySource,
        }));

        if (controllerAuthorized === false) {
          throw new Error(
            `[REGISTER_CONTROLLER_NOT_AUTHORIZED] controllers[${controller}] = false on registrar ${registrar}. ` +
            `The controller is not authorized to register names. ` +
            `Fix: call registrar.addController(${controller}) as registrar owner.`
          );
        }

        if (registrarIsLive === false) {
          throw new Error(
            `[REGISTER_REGISTRAR_STATE_MISMATCH] registry.owner(baseNode) = ${baseNodeOwner}, expected ${registrar}. ` +
            `The registrar is not live — it does not own the TLD node in the registry.`
          );
        }

        // ── Subnode ownership + registrar baseNode cross-check ──────────────
        // Reads the registrar's own baseNode value and the subnode owner for this
        // specific name. Catches R6: registry.setSubnodeOwner auth failure.
        const { keccak256: kSubnode, concat: concatBytes, toBytes: toBytesViem } = await import("viem");
        const baseNodeBytes32 = toBytesViem(baseNodeHash, { size: 32 });
        const tokenIdHex      = `0x${tokenId.toString(16).padStart(64, "0")}` as `0x${string}`;
        const tokenIdBytes32  = toBytesViem(tokenIdHex, { size: 32 });
        const subnodeHash     = kSubnode(concatBytes([baseNodeBytes32, tokenIdBytes32])) as `0x${string}`;

        const [registrarBaseNodeResult, subnodeOwnerResult] = await Promise.allSettled([
          withTimeout(
            senderAuthorityClient.readContract({
              address: registrar,
              abi: [{ type: "function", name: "baseNode", stateMutability: "view",
                inputs: [], outputs: [{ name: "", type: "bytes32" }] }],
              functionName: "baseNode",
              args: [],
            }) as Promise<`0x${string}`>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "registrar.baseNode()",
          ),
          withTimeout(
            senderAuthorityClient.readContract({
              address: CONTRACTS.registry,
              abi: [{ type: "function", name: "owner", stateMutability: "view",
                inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] }],
              functionName: "owner",
              args: [subnodeHash],
            }) as Promise<`0x${string}`>,
            TIMEOUT.RPC_READ_MS, PIPELINE_ERR.RPC_STALE_READ, "registry.owner(subnode)",
          ),
        ]);

        const onChainBaseNode  = registrarBaseNodeResult.status === "fulfilled" ? registrarBaseNodeResult.value : null;
        const subnodeOwner     = subnodeOwnerResult.status      === "fulfilled" ? subnodeOwnerResult.value      : null;
        const baseNodeHashMatch = onChainBaseNode !== null
          ? onChainBaseNode.toLowerCase() === baseNodeHash.toLowerCase()
          : null;

        console.error("[Pipeline:register-subnode-check:FLAT]", JSON.stringify({
          label,
          tld,
          registrar,
          frontendBaseNodeHash:  baseNodeHash,
          onChainBaseNode:       onChainBaseNode ?? "unavailable",
          baseNodeHashMatch,
          subnodeHash,
          subnodeOwner:          subnodeOwner ?? "unavailable",
          tokenId:               tokenId.toString(),
          walletChainId,
          senderAuthoritySource,
          note: "If baseNodeHashMatch=false, frontend namehash(tld) differs from registrar.baseNode — registry.setSubnodeOwner will fail with ArcNS: not authorised",
        }));

        if (baseNodeHashMatch === false) {
          throw new Error(
            `[REGISTER_REGISTRAR_STATE_MISMATCH] Frontend baseNodeHash=${baseNodeHash} does not match ` +
            `registrar.baseNode=${onChainBaseNode}. ` +
            `registry.setSubnodeOwner will fail with ArcNS: not authorised. ` +
            `This is a deployment configuration mismatch.`
          );
        }
      }

      try {
        logCriticalReadClient("simulateContract(register)", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          commitment,
          phase: "pre-register-simulation",
        });
        await withTimeout(
          senderAuthorityClient.simulateContract({ address: controller, abi: CONTROLLER_ABI, functionName: "register", args: registerArgs, account: address }),
          TIMEOUT.SIMULATE_MS, PIPELINE_ERR.SIMULATION_TIMEOUT, "simulateContract(register)",
        );
        log("simulate-register-success", {
          controller,
          commitment,
          account: address,
          senderAuthoritySource,
          readChainId: senderAuthorityChainId,
          registerSignature: controllerSemanticProof.registerSignature,
          registerSelector: selector,
        });
      } catch (se: any) {
        if (se.message?.includes(PIPELINE_ERR.SIMULATION_TIMEOUT)) throw se;
        const reason = se?.cause?.reason ?? se?.shortMessage ?? se?.message ?? "unknown revert";
        logCriticalReadClient("commitments[hash]", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          commitment,
          phase: "simulate-failure-diagnostic",
        });
        const diagTs  = await senderAuthorityClient.readContract({ address: controller, abi: CONTROLLER_ABI, functionName: "commitments", args: [commitment] }).catch(() => null) as bigint | null;
        logCriticalReadClient("getBlock(latest)", "sender-authority", senderAuthoritySource, senderAuthorityChainId, {
          phase: "simulate-failure-diagnostic",
        });
        const diagBlk = await senderAuthorityClient.getBlock({ blockTag: "latest" }).catch(() => null);
        log("simulate-register-fail", {
          controller, commitment, commitmentsValue: diagTs?.toString() ?? "read-failed",
          chainNow: diagBlk?.timestamp?.toString() ?? "read-failed",
          account: address, revertReason: reason, walletChainId, readChainId: senderAuthorityChainId,
          senderAuthoritySource,
          registerArgs: {
            label,
            owner: address,
            duration: duration.toString(),
            secret,
            resolver,
            resolverMode,
            data: JSON.stringify(normalizedResolverData),
            reverseRecord: setReverse,
            maxCost: maxCost.toString(),
          },
          preSimulateProof: preSimulateForensics,
        });

        // Flat diagnostic line — all fields at top level, no nested objects.
        // Readable directly in the browser console without manual expansion.
        const category =
          reason.toLowerCase().includes("resolver not approved") ? "resolver-not-approved" :
          reason.toLowerCase().includes("price exceeds") ? "price-exceeds-maxcost" :
          reason.toLowerCase().includes("commitment expired") ? "misleading-expiry-decode" :
          reason.toLowerCase().includes("commitment not found") ? "commitment-not-found" :
          reason.toLowerCase().includes("commitment too young") ? "commitment-too-young" :
          reason.toLowerCase().includes("commitment already used") ? "commitment-already-used" :
          reason.toLowerCase().includes("invalid name") ? "invalid-name" :
          reason.toLowerCase().includes("duration too short") ? "duration-too-short" :
          "unknown";

        // Cross-reference with debugCategory from the pre-simulate debug surface
        const effectiveCategory =
          usedResult === true ? "commitment-already-used" :
          debugCategory !== "commitment-state-unknown" ? debugCategory :
          category;

        const fixInstruction =
          effectiveCategory === "resolver-not-approved"
            ? `Call setApprovedResolver(${resolver}, true) as ADMIN_ROLE on ${controller}, or disable reverse record.`
            : effectiveCategory === "price-exceeds-maxcost"
            ? "Refresh the page to get the current price and retry."
            : effectiveCategory === "commitment-already-used"
            ? "This commitment was already used. Start a new registration with a fresh secret."
            : effectiveCategory === "misleading-expiry-decode"
            ? "Revert text is misleading — check resolver approval and price. See category fields above."
            : "See revertReason for details.";

        console.error("[Pipeline:simulate-register-fail:FLAT]", JSON.stringify({
          controller,
          commitment,
          resolver,
          resolverMode,
          resolverApproved:  preSimulatResolverApproved,
          dataLength:        normalizedResolverData.length,
          reverseRecord:     setReverse,
          maxCost:           maxCost.toString(),
          liveCost:          preSimulateLiveCost?.toString() ?? "unavailable",
          revertReason:      reason,
          category,
          effectiveCategory,
          debugCategory,
          usedCommitment:    usedResult,
          debugTs:           debugResult?.ts?.toString()        ?? "unavailable",
          debugExists:       debugResult?.exists                ?? "unavailable",
          statusTimestamp:   statusResult?.timestamp?.toString() ?? "unavailable",
          statusExists:      statusResult?.exists               ?? "unavailable",
          statusMatured:     statusResult?.matured              ?? "unavailable",
          statusExpired:     statusResult?.expired              ?? "unavailable",
          fixInstruction,
          computedAge: preSimulateForensics?.computedAge ?? "unavailable",
          minCommitmentAge: preSimulateForensics?.minCommitmentAge ?? "unavailable",
          maxCommitmentAge: preSimulateForensics?.maxCommitmentAge ?? "unavailable",
          ageClassification: preSimulateForensics?.ageClassification ?? "unavailable",
          commitmentsValue: diagTs?.toString() ?? "read-failed",
          chainNow: diagBlk?.timestamp?.toString() ?? "read-failed",
          label,
          owner: address,
          duration: duration.toString(),
          secret,
          walletChainId,
          readChainId: senderAuthorityChainId,
          senderAuthoritySource,
          registerSignature: controllerSemanticProof.registerSignature,
          registerSelector: selector,
          exactRegisterArgs: [
            label,
            address,
            duration.toString(),
            secret,
            resolver,
            JSON.stringify(normalizedResolverData),
            setReverse,
            maxCost.toString(),
          ],
        }));
        if (reason.toLowerCase().includes("commitment expired")) {
          throw new Error(
            `[${PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH}] simulate(register) reverted with misleading expiry text ` +
            `after hash/age/signature proof passed. cause=${reason} effectiveCategory=${effectiveCategory} debugCategory=${debugCategory} usedCommitment=${usedResult}`
          );
        }
        if (usedResult === true) {
          throw new Error(
            `[${PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH}] commitment-already-used: ` +
            `usedCommitments[${commitment}]=true. This commitment was already consumed. Start a new registration.`
          );
        }
        // All pre-checks passed (commitment valid, payment ready, registrar available,
        // controller authorized, registrar live) — revert is from base registrar internals.
        throw new Error(
          `[REGISTER_BASE_REGISTRAR_SEMANTIC_MISMATCH] simulate(register) reverted after all pre-checks passed. ` +
          `cause=${reason} effectiveCategory=${effectiveCategory} debugCategory=${debugCategory}`
        );
      }

      // ── STEP 9: REGISTER ────────────────────────────────────────────────
      let tx: `0x${string}`;
      try {
        currentTxType = "register";
        setPhase("awaiting-wallet-confirmation");
        setPhase("register-submitting");
        tx = await submitWithRetry(
          "register",
          controller,
          () => withTimeout(
            writeContractAsync({ address: controller, abi: CONTROLLER_ABI, functionName: "register", args: registerArgs }),
            TIMEOUT.REGISTER_SEND_MS, PIPELINE_ERR.WALLET_CONFIRMATION_TIMEOUT, "register() wallet prompt",
          ),
        );
      } catch (e: any) {
        throw e;
      }

      currentTxHash = tx;
      log("register-submit", {
        controller,
        commitment,
        registerTxHash: tx,
        account: address,
        walletChainId,
        senderAuthoritySource,
      });

      await proveTransactionVisible(
        senderAuthorityClient,
        tx,
        walletChainId,
        senderAuthorityChainId,
        address,
        controller,
        senderAuthoritySource,
      );
      log("register-tx-visible-on-network", {
        controller,
        commitment,
        registerTxHash: tx,
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
      });

      let registerReceipt: any;
      log("register-receipt-wait-start", {
        registerTxHash: tx,
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
        confirmations: COMMIT_CONFIRMATIONS,
      });
      try {
        registerReceipt = await withTimeout(
          senderAuthorityClient.waitForTransactionReceipt({ hash: tx, confirmations: COMMIT_CONFIRMATIONS }),
          TIMEOUT.REGISTER_RECEIPT_MS,
          PIPELINE_ERR.RECEIPT_TIMEOUT,
          `waitForTransactionReceipt(register ${tx}) chain=${senderAuthorityChainId}`,
        );
      } catch (e: any) {
        log("register-receipt-wait-fail", {
          registerTxHash: tx,
          readChainId: senderAuthorityChainId,
          senderAuthoritySource,
          ...errorDiagnostics(e),
        });
        await receiptTimeoutForensics(
          senderAuthorityClient,
          tx,
          address,
          walletChainId,
          senderAuthoritySource,
        );
        throw classifyReceiptWaitFailure(
          e,
          tx,
          senderAuthorityChainId,
          senderAuthoritySource,
          "register",
        );
      }

      log("register-receipt-wait-success", {
        registerTxHash: tx,
        blockNumber: registerReceipt.blockNumber?.toString() ?? null,
        status: registerReceipt.status,
        readChainId: senderAuthorityChainId,
        senderAuthoritySource,
      });

      setPhase("register-confirmed");
      setResult({ txHash: tx, name: `${label}.${tld}`, expires: BigInt(Math.floor(Date.now() / 1000)) + duration, cost: totalCost });
      cacheInvalidate(label, tld);
      setStep("success");
      log("register-success", {
        controller,
        commitment,
        txHash: tx,
        name: `${label}.${tld}`,
        registerReceiptBlockNumber: registerReceipt.blockNumber?.toString() ?? null,
        senderAuthoritySource,
      });

    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      const diagnosticSummary = buildDiagnosticSummary(
        msg,
        phase,
        walletChainId,
        controller,
        currentTxType,
        currentTxHash,
      );
      console.error("[Pipeline] FAILED:", msg, e);
      log("flow-error", {
        controller,
        commitment,
        account: address,
        error: msg,
        walletChainId,
        diagnosticSummary,
        ...errorDiagnostics(e),
      });
      log("diagnostic-summary", diagnosticSummary);

      // Flat diagnostic line for REGISTER_SIMULATION_SEMANTIC_MISMATCH — no expansion needed
      if (diagnosticSummary.code === PIPELINE_ERR.REGISTER_SIMULATION_SEMANTIC_MISMATCH) {
        const raw = msg.toLowerCase();
        const semCategory =
          raw.includes("resolver-not-approved") ? "resolver-not-approved" :
          raw.includes("price-exceeds-maxcost") ? "price-exceeds-maxcost" :
          raw.includes("misleading-expiry") ? "misleading-expiry-decode" :
          "unknown-semantic";
        console.error("[Pipeline:diagnostic-summary:SEMANTIC_MISMATCH:FLAT]", JSON.stringify({
          code: diagnosticSummary.code,
          layer: diagnosticSummary.layer,
          step: diagnosticSummary.step,
          category: semCategory,
          controller: diagnosticSummary.controllerAddress,
          chainId: diagnosticSummary.chainId,
          txType: diagnosticSummary.txType,
          txHash: diagnosticSummary.txHash,
          retryable: diagnosticSummary.retryable,
          cause: msg,
        }));
      }

      // User-facing recommendation — concise, demo-friendly
      const userMessage = resolveUserFacingMessage(msg, diagnosticSummary);
      setError(userMessage);
      setStep("failed");
      setPhase("failed");
    } finally {
      GLOBAL_REGISTER_LOCK = false;
      addrRef.current = null; chainRef.current = null;
      setProgress(0);
      log("flow-finally-reset", { lockReleased: true, address, walletChainId, phase });
    }
  }, [address, config, phase, submitWithRetry, walletChainId, writeContractAsync]);

  const reset = useCallback(() => {
    GLOBAL_REGISTER_LOCK = false;
    setStep("idle"); setPhase("idle"); setError(null); setResult(null); setProgress(0);
  }, []);

  return {
    register, approveUsdc, step, phase, error, result,
    waitProgress: waitProgress, reset, isLocked: GLOBAL_REGISTER_LOCK,
  };
}
