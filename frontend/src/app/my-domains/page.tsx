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
        <h1 className="text-3xl font-bold text-gray-900">My Domains</h1>
        <p className="text-gray-500 mt-1">Manage your ArcNS registrations</p>
      </div>

      {/* Phase 23: Primary name always visible */}
      <PrimaryName />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["portfolio", "history"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
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
