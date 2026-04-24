"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  useNameExpiry, useRenewal,
} from "../hooks/useArcNS";
import { useRegistrationPipeline } from "../hooks/useRegistrationPipeline";
import { useDomainResolutionPipeline } from "../hooks/useDomainResolutionPipeline";
import { CONTRACTS, getPriceTier } from "../lib/contracts";
import {
  formatUSDC, DURATION_OPTIONS, getExpiryState, expiryBadge,
  formatExpiry, daysUntilExpiry,
} from "../lib/namehash";
import { STATE_BADGES, type NameState } from "../lib/domain";
import SuccessModal from "./SuccessModal";

// ─── PriceBreakdown ───────────────────────────────────────────────────────────

interface PriceBreakdownProps {
  isPriceLoading: boolean;
  baseCost: bigint;
  premiumCost: bigint;
  totalCost: bigint;
  hasPremium: boolean;
  tierLabel: string;
  gasEstimateEth?: string | null;
}

function PriceBreakdown({
  isPriceLoading, baseCost, premiumCost, totalCost, hasPremium, tierLabel, gasEstimateEth,
}: PriceBreakdownProps): JSX.Element | null {
  // Loading skeleton — never show $0.00
  if (isPriceLoading) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between">
          <div className="h-5 bg-gray-200 rounded w-12" />
          <div className="h-5 bg-gray-200 rounded w-20" />
        </div>
      </div>
    );
  }

  // Real price — only render when totalCost > 0
  if (totalCost === 0n) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Base price</span>
          <span className="text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{tierLabel}</span>
        </div>
        <span className="font-medium text-gray-900">{formatUSDC(baseCost)}</span>
      </div>
      {hasPremium ? (
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-purple-600">Premium (recently expired)</span>
            <span className="text-xs text-gray-400">decays over 28 days</span>
          </div>
          <span className="font-medium text-purple-600">+{formatUSDC(premiumCost)}</span>
        </div>
      ) : null}
      <div className="border-t border-gray-200 pt-2 flex justify-between">
        <span className="font-semibold text-gray-700">Total</span>
        <span className="font-bold text-gray-900 text-lg">{formatUSDC(totalCost)}</span>
      </div>
      {gasEstimateEth ? (
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Est. gas</span>
          <span className="text-gray-500">~{gasEstimateEth} ETH</span>
        </div>
      ) : null}
      <p className="text-xs text-gray-400">Paid in USDC · Arc Testnet</p>
    </div>
  );
}

// ─── StateBadge ───────────────────────────────────────────────────────────────

