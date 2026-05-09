"use client";
/**
 * AddressPill.tsx — truncated EVM address display with optional copy.
 *
 * No chain calls. No wallet logic. Pure display component.
 * Truncation: first 6 + last 4 characters.
 */

import React from "react";
import { cn } from "./utils";
import { CopyButton } from "./CopyButton";

interface AddressPillProps {
  address: string;
  /** Show copy button (default: true) */
  showCopy?: boolean;
  /** Number of leading chars to show (default: 6) */
  leadChars?: number;
  /** Number of trailing chars to show (default: 4) */
  trailChars?: number;
  className?: string;
}

function truncateAddress(address: string, lead = 6, trail = 4): string {
  if (!address || address.length <= lead + trail + 2) return address;
  return `${address.slice(0, lead)}…${address.slice(-trail)}`;
}

export function AddressPill({
  address,
  showCopy = true,
  leadChars = 6,
  trailChars = 4,
  className,
}: AddressPillProps) {
  if (!address) return null;

  const truncated = truncateAddress(address, leadChars, trailChars);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-3 py-1 rounded-[var(--arcns-radius-pill)]",
        "border border-[var(--arcns-border-default)]",
        "bg-[rgba(11,18,36,0.6)]",
        className,
      )}
    >
      <span
        className="font-mono text-xs"
        style={{ color: "var(--arcns-text-secondary)" }}
        title={address}
      >
        {truncated}
      </span>
      {showCopy && (
        <CopyButton
          value={address}
          aria-label={`Copy address ${truncated}`}
          className="w-5 h-5 border-0 hover:bg-transparent"
        />
      )}
    </span>
  );
}
