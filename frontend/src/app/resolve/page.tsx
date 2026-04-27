"use client";
/**
 * resolve/page.tsx — ArcNS name resolution page.
 *
 * Wired exclusively to v3 hooks and lib.
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
import { useReceivingAddress } from "../../hooks/useReceivingAddress";

// ─── Forward resolution via publicClient ──────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResolvePage() {
  const [domain,  setDomain]  = useState("");
  const [queried, setQueried] = useState("");

  const { address: connectedAddress } = useAccount();

  const { data: resolvedAddr, isLoading } = useResolveAddress(queried);

  const parts     = queried.split(".");
  const label     = parts[0] ?? "";
  const rawTld    = parts[1] ?? "";
  const tld       = (rawTld === "arc" || rawTld === "circle") ? rawTld as SupportedTLD : null;
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

  const handleResolve = () => setQueried(domain.trim().toLowerCase());
  const nodeBytes     = queried ? namehash(queried) as `0x${string}` : undefined;
  const node          = queried ? namehash(queried) : "";
  const hasResult     = !!queried && queried.includes(".");
  const addr          = resolvedAddr as string | undefined;
  const hasAddr       = addr && addr !== "0x0000000000000000000000000000000000000000";
  const isUnregistered = hasResult && !isLoading && expiryTs === 0n;

  // ── Registry owner read (enabled only when queried and wallet connected) ──
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

  // ── useReceivingAddress for inline CTA ────────────────────────────────────
  const {
    setStep: addrSetStep,
    setError: addrSetError,
    setReceivingAddress,
    resetSet: resetAddrSet,
  } = useReceivingAddress(nodeBytes, { enabled: !!nodeBytes && !hasAddr && isOwner });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>Resolve</h1>
        <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Look up any ArcNS name</p>
      </div>

      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleResolve()}
            placeholder="alice.arc"
            className="flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-0"
            style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)', color: 'var(--color-text-primary)' }}
          />
          <button
            onClick={handleResolve}
            className="px-6 py-3 text-white rounded-xl font-semibold transition-opacity hover:opacity-90 text-sm"
            style={{ background: 'var(--color-accent-primary)' }}
          >
            Resolve
          </button>
        </div>

        {hasResult && (
          <div className="space-y-3">
            {/* Resolved address */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--color-surface-elevated)' }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Resolved Address
              </p>
              {isLoading ? (
                <div className="h-5 rounded animate-pulse w-3/4" style={{ background: 'var(--color-surface-overlay)' }} />
              ) : hasAddr ? (
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm break-all" style={{ color: 'var(--color-text-primary)' }}>{addr}</p>
                  <a
                    href={`https://testnet.arcscan.app/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs shrink-0 hover:underline"
                    style={{ color: 'var(--color-text-accent)' }}
                  >↗</a>
                </div>
              ) : isUnregistered ? (
                <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>Name not registered</p>
              ) : (
                <div>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>No receiving address set</p>
                  {isOwner && addrSetStep !== "success" && (
                    <div className="mt-2">
                      <button
                        onClick={() => connectedAddress && setReceivingAddress(connectedAddress)}
                        disabled={addrSetStep === "setting" || !connectedAddress}
                        className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--color-accent-primary)', color: '#fff' }}
                      >
                        {addrSetStep === "setting" ? "Setting…" : "Set to connected wallet"}
                      </button>
                      {addrSetError && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>
                          {addrSetError}
                          <button onClick={resetAddrSet} className="ml-2 underline" style={{ color: 'var(--color-error)' }}>Retry</button>
                        </p>
                      )}
                    </div>
                  )}
                  {isOwner && addrSetStep === "success" && (
                    <div className="mt-2 rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}>
                      ✓ Receiving address set to your connected wallet.
                      <button onClick={resetAddrSet} className="ml-2 underline" style={{ color: 'var(--color-success)' }}>Dismiss</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expiry + status */}
            {expiryTs > 0n && (
              <div
                className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: 'var(--color-surface-elevated)' }}
              >
                <div>
                  <p
                    className="text-xs font-semibold uppercase tracking-wide mb-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >Expiry</p>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{formatExpiry(expiryTs)}</p>
                </div>
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
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
              </div>
            )}

            {/* Namehash */}
            <div
              className="rounded-xl p-4"
              style={{ background: 'var(--color-surface-elevated)' }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1.5"
                style={{ color: 'var(--color-text-tertiary)' }}
              >Namehash</p>
              <p className="font-mono text-xs break-all" style={{ color: 'var(--color-text-secondary)' }}>{node}</p>
            </div>

            {/* ArcScan link */}
            {hasAddr && (
              <a
                href={`https://testnet.arcscan.app/token/${registrar}?a=${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm py-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--color-text-accent)' }}
              >
                View NFT on ArcScan ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
