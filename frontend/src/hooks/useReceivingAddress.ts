"use client";
/**
 * useReceivingAddress.ts — read and write the addr record for a given namehash.
 *
 * Reads addr(node) from ArcNSResolver.
 * Writes setAddr(node, address) on ArcNSResolver.
 * Guards: chain must be DEPLOYED_CHAIN_ID, caller must be Registry owner of node.
 *
 * No ENS-branded strings. No resolver jargon in user-facing messages.
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback } from "react";
import { RESOLVER_CONTRACT, REGISTRY_CONTRACT } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AddrState = "set" | "missing" | "loading";
export type SetAddrStep = "idle" | "setting" | "success" | "failed";

export interface UseReceivingAddressOptions {
  /** When false, suppresses the on-chain read. Default: true */
  enabled?: boolean;
}

export interface UseReceivingAddressResult {
  /** The current receiving address, or null if zero/missing */
  receivingAddress: `0x${string}` | null;
  /** Three-state classification of the addr record */
  addrState: AddrState;
  /** True while the on-chain read is in flight */
  isLoading: boolean;
  /** Step for the setAddr write flow */
  setStep: SetAddrStep;
  /** User-facing error from the write flow, or null */
  setError: string | null;
  /** Call setAddr(node, address) on the Resolver */
  setReceivingAddress: (address: `0x${string}`) => Promise<void>;
  /** Reset setStep to "idle" and clear setError */
  resetSet: () => void;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReceivingAddress(
  node: `0x${string}` | undefined,
  options?: UseReceivingAddressOptions
): UseReceivingAddressResult {
  const { address: connectedAddress, chainId: walletChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const enabled = options?.enabled !== false && !!node;

  const [setStep, setSetStep] = useState<SetAddrStep>("idle");
  const [setError, setSetError] = useState<string | null>(null);

  // ── Read addr(node) ────────────────────────────────────────────────────────
  const {
    data: addrRaw,
    isLoading: addrLoading,
    refetch: refetchAddr,
  } = useReadContract({
    ...RESOLVER_CONTRACT,
    functionName: "addr",
    args: node ? [node] : undefined,
    query: {
      enabled,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  });

  // ── Derive receivingAddress and addrState ──────────────────────────────────
  const rawAddr = addrRaw as string | undefined;
  const receivingAddress: `0x${string}` | null =
    rawAddr && rawAddr !== ZERO_ADDRESS
      ? (rawAddr as `0x${string}`)
      : null;

  const addrState: AddrState = addrLoading
    ? "loading"
    : receivingAddress
    ? "set"
    : "missing";

  // ── Write setAddr(node, address) ───────────────────────────────────────────
  const resetSet = useCallback(() => {
    setSetStep("idle");
    setSetError(null);
  }, []);

  const setReceivingAddress = useCallback(
    async (address: `0x${string}`) => {
      if (!node) return;

      // Chain guard
      if (walletChainId !== DEPLOYED_CHAIN_ID) {
        setSetError(userFacingMessage(ARC_ERR.CHAIN_MISMATCH));
        setSetStep("failed");
        return;
      }

      // Owner guard — read Registry.owner(node) before submitting
      try {
        const { publicClient } = await import("../lib/publicClient");
        const registryOwner = await publicClient.readContract({
          ...REGISTRY_CONTRACT,
          functionName: "owner",
          args: [node],
        });
        if (
          !connectedAddress ||
          (registryOwner as string).toLowerCase() !== connectedAddress.toLowerCase()
        ) {
          setSetError(userFacingMessage(ARC_ERR.UNAUTHORIZED_NODE_OWNER));
          setSetStep("failed");
          return;
        }
      } catch {
        // If the owner read fails, fall through and let the contract revert handle it
      }

      setSetError(null);
      setSetStep("setting");

      try {
        const txHash = await writeContractAsync({
          ...RESOLVER_CONTRACT,
          functionName: "setAddr",
          args: [node, address],
        });
        const { publicClient } = await import("../lib/publicClient");
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        await refetchAddr();
        setSetStep("success");
      } catch (e: unknown) {
        const { code } = classifyRawError(e);
        setSetError(userFacingMessage(code));
        setSetStep("failed");
      }
    },
    [node, walletChainId, connectedAddress, writeContractAsync, refetchAddr]
  );

  return {
    receivingAddress,
    addrState,
    isLoading: addrLoading,
    setStep,
    setError,
    setReceivingAddress,
    resetSet,
  };
}
