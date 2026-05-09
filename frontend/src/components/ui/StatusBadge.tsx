/**
 * StatusBadge.tsx — ArcNS domain and resolver state badges.
 *
 * Text-based — does not rely on color alone for meaning.
 * All variants include a visible text label.
 * No business logic.
 */

import React from "react";
import { cn } from "./utils";

export type StatusVariant =
  | "active"
  | "expired"
  | "expiring"
  | "resolved"
  | "not-set"
  | "verified"
  | "unavailable"
  | "warning"
  | "danger";

interface StatusBadgeProps {
  variant: StatusVariant;
  /** Override the default label text */
  label?: string;
  className?: string;
}

const variantConfig: Record<StatusVariant, { label: string; style: React.CSSProperties }> = {
  active: {
    label: "Active",
    style: {
      background: "rgba(20, 241, 149, 0.12)",
      border: "1px solid rgba(20, 241, 149, 0.28)",
      color: "#14F195",
    },
  },
  expired: {
    label: "Expired",
    style: {
      background: "rgba(255, 92, 122, 0.12)",
      border: "1px solid rgba(255, 92, 122, 0.32)",
      color: "#FF5C7A",
    },
  },
  expiring: {
    label: "Expiring Soon",
    style: {
      background: "rgba(251, 191, 36, 0.12)",
      border: "1px solid rgba(251, 191, 36, 0.32)",
      color: "#FBBF24",
    },
  },
  resolved: {
    label: "Resolved",
    style: {
      background: "rgba(0, 212, 255, 0.10)",
      border: "1px solid rgba(0, 212, 255, 0.28)",
      color: "#00D4FF",
    },
  },
  "not-set": {
    label: "Not Set",
    style: {
      background: "rgba(100, 112, 132, 0.12)",
      border: "1px solid rgba(100, 112, 132, 0.24)",
      color: "#647084",
    },
  },
  verified: {
    label: "Verified",
    style: {
      background: "rgba(20, 241, 149, 0.10)",
      border: "1px solid rgba(20, 241, 149, 0.24)",
      color: "#14F195",
    },
  },
  unavailable: {
    label: "Unavailable",
    style: {
      background: "rgba(100, 112, 132, 0.10)",
      border: "1px solid rgba(100, 112, 132, 0.20)",
      color: "#A8B3C7",
    },
  },
  warning: {
    label: "Warning",
    style: {
      background: "rgba(251, 191, 36, 0.10)",
      border: "1px solid rgba(251, 191, 36, 0.28)",
      color: "#FBBF24",
    },
  },
  danger: {
    label: "Error",
    style: {
      background: "rgba(255, 92, 122, 0.10)",
      border: "1px solid rgba(255, 92, 122, 0.28)",
      color: "#FF5C7A",
    },
  },
};

export function StatusBadge({ variant, label, className }: StatusBadgeProps) {
  const config = variantConfig[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)]",
        "text-xs font-semibold",
        className,
      )}
      style={config.style}
    >
      {label ?? config.label}
    </span>
  );
}
