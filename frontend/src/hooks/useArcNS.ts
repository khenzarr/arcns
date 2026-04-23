import { useReadContract, useWriteContract, useAccount, useReadContracts } from "wagmi";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  CONTRACTS, CONTROLLER_ABI, REGISTRAR_ABI, RESOLVER_ABI, REVERSE_REGISTRAR_ABI, ERC20_ABI,
} from "../lib/contracts";
import { namehash, labelToTokenId } from "../lib/namehash";
import { isValidLabel } from "../lib/domain";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/nameCache";
import { arcTestnet } from "../lib/chains";

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
    chainId: arcTestnet.id,
    query: {
      enabled: valid,
      staleTime: 0,
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
// Uses viem publicClient directly — bypasses wagmi chain context.
// wagmi's useReadContract silently does nothing when no wallet is connected
// because it has no active chain. publicClient always has the chain configured.
export function useRentPrice(label: string, tld: "arc" | "circle", duration = ONE_YEAR) {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  const enabled = Boolean(label && tld && duration > 0n && isValidLabel(label));

  const [data, setData]         = useState<{ base: bigint; premium: bigint } | undefined>(undefined);
  const [isFetching, setFetching] = useState(false);
  const [isError, setError]     = useState(false);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }

    let cancelled = false;
    setFetching(true);
    setError(false);

    // Import publicClient lazily to avoid SSR issues
    import("../lib/publicClient").then(({ publicClient }) => {
      // Use JSON ABI for the tuple return — most reliable decode path
      const abi = [{
        name: "rentPrice",
        type: "function" as const,
        stateMutability: "view" as const,
        inputs: [
          { name: "name",     type: "string"  as const },
          { name: "duration", type: "uint256" as const },
        ],
        outputs: [
          { type: "tuple" as const, components: [
            { name: "base",    type: "uint256" as const },
            { name: "premium", type: "uint256" as const },
          ]},
        ],
      }];

      publicClient.readContract({
        address: controller,
        abi,
        functionName: "rentPrice",
        args: [label, duration],
      }).then((result: unknown) => {
        if (cancelled) return;
        // result is { base: bigint, premium: bigint } from the named tuple
        const r = result as { base: bigint; premium: bigint };
        const base    = typeof r?.base    === "bigint" ? r.base    : 0n;
        const premium = typeof r?.premium === "bigint" ? r.premium : 0n;
        setData({ base, premium });
        setFetching(false);
      }).catch(() => {
        if (cancelled) return;
        setError(true);
        setFetching(false);
      });
    });

    return () => { cancelled = true; };
  }, [label, tld, duration.toString(), controller, enabled]);

  return { data, isFetching, isError };
}

// ─── USDC Allowance ───────────────────────────────────────────────────────────
// Checks how much USDC the user has already approved for a spender.
// Returns 0n if wallet not connected or data not yet loaded.
export function useAllowance(spender: `0x${string}`) {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, spender],
    query: {
      enabled: !!address,
      staleTime: 15_000,
      gcTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  });
  return {
    allowance: (data as bigint | undefined) ?? 0n,
    refetchAllowance: refetch,
  };
}
export function useUSDCBalance() {
  const { address } = useAccount();
  const [data, setData] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    if (!address) { setData(undefined); return; }

    let cancelled = false;

    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.usdc,
        abi: [{
          name: "balanceOf",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [{ name: "account", type: "address" as const }],
          outputs: [{ name: "", type: "uint256" as const }],
        }],
        functionName: "balanceOf",
        args: [address],
      }).then((result: unknown) => {
        if (cancelled) return;
        setData(typeof result === "bigint" ? result : 0n);
      }).catch(() => {
        if (cancelled) return;
        setData(0n);
      });
    });

    return () => { cancelled = true; };
  }, [address]);

  return { data };
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
    chainId: arcTestnet.id,
    query: {
      enabled: isValidLabel(label),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Resolve address ──────────────────────────────────────────────────────────
// Uses publicClient directly to bypass wagmi chain context.
// This ensures resolution works even when no wallet is connected.
export function useResolveAddress(domain: string) {
  const node = namehash(domain);
  const enabled = domain.includes(".");
  const [data, setData] = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }
    let cancelled = false;
    setLoading(true);

    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.resolver,
        abi: [{
          name: "addr",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [{ name: "node", type: "bytes32" as const }],
          outputs: [{ name: "", type: "address" as const }],
        }],
        functionName: "addr",
        args: [node as `0x${string}`],
      }).then((result: unknown) => {
        if (cancelled) return;
        setData(result as string);
        setLoading(false);
      }).catch(() => {
        if (cancelled) return;
        setData(undefined);
        setLoading(false);
      });
    });

    return () => { cancelled = true; };
  }, [domain, node, enabled]);

  return { data, isLoading };
}

