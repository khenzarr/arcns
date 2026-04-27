"use client";
/**
 * DomainCard.tsx — canonical ArcNS register/renew interaction surface.
 *
 * Wired exclusively to v3 hooks (Block 2). No v1/v2 imports.
 * All errors come through hook outputs (errors.ts-driven).
 * No ENS-branded strings.
 *
 * Handles:
 *   - Availability display
 *   - Price breakdown (base + premium)
 *   - USDC approval + registration flow (useRegistration)
 *   - Renewal flow (useRenew)
 *   - Primary name toggle (registration-time, optional, non-fatal)
 */

import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useAvailability }  from "../hooks/useAvailability";
import { useRegistration }  from "../hooks/useRegistration";
import { useRenew }         from "../hooks/useRenew";
import { USDC_CONTRACT, RESOLVER_CONTRACT, ADDR_RESOLVER, ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "../lib/contracts";
import { namehash } from "../lib/namehash";
import { DEPLOYED_CHAIN_ID } from "../lib/generated-contracts";
import {
  formatUSDC,
  withSlippage,
  DURATION_OPTIONS,
  getExpiryState,
  expiryBadge,
  formatExpiry,
  daysUntilExpiry,
  STATE_BADGES,
  type SupportedTLD,
  type NameState,
} from "../lib/normalization";
import { labelToTokenId } from "../lib/namehash";
import { registrarFor } from "../lib/contracts";

// ─── Sub-components ───────────────────────────────────────────────────────────

const DARK_BADGE_STYLES: Record<NameState, { bg: string; color: string; border?: string }> = {
  AVAILABLE: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)' },
  TAKEN:     { bg: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' },
  CHECKING:  { bg: 'rgba(37,99,235,0.15)',  color: '#58a6ff' },
  INVALID:   { bg: 'var(--color-error-surface)', color: 'var(--color-error)' },
};

function StateBadge({ state }: { state: NameState }) {
  const s = DARK_BADGE_STYLES[state];
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold ${state === 'CHECKING' ? 'animate-pulse' : ''}`}
      style={{
        background: s.bg,
        color: s.color,
        border: s.border ? `1px solid ${s.border}` : undefined,
      }}
    >
      {STATE_BADGES[state].label}
    </span>
  );
}

function PriceBreakdown({
  isPriceLoading, baseCost, premiumCost, totalCost, hasPremium, tierLabel,
}: {
  isPriceLoading: boolean;
  baseCost:       bigint;
  premiumCost:    bigint;
  totalCost:      bigint;
  hasPremium:     boolean;
  tierLabel:      string;
}) {
  if (isPriceLoading) {
    return (
      <div className="rounded-xl p-4 mb-4 space-y-2 animate-pulse" style={{ background: 'var(--color-surface-elevated)' }}>
        <div className="flex justify-between">
          <div className="h-4 rounded w-24" style={{ background: 'var(--color-surface-overlay)' }} />
          <div className="h-4 rounded w-16" style={{ background: 'var(--color-surface-overlay)' }} />
        </div>
        <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
          <div className="h-5 rounded w-12" style={{ background: 'var(--color-surface-overlay)' }} />
          <div className="h-5 rounded w-20" style={{ background: 'var(--color-surface-overlay)' }} />
        </div>
      </div>
    );
  }
  if (totalCost === 0n) return null;
  return (
    <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: 'var(--color-surface-elevated)' }}>
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--color-text-secondary)' }}>Base price</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }}>{tierLabel}</span>
        </div>
        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatUSDC(baseCost)}</span>
      </div>
      {hasPremium ? (
        <div className="flex justify-between text-sm">
          <span style={{ color: 'var(--color-accent-secondary)' }}>Premium (recently expired) <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>decays over 28 days</span></span>
          <span className="font-medium" style={{ color: 'var(--color-accent-secondary)' }}>+{formatUSDC(premiumCost)}</span>
        </div>
      ) : null}
      <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Total</span>
        <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{formatUSDC(totalCost)}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Paid in USDC · Arc Testnet</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface DomainCardProps {
  label:       string;
  tld:         SupportedTLD;
  isCommitted?: boolean;
}

export default function DomainCard({ label, tld, isCommitted = false }: DomainCardProps) {
  const { address, isConnected } = useAccount();
  const walletChainId = useAccount().chainId;
  const isWrongNetwork = isConnected && walletChainId !== DEPLOYED_CHAIN_ID;
  const [duration,    setDuration]    = useState(BigInt(DURATION_OPTIONS[0].seconds));
  const [reverseRecord, setReverseRecord] = useState(true);
  const [checkPhase,  setCheckPhase]  = useState<0 | 1 | 2>(0);

  // Time-gated loading phase to suppress flicker
  useEffect(() => {
    setCheckPhase(0);
    if (!isCommitted) return;
    const t1 = setTimeout(() => setCheckPhase(1), 300);
    const t2 = setTimeout(() => setCheckPhase(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [label, tld, isCommitted]);

  // ── v3 hooks ───────────────────────────────────────────────────────────────
  const {
    nameState, baseCost, premiumCost, totalCost, hasPremium, tierLabel,
    isPriceLoading, refetch: refetchAvail,
  } = useAvailability(label, tld, duration);

  const reg  = useRegistration();
  const renew = useRenew();

  // ── USDC allowance check ───────────────────────────────────────────────────
  const maxCost = withSlippage(totalCost);
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    ...USDC_CONTRACT,
    functionName: "allowance",
    args:         address ? [address, tld === "arc" ? ADDR_ARC_CONTROLLER : ADDR_CIRCLE_CONTROLLER] : undefined,
    query: { enabled: !!address && totalCost > 0n, staleTime: 10_000 },
  });
  const allowance    = (allowanceData as bigint | undefined) ?? 0n;
  const needsApproval = allowance < maxCost;

  // ── USDC balance check ─────────────────────────────────────────────────────
  const { data: balanceData } = useReadContract({
    ...USDC_CONTRACT,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    query: { enabled: !!address, staleTime: 15_000 },
  });
  const balance   = (balanceData as bigint | undefined) ?? 0n;
  const sufficient = balance >= totalCost;
  const shortfall  = totalCost > balance ? totalCost - balance : 0n;

  // ── Expiry (for TAKEN names) ───────────────────────────────────────────────
  const tokenId = labelToTokenId(label);
  const reg2    = registrarFor(tld);
  const { data: expiryData, refetch: refetchExpiry } = useReadContract({
    ...reg2,
    functionName: "nameExpires",
    args:         [tokenId],
    query: { enabled: nameState === "TAKEN", staleTime: 0, refetchOnWindowFocus: false },
  });
  const expiryTs    = (expiryData as bigint | undefined) ?? 0n;
  const expiryState = getExpiryState(expiryTs);
  const badge       = expiryBadge(expiryState);

  // Refetch expiry after successful renewal
  useEffect(() => {
    if (renew.step === "success") {
      refetchExpiry();
      refetchAvail();
    }
  }, [renew.step]);

  // ── Active step (registration or renewal) ─────────────────────────────────
  const activeStep = reg.step !== "idle" && reg.step !== "failed" ? reg.step
    : renew.step !== "idle" && renew.step !== "failed" ? renew.step
    : null;

  const activeError = reg.error ?? renew.error ?? null;

  // ── Post-registration addr confirmation polling ────────────────────────────
  // Poll addr(node) after registration succeeds to confirm forward resolution.
  // Only active when reg.step === "success" and a result is available.
  const POLL_INTERVAL_MS = 2000;
  const POLL_TIMEOUT_MS  = 15_000;
  const pollStartTime = useRef<number | null>(null);
  const [addrTimedOut, setAddrTimedOut] = useState(false);

  const successFullName = reg.result ? `${reg.result.name}.${reg.result.tld}` : "";
  const successNode = successFullName ? namehash(successFullName) as `0x${string}` : undefined;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  // Reset poll state when registration resets
  useEffect(() => {
    if (reg.step === "idle") {
      pollStartTime.current = null;
      setAddrTimedOut(false);
    }
    if (reg.step === "success") {
      pollStartTime.current = Date.now();
      setAddrTimedOut(false);
    }
  }, [reg.step]);

  const { data: successAddr, isFetched: successAddrFetched } = useReadContract({
    ...RESOLVER_CONTRACT,
    functionName: "addr",
    args: successNode ? [successNode] : undefined,
    query: {
      enabled: reg.step === "success" && !!successNode,
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchInterval: () => {
        if (addrTimedOut || reg.step !== "success") return false;
        if (
          successAddr &&
          address &&
          (successAddr as string).toLowerCase() === address.toLowerCase()
        ) return false;
        if (pollStartTime.current && Date.now() - pollStartTime.current > POLL_TIMEOUT_MS) {
          setAddrTimedOut(true);
          return false;
        }
        return POLL_INTERVAL_MS;
      },
    },
  });

  const resolvedToWallet =
    reg.step === "success" &&
    successAddrFetched &&
    !!successAddr &&
    (successAddr as string) !== ZERO_ADDRESS &&
    !!address &&
    (successAddr as string).toLowerCase() === address.toLowerCase();

  return (
    <div
      className="rounded-2xl border p-6 transition-colors"
      style={{
        background: 'var(--color-surface-card)',
        borderColor: nameState === 'AVAILABLE' ? 'var(--color-border-accent)' : 'var(--color-border-subtle)',
      }}
    >

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {label}<span style={{ color: 'var(--color-text-accent)' }}>.{tld}</span>
          </h2>
          {nameState === "TAKEN" && expiryTs > 0n ? (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {expiryState === "active" || expiryState === "expiring-soon"
                ? `Expires ${formatExpiry(expiryTs)}`
                : expiryState === "grace"
                ? `Grace period — expired ${formatExpiry(expiryTs)}`
                : `Expired ${formatExpiry(expiryTs)}`}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {nameState === "CHECKING" && checkPhase === 0 ? null : <StateBadge state={nameState} />}
          {nameState === "TAKEN" && expiryTs > 0n ? (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: expiryState === 'expiring-soon' || expiryState === 'grace'
                  ? 'var(--color-warning-surface)'
                  : expiryState === 'expired'
                    ? 'var(--color-error-surface)'
                    : 'var(--color-surface-overlay)',
                color: expiryState === 'expiring-soon' || expiryState === 'grace'
                  ? 'var(--color-warning)'
                  : expiryState === 'expired'
                    ? 'var(--color-error)'
                    : 'var(--color-text-secondary)',
              }}
            >
              {badge.label}{expiryState === "expiring-soon" ? ` · ${daysUntilExpiry(expiryTs)}d` : ""}
            </span>
          ) : null}
          {hasPremium ? (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent-secondary)', borderColor: 'rgba(99,102,241,0.3)' }}
            >
              Premium Name
            </span>
          ) : null}
        </div>
      </div>

      {/* Duration selector */}
      {nameState !== "INVALID" ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-secondary)' }}>Registration period</p>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.seconds}
                onClick={() => setDuration(BigInt(opt.seconds))}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={duration === BigInt(opt.seconds)
                  ? { background: 'var(--color-accent-primary)', color: '#fff' }
                  : { background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Price breakdown */}
      {(nameState === "AVAILABLE" || nameState === "TAKEN") ? (
        <PriceBreakdown
          isPriceLoading={isPriceLoading}
          baseCost={baseCost}
          premiumCost={premiumCost}
          totalCost={totalCost}
          hasPremium={hasPremium}
          tierLabel={tierLabel}
        />
      ) : null}

      {/* Balance warning */}
      {isConnected && nameState === "AVAILABLE" && !isPriceLoading && !sufficient && totalCost > 0n ? (
        <div
          className="rounded-xl p-3 mb-4 flex items-start gap-2 border"
          style={{ background: 'var(--color-error-surface)', borderColor: 'var(--color-error-border)' }}
        >
          <span className="text-lg leading-none" style={{ color: 'var(--color-error)' }}>⚠</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>Insufficient USDC balance</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>
              You need {formatUSDC(shortfall)} more.{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-error)' }}>
                Get testnet USDC →
              </a>
            </p>
          </div>
        </div>
      ) : null}

      {/* Primary name toggle — optional, non-fatal */}
      {nameState === "AVAILABLE" ? (
        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reverseRecord}
            onChange={e => setReverseRecord(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Set as primary name</span>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Maps your wallet address to this name (optional — can be set later)</p>
          </div>
        </label>
      ) : null}

      {/* Action area */}
      {nameState === "INVALID" ? (
        <div className="text-center py-3 text-sm rounded-xl" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-tertiary)' }}>
          Enter a valid name (letters, numbers, hyphens, underscores)
        </div>

      ) : nameState === "CHECKING" ? (
        checkPhase === 0 ? <div className="py-3" /> :
        checkPhase === 1 ? (
          <div className="text-center py-3 text-sm rounded-xl" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-tertiary)' }}>Validating…</div>
        ) : (
          <div className="text-center py-3 text-sm rounded-xl animate-pulse" style={{ background: 'rgba(37,99,235,0.1)', color: '#58a6ff' }}>
            Checking availability on Arc Testnet…
          </div>
        )

      ) : nameState === "AVAILABLE" ? (
        !isConnected ? (
          <div className="text-center py-3 text-sm rounded-xl" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)' }}>Connect wallet to register</div>
        ) : isWrongNetwork ? (
          <div className="text-center py-3 text-sm rounded-xl font-medium" style={{ background: 'var(--color-error-surface)', color: 'var(--color-error)' }}>
            ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to register
          </div>
        ) : isPriceLoading ? (
          <button disabled className="w-full py-3.5 text-white rounded-xl font-semibold opacity-50 cursor-not-allowed text-sm" style={{ background: 'var(--color-accent-primary)' }}>
            Loading price…
          </button>
        ) : (
          <button
            onClick={() => reg.register({ label, tld, duration, totalCost, resolverAddr: ADDR_RESOLVER, reverseRecord })}
            disabled={(reg.step !== "idle" && reg.step !== "failed") || !sufficient || isPriceLoading}
            className="w-full py-3.5 text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90 text-sm"
            style={{ background: 'var(--color-accent-primary)' }}
          >
            {reg.step === "approving"   ? "Approving USDC…"
            : reg.step === "committing" ? "Submitting commitment…"
            : reg.step === "waiting"    ? `Waiting… ${reg.waitProgress}%`
            : reg.step === "ready"      ? "Ready to register…"
            : reg.step === "registering"? "Registering on-chain…"
            : reg.step === "success"    ? "✓ Registered!"
            : `Register ${label}.${tld} · ${formatUSDC(totalCost)}`}
          </button>
        )

      ) : /* TAKEN */ (
        expiryState === "active" || expiryState === "expiring-soon" || expiryState === "grace" ? (
          !isConnected ? (
            <div className="text-center py-3 text-sm rounded-xl" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)' }}>Connect wallet to renew</div>
          ) : isWrongNetwork ? (
            <div className="text-center py-3 text-sm rounded-xl font-medium" style={{ background: 'var(--color-error-surface)', color: 'var(--color-error)' }}>
              ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to renew
            </div>
          ) : (
            <button
              onClick={() => renew.renew({ label, tld, duration, totalCost })}
              disabled={renew.step === "approving" || renew.step === "renewing" || !sufficient || isPriceLoading}
              className="w-full py-3.5 text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity hover:opacity-90 text-sm"
              style={{ background: 'var(--color-warning)' }}
            >
              {renew.step === "approving" ? "Approving USDC…"
              : renew.step === "renewing" ? "Renewing…"
              : renew.step === "success"  ? "✓ Renewed!"
              : isPriceLoading ? `Renew ${label}.${tld} · Loading…`
              : `Renew ${label}.${tld} · ${formatUSDC(totalCost)}`}
            </button>
          )
        ) : (
          <div className="text-center py-3 text-sm rounded-xl" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-secondary)' }}>This name is taken</div>
        )
      )}

      {/* Progress bar (waiting phase) */}
      {reg.step === "waiting" ? (
        <div className="mt-3">
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'var(--color-surface-overlay)' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-1000"
              style={{ background: 'var(--color-accent-primary)', width: `${reg.waitProgress}%` }}
            />
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Anti-frontrun protection — waiting for on-chain maturity</p>
        </div>
      ) : null}

      {/* Error display */}
      {activeError ? (
        <div className="mt-3 text-sm rounded-xl p-3 flex items-start gap-2 border" style={{ background: 'var(--color-error-surface)', borderColor: 'var(--color-error-border)', color: 'var(--color-error)' }}>
          <span>⚠</span>
          <span>{activeError}</span>
        </div>
      ) : null}

      {/* Success state */}
      {reg.step === "success" && reg.result ? (
        <div className="mt-3 text-sm rounded-xl p-3 flex items-start gap-2 border" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }}>
          <span>✓</span>
          <div>
            <p className="font-medium">{reg.result.name}.{reg.result.tld} registered!</p>
            {resolvedToWallet && address ? (
              <p className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>
                This name now resolves to{" "}
                <span className="font-mono break-all">{address}</span>
              </p>
            ) : null}
            <button onClick={reg.reset} className="text-xs underline mt-1" style={{ color: 'var(--color-success)' }}>Register another</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
