import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback, useEffect } from "react";
import {
  CONTRACTS, CONTROLLER_ABI, REGISTRAR_ABI, REVERSE_REGISTRAR_ABI, ERC20_ABI,
} from "../lib/contracts";
import { namehash, labelToTokenId, makeCommitmentHash } from "../lib/namehash";
import { isValidLabel } from "../lib/domain";
import { cacheGet, cacheSet, cacheInvalidate } from "../lib/nameCache";
import { arcTestnet } from "../lib/chains";

export { CONTROLLER_ABI as CONTROLLER_V2_ABI } from "../lib/contracts";
export { cacheInvalidate as invalidateAvailability } from "../lib/nameCache";

const ONE_YEAR     = BigInt(365 * 24 * 60 * 60);
const SLIPPAGE_BPS = 500n;

function withSlippage(amount: bigint): bigint {
  return amount + (amount * SLIPPAGE_BPS) / 10_000n;
}

function randomSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export function useAvailability(label: string, tld: "arc" | "circle") {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  const valid = isValidLabel(label);

  const [resolved, setResolved] = useState<boolean | null>(() =>
    valid ? cacheGet(label, tld) : null
  );
  const [isRefetching, setIsRefetching] = useState(false);

  useEffect(() => {
    if (!valid) { setResolved(null); return; }
    setResolved(cacheGet(label, tld));
  }, [label, tld, valid]);

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

  useEffect(() => {
    if (rpc.data === undefined || rpc.isLoading || rpc.isError) return;
    const fresh = rpc.data as boolean;
    cacheSet(label, tld, fresh);
    setResolved(fresh);
  }, [rpc.data, rpc.isLoading, rpc.isError, label, tld]);

  useEffect(() => {
    setIsRefetching(rpc.isFetching && resolved !== null);
  }, [rpc.isFetching, resolved]);

  return {
    data: resolved !== null ? resolved : undefined,
    isLoading: resolved === null && rpc.isLoading,
    isError: false,
    isRefetching,
  };
}

// ─── Rent price ───────────────────────────────────────────────────────────────

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

    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "rentPrice",
        args: [label, duration],
      })
        .then((result: unknown) => {
          if (cancelled) return;
          const r = result as { base: bigint; premium: bigint };
          setData({
            base:    typeof r?.base    === "bigint" ? r.base    : 0n,
            premium: typeof r?.premium === "bigint" ? r.premium : 0n,
          });
          setFetching(false);
        })
        .catch(() => { if (!cancelled) { setError(true); setFetching(false); } });
    });

    return () => { cancelled = true; };
  }, [label, tld, duration.toString(), controller, enabled]);

  return { data, isFetching, isError };
}

// ─── USDC Allowance ───────────────────────────────────────────────────────────

export function useAllowance(spender: `0x${string}`) {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: CONTRACTS.usdc,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, spender],
    query: { enabled: !!address, staleTime: 15_000, gcTime: 60_000, refetchOnWindowFocus: false, retry: 2 },
  });
  return { allowance: (data as bigint | undefined) ?? 0n, refetchAllowance: refetch };
}

// ─── USDC Balance ─────────────────────────────────────────────────────────────

export function useUSDCBalance() {
  const { address } = useAccount();
  const [data, setData] = useState<bigint | undefined>(undefined);

  useEffect(() => {
    if (!address) { setData(undefined); return; }
    let cancelled = false;
    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
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

// ─── Balance safety check ─────────────────────────────────────────────────────

export function useBalanceSafety(requiredAmount: bigint) {
  const { data: balance } = useUSDCBalance();
  const bal = (balance as bigint | undefined) ?? 0n;
  const sufficient = bal >= requiredAmount;
  return { balance: bal, sufficient, shortfall: sufficient ? 0n : requiredAmount - bal };
}

// ─── Name expiry ──────────────────────────────────────────────────────────────

export function useNameExpiry(label: string, tld: "arc" | "circle") {
  const registrar = tld === "arc" ? CONTRACTS.arcRegistrar : CONTRACTS.circleRegistrar;
  return useReadContract({
    address: registrar,
    abi: REGISTRAR_ABI,
    functionName: "nameExpires",
    args: [labelToTokenId(label)],
    chainId: arcTestnet.id,
    query: { enabled: isValidLabel(label), staleTime: 30_000, refetchOnWindowFocus: false },
  });
}

// ─── Resolve address (forward) ────────────────────────────────────────────────

export function useResolveAddress(domain: string) {
  const node    = namehash(domain);
  const enabled = domain.includes(".");
  const [data, setData]         = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }
    let cancelled = false;
    setLoading(true);
    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.resolver,
        abi: [{ name: "addr", type: "function", stateMutability: "view",
          inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "address" }] }],
        functionName: "addr",
        args: [node as `0x${string}`],
      })
        .then((r: unknown) => { if (!cancelled) { setData(r as string); setLoading(false); } })
        .catch(() => { if (!cancelled) { setData(undefined); setLoading(false); } });
    });
    return () => { cancelled = true; };
  }, [domain, node, enabled]);

  return { data, isLoading };
}

// ─── Resolve name (reverse) ───────────────────────────────────────────────────

