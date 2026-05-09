/**
 * PrimaryButton.tsx — ArcNS gradient CTA button.
 *
 * Purely visual. No navigation or business logic.
 * Supports all standard button props + optional loading state.
 */

import React from "react";
import { cn } from "./utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function PrimaryButton({
  loading = false,
  disabled,
  className,
  children,
  ...props
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={cn(
        // Base
        "inline-flex items-center justify-center gap-2",
        "px-6 py-3 rounded-[var(--arcns-radius-md)]",
        "text-sm font-semibold text-white",
        "transition-all duration-150",
        // Gradient background
        "bg-[image:var(--arcns-gradient-primary)]",
        // Hover / active
        "hover:opacity-90 active:scale-[0.98]",
        // Focus
        "arcns-focus-ring",
        // Disabled
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span
            className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            aria-hidden="true"
          />
          <span>Loading…</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
