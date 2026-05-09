/**
 * SecondaryButton.tsx — ArcNS outline / ghost button.
 *
 * Purely visual. No navigation or business logic.
 * Supports all standard button props.
 */

import React from "react";
import { cn } from "./utils";

interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function SecondaryButton({
  disabled,
  className,
  children,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        // Base
        "inline-flex items-center justify-center gap-2",
        "px-6 py-3 rounded-[var(--arcns-radius-md)]",
        "text-sm font-semibold",
        "transition-all duration-150",
        // Glass outline style
        "bg-transparent border border-[var(--arcns-border-default)]",
        "text-[var(--arcns-text-secondary)]",
        // Hover
        "hover:border-[var(--arcns-border-strong)] hover:text-[var(--arcns-text-primary)] hover:bg-[rgba(120,160,255,0.06)]",
        // Active
        "active:scale-[0.98]",
        // Focus
        "arcns-focus-ring",
        // Disabled
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
