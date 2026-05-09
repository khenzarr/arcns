/**
 * PrimaryBadge.tsx — ArcNS "Primary" identity badge.
 *
 * Used to indicate a domain is set as the wallet's primary name.
 * No business logic. No icon library dependency.
 */

import React from "react";
import { cn } from "./utils";

interface PrimaryBadgeProps {
  className?: string;
}

export function PrimaryBadge({ className }: PrimaryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)]",
        "text-xs font-semibold",
        className,
      )}
      style={{
        background: "rgba(37, 99, 255, 0.16)",
        border: "1px solid rgba(37, 99, 255, 0.36)",
        color: "#8FB3FF",
      }}
    >
      {/* CSS-only star dot — no icon library */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: "#8FB3FF" }}
        aria-hidden="true"
      />
      Primary
    </span>
  );
}
