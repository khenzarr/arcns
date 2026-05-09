/**
 * GlassCard.tsx — ArcNS frosted glass card surface.
 *
 * Purely visual wrapper. No business logic.
 * Uses ArcNS design tokens from globals.css.
 */

import React from "react";
import { cn } from "./utils";

export type GlassCardVariant = "default" | "elevated" | "active" | "subtle";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: GlassCardVariant;
  children: React.ReactNode;
}

const variantStyles: Record<GlassCardVariant, string> = {
  default:  "arcns-glass rounded-[var(--arcns-radius-xl)]",
  elevated: "arcns-glass rounded-[var(--arcns-radius-xl)] shadow-[var(--arcns-shadow-card)]",
  active:   "arcns-glass rounded-[var(--arcns-radius-xl)] shadow-[var(--arcns-shadow-glow-active)] border-[var(--arcns-border-active)]",
  subtle:   "rounded-[var(--arcns-radius-xl)] border border-[var(--arcns-divider)]",
};

export function GlassCard({
  variant = "default",
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(variantStyles[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}
