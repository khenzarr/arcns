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

import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useAvailability }  from "../hooks/useAvailability";
import { useRegistration }  from "../hooks/useRegistration";
import { useRenew }         from "../hooks/useRenew";
import { USDC_CONTRACT, RESOLVER_CONTRACT, ADDR_RESOLVER, ADDR_ARC_CONTROLLER, ADDR_CIRCLE_CONTROLLER } from "../lib/contracts";
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

function StateBadge({ state }: { state: NameState }) {
  const cfg = STATE_BADGES[state];
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cfg.className} ${cfg.pulse ? "animate-pulse" : ""}`}>
      {cfg.label}
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
      <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 animate-pulse">
        <div className="flex justify-between"><div className="h-4 bg-gray-200 rounded w-24" /><div className="h-4 bg-gray-200 rounded w-16" /></div>
        <div className="border-t border-gray-200 pt-2 flex justify-between"><div className="h-5 bg-gray-200 rounded w-12" /><div className="h-5 bg-gray-200 rounded w-20" /></div>
      </div>
    );
  }
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
          <span className="text-purple-600">Premium (recently expired) <span className="text-xs text-gray-400">decays over 28 days</span></span>
          <span className="font-medium text-purple-600">+{formatUSDC(premiumCost)}</span>
        </div>
      ) : null}
      <div className="border-t border-gray-200 pt-2 flex justify-between">
        <span className="font-semibold text-gray-700">Total</span>
        <span className="font-bold text-gray-900 text-lg">{formatUSDC(totalCost)}</span>
      </div>
      <p className="text-xs text-gray-400">Paid in USDC · Arc Testnet</p>
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

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {label}<span className="text-blue-500">.{tld}</span>
          </h2>
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

        <div className="flex flex-col items-end gap-1.5">
          {nameState === "CHECKING" && checkPhase === 0 ? null : <StateBadge state={nameState} />}
          {nameState === "TAKEN" && expiryTs > 0n ? (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
              {badge.label}{expiryState === "expiring-soon" ? ` · ${daysUntilExpiry(expiryTs)}d` : ""}
            </span>
          ) : null}
          {hasPremium ? (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
              Premium Name
            </span>
          ) : null}
        </div>
      </div>

      {/* Duration selector */}
      {nameState !== "INVALID" ? (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Registration period</p>
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
        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
          <span className="text-red-500 text-lg leading-none">⚠</span>
          <div>
            <p className="text-sm font-medium text-red-700">Insufficient USDC balance</p>
            <p className="text-xs text-red-500 mt-0.5">
              You need {formatUSDC(shortfall)} more.{" "}
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-red-700">
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
            <span className="text-sm font-medium text-gray-700">Set as primary name</span>
            <p className="text-xs text-gray-400">Maps your wallet address to this name (optional — can be set later)</p>
          </div>
        </label>
      ) : null}

      {/* Action area */}
      {nameState === "INVALID" ? (
        <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-xl">
          Enter a valid name (letters, numbers, hyphens, underscores)
        </div>

      ) : nameState === "CHECKING" ? (
        checkPhase === 0 ? <div className="py-3" /> :
        checkPhase === 1 ? (
          <div className="text-center py-3 text-gray-400 text-sm bg-gray-50 rounded-xl">Validating…</div>
        ) : (
          <div className="text-center py-3 text-blue-500 text-sm bg-blue-50 rounded-xl animate-pulse">
            Checking availability on Arc Testnet…
          </div>
        )

      ) : nameState === "AVAILABLE" ? (
        !isConnected ? (
          <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet to register</div>
        ) : isWrongNetwork ? (
          <div className="text-center py-3 text-red-600 text-sm bg-red-50 rounded-xl font-medium">
            ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to register
          </div>
        ) : isPriceLoading ? (
          <button disabled className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold opacity-50 cursor-not-allowed text-sm">
            Loading price…
          </button>
        ) : (
          <button
            onClick={() => reg.register({ label, tld, duration, totalCost, resolverAddr: ADDR_RESOLVER, reverseRecord })}
            disabled={(reg.step !== "idle" && reg.step !== "failed") || !sufficient || isPriceLoading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
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
            <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">Connect wallet to renew</div>
          ) : isWrongNetwork ? (
            <div className="text-center py-3 text-red-600 text-sm bg-red-50 rounded-xl font-medium">
              ⚠ Switch to Arc Testnet (Chain ID {DEPLOYED_CHAIN_ID}) to renew
            </div>
          ) : (
            <button
              onClick={() => renew.renew({ label, tld, duration, totalCost })}
              disabled={renew.step === "approving" || renew.step === "renewing" || !sufficient || isPriceLoading}
              className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm"
            >
              {renew.step === "approving" ? "Approving USDC…"
              : renew.step === "renewing" ? "Renewing…"
              : renew.step === "success"  ? "✓ Renewed!"
              : isPriceLoading ? `Renew ${label}.${tld} · Loading…`
              : `Renew ${label}.${tld} · ${formatUSDC(totalCost)}`}
            </button>
          )
        ) : (
          <div className="text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-xl">This name is taken</div>
        )
      )}

      {/* Progress bar (waiting phase) */}
      {reg.step === "waiting" ? (
        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${reg.waitProgress}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">Anti-frontrun protection — waiting for on-chain maturity</p>
        </div>
      ) : null}

      {/* Error display */}
      {activeError ? (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2">
          <span>⚠</span>
          <span>{activeError}</span>
        </div>
      ) : null}

      {/* Success state */}
      {reg.step === "success" && reg.result ? (
        <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl p-3 flex items-start gap-2">
          <span>✓</span>
          <div>
            <p className="font-medium">{reg.result.name}.{reg.result.tld} registered!</p>
            <button onClick={reg.reset} className="text-xs text-green-600 underline mt-1">Register another</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
