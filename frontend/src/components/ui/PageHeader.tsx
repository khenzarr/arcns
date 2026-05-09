/**
 * PageHeader.tsx — ArcNS page title + subtitle block.
 *
 * Uses display font (Space Grotesk) for the title.
 * Accepts optional badge and action slot.
 * No business logic.
 */

import React from "react";
import { cn } from "./utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional badge element rendered next to the title */
  badge?: React.ReactNode;
  /** Optional action element rendered on the right */
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, badge, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1
            className="font-display font-bold tracking-tight"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              color: "var(--arcns-text-primary)",
              fontFamily: "var(--arcns-font-display)",
            }}
          >
            {title}
          </h1>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
        {subtitle && (
          <p
            className="mt-1 text-base"
            style={{ color: "var(--arcns-text-secondary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 mt-1">{action}</div>
      )}
    </div>
  );
}
