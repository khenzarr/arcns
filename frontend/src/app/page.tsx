"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import SearchBar from "../components/SearchBar";
import DomainCard from "../components/DomainCard";
import {
  isValidLabel,
  PRICING_TABLE,
  type SupportedTLD,
} from "../lib/normalization";
import { FooterIdentityLine } from "../components/ui/FooterIdentityLine";

const TRUST_ITEMS = [
  {
    title: "Arc Testnet",
    sub: "Chain ID 5042002",
    accent: "var(--arcns-cyan)",
    icon: (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="14" cy="14" r="4" fill="currentColor" opacity="0.8" />
      </svg>
    ),
  },
  {
    title: "Pay with USDC",
    sub: "Secure. Stable. On-chain.",
    accent: "#3BA3FF",
    icon: (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 7v14M18 10.5c-1.1-1-2.4-1.5-4-1.5-2.1 0-3.4 1-3.4 2.4 0 3.4 7.1 1.4 7.1 5.2 0 1.5-1.4 2.5-3.7 2.5-1.8 0-3.4-.6-4.5-1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "NFT Ownership",
    sub: "Your names. Your identity.",
    accent: "#8B7CFF",
    icon: (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 3.5l9 5.2v10.6l-9 5.2-9-5.2V8.7l9-5.2z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M14 8.2l5 2.9v5.8l-5 2.9-5-2.9v-5.8l5-2.9z" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
      </svg>
    ),
  },
  {
    title: "Reverse Resolution",
    sub: "Link names to any address.",
    accent: "var(--arcns-teal)",
    icon: (
      <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6.5 23c1.2-4 4-6.2 7.5-6.2S20.3 19 21.5 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
] as const;

const FEATURES = [
  {
    title: "NFT Ownership",
    desc: "Each name is an ERC-721 NFT. Transfer, sell, or hold forever.",
    accent: "var(--arcns-cyan)",
    icon: TRUST_ITEMS[2].icon,
  },
  {
    title: "Pay with USDC",
    desc: "Stable, predictable pricing. No gas volatility. From $2.00/yr.",
    accent: "#3BA3FF",
    icon: TRUST_ITEMS[1].icon,
  },
  {
    title: "Reverse Resolution",
    desc: "Set your primary name — map your wallet to a human-readable identity.",
    accent: "var(--arcns-teal)",
    icon: TRUST_ITEMS[3].icon,
  },
] as const;

export default function HomePage() {
  const [pending, setPending] = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [committed, setCommitted] = useState<{ label: string; tld: SupportedTLD } | null>(null);

  const handleSearch = useCallback((label: string, tld: SupportedTLD) => {
    setCommitted({ label, tld });
  }, []);

  const handleInput = useCallback((label: string, tld: SupportedTLD) => {
    if (isValidLabel(label)) {
      setPending({ label, tld });
    } else {
      setPending(null);
    }
  }, []);

  const display = pending ?? committed;

  return (
    <div className="arcns-landing-page">
      <section className="arcns-landing-scene">
        <div className="arcns-landing-bg" aria-hidden="true" />
        <div className="arcns-orbit-lines" aria-hidden="true" />

        <div className="arcns-landing-inner">
          <div className="arcns-left-emblem" aria-hidden="true">
  <Image
  src="/arcns/arcns-emblem-glow.png"
  alt=""
  width={520}
  height={520}
  priority
  className="arcns-left-emblem-img"
/>
</div>

          <div className="arcns-hero-copy">
            <div className="arcns-live-badge">
              <span className="arcns-pulse-dot" aria-hidden="true" />
              Live on Arc Testnet · Chain ID 5042002
            </div>

            <h1 className="arcns-hero-headline">
              Your identity <span className="arcns-gradient-text">on Arc</span>
            </h1>

            <p className="arcns-hero-subtitle">
              Register <strong>.arc</strong> and <strong className="circle">.circle</strong> names.
              Pay with <span>USDC</span>.
              <br />
              Own your on-chain identity as an NFT.
            </p>
          </div>

          <div className="arcns-hero-search">
            <SearchBar onSearch={handleSearch} onInput={handleInput} />
          </div>

          {!display ? (
            <div className="arcns-lower-suite">
              <div className="arcns-trust-bar">
                {TRUST_ITEMS.map(item => (
                  <div className="arcns-trust-cell" key={item.title} style={{ color: item.accent }}>
                    <div className="arcns-trust-icon">{item.icon}</div>
                    <div>
                      <p>{item.title}</p>
                      <span>{item.sub}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="arcns-feature-grid">
                {FEATURES.map(feature => (
                  <article className="arcns-feature-panel" key={feature.title}>
                    <div className="arcns-feature-topline" style={{ background: feature.accent }} />
                    <div className="arcns-feature-body">
                      <div className="arcns-feature-icon" style={{ color: feature.accent }}>
                        {feature.icon}
                      </div>
                      <div>
                        <h3>{feature.title}</h3>
                        <p>{feature.desc}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <section className="arcns-pricing-panel">
                <div className="arcns-pricing-heading">
                  <div>
                    <h2>Simple, transparent pricing</h2>
                    <p>All prices in USDC · Pro-rated for multi-year registrations</p>
                  </div>
                  <div className="arcns-premium-pill">
                    ✦ $100 premium for recently expired names (decays over 28 days)
                  </div>
                </div>

                <div className="arcns-price-grid">
                  {PRICING_TABLE.map((row, index) => (
                    <div className="arcns-price-cell" key={row.len} data-best={index === 0 ? "true" : "false"}>
                      <span>{row.len}</span>
                      <strong>{row.price.replace(" / year", "")}</strong>
                      <em>/ year</em>
                      {index === 0 ? <b>Best value</b> : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <section className="arcns-card-section">
              <DomainCard
                label={display.label}
                tld={display.tld}
                isCommitted={committed?.label === display.label && committed?.tld === display.tld}
              />
            </section>
          )}
        </div>
      </section>

      <FooterIdentityLine className="arcns-home-footer" />
    </div>
  );
}