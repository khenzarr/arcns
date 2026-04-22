"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

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

        <ConnectButton
          chainStatus="icon"
          showBalance={{ smallScreen: false, largeScreen: true }}
          accountStatus="avatar"
        />
      </div>
    </header>
  );
}
