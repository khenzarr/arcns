"use client";
/**
 * Portfolio.tsx — v3 portfolio UI.
 *
 * Subgraph-first via useMyDomains (RPC fallback built into the hook).
 * Shows human-readable domain names when subgraph is available.
 * No v1/v2 imports. No ENS-branded strings.
 */

import { useAccount } from "wagmi";
import { useState } from "react";
import { useMyDomains }  from "../hooks/useMyDomains";
import { useRenew }      from "../hooks/useRenew";
import {
  formatUSDC,
  formatExpiry,
  daysUntilExpiry,
  expiryBadge,
  DURATION_OPTIONS,
  type SupportedTLD,
} from "../lib/normalization";

export default function Portfolio() {
  const { isConnected } = useAccount();
  const { domains, isLoading, error, refetch } = useMyDomains();
  const renew = useRenew();
  const [renewTarget, setRenewTarget] = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [renewDuration, setRenewDuration] = useState(BigInt(DURATION_OPTIONS[0].seconds));

  if (!isConnected) {
    return (
      <div className="text-center py-12 text-gray-500">
        Connect your wallet to view your portfolio
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-5 bg-gray-100 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
        {error}
        <button onClick={refetch} className="ml-3 underline text-red-500 hover:text-red-700">Retry</button>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No domains registered yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {domains.map((d, i) => {
        const badge    = expiryBadge(d.expiryState);
        const daysLeft = daysUntilExpiry(d.expiry);
        const canRenew = d.expiryState === "expiring-soon" || d.expiryState === "grace";

        // Display name: use labelName from subgraph if available, else token ID hash
        const displayName = d.labelName
          ? `${d.labelName}.${d.tld}`
          : d.tokenId
            ? `${("0x" + d.tokenId.toString(16).padStart(64, "0")).slice(0, 10)}….${d.tld}`
            : `unknown.${d.tld}`;

        const key = d.labelName
          ? `${d.labelName}-${d.tld}`
          : d.tokenId
            ? `${d.tokenId.toString()}-${d.tld}`
            : `${i}-${d.tld}`;

        return (
          <div
            key={key}
            className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              .{d.tld}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900 truncate">{displayName}</span>
                {d.source === "rpc" ? (
                  <span className="text-xs text-gray-300 shrink-0">RPC</span>
                ) : null}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {d.expiryState === "expired"
                  ? `Expired ${formatExpiry(d.expiry)}`
                  : `Expires ${formatExpiry(d.expiry)}`}
                {d.expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                {badge.label}
              </span>
              {canRenew && d.labelName ? (
                <button
                  onClick={() => setRenewTarget({ label: d.labelName!, tld: d.tld })}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                >
                  Renew
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {/* Renew modal */}
      {renewTarget ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-1">Renew Domain</h3>
            <p className="text-sm text-blue-600 font-medium mb-4">{renewTarget.label}.{renewTarget.tld}</p>
            <p className="text-sm text-gray-500 mb-4">
              Select a renewal duration. Payment will be in USDC.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={() => setRenewDuration(BigInt(opt.seconds))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    renewDuration === BigInt(opt.seconds)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renew.error ? <p className="text-xs text-red-500 mb-3">{renew.error}</p> : null}
            <p className="text-xs text-gray-400 mb-4">
              Price will be calculated at renewal time. Approve USDC when prompted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setRenewTarget(null); renew.reset(); }}
                className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Renew requires a price — redirect to search for full renew flow
                  // Full renew-by-name is available on the home search page
                  setRenewTarget(null);
                }}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
              >
                Search to Renew
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
