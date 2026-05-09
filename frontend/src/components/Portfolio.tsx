"use client";
/**
 * Portfolio.tsx — ArcNS portfolio dashboard.
 *
 * Product-level row/table redesign.
 *
 * LOGIC PRESERVED:
 * - useAccount, useMyDomains, useRenew, useReceivingAddress, usePrimaryName hooks preserved
 * - namehash + receiving address model preserved
 * - expiry/badge/date calculations preserved
 * - renewTarget / renewDuration state preserved
 * - Renew modal behavior preserved
 *
 * NOTE:
 * - This component does NOT render Portfolio/History tabs.
 * - This component does NOT render Search/Filter toolbar.
 * - Tabs + toolbar are owned by app/my-domains/page.tsx.
 */

import { useAccount } from "wagmi";
import { useMemo, useState, type CSSProperties } from "react";
import { useMyDomains } from "../hooks/useMyDomains";
import { useRenew } from "../hooks/useRenew";
import { useReceivingAddress } from "../hooks/useReceivingAddress";
import { usePrimaryName } from "../hooks/usePrimaryName";
import { namehash } from "../lib/namehash";
import {
  formatExpiry,
  daysUntilExpiry,
  expiryBadge,
  DURATION_OPTIONS,
  type SupportedTLD,
} from "../lib/normalization";

type DomainLike = any;

function expiryStyle(state: string): CSSProperties {
  if (state === "expiring-soon" || state === "grace") {
    return {
      background: "rgba(251,191,36,0.12)",
      border: "1px solid rgba(251,191,36,0.28)",
      color: "var(--arcns-warning)",
    };
  }

  if (state === "expired") {
    return {
      background: "rgba(255,92,122,0.12)",
      border: "1px solid rgba(255,92,122,0.28)",
      color: "var(--arcns-danger)",
    };
  }

  return {
    background: "rgba(20,241,149,0.10)",
    border: "1px solid rgba(20,241,149,0.24)",
    color: "var(--arcns-green)",
  };
}

function TldTile({ tld }: { tld: string }) {
  const isCircle = tld === "circle";

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border font-mono text-lg font-bold"
      style={{
        background: isCircle
          ? "radial-gradient(circle at 50% 30%, rgba(0,230,194,0.18), rgba(0,230,194,0.06) 48%, rgba(11,18,36,0.70) 100%)"
          : "radial-gradient(circle at 50% 30%, rgba(37,99,255,0.22), rgba(37,99,255,0.08) 48%, rgba(11,18,36,0.70) 100%)",
        borderColor: isCircle
          ? "rgba(0,230,194,0.28)"
          : "rgba(37,99,255,0.34)",
        color: isCircle ? "#7FFFE3" : "#8FB3FF",
        boxShadow: isCircle
          ? "0 0 32px rgba(0,230,194,0.10)"
          : "0 0 32px rgba(37,99,255,0.14)",
      }}
    >
      .{tld}
    </div>
  );
}

function CopyGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect
        x="5"
        y="5"
        width="8"
        height="8"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3 10.5H2.8C1.8 10.5 1 9.7 1 8.7V2.8C1 1.8 1.8 1 2.8 1H8.7C9.7 1 10.5 1.8 10.5 2.8V3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShieldGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 2.25L14.25 4.2V8.65C14.25 11.92 12.15 14.74 9 15.75C5.85 14.74 3.75 11.92 3.75 8.65V4.2L9 2.25Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 9.1L8.2 10.5L11.35 7.35"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 4.5V8L10.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="4" cy="9" r="1.25" fill="currentColor" />
      <circle cx="9" cy="9" r="1.25" fill="currentColor" />
      <circle cx="14" cy="9" r="1.25" fill="currentColor" />
    </svg>
  );
}

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function copyText(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(value).catch(() => undefined);
  }
}

