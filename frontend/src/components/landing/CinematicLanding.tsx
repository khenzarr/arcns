"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const SUFFIXES = [".arc", ".circle"] as const;
type Suffix = (typeof SUFFIXES)[number];
const Arrow = () => <span aria-hidden="true">-&gt;</span>;

export default function CinematicLanding() {
  const [name, setName] = useState("yourname");
  const [suffix, setSuffix] = useState<Suffix>(".arc");
  const cleanName = useMemo(() => name.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24), [name]);
  const fullName = `${cleanName || "yourname"}${suffix}`;

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
        <div className="cinematic-section-heading cinematic-shell"><div><span>01</span><p>Visual experience</p></div><h2 id="experience-title">Imagine your identity<br />on Arc.</h2><p>This preview is a visual simulation. It never checks availability, connects a wallet, quotes a price, or submits a transaction.</p></div>
        <div className="cinematic-app-window cinematic-shell">
          <div className="cinematic-app-topbar"><div className="cinematic-mini-brand"><Image src="/arcns/arcns-emblem.svg" alt="" width={32} height={32} />Arc<span>NS</span></div><div className="cinematic-network-pill"><i aria-hidden="true" />Arc Testnet</div><Link className="cinematic-mini-launch" href="/app">Open real app</Link></div>
          <div className="cinematic-app-body">
            <aside aria-label="Simulation status"><strong>Demo mode</strong><p>Visual-only preview. No wallet or blockchain interaction.</p><Link href="/resolve">Open real resolver <Arrow /></Link></aside>
            <div className="cinematic-register-panel">
              <p className="cinematic-panel-kicker">Try the visual preview</p><h3>Your identity starts here.</h3><p>Enter an example label to preview how an ArcNS name could look.</p>
              <div className="cinematic-search-box"><label htmlFor="cinematic-name">Example name</label><div><input id="cinematic-name" value={name} onChange={event => setName(event.target.value)} autoComplete="off" /><span className="cinematic-suffix-select" aria-label="Example namespace">{SUFFIXES.map(item => <button key={item} type="button" className={suffix === item ? "selected" : ""} onClick={() => setSuffix(item)} aria-pressed={suffix === item}>{item}</button>)}</span></div></div>
              <div className="cinematic-preview-card" aria-live="polite"><span>Visual example</span><strong>{fullName}</strong><small>Availability and pricing are not checked here.</small></div>
              <Link className="cinematic-primary-button cinematic-wide-button" href="/app">Search in the real app <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="cinematic-identity cinematic-shell" id="identity" aria-labelledby="identity-title">
        <div className="cinematic-section-heading cinematic-compact"><div><span>02</span><p>Identity layer</p></div><h2 id="identity-title">More than<br />an address.</h2></div>
        <div className="cinematic-feature-grid">
          <article className="cinematic-feature-main"><span aria-hidden="true">ID</span><p>Human-readable identity</p><h3>Use a memorable name instead of a long hexadecimal address.</h3><div><span>0x9c90...ACBC</span><b aria-hidden="true">-&gt;</b><strong>yourname.arc</strong></div></article>
          <article><span aria-hidden="true">NFT</span><p>Onchain ownership</p><h3>Registered names are represented by ERC-721 ownership for the selected registration period.</h3></article>
          <article><span aria-hidden="true">OPEN</span><p>Forward and reverse resolution</p><h3>Use the production app to configure and inspect name records on Arc Testnet.</h3></article>
        </div>
      </section>

      <section className="cinematic-how" id="how" aria-labelledby="how-title"><div className="cinematic-shell">
        <div className="cinematic-section-heading cinematic-light"><div><span>03</span><p>How it works</p></div><h2 id="how-title">From search to testnet identity<br />in three steps.</h2></div>
        <div className="cinematic-steps"><article><b>01</b><span aria-hidden="true">FIND</span><h3>Find a name</h3><p>Search the real application for an available <code>.arc</code> or <code>.circle</code> name.</p></article><article><b>02</b><span aria-hidden="true">SET</span><h3>Register on testnet</h3><p>Review the verified in-app quote and confirm the testnet registration flow.</p></article><article><b>03</b><span aria-hidden="true">OK</span><h3>Resolve it</h3><p>Inspect ownership and configure supported records using ArcNS application tools.</p></article></div>
        <div className="cinematic-closing"><div><Image src="/arcns/arcns-emblem.svg" alt="" width={100} height={100} /><h2>Make yourself<br /><em>recognizable.</em></h2></div><Link className="cinematic-primary-button cinematic-pale-button" href="/app">Launch App <Arrow /></Link></div>
        <nav className="cinematic-resource-links" id="resources" aria-label="ArcNS resources"><Link href="/app">Search names</Link><Link href="/resolve">Resolve</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/trademark">Trademark</Link></nav>
      </div></section>
    </div>
  );
}