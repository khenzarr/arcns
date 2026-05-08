"use client";
/**
 * CopyButton.tsx — accessible copy-to-clipboard button.
 *
 * No external dependencies. Uses navigator.clipboard with graceful fallback.
 * Shows a brief "Copied" confirmation state.
 */

import React, { useState, useCallback } from "react";
import { cn } from "./utils";

interface CopyButtonProps {
  /** The value to copy to clipboard */
  value: string;
  /** Accessible label describing what is being copied */
  "aria-label"?: string;
  className?: string;
  /** Duration in ms to show the copied state (default: 2000) */
  copiedDuration?: number;
}

export function CopyButton({
  value,
  "aria-label": ariaLabel = "Copy to clipboard",
  className,
  copiedDuration = 2000,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Fallback for environments without clipboard API
        const el = document.createElement("textarea");
        el.value = value;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), copiedDuration);
    } catch {
      // Silent fail — copy is a convenience feature
    }
  }, [value, copiedDuration]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : ariaLabel}
      className={cn(
        "inline-flex items-center justify-center",
        "w-7 h-7 rounded-[var(--arcns-radius-xs)]",
        "transition-all duration-150",
        "text-[var(--arcns-text-muted)] hover:text-[var(--arcns-text-secondary)]",
        "hover:bg-[rgba(120,160,255,0.08)]",
        "arcns-focus-ring",
        className,
      )}
    >
      {copied ? (
        /* Checkmark — CSS only */
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2.5 7L5.5 10L11.5 4" stroke="#14F195" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        /* Copy icon — CSS only */
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <rect x="4.5" y="1.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
          <path d="M1.5 5.5H3.5V12.5H10.5V10.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
