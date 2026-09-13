"use client";

import type { SnapshotDiscount } from "../hooks/useSnapshotDiscount";
import { formatUSDC } from "../lib/normalization";

/** Only mounted after proof, campaign, registry, and unused-state checks pass. */
export function SnapshotPricePreview({ discount, standardCost, selected, onSelect }: {
  discount: SnapshotDiscount;
  standardCost: bigint;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.07] p-4 text-sm text-[var(--arcns-text-secondary)]">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-cyan-400" checked={selected} onChange={event => onSelect(event.target.checked)} />
        <span><strong className="block text-cyan-300">Your testnet snapshot benefit is available</strong>
          <span className="mt-1 block">Use your one-time eligible first-registration price: <s>{formatUSDC(standardCost)}</s> <strong className="text-white">{formatUSDC(discount.total)}</strong></span>
        </span>
      </label>
      <details className="mt-3 text-xs leading-5"><summary className="cursor-pointer">How this works</summary><p className="mt-2">This wallet has a verified snapshot proof and an unused claim in the active campaign. The discount applies to one registration across .arc and .circle; renewals use standard pricing. Multi-year quotes discount only the first year. Check the final amount in your wallet before signing.</p></details>
    </div>
  );
}
