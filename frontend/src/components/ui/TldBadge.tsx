/**
 * TldBadge.tsx — ArcNS namespace badges for .arc and .circle.
 *
 * Native ArcNS namespaces only. No ENS wording.
 * No business logic.
 */

import React from "react";
import { cn } from "./utils";

export type TldVariant = "arc" | "circle";

interface TldBadgeProps {
  tld: TldVariant;
  className?: string;
}

const tldConfig: Record<TldVariant, { label: string; style: React.CSSProperties }> = {
  arc: {
    label: ".arc",
    style: {
      background: "rgba(37, 99, 255, 0.16)",
      border: "1px solid rgba(37, 99, 255, 0.42)",
      color: "#8FB3FF",
    },
  },
  circle: {
    label: ".circle",
    style: {
      background: "rgba(0, 230, 194, 0.12)",
      border: "1px solid rgba(0, 230, 194, 0.36)",
      color: "#7FFFE3",
    },
  },
};

export function TldBadge({ tld, className }: TldBadgeProps) {
  const config = tldConfig[tld];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)]",
        "text-xs font-bold font-mono",
        className,
      )}
      style={config.style}
    >
      {config.label}
    </span>
  );
}
