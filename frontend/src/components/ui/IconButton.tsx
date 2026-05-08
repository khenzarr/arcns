/**
 * IconButton.tsx — ArcNS icon-only button.
 *
 * Requires aria-label for accessibility.
 * No icon library dependency — accepts children (any SVG or element).
 */

import React from "react";
import { cn } from "./utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — describes the button action */
  "aria-label": string;
  children: React.ReactNode;
  /** Visual size variant */
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-11 h-11 text-base",
};

export function IconButton({
  size = "md",
  disabled,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        // Base
        "inline-flex items-center justify-center flex-shrink-0",
        "rounded-[var(--arcns-radius-sm)]",
        "transition-all duration-150",
        // Surface
        "bg-transparent border border-[var(--arcns-border-default)]",
        "text-[var(--arcns-text-secondary)]",
        // Hover
        "hover:border-[var(--arcns-border-strong)] hover:text-[var(--arcns-text-primary)] hover:bg-[rgba(120,160,255,0.08)]",
        // Active
        "active:scale-[0.95]",
        // Focus
        "arcns-focus-ring",
        // Disabled
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        // Size
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
