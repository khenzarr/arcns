"use client";
/**
 * resolve/page.tsx — ArcNS name resolution page.
 *
 * Phase 8 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useResolveAddress hook (publicClient, useEffect, cancel pattern) untouched
 *   - useAccount, useReadContract calls untouched
 *   - domain/queried state untouched
 *   - handleResolve handler untouched
 *   - parts/label/tld/registrar/tokenId derivation untouched
 *   - expiryTs/expiryState/badge derivation untouched
 *   - hasResult/hasAddr/isUnregistered/isOwner derivation untouched
 *   - namehash/node derivation untouched
 *   - ArcScan links untouched
 *
 * No v1/v2 imports. No ENS-branded strings.
 */

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { namehash, labelToTokenId } from "../../lib/namehash";
import {
  getExpiryState,
  expiryBadge,
  formatExpiry,
  type SupportedTLD,
} from "../../lib/normalization";
import {
  REGISTRAR_ABI,
  RESOLVER_ABI,
  ADDR_RESOLVER,
  ADDR_ARC_REGISTRAR,
  ADDR_CIRCLE_REGISTRAR,
  REGISTRY_CONTRACT,
} from "../../lib/contracts";
import { isValidLabel } from "../../lib/domain";
import Link from "next/link";
import { PageHeader }      from "../../components/ui/PageHeader";
import { CopyButton }      from "../../components/ui/CopyButton";
import { TldBadge }        from "../../components/ui/TldBadge";

// ─── Forward resolution via publicClient — UNCHANGED ─────────────────────────

function useResolveAddress(domain: string) {
  const node    = namehash(domain);
  const enabled = domain.includes(".");
  const [data, setData]         = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) { setData(undefined); return; }
    let cancelled = false;
    setLoading(true);
    import("../../lib/publicClient").then(({ publicClient }) => {
      publicClient.readContract({
        address: ADDR_RESOLVER,
        abi: RESOLVER_ABI,
        functionName: "addr",
        args: [node as `0x${string}`],
      })
        .then((r: unknown) => { if (!cancelled) { setData(r as string); setLoading(false); } })
        .catch(() => { if (!cancelled) { setData(undefined); setLoading(false); } });
    });
    return () => { cancelled = true; };
  }, [domain, node, enabled]);

  return { data, isLoading };
}

