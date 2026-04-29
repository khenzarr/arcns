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
 * Addr sync model (primary-name-linked):
 *   When a new primary name is set, setAddr(node, connectedWallet) is called
 *   unconditionally — no user prompt for stale addresses. The receiving address
 *   is always synchronized to the connected wallet automatically.
 *
 * Previous primary name clearing:
 *   After syncing the new primary name's addr, the hook attempts to clear the
 *   previous primary name's addr (setAddr(oldNode, ZERO_ADDRESS)) as a best-effort
 *   operation. This is only attempted if the connected wallet is still the Registry
 *   owner of the old node. If not, the clear is skipped silently — the UI copy
 *   remains neutral and does not imply the old name was deactivated.
 *
 * All errors flow through errors.ts. No ENS-branded strings.
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback } from "react";
import { RESOLVER_CONTRACT, REVERSE_REGISTRAR_CONTRACT } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { reverseNodeFor, namehash } from "../lib/namehash";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";
import { clearPrevPrimaryAddr } from "../lib/clearPrevPrimaryAddr";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrimaryNameStatus = "none" | "verified" | "stale";

export type AddrSyncStep =
  | "idle"
  | "syncing"
  | "synced"
  | "partial-success"
  | "failed";
  // "stale-prompt" removed — addr sync is now unconditional (primary-name-linked model)

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
  /** True when addr sync succeeded in the current session */
  addrSynced:    boolean;
  /** Step for the addr sync sub-flow */
  addrSyncStep:  AddrSyncStep;
  /** User-facing error from the addr sync sub-flow, or null */
  addrSyncError: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePrimaryName(address?: `0x${string}`): PrimaryNameState {
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const { writeContractAsync }        = useWriteContract();

  const addr = address ?? connectedAddress;

  const [setStep,  setSetStep]  = useState<"idle" | "setting" | "success" | "failed">("idle");
  const [setError, setSetError] = useState<string | null>(null);

  // ── Addr sync state ────────────────────────────────────────────────────────
  const [addrSynced,    setAddrSynced]    = useState(false);
  const [addrSyncStep,  setAddrSyncStep]  = useState<AddrSyncStep>("idle");
  const [addrSyncError, setAddrSyncError] = useState<string | null>(null);

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
    setAddrSynced(false);
    setAddrSyncStep("idle");
    setAddrSyncError(null);
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

    // Capture previous primary name before any async work so we can attempt
    // to clear its addr after the new primary is set.
    const prevPrimary = primaryName;

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

      // ── Addr sync after setName confirms ──────────────────────────────────
      // Primary-name-linked model: setAddr(node, connectedWallet) is called
      // unconditionally whenever the addr does not already match the connected
      // wallet. No user prompt for stale addresses.
      const node = namehash(fullName) as `0x${string}`;
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
      try {
        const currentAddr = await publicClient.readContract({
          ...RESOLVER_CONTRACT,
          functionName: "addr",
          args: [node],
        }) as string;

        const addrMatches =
          currentAddr &&
          currentAddr !== ZERO_ADDRESS &&
          currentAddr.toLowerCase() === (addr as string).toLowerCase();

        if (!addrMatches) {
          // Missing or stale — sync unconditionally to connected wallet (no prompt)
          setAddrSyncStep("syncing");
          try {
            const addrTxHash = await writeContractAsync({
              ...RESOLVER_CONTRACT,
              functionName: "setAddr",
              args: [node, addr as `0x${string}`],
            });
            await publicClient.waitForTransactionReceipt({ hash: addrTxHash });
            setAddrSynced(true);
            setAddrSyncStep("synced");
          } catch (addrErr: unknown) {
            const { toUserMessage } = await import("../lib/errors");
            setAddrSyncStep("partial-success");
            setAddrSyncError(toUserMessage(addrErr));
          }
        }
        // addr already matches connected wallet — no setAddr tx needed

        // ── Best-effort: clear previous primary name's addr ───────────────
        // Must run regardless of whether the new name needed an addr sync,
        // because the old primary's addr must be cleared in all cases.
        // Shared utility handles owner check and non-fatal failure.
        // UI copy must not imply the old name was deactivated.
        if (prevPrimary) {
          await clearPrevPrimaryAddr(prevPrimary, fullName, addr as `0x${string}`, writeContractAsync);
        }
      } catch {
        // Addr read failed — skip sync silently, setName still succeeded
      }

      // Final authoritative refetch — covers all addr-sync exit paths:
      // synced, skipped (addr already matched), and partial-success.
      // The early refetch above (after setName receipt) remains as an
      // optimistic update; this one ensures the cache reflects the fully
      // settled on-chain state after all subsequent transactions complete.
      await refetchPrimaryName();
      setSetStep("success");
    } catch (e: unknown) {
      const { code } = classifyRawError(e);
      setSetError(userFacingMessage(code));
      setSetStep("failed");
    }
  }, [addr, walletChainId, writeContractAsync, primaryName, refetchPrimaryName]);

  return {
    primaryName,
    status,
    isLoading:     nameLoading || resolveLoading,
    setStep,
    setError,
    setPrimaryName,
    resetSet,
    addrSynced,
    addrSyncStep,
    addrSyncError,
  };
}
