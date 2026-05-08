"use client";
/**
 * Header.tsx — ArcNS global navigation.
 *
 * Phase 5 visual polish + Phase 9 responsive/a11y polish.
 *
 * WALLET LOGIC IS UNCHANGED:
 *   - useAccount, useConnect, useDisconnect hooks untouched
 *   - connect({ connector }) calls untouched
 *   - disconnect() call untouched
 *   - connector lookup (injected / walletConnect) untouched
 *   - isPending / isConnected / address state untouched
 *
 * Phase 9 additions (visual only):
 *   - Mobile nav menu (hamburger toggle) for < md viewports
 *   - aria-expanded on mobile menu button
 *   - aria-label on disconnect button
 *   - aria-label on connect buttons
 */

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NetworkBadge } from "./ui/NetworkBadge";

// ─── WalletButton ─────────────────────────────────────────────────────────────
// All hook calls and handlers are identical to the original.
// Only the visual wrapper JSX has changed.

function WalletButton() {
  // ── Hooks — UNCHANGED ──────────────────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // ── Connected state ────────────────────────────────────────────────────────
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {/* Connected indicator dot */}
        <span
          className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 hidden sm:block"
          aria-hidden="true"
        />
        {/* Truncated address pill */}
        <span
          className="hidden sm:block text-xs font-mono px-3 py-1.5 rounded-[var(--arcns-radius-sm)] border"
          style={{
            background: "rgba(11, 18, 36, 0.7)",
            borderColor: "var(--arcns-border-default)",
            color: "var(--arcns-text-secondary)",
          }}
          title={address}
        >
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        {/* Disconnect button — handler UNCHANGED */}
        <button
          onClick={() => disconnect()}
          aria-label="Disconnect wallet"
          className="px-3 py-1.5 text-xs font-medium rounded-[var(--arcns-radius-sm)] border transition-all duration-150 hover:border-[var(--arcns-border-strong)] hover:text-[var(--arcns-text-primary)]"
          style={{
            background: "transparent",
            borderColor: "var(--arcns-border-default)",
            color: "var(--arcns-text-muted)",
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Disconnected state — connector lookup UNCHANGED ────────────────────────
  const injectedConnector = connectors.find(c => c.id === "injected");
  const wcConnector       = connectors.find(c => c.id === "walletConnect");

  return (
    <div className="flex items-center gap-2">
      {/* MetaMask / injected — connect handler UNCHANGED */}
      {injectedConnector ? (
        <button
          onClick={() => connect({ connector: injectedConnector })}
          disabled={isPending}
          aria-label={isPending ? "Connecting wallet…" : "Connect with MetaMask"}
          className="px-4 py-2 text-sm font-semibold text-white rounded-[var(--arcns-radius-md)] disabled:opacity-40 transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--arcns-gradient-primary)" }}
        >
          {isPending ? "Connecting…" : "Connect Wallet"}
        </button>
      ) : null}
      {/* WalletConnect — connect handler UNCHANGED */}
      {wcConnector && !injectedConnector ? (
        <button
          onClick={() => connect({ connector: wcConnector })}
          disabled={isPending}
          aria-label={isPending ? "Connecting wallet…" : "Connect with WalletConnect"}
          className="px-4 py-2 text-sm font-semibold rounded-[var(--arcns-radius-md)] border disabled:opacity-40 transition-all duration-150 hover:border-[var(--arcns-border-strong)] hover:text-[var(--arcns-text-primary)]"
          style={{
            background: "transparent",
            borderColor: "var(--arcns-border-default)",
            color: "var(--arcns-text-secondary)",
          }}
        >
          {isPending ? "Connecting…" : "WalletConnect"}
        </button>
      ) : null}
    </div>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────
// Active state detection via usePathname — no new state, no new hooks beyond
// the standard Next.js navigation hook.

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  // Exact match for "/" (home), prefix match for sub-routes
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className="relative text-sm font-medium transition-colors duration-150 px-1 py-0.5"
      style={{ color: isActive ? "var(--arcns-cyan)" : "var(--arcns-text-secondary)" }}
    >
      {children}
      {/* Active underline indicator */}
      {isActive && (
        <span
          className="absolute -bottom-[18px] left-0 right-0 h-[2px] rounded-full"
          style={{ background: "var(--arcns-gradient-primary)" }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname() ?? "";

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(5, 10, 24, 0.88)",
        borderColor: "var(--arcns-border-default)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* ── Left: Logo + Testnet badge ─────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group" onClick={() => setMobileMenuOpen(false)}>
          {/* ArcNS emblem — SVG, brand-aligned */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="14" cy="14" r="11"
              stroke="url(#logo-gradient)"
              strokeWidth="1.75"
              fill="none"
            />
            <path
              d="M 14 3 A 11 11 0 0 1 25 14"
              stroke="url(#logo-gradient)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="14" cy="14" r="2.5" fill="var(--arcns-cyan)" />
            <defs>
              <linearGradient id="logo-gradient" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#2563FF" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
          </svg>

          {/* Wordmark */}
          <span
            className="font-bold text-xl tracking-tight"
            style={{
              color: "var(--arcns-text-primary)",
              fontFamily: "var(--arcns-font-display)",
            }}
          >
            ArcNS
          </span>

          {/* Testnet badge */}
          <NetworkBadge variant="testnet" label="Testnet" />
        </Link>

        {/* ── Center: Navigation links (desktop) ────────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Main navigation"
        >
          <NavLink href="/">Search</NavLink>
          <NavLink href="/my-domains">My Domains</NavLink>
          <NavLink href="/resolve">Resolve</NavLink>
        </nav>

        {/* ── Right: Wallet + mobile menu toggle ────────────────────────── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <WalletButton />

          {/* Mobile hamburger — visible only on < md */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-[var(--arcns-radius-sm)] border transition-all duration-150"
            style={{
              background: "transparent",
              borderColor: mobileMenuOpen ? "var(--arcns-border-strong)" : "var(--arcns-border-default)",
              color: "var(--arcns-text-secondary)",
            }}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? (
              /* X icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>

      </div>

      {/* ── Mobile nav dropdown ───────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden border-t px-4 py-3 flex flex-col gap-1"
          style={{
            background: "rgba(5, 10, 24, 0.96)",
            borderColor: "var(--arcns-border-default)",
          }}
          aria-label="Mobile navigation"
        >
          {[
            { href: "/",           label: "Search" },
            { href: "/my-domains", label: "My Domains" },
            { href: "/resolve",    label: "Resolve" },
          ].map(({ href, label }) => {
            const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-[var(--arcns-radius-md)] text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive ? "var(--arcns-cyan)" : "var(--arcns-text-secondary)",
                  background: isActive ? "rgba(37,99,255,0.08)" : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "rgba(37,99,255,0.08)";
                    (e.currentTarget as HTMLElement).style.color = "var(--arcns-text-primary)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "var(--arcns-text-secondary)";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
