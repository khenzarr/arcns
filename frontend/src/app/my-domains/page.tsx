"use client";
/**
 * my-domains/page.tsx — ArcNS My Domains page.
 *
 * Manual product-level redesign shell.
 *
 * LOGIC PRESERVED:
 * - tab state preserved
 * - Portfolio / TransactionHistory / PrimaryName preserved
 * - no hook/lib/provider/wagmi/contract changes
 */

import { useState } from "react";
import Image from "next/image";
import Portfolio from "../../components/Portfolio";
import TransactionHistory from "../../components/TransactionHistory";
import PrimaryName from "../../components/PrimaryName";
import { NetworkBadge } from "../../components/ui/NetworkBadge";
import { DashboardStats } from "../../components/ui/DashboardStats";
import { FooterIdentityLine } from "../../components/ui/FooterIdentityLine";

type Tab = "portfolio" | "history";

export default function MyDomainsPage() {
  const [tab, setTab] = useState<Tab>("portfolio");
  const [portfolioSearch, setPortfolioSearch] = useState("");

  return (
    <div className="arcns-domains-page">
      <div className="arcns-domains-bg" aria-hidden="true" />

      <main className="arcns-domains-shell">
        <section className="arcns-domains-hero">
          <div className="arcns-domains-emblem" aria-hidden="true">
  <Image
    src="/arcns/arcns-emblem.svg"
    alt=""
    width={132}
    height={132}
    priority
  />
</div>

          <div className="arcns-domains-title">
            <div className="arcns-domains-title-row">
              <h1>My Domains</h1>
              <NetworkBadge variant="testnet" label="Testnet" />
            </div>
            <p>Manage your ArcNS identity portfolio.</p>
          </div>
        </section>

        <section className="arcns-domains-stats">
          <DashboardStats />
        </section>

        <section className="arcns-domains-primary">
          <PrimaryName />
        </section>

        <section className="arcns-domains-control-row">
  <div className="arcns-domains-tabs" role="tablist" aria-label="My Domains sections">
    {(["portfolio", "history"] as Tab[]).map(t => {
      const active = tab === t;

      return (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => setTab(t)}
          className="arcns-domains-tab"
          data-active={active ? "true" : "false"}
        >
          {t === "portfolio" ? "Portfolio" : "History"}
        </button>
      );
    })}
  </div>

  {tab === "portfolio" ? (
    <div className="arcns-domains-toolbar">
      <label className="arcns-domains-search">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M13.2 13.2L17 17"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <input
          value={portfolioSearch}
          onChange={event => setPortfolioSearch(event.target.value)}
          placeholder="Search your domains..."
        />
      </label>

      <button type="button" className="arcns-domains-filter">
        <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M3 4.5H15L10.5 9.6V13.5L7.5 15V9.6L3 4.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        Filter
      </button>
    </div>
  ) : null}
</section>

        <section className="arcns-domains-content">
          {tab === "portfolio" ? (
  <Portfolio searchQuery={portfolioSearch} />
) : (
  <TransactionHistory />
)}
        </section>
      </main>

      <FooterIdentityLine className="arcns-domains-footer" />
    </div>
  );
}