"use client";
/**
 * Portfolio.tsx — v3 portfolio UI.
 *
 * Phase 7 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useAccount, useMyDomains, useRenew, useReceivingAddress, usePrimaryName hooks untouched
 *   - All expiry/badge/date calculations untouched
 *   - renewTarget / renewDuration state untouched
 *   - DomainRowWithAddr sub-component hook calls untouched
 *   - Renew modal behavior untouched
 *
 * Receiving address model (primary-name-linked):
 *   - No manual receiving-address write surfaces.
 *   - Receiving address is read-only for all domain rows.
 *   - Stale indicator is shown only for the current Primary Name row.
 */

import { useAccount } from "wagmi";
import { useState } from "react";
import { useMyDomains }        from "../hooks/useMyDomains";
import { useRenew }            from "../hooks/useRenew";
import { useReceivingAddress } from "../hooks/useReceivingAddress";
import { usePrimaryName }      from "../hooks/usePrimaryName";
import { namehash }            from "../lib/namehash";
import {
  formatExpiry,
  daysUntilExpiry,
  expiryBadge,
  DURATION_OPTIONS,
  type SupportedTLD,
} from "../lib/normalization";

// ── Expiry badge style helper ─────────────────────────────────────────────────
function expiryStyle(state: string): React.CSSProperties {
  if (state === "expiring-soon" || state === "grace") {
    return { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)", color: "var(--arcns-warning)" };
  }
  if (state === "expired") {
    return { background: "rgba(255,92,122,0.12)", border: "1px solid rgba(255,92,122,0.28)", color: "var(--arcns-danger)" };
  }
  return { background: "rgba(20,241,149,0.10)", border: "1px solid rgba(20,241,149,0.24)", color: "var(--arcns-green)" };
}

