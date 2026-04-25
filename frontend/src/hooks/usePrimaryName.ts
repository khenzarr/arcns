"use client";
/**
 * usePrimaryName.ts — v3 reverse/primary name hook.
 *
 * Responsibilities:
 *   - Read the current primary name for a connected address (3-state)
 *   - Trigger dashboard-driven primary name update via ReverseRegistrar.setName()
 *
 * Three-state primary name:
 *   "none"     — no reverse record set for this address
 *   "verified" — reverse record set AND the name resolves back to this address
 *   "stale"    — reverse record set BUT the name no longer resolves to this address
 *                (name transferred or expired)
 *
 * Registration-time primary name is a SEPARATE flow handled by useRegistration
 * (reverseRecord param). This hook is for dashboard-driven updates only.
 *
 * All errors flow through errors.ts. No ENS-branded strings.
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback } from "react";
import { RESOLVER_CONTRACT, REVERSE_REGISTRAR_CONTRACT } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { reverseNodeFor, namehash } from "../lib/namehash";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrimaryNameStatus = "none" | "verified" | "stale";

export interface PrimaryNameState {
  /** The primary name string, or null if not set */
  primaryName:   string | null;
  /** Three-state status */
  status:        PrimaryNameStatus;
  /** True while reading the reverse record */
  isLoading:     boolean;
  /** Step for the set-primary-name write flow */
  setStep:       "idle" | "setting" | "success" | "failed";
  /** User-facing error from the set flow */
  setError:      string | null;
  /** Trigger dashboard-driven primary name update */
  setPrimaryName: (fullName: string) => Promise<void>;
  /** Reset the set flow state */
  resetSet:      () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePrimaryName(address?: `0x${string}`): PrimaryNameState {
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const { writeContractAsync }        = useWriteContract();

  const addr = address ?? connectedAddress;

  const [setStep,  setSetStep]  = useState<"idle" | "setting" | "success" | "failed">("idle");
  const [setError, setSetError] = useState<string | null>(null);

  // ── Read reverse record ────────────────────────────────────────────────────
  const reverseNode = addr ? reverseNodeFor(addr) : undefined;

  const {
    data:      primaryNameRaw,
    isLoading: nameLoading,
    refetch:   refetchPrimaryName,
  } = useReadContract({
    ...RESOLVER_CONTRACT,
    functionName: "name",
    args:         reverseNode ? [reverseNode] : undefined,
    query: {
      enabled:             !!reverseNode,
      staleTime:           0,
      refetchOnWindowFocus: false,
    },
  });

  const primaryName = (primaryNameRaw as string | undefined) || null;

  // ── Read forward resolution to verify the name still points back ───────────
  const forwardNode = primaryName ? namehash(primaryName) : undefined;

  const {
    data:      resolvedAddr,
    isLoading: resolveLoading,
  } = useReadContract({
    ...RESOLVER_CONTRACT,
    functionName: "addr",
    args:         forwardNode ? [forwardNode] : undefined,
    query: {
      enabled:             !!forwardNode,
      staleTime:           30_000,
      refetchOnWindowFocus: false,
    },
  });

  // ── Derive three-state status ──────────────────────────────────────────────
  const status: PrimaryNameStatus = (() => {
    if (!primaryName) return "none";
    if (!resolvedAddr) return "none";
    const resolved = (resolvedAddr as string).toLowerCase();
    const expected = addr?.toLowerCase() ?? "";
    return resolved === expected ? "verified" : "stale";
  })();

  // ── Dashboard-driven primary name update ───────────────────────────────────
  const resetSet = useCallback(() => {
    setSetStep("idle");
    setSetError(null);
  }, []);

  const setPrimaryName = useCallback(async (fullName: string) => {
    if (!addr) {
      setSetError(userFacingMessage(ARC_ERR.CHAIN_MISMATCH));
      setSetStep("failed");
      return;
    }

    if (walletChainId !== DEPLOYED_CHAIN_ID) {
      setSetError(userFacingMessage(ARC_ERR.CHAIN_MISMATCH));
      setSetStep("failed");
      return;
    }

    setSetError(null);
    setSetStep("setting");

    try {
      const txHash = await writeContractAsync({
        ...REVERSE_REGISTRAR_CONTRACT,
        functionName: "setName",
        args:         [fullName],
      });
      // Wait for the tx to be mined before declaring success
      const { publicClient } = await import("../lib/publicClient");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      // Force refetch so the read path reflects the new on-chain state
      await refetchPrimaryName();
      setSetStep("success");
    } catch (e: unknown) {
      const { code } = classifyRawError(e);
      setSetError(userFacingMessage(code));
      setSetStep("failed");
    }
  }, [addr, walletChainId, writeContractAsync]);

  return {
    primaryName,
    status,
    isLoading:     nameLoading || resolveLoading,
    setStep,
    setError,
    setPrimaryName,
    resetSet,
  };
}
