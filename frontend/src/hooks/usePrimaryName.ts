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
import { useState, useCallback, useRef } from "react";
import { RESOLVER_CONTRACT, REVERSE_REGISTRAR_CONTRACT } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { reverseNodeFor, namehash } from "../lib/namehash";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PrimaryNameStatus = "none" | "verified" | "stale";

export type AddrSyncStep =
  | "idle"
  | "syncing"
  | "synced"
  | "partial-success"
  | "stale-prompt"
  | "failed";

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
  /** User confirms overwrite of stale addr */
  confirmStaleSync: () => Promise<void>;
  /** User skips overwrite of stale addr */
  skipStaleSync: () => void;
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
  // Ref to hold the node for stale-prompt confirm/skip
  const staleSyncNodeRef = useRef<`0x${string}` | null>(null);

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
    staleSyncNodeRef.current = null;
  }, []);

  const skipStaleSync = useCallback(() => {
    setAddrSyncStep("idle");
    staleSyncNodeRef.current = null;
  }, []);

  const confirmStaleSync = useCallback(async () => {
    const node = staleSyncNodeRef.current;
    if (!node || !connectedAddress) return;
    setAddrSyncStep("syncing");
    try {
      const { publicClient } = await import("../lib/publicClient");
      const addrTxHash = await writeContractAsync({
        ...RESOLVER_CONTRACT,
        functionName: "setAddr",
        args: [node, connectedAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash: addrTxHash });
      setAddrSynced(true);
      setAddrSyncStep("synced");
      staleSyncNodeRef.current = null;
    } catch (e: unknown) {
      const { toUserMessage } = await import("../lib/errors");
      setAddrSyncStep("partial-success");
      setAddrSyncError(toUserMessage(e));
    }
  }, [connectedAddress, writeContractAsync]);

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

      // ── Addr sync after setName confirms ──────────────────────────────────
      const node = namehash(fullName) as `0x${string}`;
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
      try {
        const currentAddr = await publicClient.readContract({
          ...RESOLVER_CONTRACT,
          functionName: "addr",
          args: [node],
        }) as string;

        if (!currentAddr || currentAddr === ZERO_ADDRESS) {
          // Branch 1: Missing addr — auto-sync to connected wallet
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
        } else if (currentAddr.toLowerCase() !== (addr as string).toLowerCase()) {
          // Branch 2: Stale addr — prompt user
          staleSyncNodeRef.current = node;
          setAddrSyncStep("stale-prompt");
        }
        // Branch 3: Already matches — skip (no transaction)
      } catch {
        // Addr read failed — skip sync silently, setName still succeeded
      }

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
    addrSynced,
    addrSyncStep,
    addrSyncError,
    confirmStaleSync,
    skipStaleSync,
  };
}
