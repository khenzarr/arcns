"use client";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback, useEffect } from "react";
import {
  CONTRACTS, CONTROLLER_ABI, REGISTRAR_ABI, ERC20_ABI,
} from "../lib/contracts";
import { namehash, labelToTokenId, formatUSDC } from "../lib/namehash";
import { isValidLabel } from "../lib/domain";
import { getDomainsByOwner, getExpiringDomains, getRegistrationHistory, GQLDomain } from "../lib/graphql";

const ONE_YEAR = BigInt(365 * 24 * 60 * 60);

// ─── Availability ─────────────────────────────────────────────────────────────

export function useAvailabilityV2(label: string, tld: "arc" | "circle") {
  const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
  return useReadContract({
    address: controller,
    abi: CONTROLLER_ABI,
    functionName: "available",
    args: [label],
    query: {
      enabled: isValidLabel(label), // uses domain.ts policy — allows 1-char names
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
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
    query: {
      enabled: isValidLabel(label), // uses domain.ts policy — allows 1-char names
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
}

// ─── Portfolio (from indexer) ─────────────────────────────────────────────────

export function usePortfolio() {
  const { address } = useAccount();
  const [domains, setDomains] = useState<GQLDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

export function useRegistrationV2() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [step, setStep] = useState<"idle" | "approving" | "committing" | "waiting" | "registering" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const register = useCallback(async (
    label: string,
    tld: "arc" | "circle",
    duration: bigint,
    resolverAddr: `0x${string}`,
    setReverse: boolean,
    totalCost: bigint,
    slippageBps = 500n
  ) => {
    if (!address) return;
    setError(null);

    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost = totalCost + (totalCost * slippageBps) / 10000n;
    const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as `0x${string}`;
    const resolverForCommit = resolverAddr ?? ZERO_ADDR;

    try {
      // ── Step 1: Approve USDC ────────────────────────────────────────────
      setStep("approving");
      await writeContractAsync({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [controller, maxCost],
      });
      await new Promise(r => setTimeout(r, 3000));

      // ── Step 2: Generate secret + get commitment from contract ──────────
      setStep("committing");
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = `0x${Array.from(secretBytes).map(b => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;

      console.log("[ArcNS] REGISTER ARGS:", {
        label, owner: address, duration: duration.toString(),
        secret, resolver: resolverForCommit, data: [], reverseRecord: setReverse,
      });

      const { publicClient } = await import("../lib/publicClient");
      let commitment: `0x${string}`;
      try {
        commitment = await publicClient.readContract({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "makeCommitment",
          args: [label, address, duration, secret, resolverForCommit, [], setReverse],
          account: address,
        }) as `0x${string}`;
        console.log("[ArcNS] COMMITMENT HASH:", commitment);
      } catch (e) {
        console.error("[ArcNS] makeCommitment FAILED:", e);
        throw new Error(`makeCommitment failed: ${(e as any)?.shortMessage || (e as any)?.message}`);
      }

      // ── Step 3: Verify allowance ────────────────────────────────────────
      const allowance = await publicClient.readContract({
        address: CONTRACTS.usdc,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, controller],
      }) as bigint;
      console.log("[ArcNS] ALLOWANCE:", allowance.toString(), "NEEDED:", totalCost.toString());
      if (allowance < totalCost) {
        throw new Error(`Insufficient USDC allowance. Have: ${allowance}, Need: ${totalCost}`);
      }

      // ── Step 4: Submit commit tx ────────────────────────────────────────
      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });
      console.log("[ArcNS] commit() sent");

      // ── Step 5: Wait MIN_COMMITMENT_AGE ────────────────────────────────
      setStep("waiting");
      await new Promise(r => setTimeout(r, 65_000));

      // ── Step 6: Verify commitment on-chain ─────────────────────────────
      const commitTs = await publicClient.readContract({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commitments",
        args: [commitment],
      }) as bigint;
      console.log("[ArcNS] COMMITMENT TIMESTAMP on-chain:", commitTs.toString());
      if (commitTs === 0n) {
        throw new Error("Commitment not found on-chain. commit() may have failed.");
      }

      // ── Step 7: Simulate register ───────────────────────────────────────
      setStep("registering");
      try {
        await publicClient.simulateContract({
          address: controller,
          abi: CONTROLLER_ABI,
          functionName: "register",
          args: [label, address, duration, secret, resolverForCommit, [], setReverse],
          account: address,
        });
        console.log("[ArcNS] simulateContract register: OK");
      } catch (simErr: any) {
        const reason = simErr?.cause?.reason || simErr?.shortMessage || simErr?.message || "simulation failed";
        console.error("[ArcNS] simulateContract register FAILED:", reason, simErr);
        throw new Error(`Register simulation failed: ${reason}`);
      }

      // ── Step 8: Send register tx ────────────────────────────────────────
      const tx = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [label, address, duration, secret, resolverForCommit, [], setReverse],
      });
      console.log("[ArcNS] register() tx:", tx);
      setTxHash(tx);
      setStep("done");
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "Registration failed";
      console.error("[ArcNS] register error:", msg, e);
      setError(msg);
      setStep("error");
    }
  }, [address, writeContractAsync]);

  return { register, step, error, txHash };
}

// ─── Bulk renew ───────────────────────────────────────────────────────────────

export function useBulkRenew() {
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ name: string; success: boolean }[]>([]);

  const bulkRenew = useCallback(async (
    names: { label: string; tld: "arc" | "circle"; cost: bigint }[],
    duration: bigint
  ) => {
    setLoading(true);
    const newResults: { name: string; success: boolean }[] = [];

    for (const { label, tld, cost } of names) {
      const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
      const maxCost = cost + (cost * 500n) / 10000n; // 5% slippage
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
          args: [label, duration],
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
