import { useReadContract, useWriteContract, useAccount, useReadContracts } from "wagmi";
import { keccak256, stringToBytes, encodeAbiParameters } from "viem";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  CONTRACTS, CONTROLLER_ABI, REGISTRAR_ABI, RESOLVER_ABI, REVERSE_REGISTRAR_ABI, ERC20_ABI,
} from "../lib/contracts";
import { namehash, labelToTokenId } from "../lib/namehash";
import { isValidLabel } from "../lib/domain";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/nameCache";

// Re-export for components that import from here
export { CONTROLLER_ABI as CONTROLLER_V2_ABI } from "../lib/contracts";
export { cacheInvalidate as invalidateAvailability } from "../lib/nameCache";

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

// ─── Debounce hook ────────────────────────────────────────────────────────────
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// ─── Availability — cache-first, RPC background ──────────────────────────────
//
// Resolution order (all synchronous from UI perspective):
//   1. useState initialised from L1/L2 cache → instant on mount
//   2. RPC fires in background → updates state when it resolves
//   3. Optimistic default: if no cache and RPC pending → treat as AVAILABLE
//
// The key fix: `resolved` is a React state value, not a conditional return.
// This means the UI always has a stable value and never depends on rpc.data directly.
//
export function useAvailability(label: string, tld: "arc" | "circle") {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  const valid = isValidLabel(label);

  // Primary state: initialised from cache synchronously, updated by RPC
  // null = no data yet (will use optimistic default in getNameState)
  const [resolved, setResolved] = useState<boolean | null>(() =>
    valid ? cacheGet(label, tld) : null
  );
  const [isRefetching, setIsRefetching] = useState(false);

  // When label/tld changes, immediately load from cache (synchronous)
  useEffect(() => {
    if (!valid) { setResolved(null); return; }
    const hit = cacheGet(label, tld);
    setResolved(hit); // null if cache miss — optimistic default kicks in
  }, [label, tld, valid]);

  // RPC — always fires for valid labels, purely for background revalidation
  const rpc = useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: "available",
    args: [label],
    query: {
      enabled: valid,
      staleTime: 0,          // always revalidate — we serve from our own cache
      gcTime: 600_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  });

  // When RPC resolves: update our state + write to cache
  useEffect(() => {
    if (rpc.data === undefined || rpc.isLoading || rpc.isError) return;
    const fresh = rpc.data as boolean;
    cacheSet(label, tld, fresh);
    setResolved(fresh);
  }, [rpc.data, rpc.isLoading, rpc.isError, label, tld]);

  // Track background refresh for the subtle UI dot
  useEffect(() => {
    setIsRefetching(rpc.isFetching && resolved !== null);
  }, [rpc.isFetching, resolved]);

  return {
    // data: boolean | undefined — undefined means "no data yet, use optimistic"
    data: resolved !== null ? resolved : undefined,
    // Only surface isLoading/isError to UI when we have NO cached data
    // If we have cached data, these are always false (background refresh is silent)
    isLoading: resolved === null && rpc.isLoading,
    // isError: false even on RPC error when no cache — let optimistic default handle it
    // The RPC will retry silently; we don't want to block the UI
    isError: false,
    isRefetching,
  };
}

// ─── Rent price ───────────────────────────────────────────────────────────────
// Returns { base, premium } in USDC (6 decimals).
// duration must be in seconds (BigInt). Price scales linearly with duration.
export function useRentPrice(label: string, tld: "arc" | "circle", duration = ONE_YEAR) {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  return useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: "rentPrice",
    args: [label, duration],
    query: {
      enabled: isValidLabel(label) && duration > 0n,
      staleTime: 30_000,
      gcTime: 120_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  });
}

