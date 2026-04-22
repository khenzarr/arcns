"use client";
import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useState, useCallback, useEffect } from "react";
import { keccak256, stringToBytes, encodeAbiParameters } from "viem";
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
    slippageBps = 500n // 5% slippage buffer
  ) => {
    if (!address) return;
    setError(null);

    const controller = tld === "arc" ? CONTRACTS.arcController : CONTRACTS.circleController;
    const maxCost = totalCost + (totalCost * slippageBps) / 10000n;

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
      // Commitment binds to: caller, chainId, controller address — matches on-chain makeCommitment
      const chainId = BigInt(5042002); // Arc Testnet — must match block.chainid on-chain
      const commitment = keccak256(encodeAbiParameters(
        [
          { type: "bytes32" }, { type: "address" }, { type: "uint256" },
          { type: "bytes32" }, { type: "address" }, { type: "bytes[]" }, { type: "bool" },
          { type: "address" }, { type: "uint256" }, { type: "address" },
        ],
        [labelHash, address, duration, secret, resolverAddr, [], setReverse, address, chainId, controller]
      ));

      await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "commit",
        args: [commitment],
      });

      setStep("waiting");
      await new Promise(r => setTimeout(r, 65_000));

      setStep("registering");
      const tx = await writeContractAsync({
        address: controller,
        abi: CONTROLLER_ABI,
        functionName: "register",
        args: [label, address, duration, secret, resolverAddr, [], setReverse],
      });
      setTxHash(tx);
      setStep("done");
    } catch (e: any) {
      setError(e.shortMessage || e.message || "Registration failed");
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
