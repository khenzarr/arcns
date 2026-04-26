"use client";
/**
 * TransactionHistory.tsx — v3 transaction history UI.
 *
 * Subgraph-backed: registrations + renewals, merged and sorted by timestamp.
 * Gracefully shows empty state when subgraph is unavailable.
 * No v1/v2 hook imports. No ENS-branded strings.
 */

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { getRegistrationHistory, getRenewalHistory } from "../lib/graphql";
import { formatUSDC } from "../lib/normalization";

interface TxRow {
  id:              string;
  type:            "Registration" | "Renewal";
  domainName:      string;
  cost:            string | null;
  timestamp:       string;
  transactionHash: string;
}

export default function TransactionHistory() {
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

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--color-surface-overlay)' }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>No transactions yet</p>;
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b" style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-subtle)' }}>
            <tr>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Domain</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Type</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Cost</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Date</th>
              <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(48,54,61,1)]">
            {rows.map(row => (
              <tr key={row.id} className="hover:bg-[#1c2128] transition-colors">
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{row.domainName}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={row.type === "Registration"
                      ? { background: 'rgba(37,99,235,0.15)', color: 'var(--color-text-accent)' }
                      : { background: 'var(--color-warning-surface)', color: 'var(--color-warning)' }
                    }
                  >
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-secondary)' }}>
                  {row.cost ? formatUSDC(BigInt(row.cost)) : "—"}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: 'var(--color-text-tertiary)' }}>
                  {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`https://testnet.arcscan.app/tx/${row.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--color-text-accent)' }}
                  >
                    {row.transactionHash.slice(0, 8)}...
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
