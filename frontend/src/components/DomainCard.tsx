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
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useAvailability }  from "../hooks/useAvailability";
import { useRegistration }  from "../hooks/useRegistration";
import { useRenew }         from "../hooks/useRenew";
import { usePrimaryName }   from "../hooks/usePrimaryName";
import { USDC_CONTRACT, RESOLVER_CONTRACT, ADDR_RESOLVER, ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "../lib/contracts";
import { namehash } from "../lib/namehash";
import { clearPrevPrimaryAddr } from "../lib/clearPrevPrimaryAddr";
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

// Updated to ArcNS brand palette — logic unchanged
const DARK_BADGE_STYLES: Record<NameState, { bg: string; color: string; border?: string }> = {
  AVAILABLE: { bg: 'rgba(20, 241, 149, 0.12)', color: '#14F195', border: 'rgba(20,241,149,0.28)' },
  TAKEN:     { bg: 'rgba(100,112,132,0.12)',   color: 'var(--arcns-text-secondary)' },
  CHECKING:  { bg: 'rgba(37, 99, 255, 0.12)',  color: '#8FB3FF' },
  INVALID:   { bg: 'rgba(255,92,122,0.10)',    color: '#FF5C7A' },
};

function StateBadge({ state }: { state: NameState }) {
  const s = DARK_BADGE_STYLES[state];
  return (
    <span
      className={`px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold ${state === 'CHECKING' ? 'animate-pulse' : ''}`}
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
      <div className="rounded-[var(--arcns-radius-lg)] p-4 mb-4 space-y-2 animate-pulse" style={{ background: 'var(--arcns-bg-elevated)' }}>
        <div className="flex justify-between">
          <div className="h-4 rounded w-24" style={{ background: 'rgba(120,160,255,0.08)' }} />
          <div className="h-4 rounded w-16" style={{ background: 'rgba(120,160,255,0.08)' }} />
        </div>
        <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--arcns-border-default)' }}>
          <div className="h-5 rounded w-12" style={{ background: 'rgba(120,160,255,0.08)' }} />
          <div className="h-5 rounded w-20" style={{ background: 'rgba(120,160,255,0.08)' }} />
        </div>
      </div>
    );
  }
  if (totalCost === 0n) return null;
  return (
    <div className="rounded-[var(--arcns-radius-lg)] p-4 mb-4 space-y-2" style={{ background: 'var(--arcns-bg-elevated)', border: '1px solid var(--arcns-border-default)' }}>
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--arcns-text-secondary)' }}>Base price</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(120,160,255,0.08)', color: 'var(--arcns-text-muted)' }}>{tierLabel}</span>
        </div>
        <span className="font-medium" style={{ color: 'var(--arcns-text-primary)' }}>{formatUSDC(baseCost)}</span>
      </div>
      {hasPremium ? (
        <div className="flex justify-between text-sm">
          <span style={{ color: '#8B5CF6' }}>Premium (recently expired) <span className="text-xs" style={{ color: 'var(--arcns-text-muted)' }}>decays over 28 days</span></span>
          <span className="font-medium" style={{ color: '#8B5CF6' }}>+{formatUSDC(premiumCost)}</span>
        </div>
      ) : null}
      <div className="border-t pt-2 flex justify-between" style={{ borderColor: 'var(--arcns-border-default)' }}>
        <span className="font-semibold" style={{ color: 'var(--arcns-text-secondary)' }}>Total</span>
        <span className="font-bold text-lg" style={{ color: 'var(--arcns-text-primary)' }}>{formatUSDC(totalCost)}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--arcns-text-muted)' }}>Paid in USDC · Arc Testnet</p>
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

  // Read current primary name so we can clear its addr if the user registers
  // a new name with "Set as primary name" checked (registration-time switching).
  // This mirrors the clearing logic in usePrimaryName.setPrimaryName.
  const { primaryName: currentPrimaryName } = usePrimaryName(address);

  // writeContractAsync for the post-registration clearing step
  const { writeContractAsync } = useWriteContract();

  // Snapshot the previous primary name at the moment the user clicks Register.
  // Stored in a ref so it survives across the async registration flow.
  const prevPrimaryAtRegRef = useRef<string | null>(null);
  const clearAttemptedRef   = useRef(false);

  const handleRegister = () => {
    if (reverseRecord) {
      // Capture the current primary name before registration changes it on-chain
      prevPrimaryAtRegRef.current = currentPrimaryName;
    } else {
      prevPrimaryAtRegRef.current = null;
    }
    clearAttemptedRef.current = false;
    reg.register({ label, tld, duration, totalCost, resolverAddr: reverseRecord ? ADDR_RESOLVER : ZERO_ADDRESS, reverseRecord });
  };

  // After registration succeeds with reverseRecord=true, attempt to clear the
  // previous primary name's addr (best-effort, owner-guarded).
  // Uses the shared clearPrevPrimaryAddr utility — same logic as usePrimaryName.
  useEffect(() => {
    if (
      reg.step !== "success" ||
      !reverseRecord ||
      clearAttemptedRef.current ||
      !prevPrimaryAtRegRef.current ||
      !reg.result ||
      !address
    ) return;

    const newFullName = `${reg.result.name}.${reg.result.tld}`;
    const prevPrimary = prevPrimaryAtRegRef.current;
    clearAttemptedRef.current = true;

    // Non-blocking — registration success is already confirmed, clearing is best-effort
    clearPrevPrimaryAddr(prevPrimary, newFullName, address, writeContractAsync).catch(() => {});
  }, [reg.step, reverseRecord, address, reg.result, writeContractAsync]);

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

  // ── Ownership check (for TAKEN names, connected wallet only) ──────────────
  const reg3 = registrarFor(tld);
  const {
    data: ownerData,
    isLoading: isOwnerLoading,
  } = useReadContract({
    ...reg3,
    functionName: "ownerOf",
    args:         [tokenId],
    query: {
      enabled: nameState === "TAKEN"
               && isConnected
               && !isWrongNetwork
               && (expiryState === "active" || expiryState === "expiring-soon" || expiryState === "grace"),
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  });
  const isOwner =
    !!address &&
    !!ownerData &&
    (ownerData as string).toLowerCase() === address.toLowerCase();

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
      className="arcns-glass rounded-[var(--arcns-radius-xl)] p-6 transition-all duration-200"
      style={{
        borderColor: nameState === 'AVAILABLE'
          ? 'var(--arcns-border-strong)'
          : 'var(--arcns-border-default)',
        boxShadow: nameState === 'AVAILABLE'
          ? 'var(--arcns-shadow-glow-soft)'
          : undefined,
      }}
    >

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--arcns-text-primary)', fontFamily: 'var(--arcns-font-display)' }}
          >
            {label}<span className="arcns-gradient-text">.{tld}</span>
          </h2>
          {nameState === "TAKEN" && expiryTs > 0n ? (
            <p className="text-sm mt-1" style={{ color: 'var(--arcns-text-secondary)' }}>
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
              className="px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold"
              style={{
                background: expiryState === 'expiring-soon' || expiryState === 'grace'
                  ? 'rgba(251,191,36,0.12)'
                  : expiryState === 'expired'
                    ? 'rgba(255,92,122,0.12)'
                    : 'rgba(100,112,132,0.12)',
                color: expiryState === 'expiring-soon' || expiryState === 'grace'
                  ? 'var(--arcns-warning)'
                  : expiryState === 'expired'
                    ? 'var(--arcns-danger)'
                    : 'var(--arcns-text-secondary)',
              }}
            >
              {badge.label}{expiryState === "expiring-soon" ? ` · ${daysUntilExpiry(expiryTs)}d` : ""}
            </span>
          ) : null}
          {hasPremium ? (
            <span
              className="px-3 py-1 rounded-[var(--arcns-radius-pill)] text-xs font-semibold border"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#A78BFA', borderColor: 'rgba(99,102,241,0.28)' }}
            >
              Premium Name
            </span>
          ) : null}
        </div>
      </div>

      {/* Duration selector */}
      {nameState !== "INVALID" ? (
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--arcns-text-muted)' }}>Registration period</p>
          <div className="flex gap-2 flex-wrap">
            {DURATION_OPTIONS.map(opt => (
              <button
                key={opt.seconds}
                onClick={() => setDuration(BigInt(opt.seconds))}
                className="px-4 py-2 rounded-[var(--arcns-radius-sm)] text-sm font-medium transition-all duration-150"
                style={duration === BigInt(opt.seconds)
                  ? { background: 'var(--arcns-gradient-primary)', color: '#fff' }
                  : { background: 'rgba(120,160,255,0.06)', color: 'var(--arcns-text-secondary)', border: '1px solid var(--arcns-border-default)' }
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
          className="rounded-[var(--arcns-radius-lg)] p-3 mb-4 flex items-start gap-2 border"
          style={{ background: 'rgba(255,92,122,0.08)', borderColor: 'rgba(255,92,122,0.24)' }}
        >
          <span className="text-lg leading-none" style={{ color: 'var(--arcns-danger)' }}>⚠</span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--arcns-danger)' }}>Insufficient USDC balance</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--arcns-danger)' }}>
              You need {formatUSDC(shortfall)} more.{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--arcns-danger)' }}>
                Get testnet USDC →
              </a>
            </p>
          </div>
        </div>
      ) : null}

      {/* Primary name toggle — optional, non-fatal — logic UNCHANGED */}
      {nameState === "AVAILABLE" ? (
        <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={reverseRecord}
            onChange={e => setReverseRecord(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
          />
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--arcns-text-primary)' }}>Set as primary name</span>
            <p className="text-xs" style={{ color: 'var(--arcns-text-muted)' }}>Maps your wallet address to this name (optional — can be set later)</p>
          </div>
        </label>
      ) : null}

      {/* Action area — all handlers UNCHANGED */}
      {nameState === "INVALID" ? (
        <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)]" style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-muted)' }}>
          Enter a valid name (letters, numbers, hyphens, underscores)
        </div>

      ) : nameState === "CHECKING" ? (
        checkPhase === 0 ? <div className="py-3" /> :
        checkPhase === 1 ? (
          <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)]" style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-muted)' }}>Validating…</div>
        ) : (
          <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)] animate-pulse" style={{ background: 'rgba(37,99,255,0.08)', color: '#8FB3FF' }}>
            Checking availability on Arc Testnet…
          </div>
        )

      ) : nameState === "AVAILABLE" ? (
        !isConnected ? (
          <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)]" style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-secondary)' }}>Connect wallet to register</div>
        ) : isWrongNetwork ? (
          <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)] font-medium" style={{ background: 'rgba(255,92,122,0.08)', color: 'var(--arcns-danger)' }}>
            ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to register
          </div>
        ) : isPriceLoading ? (
          <button disabled className="w-full py-3.5 text-white rounded-[var(--arcns-radius-lg)] font-semibold opacity-50 cursor-not-allowed text-sm" style={{ background: 'var(--arcns-gradient-primary)' }}>
            Loading price…
          </button>
        ) : (
          <button
            onClick={handleRegister}
            disabled={(reg.step !== "idle" && reg.step !== "failed") || !sufficient || isPriceLoading}
            className="w-full py-3.5 text-white rounded-[var(--arcns-radius-lg)] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 hover:opacity-90 active:scale-[0.99] text-sm"
            style={{ background: 'var(--arcns-gradient-primary)' }}
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
            <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)]" style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-secondary)' }}>Connect wallet to renew</div>
          ) : isWrongNetwork ? (
            <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)] font-medium" style={{ background: 'rgba(255,92,122,0.08)', color: 'var(--arcns-danger)' }}>
              ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to renew
            </div>
          ) : isOwnerLoading ? (
            <button
              disabled
              className="w-full py-3.5 text-white rounded-[var(--arcns-radius-lg)] font-semibold opacity-50 cursor-not-allowed text-sm"
              style={{ background: 'rgba(251,191,36,0.80)' }}
            >
              Checking ownership…
            </button>
          ) : !isOwner ? (
            <div
              role="button"
              aria-disabled="true"
              className="w-full py-3 text-center text-sm rounded-[var(--arcns-radius-lg)] cursor-not-allowed"
              style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-secondary)' }}
            >
              This name is owned by another wallet — only the owner can renew.
            </div>
          ) : (
            <button
              onClick={() => renew.renew({ label, tld, duration, totalCost })}
              disabled={renew.step === "approving" || renew.step === "renewing" || !sufficient || isPriceLoading}
              className="w-full py-3.5 text-white rounded-[var(--arcns-radius-lg)] font-semibold disabled:opacity-50 transition-all duration-150 hover:opacity-90 active:scale-[0.99] text-sm"
              style={{ background: 'var(--arcns-warning)' }}
            >
              {renew.step === "approving" ? "Approving USDC…"
              : renew.step === "renewing" ? "Renewing…"
              : renew.step === "success"  ? "✓ Renewed!"
              : isPriceLoading ? `Renew ${label}.${tld} · Loading…`
              : `Renew ${label}.${tld} · ${formatUSDC(totalCost)}`}
            </button>
          )
        ) : (
          <div className="text-center py-3 text-sm rounded-[var(--arcns-radius-lg)]" style={{ background: 'var(--arcns-bg-elevated)', color: 'var(--arcns-text-secondary)' }}>This name is taken</div>
        )
      )}

      {/* Progress bar (waiting phase) — logic UNCHANGED */}
      {reg.step === "waiting" ? (
        <div className="mt-3">
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(120,160,255,0.08)' }}>
            <div
              className="h-1.5 rounded-full transition-all duration-1000"
              style={{ background: 'var(--arcns-gradient-primary)', width: `${reg.waitProgress}%` }}
            />
          </div>
          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--arcns-text-muted)' }}>Anti-frontrun protection — waiting for on-chain maturity</p>
        </div>
      ) : null}

      {/* Error display */}
      {activeError ? (
        <div className="mt-3 text-sm rounded-[var(--arcns-radius-lg)] p-3 flex items-start gap-2 border" style={{ background: 'rgba(255,92,122,0.08)', borderColor: 'rgba(255,92,122,0.24)', color: 'var(--arcns-danger)' }}>
          <span>⚠</span>
          <span>{activeError}</span>
        </div>
      ) : null}

      {/* Success state */}
      {reg.step === "success" && reg.result ? (
        <div className="mt-3 text-sm rounded-[var(--arcns-radius-lg)] p-3 flex items-start gap-2 border" style={{ background: 'rgba(20,241,149,0.08)', borderColor: 'rgba(20,241,149,0.24)', color: 'var(--arcns-green)' }}>
          <span>✓</span>
          <div>
            <p className="font-medium">{reg.result.name}.{reg.result.tld} registered!</p>
            {reverseRecord && resolvedToWallet && address ? (
              <p className="text-xs mt-1" style={{ color: 'var(--arcns-green)' }}>
                This name is now active for receiving transfers.
              </p>
            ) : null}
            <button onClick={reg.reset} className="text-xs underline mt-1" style={{ color: 'var(--arcns-green)' }}>Register another</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
