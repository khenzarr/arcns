"use client";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback, useEffect } from "react";
import {
  CONTRACTS, CONTROLLER_ABI, REGISTRAR_ABI, ERC20_ABI,
} from "../lib/contracts";
import { labelToTokenId, makeCommitmentHash } from "../lib/namehash";
import { isValidLabel } from "../lib/domain";
import { getDomainsByOwner, getExpiringDomains, getRegistrationHistory, GQLDomain } from "../lib/graphql";

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

// ─── Availability ─────────────────────────────────────────────────────────────

export function useAvailabilityV2(label: string, tld: "arc" | "circle") {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  return useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: "available",
    args: [label],
    query: { enabled: isValidLabel(label), staleTime: 30_000, refetchOnWindowFocus: false },
  });
}

// ─── Rent price ───────────────────────────────────────────────────────────────

export function useRentPriceV2(label: string, tld: "arc" | "circle", duration = ONE_YEAR) {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  return useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: "rentPrice",
    args: [label, duration],
    query: { enabled: isValidLabel(label), staleTime: 30_000, refetchOnWindowFocus: false },
  });
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export function usePortfolio() {
  const { address } = useAccount();
  const [domains, setDomains] = useState<GQLDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getDomainsByOwner(address)
      .then(setDomains)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [address]);

  return { domains, loading, error };
}

// ─── Expiry alerts ────────────────────────────────────────────────────────────

export function useExpiryAlerts(withinDays = 30) {
  const { address } = useAccount();
  const [expiring, setExpiring] = useState<GQLDomain[]>([]);

  useEffect(() => {
    if (!address) return;
    getExpiringDomains(address, withinDays).then(setExpiring).catch(() => {});
  }, [address, withinDays]);

  return expiring;
}

// ─── Transaction history ──────────────────────────────────────────────────────

export function useTransactionHistory() {
  const { address } = useAccount();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getRegistrationHistory(address)
      .then(setHistory)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  return { history, loading };
}

// ─── V2 Registration ──────────────────────────────────────────────────────────
//
// ENS-style flow:
//   1. approve
//   2. commit()
//   3. waitForTransactionReceipt
//   4. read commitments[hash] — if 0 → throw
//   5. wait 65s
//   6. register()
//

export type RegStepV2 = "idle" | "approving" | "committing" | "waiting" | "registering" | "done" | "error";

export function useRegistrationV2() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep]   = useState<RegStepV2>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

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

    const ZERO_ADDR         = "0x0000000000000000000000000000000000000000" as `0x${string}`;
    const controller        = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const resolverForCommit = resolverAddr ?? ZERO_ADDR;
    const maxCost           = withSlippage(totalCost);
    const secret            = randomSecret() as `0x${string}`;
    const commitment        = makeCommitmentHash(
      label, address, duration, secret, resolverForCommit, [], setReverse, address,
    );

    console.log("[ArcNS V2] controller:", controller);
    console.log("[ArcNS V2] commitment:", commitment);

    try {
      // ── 1. Approve USDC ───────────────────────────────────────────────────
      setStep("approving");
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [controller, maxCost],
      });
      await new Promise(r => setTimeout(r, 3000));

      // ── 2. Submit commit tx ───────────────────────────────────────────────
      setStep("committing");
      const commitHash = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });
      console.log("[ArcNS V2] commit tx:", commitHash);

      // ── 3. Wait for commit tx to be mined ─────────────────────────────────
      const { publicClient } = await import("../lib/publicClient");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: commitHash });
      console.log("[ArcNS V2] commit mined, block:", receipt.blockNumber.toString());

      // ── 4. Verify commitment is stored on-chain ───────────────────────────
      const commitTs = await publicClient.readContract({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commitments",
        args: [commitment],
      }) as bigint;
      console.log("[ArcNS V2] commitments[hash]:", commitTs.toString());

      if (commitTs === 0n) {
        throw new Error("Commitment not found on-chain after mining. Possible hash mismatch.");
      }

      // ── 5. Wait MIN_COMMITMENT_AGE (65s) ──────────────────────────────────
      setStep("waiting");
      await new Promise(r => setTimeout(r, 65_000));

      // ── 6. Register ───────────────────────────────────────────────────────
      setStep("registering");
      console.log("[ArcNS V2] calling register()...");

      const tx = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [label, address, duration, secret, resolverForCommit, [], setReverse, maxCost],
      });
      console.log("[ArcNS V2] register tx:", tx);
      setTxHash(tx);
      setStep("done");

    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      console.error("[ArcNS V2] error:", msg, e);
      setError(msg);
      setStep("error");
    }
  }, [address, writeContractAsync]);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
    setTxHash(null);
  }, []);

  return { register, step, error, txHash, reset };
}

// ─── Bulk renew ───────────────────────────────────────────────────────────────

export function useBulkRenew() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ name: string; success: boolean }[]>([]);

  const bulkRenew = useCallback(async (
    names: { label: string; tld: "arc" | "circle"; cost: bigint }[],
    duration: bigint,
  ) => {
    setLoading(true);
    const newResults: { name: string; success: boolean }[] = [];

    for (const { label, tld, cost } of names) {
      const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
      const maxCost    = withSlippage(cost);
      try {
        await writeContractAsync({
          address: CONTRACTS.usdc,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [controller, maxCost],
        });
        await new Promise(r => setTimeout(r, 2000));
        await writeContractAsync({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "renew",
          args: [label, duration, maxCost],
        });
        newResults.push({ name: `${label}.${tld}`, success: true });
      } catch {
        newResults.push({ name: `${label}.${tld}`, success: false });
      }
    }

    setResults(newResults);
    setLoading(false);
  }, [writeContractAsync]);

  return { bulkRenew, loading, results };
}
