/**
 * OrbitBackground.tsx — ArcNS decorative orbit/arc motif.
 *
 * Purely visual. pointer-events-none. aria-hidden.
 * Uses inline SVG — no external file dependency.
 * Opacity kept low per brandkit visual-motifs.md (4–22%).
 */

import React from "react";
import { cn } from "./utils";

interface OrbitBackgroundProps {
  /** Visual intensity variant */
  variant?: "hero" | "page" | "card";
  className?: string;
}

const opacityByVariant = {
  hero: 0.18,
  page: 0.10,
  card: 0.06,
};

export function OrbitBackground({ variant = "page", className }: OrbitBackgroundProps) {
  const opacity = opacityByVariant[variant];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none select-none",
        className,
      )}
      style={{ opacity }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 800 600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Outer orbit arc */}
        <ellipse
          cx="400"
          cy="300"
          rx="380"
          ry="260"
          stroke="url(#orbit-gradient-outer)"
          strokeWidth="1"
          fill="none"
        />
        {/* Mid orbit arc */}
        <ellipse
          cx="400"
          cy="300"
          rx="260"
          ry="180"
          stroke="url(#orbit-gradient-mid)"
          strokeWidth="0.75"
          fill="none"
        />
        {/* Inner orbit arc */}
        <ellipse
          cx="400"
          cy="300"
          rx="140"
          ry="96"
          stroke="url(#orbit-gradient-inner)"
          strokeWidth="0.5"
          fill="none"
        />
        {/* Center node */}
        <circle cx="400" cy="300" r="3" fill="#00D4FF" />
        {/* Orbit node dots */}
        <circle cx="780" cy="300" r="2" fill="#2563FF" />
        <circle cx="20"  cy="300" r="2" fill="#2563FF" />
        <circle cx="400" cy="40"  r="2" fill="#00D4FF" />
        <circle cx="400" cy="560" r="2" fill="#00D4FF" />

        <defs>
          <linearGradient id="orbit-gradient-outer" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#2563FF" stopOpacity="0.6" />
            <stop offset="50%"  stopColor="#00D4FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#2563FF" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="orbit-gradient-mid" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#00D4FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#2563FF" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="orbit-gradient-inner" x1="0" y1="0" x2="800" y2="600" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="#00E6FF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#2563FF" stopOpacity="0.3" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
