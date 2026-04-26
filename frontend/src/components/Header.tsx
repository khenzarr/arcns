"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import Link from "next/link";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 hidden sm:block" />
        <span className="text-xs font-mono hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
          style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Find injected (MetaMask extension) and WalletConnect connectors
  const injectedConnector   = connectors.find(c => c.id === "injected");
  const wcConnector         = connectors.find(c => c.id === "walletConnect");

  return (
    <div className="flex items-center gap-2">
      {injectedConnector ? (
        <button
          onClick={() => connect({ connector: injectedConnector })}
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-colors hover:opacity-90"
          style={{ background: 'var(--color-accent-primary)' }}
        >
          {isPending ? "Connecting…" : "MetaMask"}
        </button>
      ) : null}
      {wcConnector ? (
        <button
          onClick={() => connect({ connector: wcConnector })}
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
          style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-primary)' }}
        >
          WalletConnect
        </button>
      ) : null}
    </div>
  );
}

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-sm border-b"
      style={{ background: 'rgba(13,17,23,0.85)', borderColor: 'var(--color-border-subtle)' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="11" stroke="var(--color-accent-primary)" strokeWidth="2" fill="none"/>
            <path d="M 14 3 A 11 11 0 0 1 25 14" stroke="var(--color-accent-primary)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            <circle cx="14" cy="14" r="2.5" fill="var(--color-accent-primary)"/>
          </svg>
          <span className="font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>ArcNS</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }}
          >
            Testnet
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:text-white transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Search</Link>
          <Link href="/my-domains" className="hover:text-white transition-colors" style={{ color: 'var(--color-text-secondary)' }}>My Domains</Link>
          <Link href="/resolve" className="hover:text-white transition-colors" style={{ color: 'var(--color-text-secondary)' }}>Resolve</Link>
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}
