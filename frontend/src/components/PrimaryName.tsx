"use client";
/**
 * PrimaryName.tsx — v3 primary name UI.
 *
 * Selection is owned-domain-only. No free-form text entry.
 * Source of truth for the owned list: useMyDomains.
 * Write path: usePrimaryName (unchanged).
 *
 * No ENS-branded strings.
 */

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { usePrimaryName } from "../hooks/usePrimaryName";
import { useMyDomains }   from "../hooks/useMyDomains";

export default function PrimaryName() {
  const { address, isConnected } = useAccount();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const {
    primaryName,
    status,
    isLoading: primaryLoading,
    setStep,
    setError,
    setPrimaryName,
    resetSet,
  } = usePrimaryName(address);

  const { domains, isLoading: domainsLoading } = useMyDomains();

  // Only non-expired, label-resolved domains are selectable.
  const selectableDomains = useMemo(
    () => domains.filter(d => d.labelName !== null && d.expiryState !== "expired"),
    [domains],
  );

  // Build owned-name set for membership validation.
  const ownedNameSet = useMemo(
    () => new Set(selectableDomains.map(d => `${d.labelName}.${d.tld}`)),
    [selectableDomains],
  );

  // Invalidate stale selection when the owned list changes.
  useMemo(() => {
    if (selectedDomain && !ownedNameSet.has(selectedDomain)) {
      setSelectedDomain(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedNameSet]);

  const isOwnedSelection = selectedDomain !== null && ownedNameSet.has(selectedDomain);
  const isAlreadyPrimary = isOwnedSelection && selectedDomain === primaryName;
  const isLoading        = primaryLoading || domainsLoading;
  const canSubmit        = isOwnedSelection && !isAlreadyPrimary && setStep !== "setting" && !isLoading;

  const handleSet = async () => {
    if (!isOwnedSelection || !selectedDomain) return;

    console.log("[ArcNS:primaryName] pre-submit diagnostic", {
      selectedDomain,
      isOwnedSelection,
      isCurrentPrimary: isAlreadyPrimary,
      buttonEnabled:    canSubmit,
    });

    await setPrimaryName(selectedDomain);
    setSelectedDomain(null);
  };

  if (!isConnected) return null;

  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>Primary Name</h3>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Your wallet&apos;s human-readable identity</p>
          </div>
        </div>
        {primaryName ? (
          <span className="text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--color-text-accent)' }}>
            {primaryName}
            {status === "verified" ? (
              <span className="text-xs" style={{ color: 'var(--color-success)' }}>✓</span>
            ) : status === "stale" ? (
              <span className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠</span>
            ) : null}
          </span>
        ) : null}
      </div>

      {setStep === "success" ? (
        <div className="rounded-xl p-3 text-sm font-medium text-center border" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }}>
          ✓ Primary name updated
          <button onClick={resetSet} className="ml-2 text-xs underline" style={{ color: 'var(--color-success)' }}>Dismiss</button>
        </div>
      ) : selectableDomains.length > 0 ? (
        <div className="flex gap-2">
          <select
            value={selectedDomain ?? ""}
            onChange={e => {
              const val = e.target.value;
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
            onClick={handleSet}
            disabled={!canSubmit}
            className="px-4 py-2.5 text-white text-sm rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90 whitespace-nowrap"
            style={{ background: 'var(--color-accent-primary)' }}
          >
            {setStep === "setting" ? "Updating…" : primaryName ? "Update Primary Name" : "Set as Primary"}
          </button>
        </div>
      ) : isLoading ? (
        <div className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-overlay)' }} />
      ) : (
        <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
          {domains.length === 0
            ? "No domains found. Register a .arc or .circle name first."
            : "Domain names are not yet resolved. Primary name selection will be available once the subgraph is indexed."}
        </p>
      )}

      {setError ? (
        <p className="mt-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--color-error-surface)', color: 'var(--color-error)' }}>{setError}</p>
      ) : null}

      {isAlreadyPrimary && selectedDomain ? (
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{selectedDomain} is already your primary name.</p>
      ) : null}

      {status === "stale" && primaryName ? (
        <p className="mt-2 text-xs rounded-lg px-3 py-2" style={{ background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }}>
          ⚠ This name no longer resolves to your address. Select a different domain to update it.
        </p>
      ) : null}
    </div>
  );
}
