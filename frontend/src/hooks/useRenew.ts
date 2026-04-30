"use client";
/**
 * useRenew.ts — v3 renewal hook.
 *
 * Handles USDC approval + renew() call with maxCost guard.
 * All errors flow through errors.ts.
 * No ENS-branded strings.
 */

import { useWriteContract, useAccount } from "wagmi";
import { useState, useCallback } from "react";
import { controllerFor, USDC_CONTRACT, ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "../lib/contracts";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import { maxCostWithSlippage } from "../lib/commitment";
import { classifyRawError, userFacingMessage, ARC_ERR } from "../lib/errors";
import { normalizeLabel, type SupportedTLD } from "../lib/normalization";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RenewStep = "idle" | "approving" | "renewing" | "success" | "failed";

export interface RenewState {
  step:    RenewStep;
  error:   string | null;
  txHash:  `0x${string}` | null;
  renew:   (params: RenewParams) => Promise<void>;
  reset:   () => void;
}

export interface RenewParams {
  label:     string;       // normalized label
  tld:       SupportedTLD;
  duration:  bigint;       // seconds
  totalCost: bigint;       // USDC (6 decimals)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRenew(): RenewState {
  const { address, chainId: walletChainId } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [step,   setStep]   = useState<RenewStep>("idle");
  const [error,  setError]  = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  const renew = useCallback(async (params: RenewParams) => {
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

    const { label, tld, duration, totalCost } = params;
    const normalizedName = normalizeLabel(label);
    const ctrl           = controllerFor(tld);
    const controllerAddr = tld === "arc" ? ADDR_ARC_CONTROLLER : ADDR_CIRCLE_CONTROLLER;
    const maxCost        = maxCostWithSlippage(totalCost);

    setError(null);
    setTxHash(null);

    // ── Pre-flight: ownership guard ────────────────────────────────────────
    // The v3 controller.renew() is permissionless by protocol design.
    // Product policy requires owner-only renewal. Abort before any tx if the
    // connected wallet is not the current ownerOf(tokenId) on the base registrar.
    try {
      const { labelToTokenId } = await import("../lib/namehash");
      const { registrarFor }   = await import("../lib/contracts");
      const { publicClient }   = await import("../lib/publicClient");
      const { REGISTRAR_ABI }  = await import("../lib/abis");

      const tokenId   = labelToTokenId(normalizedName);
      const registrar = registrarFor(tld);

      let tokenOwner: string;
      try {
        tokenOwner = await publicClient.readContract({
          address:      registrar.address,
          abi:          REGISTRAR_ABI,
          functionName: "ownerOf",
          args:         [tokenId],
        }) as string;
      } catch {
        // ownerOf reverts if the token does not exist (name not registered / fully expired).
        // Treat as non-owner — the name is not in a renewable state.
        setError(userFacingMessage(ARC_ERR.NOT_NAME_OWNER));
        setStep("failed");
        return;
      }

      if (tokenOwner.toLowerCase() !== address.toLowerCase()) {
        setError(userFacingMessage(ARC_ERR.NOT_NAME_OWNER));
        setStep("failed");
        return;
      }
    } catch (importErr: unknown) {
      // Dynamic import failure — treat as infra error and fall through to the
      // main try/catch which will classify and surface it.
      throw importErr;
    }

    try {
      // ── Step 1: Approve USDC ───────────────────────────────────────────────
      setStep("approving");
      await writeContractAsync({
        ...USDC_CONTRACT,
        functionName: "approve",
        args:         [controllerAddr, maxCost],
      });

      // ── Step 2: Renew ──────────────────────────────────────────────────────
      setStep("renewing");
      const hash = await writeContractAsync({
        ...ctrl,
        functionName: "renew",
        args:         [normalizedName, duration, maxCost],
      });

      // Wait for the tx to be mined before declaring success
      const { publicClient } = await import("../lib/publicClient");
      await publicClient.waitForTransactionReceipt({ hash });

      setTxHash(hash);
      setStep("success");

    } catch (e: unknown) {
      const { code } = classifyRawError(e);
      setError(userFacingMessage(code));
      setStep("failed");
    }
  }, [address, walletChainId, writeContractAsync]);

  return { step, error, txHash, renew, reset };
}
