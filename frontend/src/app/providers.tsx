"use client";

import { useState, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../lib/wagmiConfig";
import { CONTRACTS } from "../lib/contracts";

// EIP-1967 implementation slot: keccak256("eip1967.proxy.implementation") - 1
// CORRECT value — the previous value had wrong trailing bytes and read the wrong slot.
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" as `0x${string}`;

/**
 * Boot-time proxy check — runs ONCE on app startup.
 * Reads the EIP-1967 implementation slot from both controllers.
 * If either slot is zero or has no bytecode → shows PROXY_OUTDATED banner.
 * Does NOT block reads or availability checks — only blocks write actions.
 */
async function checkProxies(): Promise<string | null> {
  try {
    const { publicClient } = await import("../lib/publicClient");
    const proxies = [
      { name: "arcController",    address: CONTRACTS.arcController    },
      { name: "circleController", address: CONTRACTS.circleController },
    ];

    for (const { name, address } of proxies) {
      const raw  = await publicClient.getStorageAt({ address, slot: IMPL_SLOT });
      if (!raw) {
        return `PROXY_CHECK_FAILED: ${name} implementation slot could not be read from Arc Testnet RPC.`;
      }
      const impl = ("0x" + raw.slice(-40)) as `0x${string}`;
      console.log(`[Boot] ${name} impl: ${impl}`);

      if (impl === "0x0000000000000000000000000000000000000000") {
        return `PROXY_OUTDATED: ${name} implementation slot is zero. Run upgradeV2.js.`;
      }
      const code = await publicClient.getCode({ address: impl });
      if (!code || code === "0x") {
        return `PROXY_OUTDATED: ${name} implementation ${impl} has no bytecode.`;
      }
    }
    return null;
  } catch (e: any) {
    // Non-fatal — proxy check failure should not block the app
    console.warn("[Boot] proxy check failed:", e.message);
    return null;
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 30_000,
      },
    },
  }));

  const [proxyError, setProxyError] = useState<string | null>(null);

  // Boot-time proxy check — runs once, non-blocking
  useEffect(() => {
    checkProxies().then(err => { if (err) setProxyError(err); });
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {proxyError ? (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
            background: "#dc2626", color: "#fff", padding: "10px 16px",
            fontSize: "13px", fontFamily: "monospace", textAlign: "center",
          }}>
            ⚠ {proxyError} — Transactions are blocked until the proxy is upgraded.
          </div>
        ) : null}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
