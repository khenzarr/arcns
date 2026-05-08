"use client";
/**
 * PrimaryName.tsx — v3 primary name UI.
 *
 * Phase 7 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useAccount, usePrimaryName, useMyDomains hooks untouched
 *   - selectableDomains, ownedNameSet, canSubmit logic untouched
 *   - handleSet handler untouched
 *   - All state transitions (setStep, addrSyncStep) untouched
 *
 * Selection is owned-domain-only. No free-form text entry.
 * No ENS-branded strings.
 */

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { usePrimaryName } from "../hooks/usePrimaryName";
import { useMyDomains }   from "../hooks/useMyDomains";

export default function PrimaryName() {
  // ── Hooks — UNCHANGED ──────────────────────────────────────────────────────
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
    addrSynced,
    addrSyncStep,
    addrSyncError,
  } = usePrimaryName(address);

  const { domains, isLoading: domainsLoading } = useMyDomains();

  // ── Derived state — UNCHANGED ──────────────────────────────────────────────
  const selectableDomains = useMemo(
    () => domains.filter(d => d.labelName !== null && d.expiryState !== "expired"),
    [domains],
  );

  const ownedNameSet = useMemo(
    () => new Set(selectableDomains.map(d => `${d.labelName}.${d.tld}`)),
    [selectableDomains],
  );

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

  // ── handleSet — UNCHANGED ──────────────────────────────────────────────────
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
    <div
      className="arcns-glass rounded-[var(--arcns-radius-xl)] p-5"
    >
      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className="font-semibold text-sm"
            style={{ color: "var(--arcns-text-primary)", fontFamily: "var(--arcns-font-display)" }}
          >
            Primary Name
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--arcns-text-muted)" }}>
            This name represents your wallet across ArcNS and supported apps.
          </p>
        </div>

        {/* Current primary name chip */}
        {primaryName ? (
          <span
            className="text-sm font-semibold px-3 py-1 rounded-[var(--arcns-radius-pill)] flex items-center gap-1.5 flex-shrink-0 ml-3"
            style={{
              background: "rgba(37, 99, 255, 0.14)",
              border: "1px solid rgba(37, 99, 255, 0.32)",
              color: "#8FB3FF",
            }}
          >
            {primaryName}
            {status === "verified" ? (
              <span className="text-xs" style={{ color: "var(--arcns-green)" }}>✓</span>
            ) : status === "stale" ? (
              <span className="text-xs" style={{ color: "var(--arcns-warning)" }}>⚠</span>
            ) : null}
          </span>
        ) : null}
      </div>

      {/* ── Success state — UNCHANGED logic ─────────────────────────────── */}
      {setStep === "success" ? (
        <div>
          <div
            className="rounded-[var(--arcns-radius-lg)] p-3 text-sm font-medium text-center border"
            style={{
              background: "rgba(20, 241, 149, 0.08)",
              borderColor: "rgba(20, 241, 149, 0.24)",
              color: "var(--arcns-green)",
            }}
          >
            ✓ Primary name updated
            <button
              onClick={resetSet}
              className="ml-2 text-xs underline"
              style={{ color: "var(--arcns-green)" }}
            >
              Dismiss
            </button>
          </div>

          {addrSyncStep === "syncing" ? (
            <p className="mt-2 text-xs" style={{ color: "var(--arcns-text-muted)" }}>
              Syncing receiving address…
            </p>
          ) : addrSyncStep === "synced" && addrSynced ? (
            <p
              className="mt-2 text-xs rounded-[var(--arcns-radius-sm)] px-3 py-2"
              style={{ background: "rgba(20,241,149,0.08)", color: "var(--arcns-green)" }}
            >
              ✓ Receiving address updated for this name.
            </p>
          ) : addrSyncStep === "partial-success" ? (
            <div
              className="mt-2 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
              style={{ background: "rgba(251,191,36,0.08)", color: "var(--arcns-warning)" }}
            >
              <p>Primary Name set, but receiving address could not be synced.{addrSyncError ? ` ${addrSyncError}` : ""}</p>
            </div>
          ) : null}
        </div>

      ) : selectableDomains.length > 0 ? (
        /* ── Domain selector + action — UNCHANGED logic ─────────────────── */
        <div className="flex gap-2">
          <select
            value={selectedDomain ?? ""}
            onChange={e => {
              const val = e.target.value;
              setSelectedDomain(val && ownedNameSet.has(val) ? val : null);
            }}
            className="flex-1 px-3 py-2.5 text-sm rounded-[var(--arcns-radius-lg)] border focus:outline-none focus:ring-2 focus:ring-[var(--arcns-cyan)]"
            style={{
              background: "var(--arcns-bg-elevated)",
              borderColor: "var(--arcns-border-default)",
              color: "var(--arcns-text-primary)",
            }}
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
            className="px-4 py-2.5 text-white text-sm rounded-[var(--arcns-radius-lg)] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 hover:opacity-90 active:scale-[0.98] whitespace-nowrap"
            style={{ background: "var(--arcns-gradient-primary)" }}
          >
            {setStep === "setting" ? "Updating…" : primaryName ? "Update Primary Name" : "Set as Primary"}
          </button>
        </div>

      ) : isLoading ? (
        <div
          className="h-10 rounded-[var(--arcns-radius-lg)] animate-pulse"
          style={{ background: "rgba(120,160,255,0.06)" }}
        />
      ) : (
        <p className="text-xs" style={{ color: "var(--arcns-text-muted)" }}>
          {domains.length === 0
            ? "No domains found. Register a .arc or .circle name first."
            : "Domain names are not yet resolved. Primary name selection will be available once the subgraph is indexed."}
        </p>
      )}

      {/* ── Error — UNCHANGED logic ──────────────────────────────────────── */}
      {setError ? (
        <p
          className="mt-2 text-xs rounded-[var(--arcns-radius-sm)] px-3 py-2"
          style={{ background: "rgba(255,92,122,0.08)", color: "var(--arcns-danger)" }}
        >
          {setError}
        </p>
      ) : null}

      {isAlreadyPrimary && selectedDomain ? (
        <p className="mt-2 text-xs" style={{ color: "var(--arcns-text-muted)" }}>
          {selectedDomain} is already your primary name.
        </p>
      ) : null}

      {/* ── Stale warning — UNCHANGED logic ─────────────────────────────── */}
      {status === "stale" && primaryName ? (
        <p
          className="mt-2 text-xs rounded-[var(--arcns-radius-sm)] px-3 py-2"
          style={{ background: "rgba(251,191,36,0.08)", color: "var(--arcns-warning)" }}
        >
          ⚠ This name no longer resolves to your address. Select a different domain to update it.
        </p>
      ) : null}
    </div>
  );
}
