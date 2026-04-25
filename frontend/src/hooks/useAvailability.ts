"use client";
/**
 * useAvailability.ts — canonical availability + price hook for ArcNS v3.
 *
 * Canonical product flow:
 *   normalize → validate → price-tier preview → availability RPC call
 *
 * Returns everything a SearchBar or DomainCard needs to render:
 *   - nameState: INVALID | CHECKING | AVAILABLE | TAKEN
 *   - price breakdown (base, premium, total)
 *   - price tier label
 *   - loading/error flags
 *
 * Reads are RPC-backed via wagmi useReadContract.
 * No subgraph dependency.
 */

import { useReadContract } from "wagmi";
import { useMemo } from "react";
import { controllerFor } from "../lib/contracts";
import {
  normalizeLabel,
  validateLabel,
  priceTierFor,
  type NameState,
  type SupportedTLD,
  DURATION_OPTIONS,
} from "../lib/normalization";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AvailabilityResult {
  /** Canonical name state after normalization + RPC */
  nameState:      NameState;
  /** Normalized label (lowercase, trimmed) */
  normalizedLabel: string;
  /** Base price in USDC (6 decimals) */
  baseCost:       bigint;
  /** Premium for recently expired names (6 decimals) */
  premiumCost:    bigint;
  /** Total cost = base + premium */
  totalCost:      bigint;
  /** Whether a premium is active */
  hasPremium:     boolean;
  /** Human-readable price tier label (e.g. "5+ characters") */
  tierLabel:      string;
  /** True while the availability RPC call is in-flight */
  isLoading:      boolean;
  /** True while the price RPC call is in-flight */
  isPriceLoading: boolean;
  /** True if either RPC call errored */
  isError:        boolean;
  /** Trigger a manual refetch of availability */
  refetch:        () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAvailability — normalize → validate → price-tier preview → availability lookup.
 *
 * @param rawLabel  Raw user input (may be unnormalized)
 * @param tld       "arc" | "circle"
 * @param duration  Registration duration in seconds (default: 1 year)
 */
export function useAvailability(
  rawLabel:  string,
  tld:       SupportedTLD,
  duration?: bigint,
): AvailabilityResult {
  const dur = duration ?? BigInt(DURATION_OPTIONS[0].seconds);

  // ── Step 1: Normalize ──────────────────────────────────────────────────────
  const normalizedLabel = normalizeLabel(rawLabel);
  const validationError = validateLabel(normalizedLabel);
  const isValid         = validationError === null && normalizedLabel.length > 0;

  // ── Step 2: Price tier preview (instant, no RPC) ───────────────────────────
  const tier = priceTierFor(normalizedLabel);

  // ── Step 3: Availability RPC call ──────────────────────────────────────────
  const ctrl = controllerFor(tld);

  const {
    data:    availableData,
    isLoading: availLoading,
    isError:   availError,
    refetch,
  } = useReadContract({
    ...ctrl,
    functionName: "available",
    args:         [normalizedLabel],
    query: {
      enabled:             isValid,
      staleTime:           15_000,
      refetchOnWindowFocus: false,
    },
  });

  // ── Step 4: Price RPC call ─────────────────────────────────────────────────
  const {
    data:    priceData,
    isLoading: priceLoading,
    isError:   priceError,
  } = useReadContract({
    ...ctrl,
    functionName: "rentPrice",
    args:         [normalizedLabel, dur],
    query: {
      enabled:             isValid,
      staleTime:           15_000,
      refetchOnWindowFocus: false,
    },
  });

  // ── Derive name state ──────────────────────────────────────────────────────
  const nameState = useMemo<NameState>(() => {
    if (!isValid)                    return "INVALID";
    if (availError)                  return "CHECKING"; // silent retry
    if (availableData !== undefined) return availableData ? "AVAILABLE" : "TAKEN";
    if (availLoading)                return "CHECKING";
    return "CHECKING";
  }, [isValid, availError, availableData, availLoading]);

  // ── Derive price breakdown ─────────────────────────────────────────────────
  const price = priceData as { base: bigint; premium: bigint } | undefined;

  const baseCost    = price?.base    ?? 0n;
  const premiumCost = price?.premium ?? 0n;
  const totalCost   = baseCost + premiumCost;
  const hasPremium  = premiumCost > 0n;

  return {
    nameState,
    normalizedLabel,
    baseCost,
    premiumCost,
    totalCost,
    hasPremium,
    tierLabel:      tier.label,
    isLoading:      availLoading,
    isPriceLoading: priceLoading,
    isError:        availError || priceError,
    refetch,
  };
}

// ─── Balance safety check ─────────────────────────────────────────────────────
// Extracted from v1 useArcNS for use by v3 components and tests.

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { USDC_CONTRACT } from "../lib/contracts";

export function useUSDCBalance() {
  const { address } = useAccount();
  const [data, setData] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    if (!address) { setData(undefined); return; }
    let cancelled = false;
    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        ...USDC_CONTRACT,
        functionName: "balanceOf",
        args: [address],
      })
        .then((r: unknown) => { if (!cancelled) setData(typeof r === "bigint" ? r : 0n); })
        .catch(() => { if (!cancelled) setData(0n); });
    });
    return () => { cancelled = true; };
  }, [address]);

  return { data };
}

export function useBalanceSafety(requiredAmount: bigint) {
  const { data: balance } = useUSDCBalance();
  const bal = (balance as bigint | undefined) ?? 0n;
  const sufficient = bal >= requiredAmount;
  return { balance: bal, sufficient, shortfall: sufficient ? 0n : requiredAmount - bal };
}
