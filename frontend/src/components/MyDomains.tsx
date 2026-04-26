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
import { useState, useMemo } from "react";

// ─── Domain row ───────────────────────────────────────────────────────────────

function DomainRow({
  tokenId,
  labelName,
  tld,
  expiry,
  expiryState,
  isPrimary,
  isSelected,
  onSelect,
  onRenew,
}: {
  tokenId:     bigint | null;
  labelName:   string | null;
  tld:         SupportedTLD;
  expiry:      bigint;
  expiryState: string;
  isPrimary:   boolean;
  isSelected:  boolean;
  onSelect:    () => void;
  onRenew:     (tokenId: bigint | null, tld: SupportedTLD) => void;
}) {
  const badge    = expiryBadge(expiryState as any);
  const daysLeft = daysUntilExpiry(expiry);
  const displayName = labelName
    ? `${labelName}.${tld}`
    : tokenId != null
      ? `${"0x" + tokenId.toString(16).padStart(64, "0").slice(0, 8)}….${tld}`
      : `unknown.${tld}`;

  const isExpired    = expiryState === "expired";
  const isSelectable = !isExpired;

  return (
    <div
      className={`flex items-center justify-between py-4 border-b last:border-0 rounded-xl transition-colors ${isSelectable && !isSelected ? 'hover:bg-[#1c2128] cursor-pointer' : ''}`}
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: isSelected ? 'rgba(37,99,235,0.08)' : 'transparent',
      }}
      onClick={isSelectable ? onSelect : undefined}
    >
      <div className="flex items-center gap-3 min-w-0 px-1">
        {/* Selection indicator */}
        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
          isSelected
            ? "border-blue-600 bg-blue-600"
            : isSelectable
              ? "border-gray-300"
              : "border-gray-200"
        }`}>
          {isSelected && (
            <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="3" />
            </svg>
          )}
        </div>

        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 border"
          style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-accent)' }}
        >
          .{tld}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>{displayName}</span>
            {isPrimary ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--color-text-accent)' }}>Primary</span>
            ) : null}
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            {isExpired ? "Expired" : `Expires ${formatExpiry(expiry)}`}
            {expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: expiryState === 'expiring-soon' || expiryState === 'grace'
              ? 'var(--color-warning-surface)'
              : expiryState === 'expired'
                ? 'var(--color-error-surface)'
                : 'rgba(16,185,129,0.15)',
            color: expiryState === 'expiring-soon' || expiryState === 'grace'
              ? 'var(--color-warning)'
              : expiryState === 'expired'
                ? 'var(--color-error)'
                : '#10b981',
          }}
        >
          {badge.label}
        </span>

        {(expiryState === "expiring-soon" || expiryState === "grace") ? (
          <button
            onClick={e => { e.stopPropagation(); onRenew(tokenId, tld); }}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}
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

  const [renewTarget,    setRenewTarget]    = useState<{ tokenId: bigint | null; tld: SupportedTLD } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Only non-expired domains with a resolved label are selectable.
  // RPC-only domains (labelName === null) are intentionally excluded —
  // we cannot verify ownership by name without the label.
  const selectableDomains = useMemo(
    () => domains.filter(d => d.labelName !== null && d.expiryState !== "expired"),
    [domains],
  );

  // Build a Set of valid owned full-names for O(1) membership check.
  const ownedNameSet = useMemo(
    () => new Set(selectableDomains.map(d => `${d.labelName}.${d.tld}`)),
    [selectableDomains],
  );

  // A selection is only valid when it comes from the owned set.
  const isOwnedSelection  = selectedDomain !== null && ownedNameSet.has(selectedDomain);
  const isAlreadyPrimary  = isOwnedSelection && selectedDomain === primaryName;
  const canSubmit         = isOwnedSelection && !isAlreadyPrimary && setStep !== "setting" && !isLoading;

  const buttonLabel = setStep === "setting"
    ? "Updating…"
    : primaryName
      ? "Update Primary Name"
      : "Set as Primary";

  const handleSetPrimary = async () => {
    // Hard guard: only proceed if the selection is a verified owned domain.
    if (!isOwnedSelection || !selectedDomain) return;

    console.log("[ArcNS:primaryName] pre-submit diagnostic", {
      selectedDomain,
      isOwnedSelection,
      isCurrentPrimary: isAlreadyPrimary,
      buttonEnabled:    canSubmit,
    });

    await setPrimaryName(selectedDomain);
  };

  // When the domain list reloads, clear any stale selection that is no longer owned.
  useMemo(() => {
    if (selectedDomain && !ownedNameSet.has(selectedDomain)) {
      setSelectedDomain(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedNameSet]);

  if (!isConnected || !address) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
        <p className="text-lg font-medium">Connect your wallet to view your domains</p>
        <p className="text-sm mt-2">Your .arc and .circle names will appear here</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-overlay)' }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm" style={{ color: 'var(--color-error)' }}>{error}</p>
        <button onClick={refetch} className="mt-3 text-sm underline" style={{ color: 'var(--color-text-accent)' }}>Try again</button>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
        <p className="text-lg font-medium">No domains found</p>
        <p className="text-sm mt-2">Register a .arc or .circle name to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary name status */}
      <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Primary Name</p>
            {primaryName ? (
              <p className="text-lg font-bold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                {primaryName}
                {primaryStatus === "stale" ? (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-warning)' }}>(stale — name no longer owned)</span>
                ) : primaryStatus === "verified" ? (
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-success)' }}>✓ verified</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>No primary name set</p>
            )}
          </div>
          {setStep === "success" ? (
            <button onClick={resetSet} className="text-xs underline" style={{ color: 'var(--color-success)' }}>✓ Updated · Dismiss</button>
          ) : null}
        </div>

        {/* Selection + action — only shown when there are selectable domains */}
        {selectableDomains.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {primaryName ? "Select a domain to change your primary name:" : "Select a domain to set as your primary name:"}
            </p>
            <div className="flex gap-2">
              <select
                value={selectedDomain ?? ""}
                onChange={e => {
                  const val = e.target.value;
                  // Only accept values that are in the owned set — reject empty string and anything else.
                  setSelectedDomain(val && ownedNameSet.has(val) ? val : null);
                }}
                className="flex-1 px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
              >
                <option value="">— choose a domain —</option>
                {selectableDomains.map(d => {
                  const fullName = `${d.labelName}.${d.tld}`;
                  return (
                    <option key={fullName} value={fullName}>
                      {fullName}{fullName === primaryName ? " (current)" : ""}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleSetPrimary}
                disabled={!canSubmit}
                className="px-4 py-2.5 text-white text-sm rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ background: 'var(--color-accent-primary)' }}
              >
                {buttonLabel}
              </button>
            </div>
            {isAlreadyPrimary && selectedDomain ? (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{selectedDomain} is already your primary name.</p>
            ) : null}
          </div>
        ) : domains.length > 0 ? (
          /* Domains exist but none have a resolved label (RPC-only fallback) */
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Domain names are not yet resolved. Primary name selection will be available once the subgraph is indexed.
          </p>
        ) : null}

        {setPrimaryError ? (
          <p className="text-xs rounded-lg px-3 py-2 mt-2" style={{ background: 'var(--color-error-surface)', color: 'var(--color-error)' }}>{setPrimaryError}</p>
        ) : null}
      </div>

      {/* Domain list */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Your Domains</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{domains.length} name{domains.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="px-5">
          {domains.map((d, i) => {
            const fullName = d.labelName ? `${d.labelName}.${d.tld}` : null;
            return (
              <DomainRow
                key={d.tokenId != null ? `${d.tokenId}-${d.tld}` : `${i}-${d.tld}`}
                tokenId={d.tokenId}
                labelName={d.labelName}
                tld={d.tld}
                expiry={d.expiry}
                expiryState={d.expiryState}
                isPrimary={!!fullName && fullName === primaryName}
                isSelected={!!fullName && fullName === selectedDomain}
                onSelect={() => {
                  // Only allow selection of domains that are in the owned set.
                  if (!fullName || !ownedNameSet.has(fullName)) return;
                  setSelectedDomain(prev => prev === fullName ? null : fullName);
                }}
                onRenew={(tokenId, tld) => setRenewTarget({ tokenId, tld })}
              />
            );
          })}
        </div>
      </div>

      {/* Renew modal (minimal) */}
      {renewTarget ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl p-6 max-w-sm w-full border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
            <h3 className="font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>Renew Domain</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              Select a renewal duration. Payment will be in USDC.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={async () => {
                    setRenewTarget(null);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renew.error ? <p className="text-xs mb-3" style={{ color: 'var(--color-error)' }}>{renew.error}</p> : null}
            <button
              onClick={() => { setRenewTarget(null); renew.reset(); }}
              className="w-full py-2.5 text-sm transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Scope note — visible in dev, hidden in prod */}
      {process.env.NODE_ENV === "development" ? (
        <p className="text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
          Portfolio is RPC-backed (v1/founder-demo scope). Subgraph integration ships in Phase F.
        </p>
      ) : null}
    </div>
  );
}
