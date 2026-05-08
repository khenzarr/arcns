/**
 * FooterIdentityLine.tsx — ArcNS footer identity line.
 *
 * Small, self-contained footer strip.
 * No business logic. No external links beyond what the app already uses.
 */

import React from "react";
import { cn } from "./utils";

interface FooterIdentityLineProps {
  className?: string;
}

export function FooterIdentityLine({ className }: FooterIdentityLineProps) {
  return (
    <footer
      className={cn(
        "border-t py-8 text-center text-sm",
        className,
      )}
      style={{
        borderColor: "var(--arcns-divider)",
        color: "var(--arcns-text-muted)",
      }}
    >
      <p>
        <span style={{ color: "var(--arcns-text-secondary)", fontWeight: 500 }}>ArcNS</span>
        {" · "}
        Identity for everything on Arc
        {" · "}
        <span className="font-mono text-xs">Arc Testnet · Chain ID 5042002</span>
      </p>
    </footer>
  );
}
