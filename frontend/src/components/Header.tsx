"use client";
/**
 * Header.tsx — ArcNS global navigation.
 *
 * Uses the real ArcNS emblem asset from /public/arcns/arcns-emblem.svg
 * and a crisp text wordmark for reliable header rendering.
 *
 * WALLET LOGIC IS UNCHANGED:
 *   - useAccount, useConnect, useDisconnect hooks untouched
 *   - connect({ connector }) calls untouched
 *   - disconnect() call untouched
 *   - connector lookup (injected / walletConnect) untouched
 *   - isPending / isConnected / address state untouched
 */

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NetworkBadge } from "./ui/NetworkBadge";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 hidden sm:block"
          aria-hidden="true"
        />

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

  const injectedConnector = connectors.find(c => c.id === "injected");
  const wcConnector = connectors.find(c => c.id === "walletConnect");

  return (
    <div className="flex items-center gap-2">
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

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className="relative text-sm font-medium transition-colors duration-150 px-1 py-0.5"
      style={{
        color: isActive ? "var(--arcns-cyan)" : "var(--arcns-text-secondary)",
      }}
    >
      {children}

      {isActive ? (
        <span
          className="absolute -bottom-[18px] left-0 right-0 h-[2px] rounded-full"
          style={{ background: "var(--arcns-gradient-primary)" }}
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

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
      <div className="w-full px-8 lg:px-16 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 flex-shrink-0 group"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="ArcNS home"
        >
          <span
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl border"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(0,212,255,0.16), rgba(37,99,255,0.08) 46%, rgba(11,18,36,0.72) 100%)",
              borderColor: "rgba(0, 212, 255, 0.28)",
              boxShadow:
                "0 0 24px rgba(0, 212, 255, 0.14), inset 0 0 18px rgba(37, 99, 255, 0.10)",
            }}
            aria-hidden="true"
          >
            <Image
              src="/arcns/arcns-emblem.svg"
              alt=""
              width={28}
              height={28}
              priority
              className="h-7 w-7 select-none"
              style={{
                objectFit: "contain",
                filter:
                  "drop-shadow(0 0 10px rgba(0, 212, 255, 0.45)) drop-shadow(0 0 16px rgba(37, 99, 255, 0.28))",
              }}
            />
          </span>

          <span
            className="font-bold text-2xl tracking-[-0.04em]"
            style={{
              color: "var(--arcns-text-primary)",
              fontFamily: "var(--arcns-font-display)",
              textShadow: "0 0 18px rgba(0, 212, 255, 0.08)",
            }}
          >
            ArcNS
          </span>

          <NetworkBadge variant="testnet" label="Testnet" />
        </Link>

        <nav
          className="hidden md:flex items-center gap-7"
          aria-label="Main navigation"
        >
          <NavLink href="/">Search</NavLink>
          <NavLink href="/my-domains">My Domains</NavLink>
          <NavLink href="/resolve">Resolve</NavLink>
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          <WalletButton />

          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-[var(--arcns-radius-sm)] border transition-all duration-150"
            style={{
              background: "transparent",
              borderColor: mobileMenuOpen
                ? "var(--arcns-border-strong)"
                : "var(--arcns-border-default)",
              color: "var(--arcns-text-secondary)",
            }}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav"
          >
            {mobileMenuOpen ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3 3L13 13M13 3L3 13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 4H14M2 8H14M2 12H14"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen ? (
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
            { href: "/", label: "Search" },
            { href: "/my-domains", label: "My Domains" },
            { href: "/resolve", label: "Resolve" },
          ].map(({ href, label }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-[var(--arcns-radius-md)] text-sm font-medium transition-all duration-150"
                style={{
                  color: isActive
                    ? "var(--arcns-cyan)"
                    : "var(--arcns-text-secondary)",
                  background: isActive
                    ? "rgba(37,99,255,0.08)"
                    : "transparent",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "rgba(37,99,255,0.08)";
                    e.currentTarget.style.color = "var(--arcns-text-primary)";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--arcns-text-secondary)";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}