/**
 * NetworkBadge.tsx — ArcNS network state badge.
 *
 * Variants: testnet (default), wrong-network.
 * No business logic. No wallet calls.
 */

import React from "react";
import { cn } from "./utils";

export type NetworkVariant = "testnet" | "wrong-network";

interface NetworkBadgeProps {
  variant?: NetworkVariant;
  /** Override the default label */
  label?: string;
  className?: string;
}

const variantConfig: Record<NetworkVariant, { label: string; style: React.CSSProperties }> = {
  testnet: {
    label: "Arc Testnet",
    style: {
      background: "rgba(120, 160, 255, 0.10)",
      border: "1px solid rgba(120, 160, 255, 0.20)",
      color: "#A8B3C7",
    },
  },
  "wrong-network": {
    label: "Wrong Network",
    style: {
      background: "rgba(255, 92, 122, 0.12)",
      border: "1px solid rgba(255, 92, 122, 0.32)",
      color: "#FF5C7A",
    },
  },
};

export function NetworkBadge({ variant = "testnet", label, className }: NetworkBadgeProps) {
  const config = variantConfig[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)]",
        "text-xs font-medium",
        className,
      )}
      style={config.style}
    >
      {/* Status dot */}
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          variant === "testnet" ? "bg-emerald-400" : "bg-[#FF5C7A]",
        )}
        aria-hidden="true"
      />
      {label ?? config.label}
    </span>
  );
}
