"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MAINNET_PRICING } from "@/lib/normalization";

const SUFFIXES = [".arc", ".circle"] as const;
type Suffix = (typeof SUFFIXES)[number];
const Arrow = () => <span aria-hidden="true">-&gt;</span>;

export default function CinematicLanding() {
  const [name, setName] = useState("yourname");
  const [suffix, setSuffix] = useState<Suffix>(".arc");
  const [years, setYears] = useState(1);
  const cleanName = useMemo(() => name.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24), [name]);
  const fullName = `${cleanName || "yourname"}${suffix}`;
  const annualPrice = useMemo(() => {
    const characterCount = [...(cleanName || "yourname")].length;
    const tier = MAINNET_PRICING.find(item => item.chars === Math.min(characterCount, 5));
    return Number((tier ?? MAINNET_PRICING[4]).annualUSDC) / 1_000_000;
  }, [cleanName]);
  const totalPrice = annualPrice * years;

  return (
    <div className="arcns-cinematic" id="top">
      <div className="cinematic-ambient-grid" aria-hidden="true" />
      <div className="cinematic-glow cinematic-glow-a" aria-hidden="true" />
      <div className="cinematic-glow cinematic-glow-b" aria-hidden="true" />

      <section className="cinematic-hero cinematic-shell" aria-labelledby="landing-title">
        <div className="cinematic-hero-copy">
          <p className="cinematic-eyebrow"><span aria-hidden="true" />Arc public testnet - Pre-mainnet</p>
          <h1 id="landing-title">One name.<br /><em>Every interaction.</em></h1>
          <p className="cinematic-lede">Turn a wallet address into a human-readable identity on Arc Testnet. Explore ArcNS, then use the real application to search, register, and resolve names.</p>
          <p className="cinematic-disclosure">ArcNS is an independent testnet project. The <code>.circle</code> namespace does not imply Circle affiliation, sponsorship, or endorsement.</p>
          <div className="cinematic-actions">
            <Link className="cinematic-primary-button" href="/app">Visit ArcNS <Arrow /></Link>
            <a className="cinematic-text-link" href="#experience">Explore the experience</a>
          </div>
        </div>
        <div className="cinematic-identity-visual" aria-hidden="true">
          <div className="cinematic-orbit cinematic-orbit-one"><span /></div><div className="cinematic-orbit cinematic-orbit-two"><span /></div><div className="cinematic-orbit cinematic-orbit-three"><span /></div>
          <div className="cinematic-identity-core"><span className="cinematic-core-pulse" /><Image src="/arcns/arcns-emblem.svg" alt="" width={180} height={180} priority /></div>
          <div className="cinematic-chip cinematic-chip-wallet"><small>WALLET</small><b>0xCdc3...16a7</b></div>
          <div className="cinematic-chip cinematic-chip-name"><small>EXAMPLE NAME</small><b>yourname.arc</b></div>
          <div className="cinematic-chip cinematic-chip-resolve"><small>NETWORK</small><b>Arc Testnet</b></div>
        </div>
      </section>

      <section className="cinematic-experience" id="experience" aria-labelledby="experience-title">
        <div className="cinematic-section-heading cinematic-shell"><div><span>01</span><p>Interactive experience</p></div><h2 id="experience-title">Claim your place<br />on Arc.</h2><p>Explore the full registration flow with a safe, simulated transaction. No wallet or testnet funds required.</p></div>
        <div className="cinematic-app-window cinematic-shell">
          <div className="cinematic-app-topbar"><div className="cinematic-mini-brand"><Image src="/arcns/arcns-emblem.svg" alt="" width={32} height={32} />Arc<span>NS</span></div><div className="cinematic-network-pill"><i aria-hidden="true" />Arc Testnet</div><Link className="cinematic-demo-connect" href="/app">Connect</Link></div>
          <div className="cinematic-app-body">
            <aside className="cinematic-demo-sidebar" aria-label="Demo navigation">
              <nav>
                <button className="active" type="button"><span aria-hidden="true">⌕</span>Register</button>
                <Link href="/resolve"><span aria-hidden="true">◇</span>Resolve</Link>
              </nav>
              <div className="cinematic-demo-note"><strong>Demo mode</strong><p>Interactions are simulated and never touch your wallet.</p></div>
            </aside>
            <div className="cinematic-register-panel">
              <p className="cinematic-panel-kicker">Register a name</p><h3>Your identity starts here.</h3><p>Search for a memorable name and make it yours.</p>
              <div className="cinematic-search-box cinematic-demo-search"><label className="sr-only" htmlFor="cinematic-name">Name to register</label><div><input id="cinematic-name" value={name} onChange={event => setName(event.target.value)} autoComplete="off" /><span className="cinematic-suffix-select" aria-label="Example namespace">{SUFFIXES.map(item => <button key={item} type="button" className={suffix === item ? "selected" : ""} onClick={() => setSuffix(item)} aria-pressed={suffix === item}>{item}</button>)}</span><button className="cinematic-search-submit" type="button" aria-label={`Preview ${fullName}`}>→</button></div></div>
              <div className="cinematic-availability" aria-live="polite"><span><i aria-hidden="true" /><b>{fullName}</b><small>is available</small></span><strong>{annualPrice} USDC <small>/ year · mainnet preview</small></strong></div>
              <div className="cinematic-demo-quote">
                <div className="cinematic-period-row"><span>Registration period</span><div><button type="button" onClick={() => setYears(value => Math.max(1, value - 1))} disabled={years === 1} aria-label="Decrease registration period">−</button><strong>{years} {years === 1 ? "year" : "years"}</strong><button type="button" onClick={() => setYears(value => Math.min(10, value + 1))} disabled={years === 10} aria-label="Increase registration period">+</button></div></div>
                <div className="cinematic-total-row"><span>Total</span><strong>{totalPrice.toFixed(2)} USDC</strong></div>
                <Link className="cinematic-primary-button cinematic-wide-button" href={`/app?name=${encodeURIComponent(cleanName || "yourname")}&suffix=${encodeURIComponent(suffix)}`}>Connect wallet to continue <span aria-hidden="true">↗</span></Link>
                <small className="cinematic-simulation-label"><i aria-hidden="true" />Simulated transaction · No funds required</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cinematic-identity cinematic-shell" id="identity" aria-labelledby="identity-title">
        <div className="cinematic-section-heading cinematic-compact"><div><span>02</span><p>Identity layer</p></div><h2 id="identity-title">More than<br />an address.</h2></div>
        <div className="cinematic-feature-grid">
          <article className="cinematic-feature-main"><span aria-hidden="true">ID</span><p>Human-readable identity</p><h3>Use a memorable name instead of a long hexadecimal address.</h3><div><span>0x9c90...ACBC</span><b aria-hidden="true">-&gt;</b><strong>yourname.arc</strong></div><Link className="cinematic-text-link" href="/send">Send assets to a name <Arrow /></Link></article>
          <article><span aria-hidden="true">NFT</span><p>Onchain ownership</p><h3>Registered names are represented by ERC-721 ownership for the selected registration period.</h3></article>
          <article><span aria-hidden="true">OPEN</span><p>Forward and reverse resolution</p><h3>Use the production app to configure and inspect name records on Arc Testnet.</h3></article>
        </div>
      </section>

      <section className="cinematic-how" id="how" aria-labelledby="how-title"><div className="cinematic-shell">
        <div className="cinematic-section-heading cinematic-light"><div><span>03</span><p>How it works</p></div><h2 id="how-title">From search to testnet identity<br />in three steps.</h2></div>
        <div className="cinematic-steps"><article><b>01</b><span aria-hidden="true">FIND</span><h3>Find a name</h3><p>Search the real application for an available <code>.arc</code> or <code>.circle</code> name.</p></article><article><b>02</b><span aria-hidden="true">SET</span><h3>Register on testnet</h3><p>Review the verified in-app quote and confirm the testnet registration flow.</p></article><article><b>03</b><span aria-hidden="true">OK</span><h3>Resolve it</h3><p>Inspect ownership and configure supported records using ArcNS application tools.</p></article></div>
        <div className="cinematic-closing"><div><Image src="/arcns/arcns-emblem.svg" alt="" width={100} height={100} /><h2>Make yourself<br /><em>recognizable.</em></h2></div><Link className="cinematic-primary-button cinematic-pale-button" href="/app">Launch App <Arrow /></Link></div>
        <nav className="cinematic-resource-links" id="resources" aria-label="ArcNS resources"><Link href="/app">Search names</Link><Link href="/send">Send assets</Link><Link href="/resolve">Resolve</Link><Link href="/developers/integrate">Integrate ArcNS</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/trademark">Trademark</Link></nav>
      </div></section>
    </div>
  );
}
