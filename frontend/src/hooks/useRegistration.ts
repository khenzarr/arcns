"use client";
/**
 * useRegistration.ts — canonical v3 commit-reveal registration state machine.
 *
 * This is the SINGLE active registration flow for ArcNS v3.
 * v1/v2 hooks (useRegistrationPipeline, useArcNSV2) are superseded and archived.
 *
 * State machine:
 *   idle → approving → committing → waiting → ready → registering → success | failed
 *
 * Primary name behavior:
 *   - Registration-time primary name is OPTIONAL (reverseRecord param).
 *   - If the reverse record set fails, the registration itself does NOT fail.
 *     The Controller handles this with try/catch internally.
 *   - Dashboard-driven primary name update is a separate flow (usePrimaryName).
 *
 * All user-facing errors flow through errors.ts.
 * No ENS-branded strings anywhere.
 */

import { useWriteContract, useAccount, useReadContract } from "wagmi";
import { useState, useCallback, useRef } from "react";
import { controllerFor, USDC_CONTRACT, ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import {
  makeCommitment,
  buildRegisterArgs,
  randomSecret,
  maxCostWithSlippage,
  ZERO_ADDRESS,
  type CommitmentParams,
} from "../lib/commitment";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";
import { normalizeLabel } from "../lib/normalization";
import type { SupportedTLD } from "../lib/normalization";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegistrationStep =
  | "idle"
  | "approving"
  | "committing"
  | "waiting"
  | "ready"
  | "registering"
  | "success"
  | "failed";

export interface RegistrationResult {
  txHash:  `0x${string}`;
  name:    string;
  tld:     SupportedTLD;
  expires: bigint;
  cost:    bigint;
}

export interface RegistrationState {
  step:         RegistrationStep;
  /** Progress 0–100 during the waiting phase */
  waitProgress: number;
  /** User-facing error message (from errors.ts, no ENS wording) */
  error:        string | null;
  /** Set on success */
  result:       RegistrationResult | null;
  /** Start the registration flow */
  register:     (params: RegisterFlowParams) => Promise<void>;
  /** Reset to idle */
  reset:        () => void;
}

export interface RegisterFlowParams {
  label:         string;          // normalized label
  tld:           SupportedTLD;
  duration:      bigint;          // seconds
  totalCost:     bigint;          // USDC (6 decimals), used for approval + maxCost
  resolverAddr?: `0x${string}`;  // optional; defaults to ZERO_ADDRESS
  reverseRecord?: boolean;        // optional; defaults to false; non-fatal if fails
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_COMMITMENT_AGE_MS = 62_000; // 62s — 2s buffer over the 60s on-chain minimum
const POLL_INTERVAL_MS      = 3_000;
const MAX_WAIT_MS           = 90_000; // 90s max wait before timeout

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRegistration(): RegistrationState {
  const { address, chainId: walletChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step,         setStep]     = useState<RegistrationStep>("idle");
  const [waitProgress, setProgress] = useState(0);
  const [error,        setError]    = useState<string | null>(null);
  const [result,       setResult]   = useState<RegistrationResult | null>(null);

  // Persisted across commit → register steps
  const secretRef     = useRef<`0x${string}` | null>(null);
  const commitHashRef = useRef<`0x${string}` | null>(null);
  const paramsRef     = useRef<CommitmentParams | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setProgress(0);
    setError(null);
    setResult(null);
    secretRef.current     = null;
    commitHashRef.current = null;
    paramsRef.current     = null;
  }, []);

  const fail = useCallback((e: unknown) => {
    const { code } = classifyRawError(e);
    // Always log the raw error so the exact revert reason is visible in the console
    console.error("[ArcNS:register] raw error:", {
      code,
      shortMessage: (e as any)?.shortMessage ?? null,
      message:      (e as any)?.message ?? String(e),
      errorName:    (e as any)?.cause?.data?.errorName ?? (e as any)?.cause?.cause?.data?.errorName ?? null,
      cause:        (e as any)?.cause ?? null,
    });
    setError(userFacingMessage(code));
    setStep("failed");
  }, []);

  const register = useCallback(async (params: RegisterFlowParams) => {
    if (!address) {
      setError(userFacingMessage(ARC_ERR.CHAIN_MISMATCH));
      setStep("failed");
      return;
    }

    if (walletChainId !== DEPLOYED_CHAIN_ID) {
      setError(userFacingMessage(ARC_ERR.CHAIN_MISMATCH));
      setStep("failed");
      return;
    }

    const {
      label,
      tld,
      duration,
      totalCost,
      resolverAddr = ZERO_ADDRESS,
      reverseRecord = false,
    } = params;

    const normalizedName = normalizeLabel(label);
    const ctrl           = controllerFor(tld);
    const controllerAddr = tld === "arc" ? ADDR_ARC_CONTROLLER : ADDR_CIRCLE_CONTROLLER;
    const maxCost        = maxCostWithSlippage(totalCost);

    setError(null);
    setResult(null);

    try {
      // ── Step 1: Approve USDC ───────────────────────────────────────────────
      setStep("approving");
      await writeContractAsync({
        ...USDC_CONTRACT,
        functionName: "approve",
        args:         [controllerAddr, maxCost],
      });

      // ── Step 2: Build commitment ───────────────────────────────────────────
      const secret = randomSecret();
      secretRef.current = secret;

      const commitParams: CommitmentParams = {
        name:          normalizedName,
        owner:         address,
        duration,
        secret,
        resolverAddr,
        reverseRecord,
        sender:        address,
      };
      paramsRef.current = commitParams;

      const commitment = makeCommitment(commitParams);
      commitHashRef.current = commitment;

      // ── Step 3: Submit commit tx ───────────────────────────────────────────
      setStep("committing");
      await writeContractAsync({
        ...ctrl,
        functionName: "commit",
        args:         [commitment],
      });

      // ── Step 4: Wait for commitment to mature (≥60s) ───────────────────────
      setStep("waiting");
      const startMs  = Date.now();
      const deadline = startMs + MIN_COMMITMENT_AGE_MS;

      await new Promise<void>((resolve, reject) => {
        const tick = () => {
          const elapsed  = Date.now() - startMs;
          const progress = Math.min(100, Math.round((elapsed / MIN_COMMITMENT_AGE_MS) * 100));
          setProgress(progress);

          if (elapsed >= MIN_COMMITMENT_AGE_MS) {
            setProgress(100);
            resolve();
            return;
          }
          if (elapsed > MAX_WAIT_MS) {
            reject(new Error(`[${ARC_ERR.MATURITY_WAIT_TIMEOUT}] Commitment maturity wait timed out.`));
            return;
          }
          setTimeout(tick, POLL_INTERVAL_MS);
        };
        setTimeout(tick, POLL_INTERVAL_MS);
      });

      // ── Step 5: Register ───────────────────────────────────────────────────
      setStep("ready");
      setStep("registering");

      const registerArgs = buildRegisterArgs({
        name:          normalizedName,
        owner:         address,
        duration,
        secret,
        resolverAddr,
        reverseRecord,
        maxCost,
      });

      // Diagnostic: verify ABI/args alignment before submitting
      const registerAbiEntry = ctrl.abi.find(
        (e: any) => e.type === "function" && e.name === "register"
      ) as { inputs?: { name: string; type: string }[] } | undefined;
      console.log("[ArcNS:register] pre-submit diagnostic", {
        registerSignature:  registerAbiEntry?.inputs?.map(i => `${i.type} ${i.name}`).join(", ") ?? "not found",
        expectedParamCount: registerAbiEntry?.inputs?.length ?? "unknown",
        actualArgCount:     registerArgs.length,
        exactRegisterArgs:  registerArgs,
      });

      const txHash = await writeContractAsync({
        ...ctrl,
        functionName: "register",
        args:         registerArgs,
      });

      // ── Step 6: Success ────────────────────────────────────────────────────
      setResult({
        txHash,
        name:    normalizedName,
        tld,
        expires: 0n, // populated by the caller from NameRegistered event if needed
        cost:    totalCost,
      });
      setStep("success");

    } catch (e: unknown) {
      fail(e);
    }
  }, [address, walletChainId, writeContractAsync, fail]);

  return { step, waitProgress, error, result, register, reset };
}
