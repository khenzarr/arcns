/**
 * EmptyState.tsx — empty state display with optional action.
 *
 * No business logic. Accepts title, description, and optional action slot.
 */

import React from "react";
import { cn } from "./utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional action element (e.g. a button or link) */
  action?: React.ReactNode;
  /** Optional icon element */
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className,
      )}
    >
      {icon && (
        <div
          className="w-14 h-14 rounded-[var(--arcns-radius-lg)] flex items-center justify-center mb-5"
          style={{
            background: "rgba(37, 99, 255, 0.10)",
            border: "1px solid rgba(37, 99, 255, 0.20)",
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p
        className="text-lg font-semibold mb-2"
        style={{ color: "var(--arcns-text-primary)", fontFamily: "var(--arcns-font-display)" }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-sm max-w-xs leading-relaxed mb-5"
          style={{ color: "var(--arcns-text-secondary)" }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
