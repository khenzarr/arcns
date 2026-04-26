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
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
        Connect your wallet to view your portfolio
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border p-4 animate-pulse" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
            <div className="h-5 rounded w-1/3 mb-2" style={{ background: 'var(--color-surface-overlay)' }} />
            <div className="h-4 rounded w-1/4" style={{ background: 'var(--color-surface-overlay)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl p-4 text-sm border" style={{ background: 'var(--color-error-surface)', borderColor: 'var(--color-error-border)', color: 'var(--color-error)' }}>
        {error}
        <button onClick={refetch} className="ml-3 underline" style={{ color: 'var(--color-error)' }}>Retry</button>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--color-text-secondary)' }}>
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
            className="rounded-xl border p-4 flex items-center gap-4"
            style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border"
              style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-accent)' }}
            >
              .{d.tld}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>
                {d.source === "rpc" ? (
                  <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>RPC</span>
                ) : null}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {d.expiryState === "expired"
                  ? `Expired ${formatExpiry(d.expiry)}`
                  : `Expires ${formatExpiry(d.expiry)}`}
                {d.expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: d.expiryState === 'expiring-soon' || d.expiryState === 'grace'
                    ? 'var(--color-warning-surface)'
                    : d.expiryState === 'expired'
                      ? 'var(--color-error-surface)'
                      : 'rgba(16,185,129,0.15)',
                  color: d.expiryState === 'expiring-soon' || d.expiryState === 'grace'
                    ? 'var(--color-warning)'
                    : d.expiryState === 'expired'
                      ? 'var(--color-error)'
                      : '#10b981',
                }}
              >
                {badge.label}
              </span>
              {canRenew && d.labelName ? (
                <button
                  onClick={() => setRenewTarget({ label: d.labelName!, tld: d.tld })}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                  style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
            <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Renew Domain</h3>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--color-text-accent)' }}>{renewTarget.label}.{renewTarget.tld}</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Select a renewal duration. Payment will be in USDC.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={() => setRenewDuration(BigInt(opt.seconds))}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={renewDuration === BigInt(opt.seconds)
                    ? { background: 'var(--color-accent-primary)', color: '#fff' }
                    : { background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renew.error ? <p className="text-xs mb-3" style={{ color: 'var(--color-error)' }}>{renew.error}</p> : null}
            <p className="text-xs mb-4" style={{ color: 'var(--color-text-tertiary)' }}>
              Price will be calculated at renewal time. Approve USDC when prompted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setRenewTarget(null); renew.reset(); }}
                className="flex-1 py-2.5 text-sm rounded-xl border transition-colors"
                style={{ borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  // Renew requires a price — redirect to search for full renew flow
                  // Full renew-by-name is available on the home search page
                  setRenewTarget(null);
                }}
                className="flex-1 py-2.5 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-warning)' }}
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
