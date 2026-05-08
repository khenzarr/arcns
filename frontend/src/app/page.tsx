"use client";
/**
 * page.tsx — ArcNS home / search page.
 *
 * Phase 6 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useState, useCallback hooks untouched
 *   - handleSearch, handleInput handlers untouched
 *   - display = pending ?? committed logic untouched
 *   - SearchBar / DomainCard props untouched
 *   - PRICING_TABLE import untouched
 *   - isValidLabel import untouched
 *
 * Only JSX structure and visual classes were updated.
 */

import { useState, useCallback } from "react";
import SearchBar  from "../components/SearchBar";
import DomainCard from "../components/DomainCard";
import { isValidLabel, PRICING_TABLE, type SupportedTLD } from "../lib/normalization";
import { OrbitBackground } from "../components/ui/OrbitBackground";
import { FooterIdentityLine } from "../components/ui/FooterIdentityLine";

export default function HomePage() {
  // ── State — UNCHANGED ──────────────────────────────────────────────────────
  const [pending,   setPending]   = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [committed, setCommitted] = useState<{ label: string; tld: SupportedTLD } | null>(null);

  // Called (debounced) when input is valid — triggers availability RPC — UNCHANGED
  const handleSearch = useCallback((label: string, tld: SupportedTLD) => {
    setCommitted({ label, tld });
  }, []);

  // Called immediately on every valid keystroke — shows card before RPC fires — UNCHANGED
  const handleInput = useCallback((label: string, tld: SupportedTLD) => {
    if (isValidLabel(label)) {
      setPending({ label, tld });
    } else {
      setPending(null);
    }
  }, []);

  const display = pending ?? committed;

  return (
    <div className="space-y-16">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative text-center pt-16 pb-8 space-y-6 overflow-hidden arcns-hero-glow"
        style={{
          minHeight: "280px",
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37,99,255,0.22) 0%, transparent 65%)",
        }}
      >
        {/* Orbit background motif — increased opacity for hero variant */}
        <OrbitBackground variant="hero" className="rounded-3xl" />
        {/* Additional radial glow layer */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(37,99,255,0.22) 0%, transparent 65%)",
          }}
        />

        {/* Live badge */}
        <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-[var(--arcns-radius-pill)] text-sm font-medium"
          style={{
            background: "rgba(37, 99, 255, 0.10)",
            border: "1px solid rgba(37, 99, 255, 0.24)",
            color: "var(--arcns-text-secondary)",
          }}
        >
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" aria-hidden="true" />
          Live on Arc Testnet · Chain ID 5042002
        </div>

        {/* Headline */}
        <h1
          className="relative text-5xl md:text-6xl font-bold tracking-tight"
          style={{
            color: "var(--arcns-text-primary)",
            fontFamily: "var(--arcns-font-display)",
          }}
        >
          Your identity{" "}
          <span className="arcns-gradient-text">on Arc</span>
        </h1>

        {/* Subtitle */}
        <p
          className="relative text-lg md:text-xl max-w-xl mx-auto leading-relaxed"
          style={{ color: "var(--arcns-text-secondary)" }}
        >
          Register{" "}
          <strong style={{ color: "var(--arcns-cyan)" }}>.arc</strong>
          {" "}and{" "}
          <strong style={{ color: "var(--arcns-teal)" }}>.circle</strong>
          {" "}names. Pay with USDC.{" "}
          Own your on-chain identity as an NFT.
        </p>
      </section>

      {/* ── Search module ─────────────────────────────────────────────────── */}
      {/* SearchBar props and behavior UNCHANGED */}
      <section>
        <SearchBar onSearch={handleSearch} onInput={handleInput} />
      </section>

      {/* ── Domain card — appears instantly when input is valid ───────────── */}
      {/* DomainCard props UNCHANGED */}
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

      {/* ── Trust strip — hidden once user starts searching ───────────────── */}
      {!display ? (
        <section className="max-w-4xl mx-auto" style={{ padding: "1.5rem 0" }}>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px overflow-hidden rounded-[var(--arcns-radius-xl)]"
            style={{ border: "1px solid var(--arcns-border-default)" }}
          >
            {[
              { label: "Arc Testnet",        sub: "Chain ID 5042002",           icon: "◈" },
              { label: "Pay with USDC",       sub: "Secure. Stable. On-chain.", icon: "◎" },
              { label: "NFT Ownership",       sub: "Your names. Your identity.", icon: "⬡" },
              { label: "Reverse Resolution",  sub: "Link names to any address.", icon: "⟳" },
            ].map((item, i) => (
              <div
                key={i}
                className="px-6 py-5 text-center transition-all duration-150"
                style={{ background: "var(--arcns-bg-surface)", borderLeft: "2px solid transparent" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderLeft = "2px solid var(--arcns-cyan)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderLeft = "2px solid transparent";
                }}
              >
                <p className="text-lg mb-1" style={{ color: "var(--arcns-cyan)" }} aria-hidden="true">
                  {item.icon}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
                  {item.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--arcns-text-muted)" }}>
                  {item.sub}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Feature cards — hidden once user starts searching ─────────────── */}
      {!display ? (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {[
            {
              icon: "◈",
              iconColor: "var(--arcns-cyan)",
              title: "NFT Ownership",
              desc: "Each name is an ERC-721 NFT. Transfer, sell, or hold forever.",
            },
            {
              icon: "◎",
              iconColor: "var(--arcns-green)",
              title: "Pay with USDC",
              desc: "Stable, predictable pricing. No gas volatility. From $2.00/yr.",
            },
            {
              icon: "⟳",
              iconColor: "var(--arcns-teal)",
              title: "Reverse Resolution",
              desc: "Set your primary name — map your wallet to a human-readable identity.",
            },
          ].map(f => (
            <div
              key={f.title}
              className="arcns-glass rounded-[var(--arcns-radius-xl)] p-7 transition-all duration-200 hover:shadow-[var(--arcns-shadow-glow-soft)]"
              style={{ borderTop: "none" }}
            >
              {/* Top gradient accent line */}
              <div
                style={{
                  height: "2px",
                  background: "var(--arcns-gradient-primary)",
                  borderRadius: "2px 2px 0 0",
                  marginBottom: "1rem",
                  marginLeft: "-1.75rem",
                  marginRight: "-1.75rem",
                  marginTop: "-1.75rem",
                }}
                aria-hidden="true"
              />
              <div
                className="w-10 h-10 rounded-[var(--arcns-radius-md)] flex items-center justify-center text-xl mb-4"
                style={{
                  background: "rgba(37, 99, 255, 0.10)",
                  border: "1px solid rgba(37, 99, 255, 0.20)",
                  color: f.iconColor,
                }}
                aria-hidden="true"
              >
                {f.icon}
              </div>
              <h3
                className="font-semibold mb-2"
                style={{
                  color: "var(--arcns-text-primary)",
                  fontFamily: "var(--arcns-font-display)",
                }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--arcns-text-secondary)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </section>
      ) : null}

      {/* ── Pricing section — hidden once user starts searching ───────────── */}
      {/* PRICING_TABLE data source UNCHANGED */}
      {!display ? (
        <section className="max-w-2xl mx-auto" style={{ background: "rgba(37,99,255,0.04)", borderRadius: "var(--arcns-radius-xl)", padding: "1.5rem" }}>
          <div className="text-center mb-6">
            <h2
              className="text-2xl font-bold"
              style={{
                color: "var(--arcns-text-primary)",
                fontFamily: "var(--arcns-font-display)",
              }}
            >
              Simple, transparent pricing
            </h2>
            <p className="text-sm mt-1" style={{ color: "var(--arcns-text-secondary)" }}>
              All prices in USDC · Pro-rated for multi-year registrations
            </p>
          </div>

          <div
            className="arcns-glass rounded-[var(--arcns-radius-xl)] overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead
                className="border-b"
                style={{ borderColor: "var(--arcns-border-default)" }}
              >
                <tr>
                  <th
                    className="text-left px-6 py-3.5 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--arcns-text-muted)" }}
                  >
                    Name length
                  </th>
                  <th
                    className="text-right px-6 py-3.5 font-semibold text-xs uppercase tracking-wide"
                    style={{ color: "var(--arcns-text-muted)" }}
                  >
                    Annual price
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_TABLE.map((row, i) => (
                  <tr
                    key={row.len}
                    className="transition-colors"
                    style={{
                      borderTop: i > 0 ? "1px solid var(--arcns-divider)" : undefined,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,99,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-6 py-4" style={{ color: "var(--arcns-text-secondary)" }}>
                      {row.len}
                    </td>
                    <td className="px-6 py-4 text-right font-bold" style={{ color: "var(--arcns-text-primary)" }}>
                      {row.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div
              className="px-6 py-3 border-t"
              style={{ borderColor: "var(--arcns-border-default)" }}
            >
              <p className="text-xs" style={{ color: "var(--arcns-text-muted)" }}>
                Recently expired names may include a $100 premium that decays over 28 days.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Footer identity line ──────────────────────────────────────────── */}
      <FooterIdentityLine className="mt-8" />

    </div>
  );
}