function StateBadge({ state }: { state: NameState }): JSX.Element {
  const cfg = STATE_BADGES[state];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.className} ${cfg.pulse ? "animate-pulse" : ""}`}>
      {cfg.label}
    </span>
  );
}

// ─── DomainCard ───────────────────────────────────────────────────────────────

interface DomainCardProps {
  label: string;
  tld: "arc" | "circle";
  /** True once the debounce has fired and the RPC call has been triggered */
  isCommitted?: boolean;
}

export default function DomainCard({ label, tld, isCommitted = false }: DomainCardProps): JSX.Element {
  const { isConnected } = useAccount();
  const [duration, setDuration]     = useState(BigInt(365 * 24 * 60 * 60));
  const [setReverse, setSetReverse] = useState(true);

  // ── Time-gated loading message — suppresses flicker for fast responses ──────
  // Shows nothing for <300ms, "Validating…" for 300–800ms, full message after 800ms
  const [checkingPhase, setCheckingPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    setCheckingPhase(0);
    if (!isCommitted) return;
    const t1 = setTimeout(() => setCheckingPhase(1), 300);
    const t2 = setTimeout(() => setCheckingPhase(2), 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [label, tld, isCommitted]);

  // ── All domain state from single pipeline hook ──
  const {
    nameState, isRefetching,
    isPriceLoading, base: baseCost, premium: premiumCost, totalCost, maxCost, hasPremium,
    needsApproval, allowance, refetchAllowance,
    sufficient, shortfall,
    controller, gasEstimateEth,
  } = useDomainResolutionPipeline(label, tld, duration);

  const priceTier = getPriceTier(label);

  // ── Registration / renewal ──
  const { register, approveUsdc, step, error: regError, result, waitProgress, reset } = useRegistrationPipeline();
  const { renew, loading: renewLoading, error: renewError } = useRenewal();

  // ── Expiry (display only — not in pipeline) ──
  const { data: expiry } = useNameExpiry(label, tld);

  // ── Expiry ──
  const expiryTs    = (expiry as bigint | undefined) ?? 0n;
  const expiryState = getExpiryState(expiryTs);
  const badge       = expiryBadge(expiryState);
  const daysLeft    = daysUntilExpiry(expiryTs);

  const STEPS = ["committing", "waiting", "registering"] as const;

  return (
    <>
      {step === "success" && result ? (
        <SuccessModal result={result} onClose={reset} onSetPrimary={reset} />
      ) : null}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {label}<span className="text-blue-500">.{tld}</span>
              {/* Subtle background-refresh indicator — only visible during revalidation */}
              {isRefetching ? (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-blue-300 animate-pulse align-middle" title="Refreshing..." />
              ) : null}
            </h2>
            {/* Expiry line — only for taken names with a known expiry */}
            {nameState === "TAKEN" && expiryTs > 0n ? (
              <p className="text-sm text-gray-500 mt-1">
                {expiryState === "active" || expiryState === "expiring-soon"
                  ? `Expires ${formatExpiry(expiryTs)}`
                  : expiryState === "grace"
                  ? `Grace period — expired ${formatExpiry(expiryTs)}`
                  : `Expired ${formatExpiry(expiryTs)}`}
              </p>
            ) : null}
          </div>

          {/* ── State badge cluster ── */}
          <div className="flex flex-col items-end gap-1.5">
            {/* Phase 0 (pre-commit or instant cache hit): no badge flicker */}
            {nameState === "CHECKING" && checkingPhase === 0 ? null : (
              <StateBadge state={nameState} />
            )}

            {/* Expiry sub-badge for taken names */}
            {nameState === "TAKEN" && expiryTs > 0n ? (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                {badge.label}{expiryState === "expiring-soon" ? ` · ${daysLeft}d` : ""}
              </span>
            ) : null}

            {/* Premium badge */}
            {hasPremium ? (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                Premium Name
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Duration selector — only relevant when registering ── */}
        {nameState !== "INVALID" ? (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Registration period
            </p>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.seconds}
                  onClick={() => setDuration(BigInt(opt.seconds))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    duration === BigInt(opt.seconds)
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Price breakdown — shown for AVAILABLE and TAKEN (renew price) ── */}
        {nameState === "AVAILABLE" || nameState === "TAKEN" ? (
          <PriceBreakdown
            isPriceLoading={isPriceLoading}
            baseCost={baseCost}
            premiumCost={premiumCost}
            totalCost={totalCost}
            hasPremium={hasPremium}
            tierLabel={priceTier.label}
            gasEstimateEth={gasEstimateEth}
          />
        ) : null}

        {/* ── Balance warning — only when price is known ── */}
        {isConnected && nameState === "AVAILABLE" && !isPriceLoading && !sufficient && totalCost > 0n ? (
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
            <span className="text-red-500 text-lg leading-none">⚠</span>
            <div>
              <p className="text-sm font-medium text-red-700">Insufficient USDC balance</p>
              <p className="text-xs text-red-500 mt-0.5">
                You need {formatUSDC(shortfall)} more.{" "}
                <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                  className="underline hover:text-red-700">Get testnet USDC →</a>
              </p>
            </div>
          </div>
        ) : null}

        {/* ── Reverse toggle — only when available ── */}
        {nameState === "AVAILABLE" ? (
          <label className="flex items-center gap-3 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={setReverse}
              onChange={e => setSetReverse(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Set as primary name</span>
              <p className="text-xs text-gray-400">Maps your wallet address to this name</p>
            </div>
          </label>
        ) : null}

        {/* ── Action area — driven entirely by nameState ── */}
        {nameState === "INVALID" ? (
          <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-xl">
            Enter a valid name (a–z, 0–9, hyphens allowed)
          </div>

        ) : nameState === "CHECKING" ? (
          // Time-gated: silent <300ms, "Validating…" 300–800ms, full message >800ms
          checkingPhase === 0 ? (
            <div className="py-3" /> // silent placeholder — no flicker
          ) : checkingPhase === 1 ? (
            <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-xl">
              Validating…
            </div>
          ) : (
            <div className="text-center py-3 text-blue-500 text-sm bg-blue-50 rounded-xl animate-pulse">
              Checking availability on Arc Testnet…
            </div>
          )

        ) : nameState === "AVAILABLE" ? (
          !isConnected ? (
            <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">
              Connect wallet to register
            </div>
          ) : isPriceLoading ? (
            <button disabled className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold opacity-50 cursor-not-allowed text-sm">
              Loading price…
            </button>
          ) : needsApproval ? (
            // ── Step 1: Approve USDC ──────────────────────────────────────────
            <button
              onClick={async () => {
                const ok = await approveUsdc(controller, maxCost);
                if (ok) await refetchAllowance();
              }}
              disabled={step === "approving" || !sufficient}
              className="w-full py-3.5 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {step === "approving"
                ? "Approving USDC…"
                : `Approve ${formatUSDC(totalCost)} USDC to continue`}
            </button>
          ) : (
            // ── Step 2: Register ─────────────────────────────────────────────
            <button
              onClick={() => register(label, tld, duration, CONTRACTS.resolver, setReverse, totalCost)}
              disabled={(step !== "idle" && step !== "failed") || !sufficient}
              className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {step === "committing"   ? "Submitting commitment…"
              : step === "committed"   ? "Commitment confirmed…"
              : step === "waiting"     ? `Waiting… ${waitProgress}%`
              : step === "ready"       ? "Ready to register…"
              : step === "registering" ? "Registering on-chain…"
              : step === "success"     ? "✓ Registered!"
              : `Register ${label}.${tld} · ${formatUSDC(totalCost)}`}
            </button>
          )

        ) : /* TAKEN */ (
          expiryState === "active" || expiryState === "expiring-soon" || expiryState === "grace" ? (
            !isConnected ? (
              <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">
                Connect wallet to renew
              </div>
            ) : (
              <button
                onClick={() => renew(label, tld, duration, totalCost, allowance)}
                disabled={renewLoading || !sufficient || isPriceLoading}
                className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
              >
                {renewLoading
                  ? "Renewing…"
                  : isPriceLoading
                  ? `Renew ${label}.${tld} · Loading price…`
                  : `Renew ${label}.${tld} · ${formatUSDC(totalCost)}`}
              </button>
            )
          ) : (
            <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">
              This name is taken
            </div>
          )
        )}

        {step !== "idle" && step !== "success" && step !== "failed" ? (
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${waitProgress}%` }}
              />
            </div>
            {step === "waiting" ? (
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Anti-frontrun protection — waiting for on-chain maturity
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ── Step dots ── */}
        {step !== "idle" && step !== "success" && step !== "failed" ? (
          <div className="flex justify-center gap-2 mt-4">
            {STEPS.map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? "bg-blue-500"
                : STEPS.indexOf(s) < STEPS.indexOf(step as typeof STEPS[number])
                  ? "bg-blue-200" : "bg-gray-200"
              }`} />
            ))}
          </div>
        ) : null}

        {/* ── Errors ── */}
        {regError || renewError ? (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
            <span>⚠</span>
            <span>{regError ?? renewError}</span>
          </div>
        ) : null}

      </div>
    </>
  );
}
