"use client";
/**
 * TransactionHistory.tsx — v3 transaction history UI.
 *
 * Phase 7 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - useAccount hook untouched
 *   - getRegistrationHistory / getRenewalHistory fetching untouched
 *   - rows merge/sort logic untouched
 *   - formatUSDC untouched
 *   - ArcScan tx links untouched
 *
 * Subgraph-backed: registrations + renewals, merged and sorted by timestamp.
 * Gracefully shows empty state when subgraph is unavailable.
 */

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { getRegistrationHistory, getRenewalHistory } from "../lib/graphql";
import { formatUSDC } from "../lib/normalization";

// ── TxRow type — UNCHANGED ────────────────────────────────────────────────────
interface TxRow {
  id:              string;
  type:            "Registration" | "Renewal";
  domainName:      string;
  cost:            string | null;
  timestamp:       string;
  transactionHash: string;
}

export default function TransactionHistory() {
  // ── Hooks and data fetching — UNCHANGED ────────────────────────────────────
  const { address } = useAccount();
  const [rows,    setRows]    = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);

    Promise.all([
      getRegistrationHistory(address),
      getRenewalHistory(address),
    ])
      .then(([regs, renewals]) => {
        const regRows: TxRow[] = regs.map(r => ({
          id:              r.id,
          type:            "Registration",
          domainName:      r.domain.name,
          cost:            r.cost,
          timestamp:       r.timestamp,
          transactionHash: r.transactionHash,
        }));
        const renewRows: TxRow[] = renewals.map(r => ({
          id:              r.id,
          type:            "Renewal",
          domainName:      r.domain.name,
          cost:            r.cost,
          timestamp:       r.timestamp,
          transactionHash: r.transactionHash,
        }));
        const merged = [...regRows, ...renewRows].sort(
          (a, b) => Number(b.timestamp) - Number(a.timestamp)
        );
        setRows(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [address]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Loading transaction history">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-12 rounded-[var(--arcns-radius-lg)] animate-pulse"
            style={{ background: "rgba(120,160,255,0.06)" }}
          />
        ))}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (rows.length === 0) {
    return (
      <div
        className="arcns-glass rounded-[var(--arcns-radius-xl)] text-center py-12"
        style={{ color: "var(--arcns-text-muted)" }}
      >
        No transactions yet
      </div>
    );
  }

  return (
    <div
      className="arcns-glass rounded-[var(--arcns-radius-xl)] overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead
            className="border-b"
            style={{ borderColor: "var(--arcns-border-default)" }}
          >
            <tr>
              {["Domain", "Type", "Cost", "Date", "Tx"].map((h, i) => (
                <th
                  key={h}
                  className={`px-4 py-3.5 font-semibold text-xs uppercase tracking-wide ${i > 1 ? "text-right" : "text-left"}`}
                  style={{ color: "var(--arcns-text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className="transition-colors"
                style={{
                  borderTop: i > 0 ? "1px solid var(--arcns-divider)" : undefined,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,99,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <td className="px-4 py-3 font-medium" style={{ color: "var(--arcns-text-primary)" }}>
                  {row.domainName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-[var(--arcns-radius-pill)] font-medium"
                    style={row.type === "Registration"
                      ? { background: "rgba(37,99,255,0.12)", border: "1px solid rgba(37,99,255,0.24)", color: "#8FB3FF" }
                      : { background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.24)", color: "var(--arcns-warning)" }
                    }
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--arcns-text-secondary)" }}>
                  {row.cost ? formatUSDC(BigInt(row.cost)) : "—"}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: "var(--arcns-text-muted)" }}>
                  {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {/* ArcScan link — UNCHANGED */}
                  <a
                    href={`https://testnet.arcscan.app/tx/${row.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs transition-opacity hover:opacity-80"
                    style={{ color: "var(--arcns-cyan)" }}
                  >
                    {row.transactionHash.slice(0, 8)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
