"use client";
/**
 * Header.tsx — ArcNS global navigation.
 *
 * Phase 5 visual polish: ArcNS design system applied.
 *
 * WALLET LOGIC IS UNCHANGED:
 *   - useAccount, useConnect, useDisconnect hooks untouched
 *   - connect({ connector }) calls untouched
 *   - disconnect() call untouched
 *   - connector lookup (injected / walletConnect) untouched
 *   - isPending / isConnected / address state untouched
 *
 * Only JSX structure and visual classes were updated.
 */

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
          className="absolute -bottom-[17px] left-0 right-0 h-[2px] rounded-full"
          style={{ background: "var(--arcns-gradient-primary)" }}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
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
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
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

        {/* ── Center: Navigation links ───────────────────────────────────── */}
        <nav
          className="hidden md:flex items-center gap-6"
          aria-label="Main navigation"
        >
          <NavLink href="/">Search</NavLink>
          <NavLink href="/my-domains">My Domains</NavLink>
          <NavLink href="/resolve">Resolve</NavLink>
        </nav>

        {/* ── Right: Wallet ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <WalletButton />
        </div>

      </div>
    </header>
  );
}
