"use client";
/**
 * providers.tsx — v3 runtime provider setup.
 *
 * Responsibilities:
 *   - WagmiProvider + QueryClientProvider (WalletConnect + MetaMask-first)
 *   - Arc Testnet chain enforcement (reactive, not boot-time blocking)
 *   - Clean v3 runtime wiring — no v2 proxy checks, no hidden v2 assumptions
 *   - QueryClient configured for Arc Testnet read patterns
 *
 * Chain enforcement strategy:
 *   - Enforced reactively when wallet connects (via useAccount().chainId in ChainGuard)
 *   - Does NOT block page render — only blocks write actions
 *   - Shows a persistent banner when wrong network is detected
 */

import { useState } from "react";
import { WagmiProvider, useAccount } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../lib/wagmiConfig";
import { DEPLOYED_CHAIN_ID, DEPLOYED_NETWORK } from "../lib/generated-contracts";

// ─── Chain guard banner ───────────────────────────────────────────────────────

function ChainGuardBanner() {
  const { chainId, isConnected } = useAccount();

  if (!isConnected || !chainId || chainId === DEPLOYED_CHAIN_ID) return null;

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#dc2626", color: "#fff",
        padding: "10px 16px", fontSize: "13px",
        fontFamily: "monospace", textAlign: "center",
      }}
    >
      ⚠ Wrong network (Chain ID {chainId}). Please switch your wallet to Arc Testnet
      (Chain ID {DEPLOYED_CHAIN_ID}). Write transactions are blocked until you switch.
    </div>
  );
}

// ─── Providers ────────────────────────────────────────────────────────────────

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Arc Testnet has fast finality — 15s stale time is reasonable
        staleTime:            15_000,
        // Retry once on failure — Arc RPC can have transient issues
        retry:                1,
        retryDelay:           1_000,
        // Don't refetch on window focus — reduces RPC load during demos
        refetchOnWindowFocus: false,
        refetchOnReconnect:   false,
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChainGuardBanner />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
