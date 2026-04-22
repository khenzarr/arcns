"use client";

import { useState } from "react";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "../lib/wagmiConfig";
import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClient MUST be created inside the component (not at module level)
  // to avoid shared state between SSR and client renders (hydration mismatch)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry on error for read calls — show error state immediately
        // Individual hooks override this where needed (useAvailability uses retry:2)
        retry: 1,
        // Don't refetch on window focus — prevents availability flicker
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect — prevents spurious CHECKING states
        refetchOnReconnect: false,
        // Stale time: 30s default — prevents redundant RPC calls
        staleTime: 30_000,
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#2563eb",
            accentColorForeground: "white",
            borderRadius: "large",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
