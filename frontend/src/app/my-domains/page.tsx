"use client";
/**
 * my-domains/page.tsx — ArcNS My Domains page.
 *
 * Phase 7 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useState tab logic untouched
 *   - Portfolio / TransactionHistory / PrimaryName imports untouched
 *   - Tab switching behavior untouched
 */

import { useState } from "react";
import Portfolio from "../../components/Portfolio";
import TransactionHistory from "../../components/TransactionHistory";
import PrimaryName from "../../components/PrimaryName";
import { PageHeader } from "../../components/ui/PageHeader";
import { NetworkBadge } from "../../components/ui/NetworkBadge";

// ── Tab type — UNCHANGED ───────────────────────────────────────────────────────
type Tab = "portfolio" | "history";

export default function MyDomainsPage() {
  // ── State — UNCHANGED ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("portfolio");

  return (
    <div className="max-w-3xl mx-auto space-y-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <PageHeader
        title="My Domains"
        subtitle="Manage your ArcNS identity portfolio."
        badge={<NetworkBadge variant="testnet" label="Testnet" />}
      />

      {/* ── Primary name module — always visible — UNCHANGED ─────────────── */}
      <PrimaryName />

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1 rounded-[var(--arcns-radius-lg)] p-1 w-fit"
        style={{ background: "var(--arcns-bg-elevated)", border: "1px solid var(--arcns-border-default)" }}
      >
        {(["portfolio", "history"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-[var(--arcns-radius-md)] text-sm font-medium transition-all duration-150 capitalize"
            style={tab === t
              ? {
                  background: "var(--arcns-bg-surface)",
                  color: "var(--arcns-text-primary)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  border: "1px solid var(--arcns-border-default)",
                }
              : {
                  color: "var(--arcns-text-muted)",
                  background: "transparent",
                }
            }
          >
            {t === "portfolio" ? "Portfolio" : "History"}
          </button>
        ))}
      </div>

      {/* ── Tab content — UNCHANGED ───────────────────────────────────────── */}
      {tab === "portfolio" && <Portfolio />}
      {tab === "history"   && <TransactionHistory />}

    </div>
  );
}