// ─── Resolve name (reverse) ───────────────────────────────────────────────────
// Uses publicClient directly to bypass wagmi chain context.
export function useResolveName(node: `0x${string}`) {
  const enabled = !!node && node !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  const [data, setData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }
    let cancelled = false;

    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.resolver,
        abi: [{
          name: "name",
          type: "function" as const,
          stateMutability: "view" as const,
          inputs: [{ name: "node", type: "bytes32" as const }],
          outputs: [{ name: "", type: "string" as const }],
        }],
        functionName: "name",
        args: [node],
      }).then((result: unknown) => {
        if (cancelled) return;
        setData(result as string);
      }).catch(() => {
        if (cancelled) return;
        setData(undefined);
      });
    });

    return () => { cancelled = true; };
  }, [node, enabled]);

  return { data };
}

// ─── Phase 26: Balance safety check ──────────────────────────────────────────
export function useBalanceSafety(requiredAmount: bigint) {
  const { data: balance } = useUSDCBalance();
  const bal = (balance as bigint | undefined) ?? 0n;
  const sufficient = bal >= requiredAmount;
  const shortfall = sufficient ? 0n : (requiredAmount - bal);
  return { balance: bal, sufficient, shortfall };
}

// ─── Registration flow ────────────────────────────────────────────────────────
// Two-phase: approve (if needed) → commit → wait → register
// The caller checks allowance and decides whether to call approveUsdc() first.
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

  // ── Standalone approve — call this when allowance < maxCost ──────────────
  const approveUsdc = useCallback(async (
    spender: `0x${string}`,
    amount: bigint
  ): Promise<boolean> => {
    setError(null);
    try {
      setStep("approving");
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [spender, amount],
      });
      // Brief pause for RPC to index the approval
      await new Promise(r => setTimeout(r, 2000));
      return true;
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Approval failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStep("error");
      return false;
    }
  }, [writeContractAsync]);

  // ── Register — assumes allowance is already sufficient ───────────────────
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
    const maxCost = totalCost + (totalCost * 500n) / 10000n; // 5% slippage

    try {
      setStep("committing");
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;

      // Use contract as source of truth — never compute hash on frontend
      const { publicClient } = await import("../lib/publicClient");
      const commitment = await publicClient.readContract({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "makeCommitment",
        args: [label, address, duration, secret, resolverAddr, [], setReverse, address],
      }) as `0x${string}`;

      console.log("[ArcNS] commitment args:", { label, owner: address, duration, secret, resolverAddr, data: [], setReverse, caller: address });
      console.log("[ArcNS] commitment hash:", commitment);

      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });

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
        args: [label, address, duration, secret, resolverAddr, [], setReverse],
      });

      setResult({
        txHash: tx,
        name: `${label}.${tld}`,
        expires: BigInt(Math.floor(Date.now() / 1000)) + duration,
        cost: totalCost,
      });
      cacheInvalidate(label, tld);
      setStep("done");
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStep("error");
    }
  }, [address, writeContractAsync]);

  const reset = useCallback(() => { setStep("idle"); setError(null); setResult(null); }, []);

  return { register, approveUsdc, step, error, result, waitProgress, reset };
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
    cost: bigint,
    currentAllowance: bigint
  ) => {
    setLoading(true);
    setError(null);
    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost = cost + (cost * 500n) / 10000n; // 5% slippage
    try {
      // Only approve if allowance is insufficient
      if (currentAllowance < maxCost) {
        await writeContractAsync({
          address: CONTRACTS.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [controller, maxCost],
        });
        await new Promise(r => setTimeout(r, 2000));
      }
      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "renew",
        args: [label, duration],
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