export default function Portfolio({
  searchQuery = "",
}: {
  searchQuery?: string;
}) {
  const { isConnected, address: connectedAddress } = useAccount();
  const { domains, isLoading, error, refetch } = useMyDomains();
  const renew = useRenew();

  const [renewTarget, setRenewTarget] = useState<{
    label: string;
    tld: SupportedTLD;
  } | null>(null);

  const [renewDuration, setRenewDuration] = useState(
    BigInt(DURATION_OPTIONS[0].seconds),
  );

  const { primaryName } = usePrimaryName(connectedAddress);

  const filteredDomains = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return domains;

    return domains.filter((d: DomainLike) => {
      const fullName = d.labelName
        ? `${d.labelName}.${d.tld}`.toLowerCase()
        : d.tokenId
          ? `${d.tokenId.toString()} ${d.tld}`.toLowerCase()
          : `${d.tld}`.toLowerCase();

      return fullName.includes(normalized);
    });
  }, [domains, searchQuery]);

  if (!isConnected) {
    return (
      <div
        className="rounded-[28px] border px-6 py-16 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,18,36,0.76), rgba(8,14,31,0.72))",
          borderColor: "rgba(120,160,255,0.18)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.20)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl"
          style={{
            background: "rgba(37,99,255,0.10)",
            borderColor: "rgba(37,99,255,0.22)",
            color: "var(--arcns-cyan)",
          }}
          aria-hidden="true"
        >
          ◎
        </div>
        <p className="font-bold" style={{ color: "var(--arcns-text-primary)" }}>
          Connect your wallet
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
          Connect to view your ArcNS portfolio.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="overflow-hidden rounded-[28px] border"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,18,36,0.76), rgba(8,14,31,0.72))",
          borderColor: "rgba(120,160,255,0.18)",
        }}
      >
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="flex items-center gap-5 border-b p-5 last:border-b-0"
            style={{ borderColor: "rgba(120,160,255,0.10)" }}
          >
            <div
              className="h-16 w-16 animate-pulse rounded-2xl"
              style={{ background: "rgba(120,160,255,0.08)" }}
            />
            <div className="flex-1">
              <div
                className="mb-2 h-5 w-1/3 animate-pulse rounded"
                style={{ background: "rgba(120,160,255,0.08)" }}
              />
              <div
                className="h-4 w-1/4 animate-pulse rounded"
                style={{ background: "rgba(120,160,255,0.06)" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-[28px] border p-5 text-sm"
        style={{
          background: "rgba(255,92,122,0.08)",
          borderColor: "rgba(255,92,122,0.24)",
          color: "var(--arcns-danger)",
        }}
      >
        {error}
        <button
          onClick={refetch}
          className="ml-3 underline"
          style={{ color: "var(--arcns-danger)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <div
        className="rounded-[28px] border px-6 py-16 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,18,36,0.76), rgba(8,14,31,0.72))",
          borderColor: "rgba(120,160,255,0.18)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.20)",
        }}
      >
        <p className="font-bold" style={{ color: "var(--arcns-text-primary)" }}>
          No domains registered yet
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
          Register a .arc or .circle name to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="overflow-hidden rounded-[28px] border"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.76))",
          borderColor: "rgba(120,160,255,0.18)",
          boxShadow: "0 28px 100px rgba(0,0,0,0.24)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "rgba(120,160,255,0.12)" }}
        >
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: "var(--arcns-text-muted)" }}
          >
            Registered Names
          </p>
          <p className="text-xs" style={{ color: "var(--arcns-text-muted)" }}>
            {filteredDomains.length} {filteredDomains.length === 1 ? "name" : "names"}
          </p>
        </div>

        {filteredDomains.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
              No matching domains
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
              Try another search term.
            </p>
          </div>
        ) : (
          <div>
            {filteredDomains.map((d: DomainLike, i: number) => {
              const badge = expiryBadge(d.expiryState);
              const daysLeft = daysUntilExpiry(d.expiry);
              const canRenew =
                d.expiryState === "expiring-soon" || d.expiryState === "grace";

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

              return (
                <RpcFallbackRow
                  key={key}
                  d={d}
                  badge={badge}
                  daysLeft={daysLeft}
                />
              );
            })}
          </div>
        )}
      </div>

      {renewTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-[var(--arcns-radius-xl)] border p-6"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,18,36,0.96), rgba(8,14,31,0.98))",
              borderColor: "rgba(120,160,255,0.22)",
              boxShadow: "0 32px 120px rgba(0,0,0,0.48)",
            }}
          >
            <h3
              className="mb-1 font-bold"
              style={{
                color: "var(--arcns-text-primary)",
                fontFamily: "var(--arcns-font-display)",
              }}
            >
              Renew Domain
            </h3>
            <p
              className="mb-4 text-sm font-semibold"
              style={{ color: "var(--arcns-cyan)" }}
            >
              {renewTarget.label}.{renewTarget.tld}
            </p>
            <p
              className="mb-4 text-sm"
              style={{ color: "var(--arcns-text-secondary)" }}
            >
              Select a renewal duration. Payment will be in USDC.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={() => setRenewDuration(BigInt(opt.seconds))}
                  className="rounded-[var(--arcns-radius-sm)] px-4 py-2 text-sm font-medium transition-all duration-150"
                  style={
                    renewDuration === BigInt(opt.seconds)
                      ? { background: "var(--arcns-gradient-primary)", color: "#fff" }
                      : {
                          background: "rgba(120,160,255,0.06)",
                          color: "var(--arcns-text-secondary)",
                          border: "1px solid var(--arcns-border-default)",
                        }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {renew.error ? (
              <p className="mb-3 text-xs" style={{ color: "var(--arcns-danger)" }}>
                {renew.error}
              </p>
            ) : null}

            <p className="mb-4 text-xs" style={{ color: "var(--arcns-text-muted)" }}>
              Price will be calculated at renewal time. Approve USDC when prompted.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRenewTarget(null);
                  renew.reset();
                }}
                className="flex-1 rounded-[var(--arcns-radius-lg)] border py-2.5 text-sm transition-all duration-150 hover:border-[var(--arcns-border-strong)]"
                style={{
                  borderColor: "var(--arcns-border-default)",
                  color: "var(--arcns-text-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setRenewTarget(null);
                }}
                className="flex-1 rounded-[var(--arcns-radius-lg)] py-2.5 text-sm font-medium text-white transition-all duration-150 hover:opacity-90"
                style={{ background: "var(--arcns-warning)" }}
              >
                Search to Renew
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface DomainRowWithAddrProps {
  d: DomainLike;
  displayName: string;
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
  const node = namehash(`${d.labelName}.${d.tld}`) as `0x${string}`;
  const fullName = `${d.labelName}.${d.tld}`;
  const { receivingAddress, addrState } = useReceivingAddress(node);

  const isPrimary = primaryName === fullName;
  const isStale =
    isPrimary &&
    receivingAddress !== null &&
    receivingAddress.toLowerCase() !== connectedAddress?.toLowerCase();

  return (
    <div
      className="group grid gap-5 border-b px-6 py-5 transition-colors duration-150 last:border-b-0 lg:grid-cols-[300px_210px_230px_180px_120px_48px] lg:items-center"
      style={{
        borderColor: "rgba(120,160,255,0.10)",
        background: isPrimary
          ? "linear-gradient(90deg, rgba(37,99,255,0.12), rgba(0,212,255,0.04), transparent)"
          : "transparent",
      }}
    >
      <div className="flex min-w-0 items-center gap-5">
        <TldTile tld={d.tld} />

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className="truncate text-2xl font-bold tracking-[-0.045em]"
              style={{
                color: "var(--arcns-text-primary)",
                fontFamily: "var(--arcns-font-display)",
              }}
              title={displayName}
            >
              <span>{d.labelName}</span>
              <span
                style={{
                  color: d.tld === "circle" ? "var(--arcns-teal)" : "var(--arcns-cyan)",
                }}
              >
                .{d.tld}
              </span>
            </h3>

            {isPrimary ? (
              <span
                className="shrink-0 rounded-[var(--arcns-radius-pill)] px-2.5 py-1 text-xs font-bold"
                style={{
                  background: "rgba(37,99,255,0.16)",
                  border: "1px solid rgba(37,99,255,0.32)",
                  color: "#8FB3FF",
                }}
              >
                Primary
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
            {isPrimary ? "Your main identity" : "Registered ArcNS name"}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm" style={{ color: "var(--arcns-text-secondary)" }}>
          {d.expiryState === "expired" ? "Expired" : "Expires"} {formatExpiry(d.expiry)}
        </p>
        <p
          className="mt-1 flex items-center gap-1.5 text-sm font-semibold"
          style={{
            color:
              d.expiryState === "expired"
                ? "var(--arcns-danger)"
                : d.expiryState === "expiring-soon" || d.expiryState === "grace"
                  ? "var(--arcns-warning)"
                  : "var(--arcns-green)",
          }}
        >
          <ClockGlyph />
          {d.expiryState === "expired"
            ? "expired"
            : daysLeft > 0
              ? `in ${daysLeft} days`
              : "active"}
        </p>
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
          Resolved to
        </p>

        {addrState === "loading" ? (
          <span
            className="inline-block h-4 w-24 animate-pulse rounded"
            style={{ background: "rgba(120,160,255,0.08)" }}
          />
        ) : addrState === "set" && !isStale && receivingAddress ? (
          <span
            className="inline-flex max-w-full items-center gap-2 rounded-[var(--arcns-radius-pill)] px-2.5 py-1 text-sm font-bold"
            style={{
              background: "rgba(20,241,149,0.10)",
              border: "1px solid rgba(20,241,149,0.22)",
              color: "var(--arcns-green)",
            }}
            title={receivingAddress}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span className="truncate">{shortAddress(receivingAddress)}</span>
            <button
              type="button"
              onClick={() => copyText(receivingAddress)}
              className="shrink-0 opacity-70 transition-opacity hover:opacity-100"
              aria-label="Copy receiving address"
              style={{ color: "currentColor" }}
            >
              <CopyGlyph />
            </button>
          </span>
        ) : addrState === "set" && isStale ? (
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--arcns-warning)" }}
          >
            Address stale
          </span>
        ) : (
          <span
            className="inline-flex rounded-[var(--arcns-radius-pill)] px-2.5 py-1 text-xs font-semibold"
            style={{
              background: "rgba(100,112,132,0.10)",
              border: "1px solid rgba(100,112,132,0.20)",
              color: "var(--arcns-text-muted)",
            }}
          >
            No Address
          </span>
        )}
      </div>

      <div className="min-w-0">
        <p
          className="flex items-center gap-2 text-sm font-semibold"
          style={{ color: "#8FB3FF" }}
        >
          <ShieldGlyph />
          On-chain
        </p>
        <p
          className="mt-1 flex items-center gap-1.5 text-sm"
          style={{ color: isStale ? "var(--arcns-warning)" : "var(--arcns-green)" }}
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {isStale ? "Needs sync" : "Verified"}
        </p>
      </div>

      <div>
        <span
          className="inline-flex rounded-[var(--arcns-radius-pill)] px-3 py-1.5 text-sm font-bold"
          style={expiryStyle(d.expiryState)}
        >
          {badge.label}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2">
        {canRenew ? (
          <button
            onClick={onRenew}
            className="rounded-[var(--arcns-radius-md)] px-3 py-2 text-xs font-bold transition-opacity hover:opacity-90"
            style={{
              background: "rgba(251,191,36,0.12)",
              border: "1px solid rgba(251,191,36,0.24)",
              color: "var(--arcns-warning)",
            }}
          >
            Renew
          </button>
        ) : null}

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-[var(--arcns-radius-md)] border transition-colors duration-150"
          style={{
            background: "rgba(11,18,36,0.72)",
            borderColor: "rgba(120,160,255,0.18)",
            color: "var(--arcns-text-secondary)",
          }}
          aria-label={`More actions for ${displayName}`}
        >
          <MoreGlyph />
        </button>
      </div>
    </div>
  );
}

function RpcFallbackRow({
  d,
  badge,
  daysLeft,
}: {
  d: DomainLike;
  badge: any;
  daysLeft: number;
}) {
  return (
    <div
      className="grid gap-5 border-b px-6 py-5 last:border-b-0 lg:grid-cols-[300px_210px_1fr_120px]"
      style={{ borderColor: "rgba(120,160,255,0.10)" }}
    >
      <div className="flex items-center gap-5">
        <TldTile tld={d.tld} />
        <div>
          <h3
            className="text-xl font-bold"
            style={{
              color: "var(--arcns-text-primary)",
              fontFamily: "var(--arcns-font-display)",
            }}
          >
            {d.tokenId
              ? `${("0x" + d.tokenId.toString(16).padStart(64, "0")).slice(0, 10)}…`
              : "unknown"}
            <span
              style={{
                color: d.tld === "circle" ? "var(--arcns-teal)" : "var(--arcns-cyan)",
              }}
            >
              .{d.tld}
            </span>
          </h3>
          <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
            RPC fallback
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm" style={{ color: "var(--arcns-text-secondary)" }}>
          {d.expiryState === "expired" ? "Expired" : "Expires"} {formatExpiry(d.expiry)}
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
          {d.expiryState === "expiring-soon" ? `${daysLeft}d left` : ""}
        </p>
      </div>

      <div />

      <div>
        <span
          className="inline-flex rounded-[var(--arcns-radius-pill)] px-3 py-1.5 text-sm font-bold"
          style={expiryStyle(d.expiryState)}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}