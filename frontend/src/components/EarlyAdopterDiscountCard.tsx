"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  lookupEarlyAdopterProof,
  type DiscountProofLookupResult,
} from "../lib/discountProofs";
import { isEarlyAdopterDiscountUiEnabled } from "../lib/discountFeature";
import { GlassCard } from "./ui/GlassCard";

type EligibilityState =
  | { status: "connect-wallet" }
  | { status: "checking" }
  | DiscountProofLookupResult;

function statusCopy(state: EligibilityState): { title: string; detail: string } {
  switch (state.status) {
    case "connect-wallet":
      return {
        title: "Connect wallet to check local eligibility",
        detail: "No wallet or contract action will be requested.",
      };
    case "checking":
      return {
        title: "Checking bundled proof data",
        detail: "This local lookup does not read chain state.",
      };
    case "eligible":
      return {
        title: "Eligible proof found",
        detail:
          "A proof does not mean the discount is active, available, or unused. Discount registration is not available yet.",
      };
    case "ineligible":
      return {
        title: "No eligible proof found",
        detail: "No discount action is available. This result does not affect the normal registration path.",
      };
    case "invalid-address":
      return {
        title: "Wallet address unavailable",
        detail: "Reconnect with a valid wallet address before checking local proof data.",
      };
    case "unavailable":
      return {
        title: "Proof artifact unavailable",
        detail: "Eligibility cannot be determined. No discount action is available.",
      };
  }
}

/**
 * Inactive preview shell. It is intentionally not mounted by the active app.
 * The component performs only a bundled static proof lookup and exposes no CTA.
 */
export function EarlyAdopterDiscountCard() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<EligibilityState>({ status: "connect-wallet" });

  useEffect(() => {
    if (!isEarlyAdopterDiscountUiEnabled || !isConnected || !address) {
      setState({ status: "connect-wallet" });
      return;
    }

    let cancelled = false;
    setState({ status: "checking" });

    lookupEarlyAdopterProof(address).then((result) => {
      if (!cancelled) setState(result);
    });

    return () => {
      cancelled = true;
    };
  }, [address, isConnected]);

  if (!isEarlyAdopterDiscountUiEnabled) return null;

  const copy = statusCopy(state);

  return (
    <GlassCard className="p-5" data-testid="early-adopter-discount-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--arcns-text-muted)]">
        Early-adopter eligibility preview
      </p>
      <h3 className="mt-2 font-semibold text-[var(--arcns-text-primary)]">{copy.title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--arcns-text-secondary)]">{copy.detail}</p>
      <p className="mt-3 text-xs font-medium text-[var(--arcns-warning)]">
        Discount not active yet
      </p>
    </GlassCard>
  );
}
