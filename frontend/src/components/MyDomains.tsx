"use client";
/**
 * MyDomains.tsx — v3 portfolio UI.
 *
 * RPC-backed for v1/founder-demo scope.
 * Subgraph integration deferred to Phase F.
 *
 * Shows: owned domains, expiry status, renewal CTA, primary name selector.
 * Wired to useMyDomains + usePrimaryName (v3 hooks only).
 */

import { useAccount } from "wagmi";
import { useMyDomains }    from "../hooks/useMyDomains";
import { usePrimaryName }  from "../hooks/usePrimaryName";
import { useRenew }        from "../hooks/useRenew";
import {
  formatExpiry,
  daysUntilExpiry,
  expiryBadge,
  formatUSDC,
  DURATION_OPTIONS,
  type SupportedTLD,
} from "../lib/normalization";
import { useState } from "react";

// ─── Domain row ───────────────────────────────────────────────────────────────

function DomainRow({
  tokenId,
  tld,
  expiry,
  expiryState,
  isPrimary,
  onSetPrimary,
  onRenew,
}: {
  tokenId:     bigint | null;
  tld:         SupportedTLD;
  expiry:      bigint;
  expiryState: string;
  isPrimary:   boolean;
  onSetPrimary: (tokenId: bigint | null, tld: SupportedTLD) => void;
  onRenew:     (tokenId: bigint | null, tld: SupportedTLD) => void;
}) {
  const badge    = expiryBadge(expiryState as any);
  const daysLeft = daysUntilExpiry(expiry);
  const tokenHex = tokenId != null ? "0x" + tokenId.toString(16).padStart(64, "0") : null;
  const shortId  = tokenHex ? tokenHex.slice(0, 10) + "…" : "unknown";

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          .{tld}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-700 truncate">{shortId}.{tld}</span>
            {isPrimary ? (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Primary</span>
            ) : null}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {expiryState === "expired" ? "Expired" : `Expires ${formatExpiry(expiry)}`}
            {expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
          {badge.label}
        </span>

        {expiryState !== "expired" && !isPrimary ? (
          <button
            onClick={() => onSetPrimary(tokenId, tld)}
            className="text-xs text-gray-500 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
          >
            Set primary
          </button>
        ) : null}

        {(expiryState === "expiring-soon" || expiryState === "grace") ? (
          <button
            onClick={() => onRenew(tokenId, tld)}
            className="text-xs font-medium text-orange-600 hover:text-orange-700 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
          >
            Renew
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyDomains() {
  const { address, isConnected } = useAccount();
  const { domains, isLoading, error, refetch } = useMyDomains();
  const { primaryName, status: primaryStatus, setStep, setError: setPrimaryError, setPrimaryName, resetSet } = usePrimaryName();
  const renew = useRenew();

  const [renewTarget, setRenewTarget] = useState<{ tokenId: bigint | null; tld: SupportedTLD } | null>(null);

  if (!isConnected || !address) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">Connect your wallet to view your domains</p>
        <p className="text-sm mt-2">Your .arc and .circle names will appear here</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
        <button onClick={refetch} className="mt-3 text-sm text-blue-600 underline">Try again</button>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">No domains found</p>
        <p className="text-sm mt-2">Register a .arc or .circle name to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary name status */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Primary Name</p>
            {primaryName ? (
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {primaryName}
                {primaryStatus === "stale" ? (
                  <span className="ml-2 text-xs text-amber-600 font-normal">(stale — name no longer owned)</span>
                ) : primaryStatus === "verified" ? (
                  <span className="ml-2 text-xs text-green-600 font-normal">✓ verified</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">No primary name set</p>
            )}
          </div>
          {setStep === "setting" ? (
            <span className="text-xs text-blue-500 animate-pulse">Updating…</span>
          ) : setStep === "success" ? (
            <span className="text-xs text-green-600">✓ Updated</span>
          ) : null}
        </div>
        {setPrimaryError ? (
          <p className="text-xs text-red-500 mt-2">{setPrimaryError}</p>
        ) : null}
      </div>

      {/* Domain list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Your Domains</h2>
          <span className="text-xs text-gray-400">{domains.length} name{domains.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="px-5">
          {domains.map((d, i) => (
            <DomainRow
              key={d.tokenId != null ? `${d.tokenId}-${d.tld}` : `${i}-${d.tld}`}
              tokenId={d.tokenId}
              tld={d.tld}
              expiry={d.expiry}
              expiryState={d.expiryState}
              isPrimary={false /* TODO: compare with primaryName once label is resolved */}
              onSetPrimary={(tokenId, tld) => {
                // Dashboard-driven primary name update
                // tokenId is the labelhash — we can't recover the label from it here
                // User must use the full domain name flow for now
              }}
              onRenew={(tokenId, tld) => setRenewTarget({ tokenId, tld })}
            />
          ))}
        </div>
      </div>

      {/* Renew modal (minimal) */}
      {renewTarget ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-4">Renew Domain</h3>
            <p className="text-sm text-gray-500 mb-4">
              Select a renewal duration. Payment will be in USDC.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={async () => {
                    // Renew by token ID is not directly supported — user must go to search
                    // This is a v1 limitation; full renew-by-name requires the label
                    setRenewTarget(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renew.error ? <p className="text-xs text-red-500 mb-3">{renew.error}</p> : null}
            <button
              onClick={() => { setRenewTarget(null); renew.reset(); }}
              className="w-full py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Scope note — visible in dev, hidden in prod */}
      {process.env.NODE_ENV === "development" ? (
        <p className="text-xs text-gray-300 text-center">
          Portfolio is RPC-backed (v1/founder-demo scope). Subgraph integration ships in Phase F.
        </p>
      ) : null}
    </div>
  );
}