// ─── Expiry badge style helper ────────────────────────────────────────────────
function expiryStyle(state: string): React.CSSProperties {
  if (state === "expiring-soon" || state === "grace") {
    return { background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.28)", color: "var(--arcns-warning)" };
  }
  if (state === "expired") {
    return { background: "rgba(255,92,122,0.12)", border: "1px solid rgba(255,92,122,0.28)", color: "var(--arcns-danger)" };
  }
  return { background: "rgba(20,241,149,0.10)", border: "1px solid rgba(20,241,149,0.24)", color: "var(--arcns-green)" };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResolvePage() {
  // ── State — UNCHANGED ──────────────────────────────────────────────────────
  const [domain,  setDomain]  = useState("");
  const [queried, setQueried] = useState("");

  // ── Hooks — UNCHANGED ──────────────────────────────────────────────────────
  const { address: connectedAddress } = useAccount();
  const { data: resolvedAddr, isLoading } = useResolveAddress(queried);

  // ── Derived values — UNCHANGED ─────────────────────────────────────────────
  const parts    = queried.split(".");
  const label    = parts[0] ?? "";
  const rawTld   = parts[1] ?? "";
  const tld      = (rawTld === "arc" || rawTld === "circle") ? rawTld as SupportedTLD : null;
  const registrar = tld === "circle" ? ADDR_CIRCLE_REGISTRAR : ADDR_ARC_REGISTRAR;
  const tokenId  = label ? labelToTokenId(label) : 0n;

  const { data: expiry } = useReadContract({
    address: registrar as `0x${string}`,
    abi: REGISTRAR_ABI,
    functionName: "nameExpires",
    args: [tokenId],
    query: { enabled: !!tld && isValidLabel(label), staleTime: 30_000, refetchOnWindowFocus: false },
  });

  const expiryTs    = (expiry as bigint | undefined) ?? 0n;
  const expiryState = getExpiryState(expiryTs);
  const badge       = expiryBadge(expiryState);

  // ── Handler — UNCHANGED ────────────────────────────────────────────────────
  const handleResolve = () => setQueried(domain.trim().toLowerCase());
  const nodeBytes     = queried ? namehash(queried) as `0x${string}` : undefined;
  const node          = queried ? namehash(queried) : "";
  const hasResult     = !!queried && queried.includes(".");
  const addr          = resolvedAddr as string | undefined;
  const hasAddr       = addr && addr !== "0x0000000000000000000000000000000000000000";
  const isUnregistered = hasResult && !isLoading && expiryTs === 0n;

  // ── Registry owner read — UNCHANGED ───────────────────────────────────────
  const { data: ownerData } = useReadContract({
    ...REGISTRY_CONTRACT,
    functionName: "owner",
    args: nodeBytes ? [nodeBytes] : undefined,
    query: {
      enabled: !!queried && queried.includes(".") && !!connectedAddress,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });
  const isOwner =
    !!connectedAddress &&
    !!ownerData &&
    (ownerData as string).toLowerCase() === connectedAddress.toLowerCase();

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <PageHeader
        title="Resolve"
        subtitle="Inspect any ArcNS name and its on-chain identity records."
      />

      {/* ── Search module ─────────────────────────────────────────────────── */}
      <div
        className="arcns-glass rounded-[var(--arcns-radius-xl)] p-6 space-y-5"
      >
        {/* Small label above input */}
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--arcns-text-muted)" }}>Resolve a name</p>
        {/* Input + button — handlers UNCHANGED */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleResolve()}
            placeholder="Enter a name, e.g. flowpay.arc"
            className="flex-1 px-4 py-3 rounded-[var(--arcns-radius-lg)] border focus:outline-none focus:ring-2 focus:ring-[var(--arcns-cyan)] text-sm min-w-0 transition-all duration-150"
            style={{
              background: "var(--arcns-bg-elevated)",
              borderColor: "var(--arcns-border-default)",
              color: "var(--arcns-text-primary)",
            }}
            aria-label="Enter an ArcNS name to resolve"
          />
          <button
            onClick={handleResolve}
            className="px-6 py-3 text-white rounded-[var(--arcns-radius-lg)] font-semibold text-sm transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--arcns-gradient-primary)" }}
          >
            Resolve
          </button>
        </div>

        {/* ── Results — hasResult logic UNCHANGED ───────────────────────── */}
        {hasResult && (
          <div className="space-y-3">

            {/* ── Result overview card ──────────────────────────────────── */}
            <div
              className="rounded-[var(--arcns-radius-lg)] p-5 space-y-4"
              style={{
                background: "var(--arcns-bg-elevated)",
                border: "1px solid var(--arcns-border-default)",
                borderLeft: hasAddr
                  ? "3px solid var(--arcns-green)"
                  : !isUnregistered
                    ? "3px solid var(--arcns-border-default)"
                    : "1px solid var(--arcns-border-default)",
              }}
            >
              {/* Domain name + TLD badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="text-xl font-bold tracking-tight"
                  style={{
                    color: "var(--arcns-text-primary)",
                    fontFamily: "var(--arcns-font-display)",
                  }}
                >
                  {queried}
                </h2>
                {tld && <TldBadge tld={tld} />}
                {/* Expiry status badge — inline with name */}
                {expiryTs > 0n && (
                  <span
                    className="px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
                    style={expiryStyle(expiryState)}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              {/* ── Resolved address row ──────────────────────────────── */}
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                  style={{ color: "var(--arcns-text-muted)" }}
                >
                  Resolved Address
                </p>
                {isLoading ? (
                  <div
                    className="h-5 rounded animate-pulse w-3/4"
                    style={{ background: "rgba(120,160,255,0.08)" }}
                  />
                ) : hasAddr ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className="font-mono text-sm break-all"
                      style={{ color: "var(--arcns-text-primary)" }}
                    >
                      {addr}
                    </p>
                    {/* Copy button — uses CopyButton component */}
                    <CopyButton
                      value={addr!}
                      aria-label={`Copy resolved address ${addr}`}
                    />
                    {/* ArcScan explorer link — UNCHANGED */}
                    <a
                      href={`https://testnet.arcscan.app/address/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs shrink-0 transition-opacity hover:opacity-80"
                      style={{ color: "var(--arcns-cyan)" }}
                      aria-label="View address on ArcScan"
                    >
                      ↗
                    </a>
                  </div>
                ) : isUnregistered ? (
                  <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                    Name not registered
                  </p>
                ) : (
                  <div>
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      No receiving address set
                    </p>
                    {/* isOwner hint — UNCHANGED logic */}
                    {isOwner && (
                      <div
                        className="mt-2 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
                        style={{
                          background: "rgba(37,99,255,0.08)",
                          border: "1px solid rgba(37,99,255,0.18)",
                          color: "var(--arcns-text-secondary)",
                        }}
                      >
                        Set this name as your Primary Name to activate it for receiving transfers.{" "}
                        <Link
                          href="/my-domains"
                          className="underline"
                          style={{ color: "var(--arcns-cyan)" }}
                        >
                          Go to My Domains →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Expiry row — expiryTs logic UNCHANGED ─────────────── */}
              {expiryTs > 0n && (
                <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--arcns-divider)" }}>
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-0.5"
                      style={{ color: "var(--arcns-text-muted)" }}
                    >
                      Expires
                    </p>
                    <p className="text-sm" style={{ color: "var(--arcns-text-primary)" }}>
                      {formatExpiry(expiryTs)}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
                    style={expiryStyle(expiryState)}
                  >
                    {badge.label}
                  </span>
                </div>
              )}
            </div>

            {/* ── Namehash card ─────────────────────────────────────────── */}
            <div
              className="rounded-[var(--arcns-radius-lg)] p-4"
              style={{
                background: "var(--arcns-bg-elevated)",
                border: "1px solid var(--arcns-border-default)",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--arcns-text-muted)" }}
                >
                  Namehash
                </p>
                <CopyButton
                  value={node}
                  aria-label="Copy namehash"
                />
              </div>
              <p
                className="font-mono text-xs break-all"
                style={{ color: "var(--arcns-text-secondary)" }}
              >
                {node}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--arcns-text-muted)" }}>
                On-chain identifier
              </p>
            </div>

            {/* ── ArcScan NFT link — UNCHANGED ──────────────────────────── */}
            {hasAddr && (
              <a
                href={`https://testnet.arcscan.app/token/${registrar}?a=${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-[var(--arcns-radius-lg)] text-sm font-medium transition-all duration-150 hover:opacity-80"
                style={{
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.18)",
                  color: "var(--arcns-cyan)",
                }}
              >
                View NFT on ArcScan <span className="text-base" aria-hidden="true">↗</span>
              </a>
            )}

          </div>
        )}

        {/* ── Initial / empty state ─────────────────────────────────────── */}
        {!hasResult && (
          <div className="text-center py-10 space-y-4">
            {/* ArcNS logo mark */}
            <div className="flex justify-center">
              <svg
                width="40"
                height="40"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="14" cy="14" r="11"
                  stroke="url(#resolve-logo-gradient)"
                  strokeWidth="1.75"
                  fill="none"
                />
                <path
                  d="M 14 3 A 11 11 0 0 1 25 14"
                  stroke="url(#resolve-logo-gradient)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="14" cy="14" r="2.5" fill="var(--arcns-cyan)" />
                <defs>
                  <linearGradient id="resolve-logo-gradient" x1="3" y1="3" x2="25" y2="25" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#2563FF" />
                    <stop offset="100%" stopColor="#00D4FF" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {/* Heading */}
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--arcns-text-primary)", fontFamily: "var(--arcns-font-display)" }}
            >
              Identity Inspector
            </h2>
            {/* Subtext */}
            <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
              Enter a .arc or .circle name to inspect its on-chain records.
            </p>
            {/* Supported namespaces pills */}
            <div className="flex items-center justify-center gap-2">
              <span
                className="px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
                style={{
                  background: "rgba(37,99,255,0.12)",
                  border: "1px solid rgba(37,99,255,0.28)",
                  color: "var(--arcns-cyan)",
                }}
              >
                .arc
              </span>
              <span
                className="px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
                style={{
                  background: "rgba(0,230,194,0.10)",
                  border: "1px solid rgba(0,230,194,0.24)",
                  color: "var(--arcns-teal)",
                }}
              >
                .circle
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
