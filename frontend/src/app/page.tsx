"use client";
/**
 * page.tsx — ArcNS home / search page.
 *
 * ArcNS product language throughout. Zero ENS leakage.
 * Wired to v3 hooks via SearchBar + DomainCard.
 * Canonical flow: normalize → validate → price preview → availability → register/renew.
 */

import { useState, useCallback } from "react";
import SearchBar  from "../components/SearchBar";
import DomainCard from "../components/DomainCard";
import { isValidLabel, PRICING_TABLE, type SupportedTLD } from "../lib/normalization";

export default function HomePage() {
  const [pending,   setPending]   = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [committed, setCommitted] = useState<{ label: string; tld: SupportedTLD } | null>(null);

  // Called (debounced) when input is valid — triggers availability RPC
  const handleSearch = useCallback((label: string, tld: SupportedTLD) => {
    setCommitted({ label, tld });
  }, []);

  // Called immediately on every valid keystroke — shows card before RPC fires
  const handleInput = useCallback((label: string, tld: SupportedTLD) => {
    if (isValidLabel(label)) {
      setPending({ label, tld });
    } else {
      setPending(null);
    }
  }, []);

  const display = pending ?? committed;

  return (
    <div className="space-y-12">

      {/* Hero */}
      <section className="text-center py-10 space-y-4">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Live on Arc Testnet · Chain ID 5042002
        </div>
        <h1 className="text-5xl font-bold text-gray-900 tracking-tight">
          Your name on Arc
        </h1>
        <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
          Register <strong>.arc</strong> and <strong>.circle</strong> domains.
          Pay with USDC. Own your on-chain identity as an NFT.
        </p>
      </section>

      {/* Search */}
      <section>
        <SearchBar onSearch={handleSearch} onInput={handleInput} />
      </section>

      {/* Domain card — appears instantly when input is valid */}
      {display ? (
        <section className="max-w-2xl mx-auto">
          <DomainCard
            label={display.label}
            tld={display.tld}
            isCommitted={
              committed?.label === display.label && committed?.tld === display.tld
            }
          />
        </section>
      ) : null}

      {/* Feature highlights — hidden once user starts searching */}
      {!display ? (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            {
              icon: "🔑",
              title: "NFT Ownership",
              desc: "Each domain is an ERC-721 NFT. Transfer, sell, or hold forever.",
            },
            {
              icon: "💵",
              title: "Pay with USDC",
              desc: "Stable, predictable pricing. No gas volatility. From $2.00/yr.",
            },
            {
              icon: "🔄",
              title: "Reverse Resolution",
              desc: "Set your primary name — map your wallet to a human-readable identity.",
            },
          ].map(f => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>
      ) : null}

      {/* Pricing table */}
      {!display ? (
        <section className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Pricing</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Name length</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Annual price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {PRICING_TABLE.map(row => (
                  <tr key={row.len} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900">{row.len}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-400">All prices in USDC · Pro-rated for multi-year registrations</p>
              <p className="text-xs text-gray-400">+$100 premium for recently expired names (decays over 28 days)</p>
            </div>
          </div>
        </section>
      ) : null}

    </div>
  );
}
