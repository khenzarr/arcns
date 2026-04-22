"use client";

/**
 * useDomainResolutionPipeline
 *
 * Single source of truth for all domain state:
 *   - availability (cache-first, optimistic)
 *   - price (from RPC, never stale)
 *   - allowance (live, refetched after approval)
 *   - derived flags (needsApproval, sufficient, etc.)
 *
 * No other component should compute these independently.
 */

import { useAccount } from "wagmi";
import { useAvailability, useRentPrice, useAllowance, useBalanceSafety } from "./useArcNS";
import { getNameState, type NameState } from "../lib/domain";
import { CONTRACTS } from "../lib/contracts";

export type PriceState = "LOADING" | "READY" | "ERROR";

export interface DomainResolutionResult {
  // ── Availability ──────────────────────────────────────────────────────────
  nameState: NameState;
  isRefetching: boolean;

  // ── Price ─────────────────────────────────────────────────────────────────
  priceState: PriceState;
  base: bigint;
  premium: bigint;
  totalCost: bigint;
  maxCost: bigint;       // totalCost + 5% slippage
  hasPremium: boolean;
  isPriceLoading: boolean;

  // ── Allowance ─────────────────────────────────────────────────────────────
  allowance: bigint;
  needsApproval: boolean;
  refetchAllowance: () => void;

  // ── Balance ───────────────────────────────────────────────────────────────
  sufficient: boolean;
  shortfall: bigint;

  // ── Controller address (for approve target) ───────────────────────────────
  controller: `0x${string}`;
}

export function useDomainResolutionPipeline(
  label: string,
  tld: "arc" | "circle",
  duration: bigint
): DomainResolutionResult {
  const { isConnected } = useAccount();
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;

  // ── 1. Availability ───────────────────────────────────────────────────────
  const {
    data: availData,
    isLoading: availLoading,
    isError: availError,
    isRefetching,
  } = useAvailability(label, tld);

  const nameState: NameState = getNameState(
    label,
    availData as boolean | undefined,
    availLoading,
    availError,
    true // optimistic default
  );

  // ── 2. Price ──────────────────────────────────────────────────────────────
  const { data: priceData, isFetching: priceFetching, isError: priceError } =
    useRentPrice(label, tld, duration);

  const isPriceLoading = priceData === undefined;
  const base      = priceData?.base    ?? 0n;
  const premium   = priceData?.premium ?? 0n;
  const totalCost = base + premium;
  const maxCost   = totalCost + (totalCost * 500n) / 10000n; // 5% slippage
  const hasPremium = premium > 0n;

  let priceState: PriceState = "LOADING";
  if (!isPriceLoading && totalCost > 0n) priceState = "READY";
  else if (priceError && !priceFetching) priceState = "ERROR";

  // ── 3. Allowance — always fresh, re-fetched after approval ────────────────
  const { allowance, refetchAllowance } = useAllowance(controller);

  // needsApproval: only relevant when connected + price is known
  const needsApproval =
    isConnected &&
    priceState === "READY" &&
    totalCost > 0n &&
    allowance < maxCost;

  // ── 4. Balance ────────────────────────────────────────────────────────────
  const { sufficient, shortfall } = useBalanceSafety(totalCost);

  return {
    nameState,
    isRefetching,
    priceState,
    base,
    premium,
    totalCost,
    maxCost,
    hasPremium,
    isPriceLoading,
    allowance,
    needsApproval,
    refetchAllowance,
    sufficient,
    shortfall,
    controller,
  };
}