export default function Portfolio() {
  // ── Hooks — UNCHANGED ──────────────────────────────────────────────────────
  const { isConnected, address: connectedAddress } = useAccount();
  const { domains, isLoading, error, refetch } = useMyDomains();
  const renew = useRenew();
  const [renewTarget,   setRenewTarget]   = useState<{ label: string; tld: SupportedTLD } | null>(null);
  const [renewDuration, setRenewDuration] = useState(BigInt(DURATION_OPTIONS[0].seconds));
  const { primaryName } = usePrimaryName(connectedAddress);

  // ── Disconnected state ─────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <div
        className="arcns-glass rounded-[var(--arcns-radius-xl)] text-center py-16 px-6"
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl"
          style={{ background: "rgba(37,99,255,0.10)", border: "1px solid rgba(37,99,255,0.20)" }}
          aria-hidden="true"
        >
          ◎
        </div>
        <p className="font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
          Connect your wallet
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--arcns-text-muted)" }}>
          Connect to view your portfolio
        </p>
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="arcns-glass rounded-[var(--arcns-radius-xl)] p-4 animate-pulse"
          >
            <div className="h-5 rounded w-1/3 mb-2" style={{ background: "rgba(120,160,255,0.08)" }} />
            <div className="h-4 rounded w-1/4"       style={{ background: "rgba(120,160,255,0.06)" }} />
          </div>
        ))}
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div
        className="rounded-[var(--arcns-radius-xl)] p-4 text-sm border"
        style={{ background: "rgba(255,92,122,0.08)", borderColor: "rgba(255,92,122,0.24)", color: "var(--arcns-danger)" }}
      >
        {error}
        <button onClick={refetch} className="ml-3 underline" style={{ color: "var(--arcns-danger)" }}>
          Retry
        </button>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (domains.length === 0) {
    return (
      <div
        className="arcns-glass rounded-[var(--arcns-radius-xl)] text-center py-16 px-6"
      >
        <p className="font-semibold" style={{ color: "var(--arcns-text-primary)" }}>No domains registered yet</p>
        <p className="text-sm mt-1" style={{ color: "var(--arcns-text-muted)" }}>
          Register a .arc or .circle name to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Domain rows — map logic UNCHANGED ─────────────────────────────── */}
      {domains.map((d, i) => {
        const badge    = expiryBadge(d.expiryState);
        const daysLeft = daysUntilExpiry(d.expiry);
        const canRenew = d.expiryState === "expiring-soon" || d.expiryState === "grace";

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
              primaryName={primaryName}
              onRenew={() => setRenewTarget({ label: d.labelName!, tld: d.tld })}
            />
          );
        }

        // RPC-fallback rows
        return (
          <div
            key={key}
            className="arcns-glass rounded-[var(--arcns-radius-xl)] p-5 flex items-center gap-4"
          >
            <div
              className="w-12 h-12 rounded-[var(--arcns-radius-md)] flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
              style={{
                background: d.tld === "arc" ? "rgba(37,99,255,0.12)" : "rgba(0,230,194,0.10)",
                border: d.tld === "arc" ? "1px solid rgba(37,99,255,0.28)" : "1px solid rgba(0,230,194,0.24)",
                color: d.tld === "arc" ? "#8FB3FF" : "#7FFFE3",
              }}
            >
              .{d.tld}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-base truncate" style={{ color: "var(--arcns-text-primary)" }}>
                  {d.tokenId
                    ? `${("0x" + d.tokenId.toString(16).padStart(64, "0")).slice(0, 10)}…`
                    : "unknown"}
                </span>
                <span className="arcns-gradient-text font-bold text-base">.{d.tld}</span>
                <span className="text-xs shrink-0" style={{ color: "var(--arcns-text-muted)" }}>RPC</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "var(--arcns-text-muted)" }}>
                {d.expiryState === "expired"
                  ? `Expired ${formatExpiry(d.expiry)}`
                  : `Expires ${formatExpiry(d.expiry)}`}
                {d.expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
              </p>
            </div>
            <span
              className="px-2.5 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold flex-shrink-0"
              style={expiryStyle(d.expiryState)}
            >
              {badge.label}
            </span>
          </div>
        );
      })}

      {/* ── Renew modal — behavior UNCHANGED ─────────────────────────────── */}
      {renewTarget ? (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className="arcns-glass rounded-[var(--arcns-radius-xl)] p-6 max-w-sm w-full"
            style={{ boxShadow: "var(--arcns-shadow-card)" }}
          >
            <h3
              className="font-bold mb-1"
              style={{ color: "var(--arcns-text-primary)", fontFamily: "var(--arcns-font-display)" }}
            >
              Renew Domain
            </h3>
            <p
              className="text-sm font-semibold mb-4"
              style={{ color: "var(--arcns-cyan)" }}
            >
              {renewTarget.label}.{renewTarget.tld}
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--arcns-text-secondary)" }}>
              Select a renewal duration. Payment will be in USDC.
            </p>
            <div className="flex gap-2 flex-wrap mb-4">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={() => setRenewDuration(BigInt(opt.seconds))}
                  className="px-4 py-2 rounded-[var(--arcns-radius-sm)] text-sm font-medium transition-all duration-150"
                  style={renewDuration === BigInt(opt.seconds)
                    ? { background: "var(--arcns-gradient-primary)", color: "#fff" }
                    : { background: "rgba(120,160,255,0.06)", color: "var(--arcns-text-secondary)", border: "1px solid var(--arcns-border-default)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {renew.error ? (
              <p className="text-xs mb-3" style={{ color: "var(--arcns-danger)" }}>{renew.error}</p>
            ) : null}
            <p className="text-xs mb-4" style={{ color: "var(--arcns-text-muted)" }}>
              Price will be calculated at renewal time. Approve USDC when prompted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setRenewTarget(null); renew.reset(); }}
                className="flex-1 py-2.5 text-sm rounded-[var(--arcns-radius-lg)] border transition-all duration-150 hover:border-[var(--arcns-border-strong)]"
                style={{ borderColor: "var(--arcns-border-default)", color: "var(--arcns-text-secondary)" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => { setRenewTarget(null); }}
                className="flex-1 py-2.5 text-sm font-medium text-white rounded-[var(--arcns-radius-lg)] transition-all duration-150 hover:opacity-90"
                style={{ background: "var(--arcns-warning)" }}
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
// Hook calls (useReceivingAddress) and all logic UNCHANGED.
// Visual wrapper updated to ArcNS design system.

interface DomainRowWithAddrProps {
  // eslint-disable-next-line
  d: any;
  displayName: string;
  // eslint-disable-next-line
  badge: any;
  daysLeft: number;
  canRenew: boolean;
  connectedAddress: `0x${string}` | undefined;
  primaryName: string | null;
  onRenew: () => void;
}

function DomainRowWithAddr({
  d,
  displayName,
  badge,
  daysLeft,
  canRenew,
  connectedAddress,
  primaryName,
  onRenew,
}: DomainRowWithAddrProps) {
  // ── Hook calls — UNCHANGED ─────────────────────────────────────────────────
  const node     = namehash(`${d.labelName}.${d.tld}`) as `0x${string}`;
  const fullName = `${d.labelName}.${d.tld}`;
  const { receivingAddress, addrState } = useReceivingAddress(node);

  const isPrimary = primaryName === fullName;
  const isStale   =
    isPrimary &&
    receivingAddress !== null &&
    receivingAddress.toLowerCase() !== connectedAddress?.toLowerCase();

  return (
    <div
      className="arcns-glass rounded-[var(--arcns-radius-xl)]"
      style={isPrimary ? { borderColor: "rgba(37,99,255,0.36)", boxShadow: "var(--arcns-shadow-glow-soft)" } : {}}
    >
      <div className="p-5 flex items-center gap-4">
        {/* TLD badge — larger, more prominent */}
        <div
          className="w-12 h-12 rounded-[var(--arcns-radius-md)] flex items-center justify-center text-sm font-bold font-mono flex-shrink-0"
          style={{
            background: d.tld === "arc" ? "rgba(37,99,255,0.12)" : "rgba(0,230,194,0.10)",
            border: d.tld === "arc" ? "1px solid rgba(37,99,255,0.28)" : "1px solid rgba(0,230,194,0.24)",
            color: d.tld === "arc" ? "#8FB3FF" : "#7FFFE3",
          }}
        >
          .{d.tld}
        </div>

        {/* Name + metadata */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Split label and TLD visually */}
            <span className="font-bold text-base truncate" style={{ color: "var(--arcns-text-primary)" }}>
              {d.labelName}
            </span>
            <span className="arcns-gradient-text font-bold text-base">.{d.tld}</span>
            {isPrimary && (
              <span
                className="text-xs px-2 py-0.5 rounded-[var(--arcns-radius-pill)] font-medium flex-shrink-0"
                style={{
                  background: "rgba(37,99,255,0.14)",
                  border: "1px solid rgba(37,99,255,0.30)",
                  color: "#8FB3FF",
                }}
              >
                Primary
              </span>
            )}
          </div>
          {/* Expiry date as separate line */}
          <p className="text-xs mt-0.5" style={{ color: "var(--arcns-text-muted)" }}>
            {d.expiryState === "expired"
              ? `Expired ${formatExpiry(d.expiry)}`
              : `Expires ${formatExpiry(d.expiry)}`}
            {d.expiryState === "expiring-soon" ? ` · ${daysLeft}d left` : ""}
          </p>

          {/* Subtle divider */}
          <div className="mt-2 mb-2" style={{ height: "1px", background: "var(--arcns-divider)" }} />

          {/* Read-only receiving address indicator — addrState logic UNCHANGED */}
          <div>
            {addrState === "loading" && (
              <span
                className="inline-block w-16 h-3 animate-pulse rounded"
                style={{ background: "rgba(120,160,255,0.08)" }}
              />
            )}
            {addrState === "set" && !isStale && receivingAddress && (
              <span
                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-[var(--arcns-radius-pill)]"
                style={{
                  background: "rgba(20,241,149,0.10)",
                  border: "1px solid rgba(20,241,149,0.20)",
                  color: "var(--arcns-green)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block flex-shrink-0" aria-hidden="true" />
                {receivingAddress.slice(0, 6)}…{receivingAddress.slice(-4)}
              </span>
            )}
            {addrState === "set" && isStale && (
              <span className="text-xs" style={{ color: "var(--arcns-warning)" }}>
                This name does not resolve to your connected wallet.
              </span>
            )}
            {addrState === "missing" && (
              <span
                className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-[var(--arcns-radius-pill)]"
                style={{
                  background: "rgba(100,112,132,0.10)",
                  border: "1px solid rgba(100,112,132,0.18)",
                  color: "var(--arcns-text-muted)",
                }}
              >
                No Address
              </span>
            )}
          </div>
        </div>

        {/* Badges + actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2.5 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
            style={expiryStyle(d.expiryState)}
          >
            {badge.label}
          </span>
          {canRenew && (
            <button
              onClick={onRenew}
              className="text-xs font-medium px-3 py-1.5 rounded-[var(--arcns-radius-sm)] transition-all duration-150 hover:opacity-90"
              style={{ background: "rgba(251,191,36,0.12)", color: "var(--arcns-warning)", border: "1px solid rgba(251,191,36,0.24)" }}
            >
              Renew
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