export function useResolveName(node: `0x${string}`) {
  const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const enabled = !!node && node !== ZERO;
  const [data, setData] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }
    let cancelled = false;
    import("../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: CONTRACTS.resolver,
        abi: [{ name: "name", type: "function", stateMutability: "view",
          inputs: [{ name: "node", type: "bytes32" }], outputs: [{ name: "", type: "string" }] }],
        functionName: "name",
        args: [node],
      })
        .then((r: unknown) => { if (!cancelled) setData(r as string); })
        .catch(() => { if (!cancelled) setData(undefined); });
    });
    return () => { cancelled = true; };
  }, [node, enabled]);

  return { data };
}

// ─── Registration flow ────────────────────────────────────────────────────────
//
// ENS-style flow:
//   1. commit()
//   2. waitForTransactionReceipt (1 block confirmation)
//   3. read commitments[hash] — if 0 → throw
//   4. wait MIN_COMMITMENT_AGE (65s with progress)
//   5. register()
//
// No polling loops. No state machines. No client-side timing logic.
// The contract enforces all timing — we just wait the minimum and let it validate.
//

export type RegStep = "idle" | "approving" | "committing" | "waiting" | "registering" | "done" | "error";

export interface RegistrationResult {
  txHash: `0x${string}`;
  name:   string;
  expires: bigint;
  cost:   bigint;
}

export function useRegistration() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep]               = useState<RegStep>("idle");
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<RegistrationResult | null>(null);
  const [waitProgress, setWaitProgress] = useState(0);

  // ── Approve USDC ──────────────────────────────────────────────────────────
  const approveUsdc = useCallback(async (
    spender: `0x${string}`,
    amount: bigint,
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
      await sleep(2000);
      return true;
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Approval failed";
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStep("error");
      return false;
    }
  }, [writeContractAsync]);

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (
    label: string,
    tld: "arc" | "circle",
    duration: bigint,
    resolverAddr: `0x${string}`,
    setReverse: boolean,
    totalCost: bigint,
  ) => {
    if (!address) return;
    setError(null);
    setResult(null);

    const ZERO_ADDR         = "0x0000000000000000000000000000000000000000" as `0x${string}`;
    const controller        = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const resolverForCommit = resolverAddr ?? ZERO_ADDR;
    const maxCost           = withSlippage(totalCost);

    // Secret generated once — same value used in commit hash and register args
    const secret = randomSecret() as `0x${string}`;

    // Commitment hash computed locally — mirrors makeCommitmentWithSender exactly
    const commitment = makeCommitmentHash(
      label, address, duration, secret, resolverForCommit, [], setReverse, address,
    );

    console.log("[ArcNS] controller:", controller);
    console.log("[ArcNS] commitment:", commitment);
    console.log("[ArcNS] register args:", {
      label, owner: address, duration: duration.toString(),
      secret, resolver: resolverForCommit, data: [], reverseRecord: setReverse, maxCost: maxCost.toString(),
    });

    try {
      setStep("committing");

      // ── 1. Submit commit tx ───────────────────────────────────────────────
      const commitHash = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });
      console.log("[ArcNS] commit tx:", commitHash);

      // ── 2. Wait for commit tx to be mined (receipt confirmation) ──────────
      const { publicClient } = await import("../lib/publicClient");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: commitHash });
      console.log("[ArcNS] commit mined, block:", receipt.blockNumber.toString());

      // ── 3. Verify commitment is stored on-chain ───────────────────────────
      const commitTs = await publicClient.readContract({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commitments",
        args: [commitment],
      }) as bigint;
      console.log("[ArcNS] commitments[hash]:", commitTs.toString());

      if (commitTs === 0n) {
        throw new Error(
          "Commitment not found on-chain after mining. " +
          "Possible hash mismatch — check controller address and proxy implementation."
        );
      }

      // ── 4. Wait MIN_COMMITMENT_AGE (65s with progress bar) ────────────────
      setStep("waiting");
      setWaitProgress(0);
      const WAIT_MS = 65_000;
      await new Promise<void>(resolve => {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 1000;
          setWaitProgress(Math.min(100, Math.floor((elapsed / WAIT_MS) * 100)));
          if (elapsed >= WAIT_MS) { clearInterval(interval); resolve(); }
        }, 1000);
      });

      // ── 5. Register ───────────────────────────────────────────────────────
      setStep("registering");
      console.log("[ArcNS] calling register()...");

      const tx = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [label, address, duration, secret, resolverForCommit, [], setReverse, maxCost],
      });
      console.log("[ArcNS] register tx:", tx);

      setResult({
        txHash: tx,
        name:   `${label}.${tld}`,
        expires: BigInt(Math.floor(Date.now() / 1000)) + duration,
        cost:   totalCost,
      });
      cacheInvalidate(label, tld);
      setStep("done");

    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      console.error("[ArcNS] error:", msg, e);
      setError(msg.includes("user rejected") ? "Transaction cancelled" : msg);
      setStep("error");
    }
  }, [address, writeContractAsync]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
    setWaitProgress(0);
  }, []);

  return { register, approveUsdc, step, error, result, waitProgress, reset };
}

// ─── Renewal ──────────────────────────────────────────────────────────────────

export function useRenewal() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const renew = useCallback(async (
    label: string,
    tld: "arc" | "circle",
    duration: bigint,
    cost: bigint,
    currentAllowance: bigint,
  ) => {
    setLoading(true);
    setError(null);
    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost    = withSlippage(cost);
    try {
      if (currentAllowance < maxCost) {
        await writeContractAsync({
          address: CONTRACTS.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [controller, maxCost],
        });
        await sleep(2000);
      }
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

// ─── Set primary name ─────────────────────────────────────────────────────────

export function useSetPrimaryName() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [done, setDone]       = useState(false);

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
