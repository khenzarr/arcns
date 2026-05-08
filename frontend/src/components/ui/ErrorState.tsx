/**
 * ErrorState.tsx — error state display with optional retry action.
 *
 * No business logic. Accepts title, description, and optional action slot.
 */

import React from "react";
import { cn } from "./utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Optional action element (e.g. a retry button) */
  action?: React.ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6",
        "rounded-[var(--arcns-radius-xl)] border",
        className,
      )}
      style={{
        background: "rgba(255, 92, 122, 0.06)",
        borderColor: "rgba(255, 92, 122, 0.20)",
      }}
      role="alert"
    >
      {/* Error icon — CSS only */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl"
        style={{
          background: "rgba(255, 92, 122, 0.12)",
          border: "1px solid rgba(255, 92, 122, 0.28)",
        }}
        aria-hidden="true"
      >
        ⚠
      </div>
      <p
        className="text-base font-semibold mb-1"
        style={{ color: "#FF5C7A" }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-sm max-w-xs leading-relaxed mb-4"
          style={{ color: "var(--arcns-text-secondary)" }}
        >
          {description}
        </p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
