"use client";
/**
 * resolve/page.tsx — ArcNS Resolve / Identity Inspector.
 *
 * Mockup-aligned product layout.
 *
 * LOGIC PRESERVED:
 * - useResolveAddress hook preserved
 * - useAccount / useReadContract calls preserved
 * - domain / queried state preserved
 * - handleResolve preserved
 * - label / tld / registrar / tokenId derivation preserved
 * - expiryTs / expiryState / badge derivation preserved
 * - hasResult / hasAddr / isUnregistered / isOwner derivation preserved
 * - namehash / node derivation preserved
 * - ArcScan links preserved
 *
 * DATA DISCIPLINE:
 * - No fake registrant / auto-renew / transfer-lock fields.
 * - No fake primary-name action.
 * - Only existing real data and deterministic derived values are rendered.
 */

import Image from "next/image";
import Link from "next/link";
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
import { CopyButton } from "../../components/ui/CopyButton";
import { TldBadge } from "../../components/ui/TldBadge";
import { FooterIdentityLine } from "../../components/ui/FooterIdentityLine";

// ─────────────────────────────────────────────────────────────────────────────
// Forward resolution hook — preserved
// ─────────────────────────────────────────────────────────────────────────────

function useResolveAddress(domain: string) {
  const node = namehash(domain);
  const enabled = domain.includes(".");
  const [data, setData] = useState<string | undefined>(undefined);
  const [isLoading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setData(undefined);
      return;
    }

    let cancelled = false;
    setLoading(true);

    import("../../lib/publicClient").then(({ publicClient }) => {
      publicClient
        .readContract({
          address: ADDR_RESOLVER,
          abi: RESOLVER_ABI,
          functionName: "addr",
          args: [node as `0x${string}`],
        })
        .then((r: unknown) => {
          if (!cancelled) {
            setData(r as string);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData(undefined);
            setLoading(false);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [domain, node, enabled]);

  return { data, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual helpers
// ─────────────────────────────────────────────────────────────────────────────

function shortAddress(value: string, head = 8, tail = 6) {
  if (!value) return "";
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function expiryStyle(state: string): React.CSSProperties {
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

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.8" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15.2 15.2L20 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6 3.5H3.5C2.67 3.5 2 4.17 2 5v7.5c0 .83.67 1.5 1.5 1.5H11c.83 0 1.5-.67 1.5-1.5V10"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
      <path
        d="M9 2h5v5"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 2L7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CopyGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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

function StackIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M14 4L24 9L14 14L4 9L14 4Z"
        fill="rgba(37,99,255,0.28)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 14L14 19L24 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M4 19L14 24L24 19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="10" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M6.5 23C7.7 18.8 10.3 16.7 14 16.7C17.7 16.7 20.3 18.8 21.5 23"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 13V19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M14 9.2V9.3" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path
        d="M10 8L4 14L10 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 8L24 14L18 20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusDot({ color = "var(--arcns-green)" }: { color?: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{
        background: color,
        boxShadow: `0 0 14px ${color}`,
      }}
      aria-hidden="true"
    />
  );
}

function MiniAction({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center justify-center gap-3 rounded-[var(--arcns-radius-lg)] border px-5 text-sm font-semibold transition-all duration-150 hover:translate-y-[-1px]"
      style={{
        background:
          variant === "primary"
            ? "linear-gradient(135deg, rgba(37,99,255,0.22), rgba(0,212,255,0.10))"
            : "rgba(11,18,36,0.68)",
        borderColor:
          variant === "primary"
            ? "rgba(37,99,255,0.48)"
            : "rgba(120,160,255,0.16)",
        color: variant === "primary" ? "#8FB3FF" : "var(--arcns-text-secondary)",
        boxShadow:
          variant === "primary" ? "0 0 32px rgba(37,99,255,0.16)" : "none",
      }}
    >
      {children}
    </a>
  );
}

function DetailRow({
  label,
  value,
  valueColor,
  copyValue,
  explorerHref,
}: {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  copyValue?: string;
  explorerHref?: string;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] items-center gap-4 py-2">
      <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
        {label}
      </p>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p
          className="min-w-0 truncate text-sm font-semibold"
          style={{ color: valueColor ?? "var(--arcns-text-primary)" }}
          title={typeof value === "string" ? value : undefined}
        >
          {value}
        </p>

        {copyValue ? (
          <CopyButton value={copyValue} aria-label={`Copy ${label}`} />
        ) : null}

        {explorerHref ? (
          <a
            href={explorerHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold"
            style={{ color: "var(--arcns-cyan)" }}
            aria-label={`Open ${label} on ArcScan`}
          >
            ArcScan <ExternalIcon />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function RecordPill({
  label,
  count,
  icon,
}: {
  label: string;
  count: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-3 border-r px-5 py-4 last:border-r-0"
      style={{ borderColor: "rgba(120,160,255,0.10)" }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border"
        style={{
          background: "rgba(120,160,255,0.08)",
          borderColor: "rgba(120,160,255,0.14)",
          color: "#9AB4FF",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold" style={{ color: "var(--arcns-text-primary)" }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: "var(--arcns-text-muted)" }}>
          {count}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ResolvePage() {
  const [domain, setDomain] = useState("");
  const [queried, setQueried] = useState("");

  const { address: connectedAddress } = useAccount();
  const { data: resolvedAddr, isLoading } = useResolveAddress(queried);

  const parts = queried.split(".");
  const label = parts[0] ?? "";
  const rawTld = parts[1] ?? "";
  const tld = rawTld === "arc" || rawTld === "circle" ? (rawTld as SupportedTLD) : null;
  const registrar = tld === "circle" ? ADDR_CIRCLE_REGISTRAR : ADDR_ARC_REGISTRAR;
  const tokenId = label ? labelToTokenId(label) : 0n;

  const { data: expiry } = useReadContract({
    address: registrar as `0x${string}`,
    abi: REGISTRAR_ABI,
    functionName: "nameExpires",
    args: [tokenId],
    query: {
      enabled: !!tld && isValidLabel(label),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  });

  const expiryTs = (expiry as bigint | undefined) ?? 0n;
  const expiryState = getExpiryState(expiryTs);
  const badge = expiryBadge(expiryState);

  const handleResolve = () => setQueried(domain.trim().toLowerCase());

  const nodeBytes = queried ? (namehash(queried) as `0x${string}`) : undefined;
  const node = queried ? namehash(queried) : "";
  const hasResult = !!queried && queried.includes(".");
  const addr = resolvedAddr as string | undefined;
  const hasAddr = !!addr && addr !== "0x0000000000000000000000000000000000000000";
  const isUnregistered = hasResult && !isLoading && expiryTs === 0n;

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

  const ownerAddress =
    typeof ownerData === "string" &&
    ownerData !== "0x0000000000000000000000000000000000000000"
      ? ownerData
      : undefined;

  const isOwner =
    !!connectedAddress &&
    !!ownerData &&
    (ownerData as string).toLowerCase() === connectedAddress.toLowerCase();

  const explorerTokenHref =
    tld && label
      ? `https://testnet.arcscan.app/token/${registrar}?a=${tokenId}`
      : "https://testnet.arcscan.app";

  const resolvedExplorerHref = hasAddr
    ? `https://testnet.arcscan.app/address/${addr}`
    : undefined;

  const ownerExplorerHref = ownerAddress
    ? `https://testnet.arcscan.app/address/${ownerAddress}`
    : undefined;

  return (
    <div
      className="relative min-h-[calc(100vh-64px)] overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 10% 12%, rgba(37,99,255,0.16), transparent 28%), radial-gradient(circle at 88% 10%, rgba(0,212,255,0.10), transparent 34%), linear-gradient(180deg, #050A18 0%, #071026 46%, #050A18 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 76% 46% at 86% 2%, transparent 69%, rgba(37,99,255,0.34) 69.4%, transparent 70.2%), radial-gradient(ellipse 72% 42% at 22% 18%, transparent 70%, rgba(0,212,255,0.16) 70.3%, transparent 71%)",
          opacity: 0.85,
        }}
      />

      <main className="relative z-10 mx-auto w-[min(1280px,calc(100vw-96px))] py-14">
        {/* Hero */}
        <section className="relative mb-7 min-h-[245px]">
          <div
            className="pointer-events-none absolute left-[-76px] top-[-18px] hidden h-[260px] w-[300px] items-center justify-center lg:flex"
            aria-hidden="true"
          >
            <Image
              src="/arcns/arcns-emblem.svg"
              alt=""
              width={250}
              height={250}
              priority
              style={{
                objectFit: "contain",
                filter:
                  "drop-shadow(0 0 30px rgba(0,212,255,0.34)) drop-shadow(0 0 80px rgba(37,99,255,0.20))",
                opacity: 0.96,
              }}
            />
          </div>

          <div className="relative z-10 ml-0 pt-7 lg:ml-[220px]">
            <h1
              className="text-[clamp(3rem,6vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.075em]"
              style={{
                color: "var(--arcns-text-primary)",
                fontFamily: "var(--arcns-font-display)",
                textShadow: "0 0 42px rgba(255,255,255,0.12)",
              }}
            >
              Resolve
            </h1>
            <p
              className="mt-5 max-w-[760px] text-2xl leading-relaxed"
              style={{ color: "var(--arcns-text-secondary)" }}
            >
              Inspect any ArcNS name and its on-chain identity records.
            </p>

            <section
              className="relative mt-8 max-w-[980px] overflow-hidden rounded-[28px] border p-5"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,18,36,0.82), rgba(8,14,31,0.76))",
                borderColor: "rgba(120,160,255,0.22)",
                boxShadow:
                  "0 0 0 1px rgba(0,212,255,0.06), 0 0 50px rgba(0,212,255,0.14), 0 0 100px rgba(37,99,255,0.10)",
              }}
            >
              <div
                className="flex flex-col gap-4 sm:flex-row"
              >
                <label
                  className="flex h-16 min-w-0 flex-1 items-center gap-4 rounded-[var(--arcns-radius-lg)] border px-5"
                  style={{
                    background: "rgba(11,18,36,0.84)",
                    borderColor: "rgba(120,160,255,0.18)",
                    color: "var(--arcns-text-muted)",
                  }}
                >
                  <SearchIcon />
                  <input
                    type="text"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleResolve()}
                    placeholder="flowpay.arc"
                    className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none"
                    style={{ color: "var(--arcns-text-primary)" }}
                    aria-label="Enter an ArcNS name to resolve"
                  />

                  {tld ? (
                    <span
                      className="hidden rounded-[var(--arcns-radius-pill)] border px-3 py-1 text-sm font-semibold sm:inline-flex"
                      style={{
                        background:
                          tld === "circle"
                            ? "rgba(0,230,194,0.08)"
                            : "rgba(37,99,255,0.12)",
                        borderColor:
                          tld === "circle"
                            ? "rgba(0,230,194,0.24)"
                            : "rgba(37,99,255,0.28)",
                        color:
                          tld === "circle"
                            ? "var(--arcns-teal)"
                            : "var(--arcns-cyan)",
                      }}
                    >
                      .{tld}
                    </span>
                  ) : null}
                </label>

                <button
                  onClick={handleResolve}
                  className="h-16 rounded-[var(--arcns-radius-lg)] px-10 text-lg font-bold text-white transition-all duration-150 hover:translate-y-[-1px] hover:opacity-95 active:scale-[0.98]"
                  style={{
                    background: "var(--arcns-gradient-primary)",
                    boxShadow: "0 18px 45px rgba(37,99,255,0.30)",
                  }}
                >
                  Resolve
                </button>
              </div>
            </section>
          </div>
        </section>

        {!hasResult ? (
          <section
            className="mx-auto mt-10 max-w-[900px] rounded-[28px] border px-8 py-10 text-center"
            style={{
              background:
                "linear-gradient(180deg, rgba(11,18,36,0.64), rgba(8,14,31,0.56))",
              borderColor: "rgba(120,160,255,0.14)",
            }}
          >
            <div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border"
              style={{
                background: "rgba(37,99,255,0.10)",
                borderColor: "rgba(37,99,255,0.22)",
              }}
              aria-hidden="true"
            >
              <Image src="/arcns/arcns-emblem.svg" alt="" width={40} height={40} />
            </div>
            <h2
              className="text-2xl font-bold"
              style={{
                color: "var(--arcns-text-primary)",
                fontFamily: "var(--arcns-font-display)",
              }}
            >
              Identity Inspector
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--arcns-text-muted)" }}>
              Enter a .arc or .circle name above to inspect its on-chain records.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <span
                className="rounded-[var(--arcns-radius-pill)] px-3 py-1 text-xs font-bold"
                style={{
                  background: "rgba(37,99,255,0.12)",
                  border: "1px solid rgba(37,99,255,0.28)",
                  color: "var(--arcns-cyan)",
                }}
              >
                • .arc
              </span>
              <span
                className="rounded-[var(--arcns-radius-pill)] px-3 py-1 text-xs font-bold"
                style={{
                  background: "rgba(0,230,194,0.10)",
                  border: "1px solid rgba(0,230,194,0.24)",
                  color: "var(--arcns-teal)",
                }}
              >
                • .circle
              </span>
            </div>
          </section>
        ) : null}

        {hasResult ? (
          <section className="space-y-6">
            {/* Main overview card */}
            <div
              className="grid gap-0 overflow-hidden rounded-[28px] border lg:grid-cols-[150px_1fr_250px]"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,18,36,0.82), rgba(8,14,31,0.78))",
                borderColor: "rgba(120,160,255,0.20)",
                boxShadow: "0 28px 110px rgba(0,0,0,0.26)",
              }}
            >
              <div
                className="flex items-center justify-center border-b p-7 lg:border-b-0 lg:border-r"
                style={{ borderColor: "rgba(120,160,255,0.12)" }}
              >
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-[26px] border font-mono text-3xl font-bold"
                  style={{
                    background:
                      tld === "circle"
                        ? "radial-gradient(circle at 50% 28%, rgba(0,230,194,0.16), rgba(0,230,194,0.05) 52%, rgba(11,18,36,0.80) 100%)"
                        : "radial-gradient(circle at 50% 28%, rgba(37,99,255,0.20), rgba(37,99,255,0.06) 52%, rgba(11,18,36,0.80) 100%)",
                    borderColor:
                      tld === "circle"
                        ? "rgba(0,230,194,0.28)"
                        : "rgba(120,160,255,0.28)",
                    color:
                      tld === "circle"
                        ? "var(--arcns-teal)"
                        : "var(--arcns-cyan)",
                  }}
                >
                  .{tld ?? "arc"}
                </div>
              </div>

              <div className="min-w-0 p-7">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <h2
                    className="min-w-0 truncate text-4xl font-bold tracking-[-0.055em]"
                    style={{
                      color: "var(--arcns-text-primary)",
                      fontFamily: "var(--arcns-font-display)",
                    }}
                    title={queried}
                  >
                    {queried}
                  </h2>

                  {tld ? <TldBadge tld={tld} /> : null}

                  {expiryTs > 0n ? (
                    <span
                      className="rounded-[var(--arcns-radius-pill)] px-3 py-1 text-xs font-bold"
                      style={expiryStyle(expiryState)}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <DetailRow
                    label="Resolved Address"
                    value={
                      isLoading
                        ? "Loading..."
                        : hasAddr
                          ? shortAddress(addr!, 10, 8)
                          : isUnregistered
                            ? "Name not registered"
                            : "No receiving address set"
                    }
                    valueColor={
                      hasAddr
                        ? "var(--arcns-text-primary)"
                        : isUnregistered
                          ? "var(--arcns-danger)"
                          : "var(--arcns-text-muted)"
                    }
                    copyValue={hasAddr ? addr : undefined}
                    explorerHref={resolvedExplorerHref}
                  />

                  <DetailRow
                    label="Owner"
                    value={ownerAddress ? shortAddress(ownerAddress, 8, 6) : "Owner not available"}
                    valueColor={ownerAddress ? "var(--arcns-cyan)" : "var(--arcns-text-muted)"}
                    copyValue={ownerAddress}
                    explorerHref={ownerExplorerHref}
                  />

                  <DetailRow
                    label="Resolver"
                    value={shortAddress(ADDR_RESOLVER, 8, 6)}
                    valueColor="var(--arcns-cyan)"
                    copyValue={ADDR_RESOLVER}
                    explorerHref={`https://testnet.arcscan.app/address/${ADDR_RESOLVER}`}
                  />

                  <DetailRow
                    label="Protocol"
                    value="ArcNS · USDC-powered"
                    valueColor="var(--arcns-text-secondary)"
                  />

                  <DetailRow
                    label="Expires"
                    value={expiryTs > 0n ? formatExpiry(expiryTs) : "Not registered"}
                    valueColor={expiryTs > 0n ? "var(--arcns-text-primary)" : "var(--arcns-danger)"}
                  />

                  {isOwner && !hasAddr ? (
                    <div
                      className="mt-4 rounded-[var(--arcns-radius-md)] border px-4 py-3 text-sm"
                      style={{
                        background: "rgba(37,99,255,0.08)",
                        borderColor: "rgba(37,99,255,0.18)",
                        color: "var(--arcns-text-secondary)",
                      }}
                    >
                      You own this name, but it has no receiving address set.{" "}
                      <Link
                        href="/my-domains"
                        className="font-bold underline"
                        style={{ color: "var(--arcns-cyan)" }}
                      >
                        Go to My Domains →
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>

              <div
                className="flex flex-col justify-center gap-3 border-t p-7 lg:border-l lg:border-t-0"
                style={{ borderColor: "rgba(120,160,255,0.12)" }}
              >
                {hasAddr ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (addr) navigator.clipboard?.writeText(addr).catch(() => undefined);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-3 rounded-[var(--arcns-radius-lg)] border px-5 text-sm font-semibold"
                    style={{
                      background: "rgba(11,18,36,0.68)",
                      borderColor: "rgba(120,160,255,0.16)",
                      color: "var(--arcns-text-secondary)",
                    }}
                  >
                    <CopyGlyph />
                    Copy Address
                  </button>
                ) : null}

                {hasAddr ? (
                  <MiniAction href={`https://testnet.arcscan.app/address/${addr}`}>
                    Open in Explorer <ExternalIcon />
                  </MiniAction>
                ) : null}

                <MiniAction href={explorerTokenHref} variant="primary">
                  View NFT on ArcScan <ExternalIcon />
                </MiniAction>
              </div>
            </div>

            {/* Detail cards */}
            <div className="grid gap-5 lg:grid-cols-3">
              <div
                className="rounded-[24px] border p-6"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.72))",
                  borderColor: "rgba(120,160,255,0.18)",
                }}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                      style={{
                        background: "rgba(37,99,255,0.12)",
                        borderColor: "rgba(37,99,255,0.24)",
                        color: "var(--arcns-cyan)",
                      }}
                    >
                      <StackIcon />
                    </span>
                    <h3
                      className="text-xl font-bold"
                      style={{
                        color: "var(--arcns-text-primary)",
                        fontFamily: "var(--arcns-font-display)",
                      }}
                    >
                      Forward Record
                    </h3>
                  </div>

                  <span
                    className="inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: hasAddr ? "var(--arcns-green)" : "var(--arcns-text-muted)" }}
                  >
                    {hasAddr ? <StatusDot /> : null}
                    {hasAddr ? "Resolved" : "Not set"}
                  </span>
                </div>

                <p className="mb-3 text-sm" style={{ color: "var(--arcns-text-secondary)" }}>
                  {queried} resolves to:
                </p>

                <div
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--arcns-radius-lg)] border px-4"
                  style={{
                    background: "rgba(11,18,36,0.68)",
                    borderColor: "rgba(120,160,255,0.14)",
                  }}
                >
                  <p
                    className="min-w-0 truncate font-mono text-sm font-semibold"
                    style={{ color: hasAddr ? "var(--arcns-text-primary)" : "var(--arcns-text-muted)" }}
                    title={hasAddr ? addr : undefined}
                  >
                    {hasAddr ? shortAddress(addr!, 12, 10) : "No address record"}
                  </p>

                  {hasAddr ? <CopyButton value={addr!} aria-label="Copy resolved address" /> : null}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                    Record Type
                  </p>
                  <span
                    className="rounded-[var(--arcns-radius-pill)] border px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "rgba(120,160,255,0.08)",
                      borderColor: "rgba(120,160,255,0.16)",
                      color: "var(--arcns-text-secondary)",
                    }}
                  >
                    Address EVM
                  </span>
                </div>
              </div>

              <div
                className="rounded-[24px] border p-6"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.72))",
                  borderColor: "rgba(120,160,255,0.18)",
                }}
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                      style={{
                        background: "rgba(37,99,255,0.12)",
                        borderColor: "rgba(37,99,255,0.24)",
                        color: "#8FB3FF",
                      }}
                    >
                      <UserIcon />
                    </span>
                    <h3
                      className="text-xl font-bold"
                      style={{
                        color: "var(--arcns-text-primary)",
                        fontFamily: "var(--arcns-font-display)",
                      }}
                    >
                      Owner / Primary
                    </h3>
                  </div>

                  <span
                    className="inline-flex items-center gap-2 text-sm font-bold"
                    style={{ color: ownerAddress ? "var(--arcns-green)" : "var(--arcns-text-muted)" }}
                  >
                    {ownerAddress ? <StatusDot /> : null}
                    {ownerAddress ? "Verified" : "Unknown"}
                  </span>
                </div>

                <p className="mb-3 text-sm" style={{ color: "var(--arcns-text-secondary)" }}>
                  Registry owner for this name:
                </p>

                <div
                  className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--arcns-radius-lg)] border px-4"
                  style={{
                    background: "rgba(11,18,36,0.68)",
                    borderColor: "rgba(120,160,255,0.14)",
                  }}
                >
                  <p
                    className="min-w-0 truncate font-mono text-sm font-semibold"
                    style={{ color: ownerAddress ? "var(--arcns-text-primary)" : "var(--arcns-text-muted)" }}
                    title={ownerAddress}
                  >
                    {ownerAddress ? shortAddress(ownerAddress, 12, 10) : "Owner not available"}
                  </p>

                  {ownerAddress ? <CopyButton value={ownerAddress} aria-label="Copy owner address" /> : null}
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                    Connected wallet
                  </p>
                  <span
                    className="rounded-[var(--arcns-radius-pill)] border px-3 py-1 text-xs font-semibold"
                    style={{
                      background: isOwner ? "rgba(20,241,149,0.10)" : "rgba(120,160,255,0.08)",
                      borderColor: isOwner ? "rgba(20,241,149,0.22)" : "rgba(120,160,255,0.16)",
                      color: isOwner ? "var(--arcns-green)" : "var(--arcns-text-muted)",
                    }}
                  >
                    {isOwner ? "Owner" : "Not owner / unknown"}
                  </span>
                </div>
              </div>

              <div
                className="rounded-[24px] border p-6"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.72))",
                  borderColor: "rgba(120,160,255,0.18)",
                }}
              >
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                      background: "rgba(37,99,255,0.12)",
                      borderColor: "rgba(37,99,255,0.24)",
                      color: "var(--arcns-cyan)",
                    }}
                  >
                    <InfoIcon />
                  </span>
                  <h3
                    className="text-xl font-bold"
                    style={{
                      color: "var(--arcns-text-primary)",
                      fontFamily: "var(--arcns-font-display)",
                    }}
                  >
                    Domain Details
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      TLD
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
                      .{tld ?? "unsupported"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      Expires
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
                      {expiryTs > 0n ? formatExpiry(expiryTs) : "Not registered"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      Status
                    </p>
                    <span
                      className="rounded-[var(--arcns-radius-pill)] px-3 py-1 text-xs font-bold"
                      style={expiryTs > 0n ? expiryStyle(expiryState) : expiryStyle("expired")}
                    >
                      {isUnregistered ? "Not registered" : expiryTs > 0n ? badge.label : "Unknown"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      Registrar
                    </p>
                    <a
                      href={`https://testnet.arcscan.app/address/${registrar}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-bold"
                      style={{ color: "var(--arcns-cyan)" }}
                    >
                      ArcScan <ExternalIcon />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Raw records */}
            <div
              className="overflow-hidden rounded-[24px] border"
              style={{
                background:
                  "linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.72))",
                borderColor: "rgba(120,160,255,0.18)",
              }}
            >
              <div
                className="flex flex-col gap-4 border-b px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                style={{ borderColor: "rgba(120,160,255,0.12)" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl border"
                    style={{
                      background: "rgba(37,99,255,0.10)",
                      borderColor: "rgba(37,99,255,0.22)",
                      color: "#8FB3FF",
                    }}
                  >
                    <CodeIcon />
                  </span>
                  <div>
                    <h3
                      className="text-xl font-bold"
                      style={{
                        color: "var(--arcns-text-primary)",
                        fontFamily: "var(--arcns-font-display)",
                      }}
                    >
                      Raw Records
                    </h3>
                    <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
                      View deterministic on-chain identifiers for this name.
                    </p>
                  </div>
                </div>

                <MiniAction href={explorerTokenHref}>
                  View on Explorer <ExternalIcon />
                </MiniAction>
              </div>

              <div className="grid md:grid-cols-4">
                <RecordPill
                  label="address"
                  count={hasAddr ? "1 record" : "0 records"}
                  icon={<span className="text-lg">◎</span>}
                />
                <RecordPill
                  label="owner"
                  count={ownerAddress ? "1 record" : "0 records"}
                  icon={<UserIcon />}
                />
                <RecordPill
                  label="expiry"
                  count={expiryTs > 0n ? "1 record" : "0 records"}
                  icon={<InfoIcon />}
                />
                <RecordPill
                  label="namehash"
                  count="1 identifier"
                  icon={<CodeIcon />}
                />
              </div>

              <div
                className="border-t px-6 py-5"
                style={{ borderColor: "rgba(120,160,255,0.12)" }}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <p
                    className="text-xs font-bold uppercase tracking-[0.18em]"
                    style={{ color: "var(--arcns-text-muted)" }}
                  >
                    Namehash
                  </p>
                  <CopyButton value={node} aria-label="Copy namehash" />
                </div>

                <div
                  className="rounded-[var(--arcns-radius-lg)] border px-4 py-3"
                  style={{
                    background: "rgba(37,99,255,0.08)",
                    borderColor: "rgba(37,99,255,0.16)",
                  }}
                >
                  <p
                    className="break-all font-mono text-xs"
                    style={{ color: "var(--arcns-text-secondary)" }}
                  >
                    {node}
                  </p>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <FooterIdentityLine className="mt-16" />
      </main>
    </div>
  );
}