// ─── USDC balance ─────────────────────────────────────────────────────────────
export function useUSDCBalance() {
  const { address } = useAccount();
  return useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address!],
    query: {
      enabled: !!address,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Name expiry ──────────────────────────────────────────────────────────────
export function useNameExpiry(label: string, tld: "arc" | "circle") {
  const registrar = tld === "arc" ? CONTRACTS.arcRegistrar : CONTRACTS.circleRegistrar;
  const tokenId = labelToTokenId(label);
  return useReadContract({
    address: registrar,
    abi: REGISTRAR_ABI,
    functionName: "nameExpires",
    args: [tokenId],
    query: {
      enabled: isValidLabel(label),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Resolve address ──────────────────────────────────────────────────────────
export function useResolveAddress(domain: string) {
  const node = namehash(domain);
  return useReadContract({
    address: CONTRACTS.resolver,
    abi: RESOLVER_ABI,
    functionName: "addr",
    args: [node],
    query: {
      enabled: domain.includes("."),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Resolve name (reverse) ───────────────────────────────────────────────────
export function useResolveName(node: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.resolver,
    abi: RESOLVER_ABI,
    functionName: "name",
    args: [node],
    query: {
      enabled: !!node && node !== "0x0000000000000000000000000000000000000000000000000000000000000000",
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Phase 26: Balance safety check ──────────────────────────────────────────
export function useBalanceSafety(requiredAmount: bigint) {
  const { data: balance } = useUSDCBalance();
  const bal = (balance as bigint | undefined) ?? 0n;
  // Arc uses USDC as gas — reserve $2.00 for gas costs on top of payment
  const GAS_BUFFER = 2_000_000n; // $2.00 USDC
  const sufficient = bal >= requiredAmount + GAS_BUFFER;
  const shortfall = sufficient ? 0n : (requiredAmount + GAS_BUFFER - bal);
  return { balance: bal, sufficient, shortfall };
}

// ─── Registration flow (V2 with slippage + balance check) ────────────────────
export type RegStep = "idle" | "approving" | "committing" | "waiting" | "registering" | "done" | "error";

export interface RegistrationResult {
  txHash: `0x${string}`;
  name: string;
  expires: bigint;
  cost: bigint;
}

export function useRegistration() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<RegStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);
  const [waitProgress, setWaitProgress] = useState(0);

  const register = useCallback(async (
    label: string,
    tld: "arc" | "circle",
    duration: bigint,
    resolverAddr: `0x${string}`,
    setReverse: boolean,
    totalCost: bigint
  ) => {
    if (!address) return;
    setError(null);
    setResult(null);

    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost = totalCost + (totalCost * 500n) / 10000n; // 5% slippage buffer

    try {
      setStep("approving");
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [controller, maxCost],
      });
      await new Promise(r => setTimeout(r, 3000));

      setStep("committing");
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
      const labelHash = keccak256(stringToBytes(label));
      const commitment = keccak256(encodeAbiParameters(
        [
          { type: "bytes32" }, { type: "address" }, { type: "uint256" },
          { type: "bytes32" }, { type: "address" }, { type: "bytes[]" }, { type: "bool" },
        ],
        [labelHash, address, duration, secret, resolverAddr, [], setReverse]
      ));
      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });

      // Phase 28: animated wait progress
      setStep("waiting");
      setWaitProgress(0);
      await new Promise<void>(resolve => {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 1000;
          setWaitProgress(Math.min(100, Math.floor((elapsed / 65000) * 100)));
          if (elapsed >= 65000) { clearInterval(interval); resolve(); }
        }, 1000);
      });

      setStep("registering");
      const tx = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [label, address, duration, secret, resolverAddr, [], setReverse, maxCost],
      });

      setResult({
        txHash: tx,
        name: `${label}.${tld}`,
        expires: BigInt(Math.floor(Date.now() / 1000)) + duration,
        cost: totalCost,
      });
      // Invalidate cache — name is now TAKEN
      cacheInvalidate(label, tld);
      setStep("done");
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStep("error");
    }
  }, [address, writeContractAsync]);

  const reset = useCallback(() => { setStep("idle"); setError(null); setResult(null); }, []);

  return { register, step, error, result, waitProgress, reset };
}

// ─── Renewal ──────────────────────────────────────────────────────────────────
export function useRenewal() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renew = useCallback(async (
    label: string,
    tld: "arc" | "circle",
    duration: bigint,
    cost: bigint
  ) => {
    setLoading(true);
    setError(null);
    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost = cost + (cost * 500n) / 10000n; // 5% slippage
    try {
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [controller, maxCost],
      });
      await new Promise(r => setTimeout(r, 3000));
      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "renew",
        args: [label, duration, maxCost],
      });
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  return { renew, loading, error };
}

// ─── Phase 23: Set primary name ───────────────────────────────────────────────
export function useSetPrimaryName() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setPrimary = useCallback(async (name: string) => {
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      await writeContractAsync({
        address: CONTRACTS.reverseRegistrar,
        abi: REVERSE_REGISTRAR_ABI,
        functionName: "setName",
        args: [name],
      });
      setDone(true);
    } catch (e: any) {
      setError(e.shortMessage || e.message);
    } finally {
      setLoading(false);
    }
  }, [writeContractAsync]);

  return { setPrimary, loading, error, done };
}
