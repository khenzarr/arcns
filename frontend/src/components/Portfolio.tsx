"use client";
/**
 * Portfolio.tsx — v3 portfolio UI.
 *
 * Subgraph-first via useMyDomains (RPC fallback built into the hook).
 * Shows human-readable domain names when subgraph is available.
 * No v1/v2 imports. No ENS-branded strings.
 */

import { useAccount, useReadContract } from "wagmi";
import { useState } from "react";
import { useMyDomains }  from "../hooks/useMyDomains";
import { useRenew }      from "../hooks/useRenew";
import { useReceivingAddress } from "../hooks/useReceivingAddress";
import { ReceivingAddressPanel } from "./ReceivingAddressPanel";
import { namehash } from "../lib/namehash";
import { REGISTRY_CONTRACT } from "../lib/contracts";
import {
  formatExpiry,
  daysUntilExpiry,
  expiryBadge,
  DURATION_OPTIONS,
  type SupportedTLD,
} from "../lib/normalization";

export default function Portfolio() {
  const { isConnected, address: connectedAddress } = useAccount();
  const { domains, isLoading, error, refetch } = useMyDomains();
  const renew = useRenew();
  const [renewTarget, setRenewTarget] = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [renewDuration, setRenewDuration] = useState(BigInt(DURATION_OPTIONS[0].seconds));
  // Track which domain key is expanded (only one at a time)
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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

        const isExpanded = expandedKey === key;

        // Only enrich rows where labelName is available (subgraph path)
        if (d.labelName) {
          return (
            <DomainRowWithAddr
              key={key}
              d={d}
              displayName={displayName}
              badge={badge}
              daysLeft={daysLeft}
              canRenew={canRenew}
              connectedAddress={connectedAddress}
              isExpanded={isExpanded}
              onToggleExpand={() => setExpandedKey(isExpanded ? null : key)}
              onRenew={() => setRenewTarget({ label: d.labelName!, tld: d.tld })}
            />
          );
        }

        // RPC-fallback rows — no receiving address indicator or expand control
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
                <span className="text-xs shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>RPC</span>
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

// ─── DomainRowWithAddr ────────────────────────────────────────────────────────
// Extracted sub-component so hooks (useReceivingAddress, useReadContract) are
// called unconditionally at the top level of a component — not inside a map.

interface DomainRowWithAddrProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  d: any;
  displayName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  badge: any;
  daysLeft: number;
  canRenew: boolean;
  connectedAddress: `0x${string}` | undefined;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRenew: () => void;
}

function DomainRowWithAddr({
  d,
  displayName,
  badge,
  daysLeft,
  canRenew,
  connectedAddress,
  isExpanded,
  onToggleExpand,
  onRenew,
}: DomainRowWithAddrProps) {
  const node = namehash(`${d.labelName}.${d.tld}`) as `0x${string}`;

  // Read Registry owner for this node
  const { data: ownerData } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "owner",
    args: [node],
    query: { enabled: !!d.labelName, staleTime: 30_000 },
  });

  const isOwner =
    (ownerData as string | undefined)?.toLowerCase() === connectedAddress?.toLowerCase();

  // Read receiving address
  const { receivingAddress, addrState } = useReceivingAddress(node);

  const isStale =
    receivingAddress !== null &&
    receivingAddress.toLowerCase() !== connectedAddress?.toLowerCase();

  return (
    <div
      className="rounded-xl border"
      style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}
    >
      {/* Main row */}
      <div className="p-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border"
          style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-accent)' }}
        >
          .{d.tld}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {d.expiryState === "expired"
              ? `Expired ${formatExpiry(d.expiry)}`
              : `Expires ${formatExpiry(d.expiry)}`}
            {d.expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
          </p>
          {/* Receiving address indicator */}
          <div className="mt-1">
            {addrState === "loading" && (
              <span className="inline-block w-16 h-3 animate-pulse rounded" style={{ background: 'var(--color-surface-elevated)' }} />
            )}
            {addrState === "set" && !isStale && receivingAddress && (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#10b981' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                {receivingAddress.slice(0, 6)}…{receivingAddress.slice(-4)}
              </span>
            )}
            {addrState === "set" && isStale && (
              <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
                This name does not resolve to your connected wallet.
              </span>
            )}
            {addrState === "missing" && (
              <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                No receiving address set
              </span>
            )}
          </div>
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
          {canRenew && (
            <button
              onClick={onRenew}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}
            >
              Renew
            </button>
          )}
          {/* Expand/collapse chevron — owner only */}
          {isOwner && (
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--color-text-tertiary)' }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
              >
                <polyline points="2 5 7 10 12 5" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <ReceivingAddressPanel node={node} isOwner={isOwner} />
        </div>
      )}
    </div>
  );
}
