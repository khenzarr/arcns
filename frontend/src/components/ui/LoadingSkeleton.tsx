/**
 * LoadingSkeleton.tsx — animated skeleton placeholder blocks.
 *
 * Respects prefers-reduced-motion.
 * No business logic.
 */

import React from "react";
import { cn } from "./utils";

interface SkeletonProps {
  /** Width — Tailwind class or inline style value */
  width?: string;
  /** Height — Tailwind class or inline style value */
  height?: string;
  className?: string;
  /** Rounded pill shape */
  pill?: boolean;
}

export function Skeleton({ width, height, className, pill = false }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse",
        pill ? "rounded-full" : "rounded-[var(--arcns-radius-sm)]",
        className,
      )}
      style={{
        background: "rgba(120, 160, 255, 0.08)",
        width: width ?? "100%",
        height: height ?? "1rem",
      }}
      aria-hidden="true"
    />
  );
}

interface LoadingSkeletonProps {
  /** Number of skeleton rows to render */
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton height="1.25rem" width={i % 2 === 0 ? "60%" : "80%"} />
          <Skeleton height="0.875rem" width="40%" />
        </div>
      ))}
    </div>
  );
}
