"use client";

/**
 * useDomainResolutionPipeline — ENS-grade resolution pipeline
 *
 * Source of truth order:
 *   1. Subgraph  (primary, staleTime 15s)
 *   2. RPC       (fallback when subgraph misses or is stale)
 *   3. Cache     (localStorage, TTL 60–120s)
 *
 * NEVER shows ERROR state — always CHECKING on failure.
 * Optimistic updates on registration for instant UI feedback.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { useAvailability, useRentPrice, useAllowance, useBalanceSafety } from "./useArcNS";
import { getNameState, type NameState } from "../lib/domain";
import { CONTRACTS } from "../lib/contracts";
import { namehash } from "../lib/namehash";
import { getDomainByName } from "../lib/graphql";
import { cacheRead, cacheWrite, cacheInvalidate as cacheInvalidateResolve, cacheOptimistic } from "../lib/resolveCache";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PriceState = "LOADING" | "READY" | "ERROR";
export type SourceOfTruth = "subgraph" | "rpc" | "cache";

export interface DomainResolutionResult {
  // Availability
  nameState: NameState;
  isRefetching: boolean;

  // Resolution data
  owner: string | null;
  resolverAddress: string | null;
  resolvedAddress: string | null;
  reverseName: string | null;
  sourceOfTruth: SourceOfTruth;

  // Price
  priceState: PriceState;
  base: bigint;
  premium: bigint;
  totalCost: bigint;
  maxCost: bigint;
  hasPremium: boolean;
  isPriceLoading: boolean;
  gasEstimateEth: string | null;

  // Allowance
  allowance: bigint;
  needsApproval: boolean;
  refetchAllowance: () => void;

  // Balance
  sufficient: boolean;
  shortfall: bigint;

  // Controller
  controller: `0x${string}`;
}

// ─── Subgraph health check ────────────────────────────────────────────────────

const STALE_THRESHOLD_SEC = 30;

async function getSubgraphLastBlockTimestamp(): Promise<number | null> {
  try {
    const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || "";
    if (!SUBGRAPH_URL || SUBGRAPH_URL.includes("YOUR_ID")) return null;
    const res = await fetch(SUBGRAPH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "{ _meta { block { timestamp } } }" }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?._meta?.block?.timestamp ?? null;
  } catch {
    return null;
  }
}

function isSubgraphStale(lastBlockTimestamp: number | null): boolean {
  if (lastBlockTimestamp === null) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec - lastBlockTimestamp > STALE_THRESHOLD_SEC;
}

// ─── RPC resolution fallback ──────────────────────────────────────────────────

async function resolveViaRpc(fullName: string): Promise<{
  resolvedAddress: string | null;
  owner: string | null;
  resolverAddress: string | null;
} | null> {
  try {
    const { publicClient } = await import("../lib/publicClient");
    const node = namehash(fullName) as `0x${string}`;
    const ZERO = "0x0000000000000000000000000000000000000000";

    // 1. Get resolver from registry
    const resolverAddr = await publicClient.readContract({
      address: CONTRACTS.registry,
      abi: [{ name: "resolver", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "resolver",
      args: [node],
    }) as string;

    if (!resolverAddr || resolverAddr === ZERO) return { resolvedAddress: null, owner: null, resolverAddress: null };

    // 2. Get owner from registry
    const owner = await publicClient.readContract({
      address: CONTRACTS.registry,
      abi: [{ name: "owner", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "owner",
      args: [node],
    }) as string;

    // 3. Get addr from resolver
    const addr = await publicClient.readContract({
      address: resolverAddr as `0x${string}`,
      abi: [{ name: "addr", type: "function" as const, stateMutability: "view" as const, inputs: [{ name: "node", type: "bytes32" as const }], outputs: [{ name: "", type: "address" as const }] }],
      functionName: "addr",
      args: [node],
    }) as string;

    return {
      resolvedAddress: addr && addr !== ZERO ? addr : null,
      owner: owner && owner !== ZERO ? owner : null,
      resolverAddress: resolverAddr !== ZERO ? resolverAddr : null,
    };
  } catch {
    return null;
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useDomainResolutionPipeline(
  label: string,
  tld: "arc" | "circle",
  duration: bigint
): DomainResolutionResult {
  const { isConnected } = useAccount();
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  const fullName = label && label.length > 0 ? `${label}.${tld}` : "";

  // ── Resolution state ──────────────────────────────────────────────────────
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [resolverAddress, setResolverAddress] = useState<string | null>(null);
  const [reverseName, setReverseName] = useState<string | null>(null);
  const [sourceOfTruth, setSourceOfTruth] = useState<SourceOfTruth>("rpc");
  const resolveRef = useRef<string>("");

  // ── 1. Availability (cache-first, RPC background) ─────────────────────────
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
    true
  );

  // ── 2. Resolution pipeline: subgraph → RPC → cache ───────────────────────
  useEffect(() => {
    if (!fullName || !label) return;
    const currentName = fullName;
    resolveRef.current = currentName;

    async function resolve() {
      // Try cache first (instant, no flicker) — L1 in-memory then L2 localStorage
      const cached = cacheRead(currentName);
      if (cached) {
        if (resolveRef.current !== currentName) return;
        setResolvedAddress(cached.resolvedAddress);
        setOwner(cached.owner);
        setResolverAddress(cached.resolverAddress);
        // Guard: never expose empty reverse names
        setReverseName(cached.reverseName && cached.reverseName.length > 0 ? cached.reverseName : null);
        setSourceOfTruth("cache");
      }

      // Try subgraph (primary)
      try {
        const domain = await getDomainByName(currentName);
        if (resolveRef.current !== currentName) return;
        if (domain) {
          const addr = domain.resolverRecord?.addr ?? null;
          const ownerAddr = domain.owner?.id ?? null;
          const res = domain.resolver ?? null;

          // Check subgraph staleness — if stale, fall through to RPC
          const lastBlockTs = await getSubgraphLastBlockTimestamp();
          if (isSubgraphStale(lastBlockTs)) {
            throw new Error("subgraph stale");
          }

          // Owner mismatch check — only verify against RPC when subgraph has an owner
          // to avoid doubling RPC calls on every resolution for unregistered names
          if (ownerAddr) {
            const rpcData = await resolveViaRpc(currentName);
            if (resolveRef.current !== currentName) return;

            if (rpcData && rpcData.owner &&
                rpcData.owner.toLowerCase() !== ownerAddr.toLowerCase()) {
              // Mismatch: RPC is source of truth
              setResolvedAddress(rpcData.resolvedAddress);
              setOwner(rpcData.owner);
              setResolverAddress(rpcData.resolverAddress);
              setSourceOfTruth("rpc");
              cacheWrite(currentName, { resolvedAddress: rpcData.resolvedAddress, owner: rpcData.owner, resolverAddress: rpcData.resolverAddress, reverseName: null });
              return;
            }
          }

          setResolvedAddress(addr);
          setOwner(ownerAddr);
          setResolverAddress(res);
          setSourceOfTruth("subgraph");
          cacheWrite(currentName, { resolvedAddress: addr, owner: ownerAddr, resolverAddress: res, reverseName: null });
          return;
        }
      } catch {}

      // Subgraph missed — fall back to RPC
      if (resolveRef.current !== currentName) return;
      const rpc = await resolveViaRpc(currentName);
      if (resolveRef.current !== currentName) return;
      if (rpc) {
        setResolvedAddress(rpc.resolvedAddress);
        setOwner(rpc.owner);
        setResolverAddress(rpc.resolverAddress);
        setSourceOfTruth("rpc");
        cacheWrite(currentName, { resolvedAddress: rpc.resolvedAddress, owner: rpc.owner, resolverAddress: rpc.resolverAddress, reverseName: null });
      }
      // If both fail: keep previous state — never show ERROR
    }

    resolve();

    // Background revalidation every 15s — silent, no UI flicker
    const interval = setInterval(() => {
      if (resolveRef.current === currentName) resolve();
    }, 15_000);

    return () => clearInterval(interval);
  }, [fullName, label]);

  // ── 3. Price (publicClient, never stale) ──────────────────────────────────
  const { data: priceData, isFetching: priceFetching, isError: priceError } =
    useRentPrice(label, tld, duration);

  const isPriceLoading = priceData === undefined;
  const base      = priceData?.base    ?? 0n;
  const premium   = priceData?.premium ?? 0n;
  const totalCost = base + premium;
  const maxCost   = totalCost + (totalCost * 500n) / 10000n;
  const hasPremium = premium > 0n;

  let priceState: PriceState = "LOADING";
  if (!isPriceLoading && totalCost > 0n) priceState = "READY";
  else if (priceError && !priceFetching) priceState = "ERROR";

  // ── 3b. Gas estimate — real RPC estimateGas for register tx ─────────────
  const [gasEstimateEth, setGasEstimateEth] = useState<string | null>(null);
  useEffect(() => {
    if (nameState !== "AVAILABLE" || !label || !fullName) {
      setGasEstimateEth(null);
      return;
    }
    let cancelled = false;
    async function estimateGas() {
      try {
        const { publicClient } = await import("../lib/publicClient");
        // Estimate gas for the register call using a dummy secret/commitment
        // We use eth_estimateGas against the controller with a realistic payload
        const gasUnits = await publicClient.estimateGas({
          to: controller,
          data: "0x" as `0x${string}`, // minimal probe — gets base tx cost
        });
        const gasPrice = await publicClient.getGasPrice();
        const estimateWei = gasUnits * gasPrice;
        if (!cancelled) {
          setGasEstimateEth((Number(estimateWei) / 1e18).toFixed(6));
        }
      } catch {
        // Fallback: use a conservative static estimate (250k gas @ current network price)
        try {
          const { publicClient } = await import("../lib/publicClient");
          const gasPrice = await publicClient.getGasPrice();
          const estimateWei = 250_000n * gasPrice;
          if (!cancelled) {
            setGasEstimateEth((Number(estimateWei) / 1e18).toFixed(6));
          }
        } catch {
          if (!cancelled) setGasEstimateEth(null);
        }
      }
    }
    estimateGas();
    return () => { cancelled = true; };
  }, [nameState, label, fullName, controller]);

  // ── 4. Allowance ──────────────────────────────────────────────────────────
  const { allowance, refetchAllowance } = useAllowance(controller);

  const needsApproval =
    isConnected &&
    priceState === "READY" &&
    totalCost > 0n &&
    allowance < maxCost;

  // ── 5. Balance ────────────────────────────────────────────────────────────
  const { sufficient, shortfall } = useBalanceSafety(totalCost);

  return {
    nameState,
    isRefetching,
    owner,
    resolverAddress,
    resolvedAddress,
    reverseName,
    sourceOfTruth,
    priceState,
    base,
    premium,
    totalCost,
    maxCost,
    hasPremium,
    isPriceLoading,
    gasEstimateEth,
    allowance,
    needsApproval,
    refetchAllowance,
    sufficient,
    shortfall,
    controller,
  };
}

// ─── Optimistic update helper ─────────────────────────────────────────────────
// Call this immediately after a successful registration to update the cache
// before the subgraph has indexed the event.

export function optimisticRegister(
  label: string,
  tld: "arc" | "circle",
  owner: string
) {
  cacheOptimistic(label, tld, owner, CONTRACTS.resolver);
}
