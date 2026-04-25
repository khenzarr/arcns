"use client";
/**
 * useMyDomains.ts — v3 portfolio hook.
 *
 * Strategy: subgraph-first, RPC fallback.
 *
 * Subgraph path (preferred):
 *   - getDomainsByOwner() → returns full domain names, expiry, tld
 *   - Fast, paginated, returns human-readable names
 *
 * RPC fallback (when subgraph is disabled or returns empty):
 *   - Read Transfer events from both BaseRegistrars
 *   - For each token, read nameExpires
 *   - Slow but reliable — used for founder-demo resilience
 *
 * Write paths are NOT touched here.
 * All errors flow through errors.ts. No ENS-branded strings.
 */

import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, parseAbiItem } from "viem";
import {
  ARC_REGISTRAR_CONTRACT,
  ADDR_ARC_REGISTRAR,
  ADDR_CIRCLE_REGISTRAR,
} from "../lib/contracts";
import { arcTestnet } from "../lib/chains";
import {
  getExpiryState,
  type ExpiryState,
  type SupportedTLD,
} from "../lib/normalization";
import { getDomainsByOwner } from "../lib/graphql";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnedDomain {
  /** ERC-721 token ID (labelhash as bigint) — null when sourced from subgraph */
  tokenId:     bigint | null;
  /** Human-readable label e.g. "alice" — available from subgraph */
  labelName:   string | null;
  /** TLD: "arc" or "circle" */
  tld:         SupportedTLD;
  /** Expiry timestamp (Unix seconds) */
  expiry:      bigint;
  /** Derived expiry state */
  expiryState: ExpiryState;
  /** Source of truth */
  source:      "subgraph" | "rpc";
}

export interface MyDomainsState {
  domains:   OwnedDomain[];
  isLoading: boolean;
  error:     string | null;
  refetch:   () => void;
}

// ─── RPC fallback client ──────────────────────────────────────────────────────

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

function makeReadClient() {
  const rpcUrl = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_RPC_URL)
    || "https://rpc.testnet.arc.network";
  return createPublicClient({
    chain:     arcTestnet,
    transport: http(rpcUrl, { timeout: 15_000, retryCount: 2, retryDelay: 1_000 }),
  });
}

async function loadViaRpc(address: `0x${string}`): Promise<OwnedDomain[]> {
  const client = makeReadClient();

  const [arcLogs, circleLogs] = await Promise.all([
    client.getLogs({
      address:   ADDR_ARC_REGISTRAR,
      event:     TRANSFER_EVENT,
      args:      { to: address },
      fromBlock: 0n,
      toBlock:   "latest",
    }),
    client.getLogs({
      address:   ADDR_CIRCLE_REGISTRAR,
      event:     TRANSFER_EVENT,
      args:      { to: address },
      fromBlock: 0n,
      toBlock:   "latest",
    }),
  ]);

  const arcTokens    = new Set<bigint>();
  const circleTokens = new Set<bigint>();

  for (const log of arcLogs)    if (log.args.tokenId !== undefined) arcTokens.add(log.args.tokenId);
  for (const log of circleLogs) if (log.args.tokenId !== undefined) circleTokens.add(log.args.tokenId);

  const results: OwnedDomain[] = [];

  const readExpiry = async (tokenId: bigint, tld: SupportedTLD, registrarAddr: `0x${string}`) => {
    try {
      const expiry = await client.readContract({
        address:      registrarAddr,
        abi:          ARC_REGISTRAR_CONTRACT.abi,
        functionName: "nameExpires",
        args:         [tokenId],
      }) as bigint;
      if (expiry > 0n) {
        results.push({ tokenId, labelName: null, tld, expiry, expiryState: getExpiryState(expiry), source: "rpc" });
      }
    } catch { /* skip */ }
  };

  await Promise.all([
    ...[...arcTokens].map(id    => readExpiry(id, "arc",    ADDR_ARC_REGISTRAR)),
    ...[...circleTokens].map(id => readExpiry(id, "circle", ADDR_CIRCLE_REGISTRAR)),
  ]);

  const ORDER: Record<ExpiryState, number> = { "active": 0, "expiring-soon": 1, "grace": 2, "expired": 3 };
  results.sort((a, b) => ORDER[a.expiryState] - ORDER[b.expiryState]);
  return results;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMyDomains(): MyDomainsState {
  const { address } = useAccount();

  const [domains,   setDomains]   = useState<OwnedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [tick,      setTick]      = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    if (!address) { setDomains([]); return; }

    const addr = address as `0x${string}`;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        // ── Subgraph-first ────────────────────────────────────────────────────
        const gqlDomains = await getDomainsByOwner(addr);

        if (!cancelled && gqlDomains.length > 0) {
          const mapped: OwnedDomain[] = gqlDomains.map(d => {
            const tld = (d.registrationType === "ARC" ? "arc" : "circle") as SupportedTLD;
            const expiry = BigInt(d.expiry);
            return {
              tokenId:     null,
              labelName:   d.labelName,
              tld,
              expiry,
              expiryState: getExpiryState(expiry),
              source:      "subgraph" as const,
            };
          });
          const ORDER: Record<ExpiryState, number> = { "active": 0, "expiring-soon": 1, "grace": 2, "expired": 3 };
          mapped.sort((a, b) => ORDER[a.expiryState] - ORDER[b.expiryState]);
          setDomains(mapped);
          setIsLoading(false);
          return;
        }

        // ── RPC fallback ──────────────────────────────────────────────────────
        if (!cancelled) {
          const rpcDomains = await loadViaRpc(addr);
          if (!cancelled) setDomains(rpcDomains);
        }
      } catch {
        if (!cancelled) setError("Could not load your domains. Please check your connection and try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [address, tick]);

  return { domains, isLoading, error, refetch };
}
