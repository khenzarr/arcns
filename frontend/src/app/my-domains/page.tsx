"use client";

import { useState } from "react";
import Portfolio from "../../components/Portfolio";
import TransactionHistory from "../../components/TransactionHistory";
import PrimaryName from "../../components/PrimaryName";

type Tab = "portfolio" | "history";

export default function MyDomainsPage() {
  const [tab, setTab] = useState<Tab>("portfolio");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>My Domains</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Manage your ArcNS registrations</p>
      </div>

      {/* Phase 23: Primary name always visible */}
      <PrimaryName />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1 w-fit" style={{ background: 'var(--color-surface-elevated)' }}>
        {(["portfolio", "history"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize"
            style={tab === t
              ? { background: 'var(--color-surface-card)', color: 'var(--color-text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }
              : { color: 'var(--color-text-secondary)' }
            }
          >
            {t === "portfolio" ? "Portfolio" : "History"}
          </button>
        ))}
      </div>

      {tab === "portfolio" && <Portfolio />}
      {tab === "history"   && <TransactionHistory />}
    </div>
  );
}
