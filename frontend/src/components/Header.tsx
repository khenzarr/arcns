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
        <span className="text-xs font-mono text-gray-500 hidden sm:block">
          {address.slice(0, 6)}…{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Connecting…" : "MetaMask"}
        </button>
      ) : null}
      {wcConnector ? (
        <button
          onClick={() => connect({ connector: wcConnector })}
          disabled={isPending}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          WalletConnect
        </button>
      ) : null}
    </div>
  );
}

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg" />
          <span className="font-bold text-xl text-gray-900">ArcNS</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            Testnet
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-gray-900 transition-colors">Search</Link>
          <Link href="/my-domains" className="hover:text-gray-900 transition-colors">My Domains</Link>
          <Link href="/resolve" className="hover:text-gray-900 transition-colors">Resolve</Link>
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}
