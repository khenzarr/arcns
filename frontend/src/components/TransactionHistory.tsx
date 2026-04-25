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
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-center text-gray-400 py-8">No transactions yet</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Tx</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{row.domainName}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  row.type === "Registration"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-orange-50 text-orange-700"
                }`}>
                  {row.type}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-gray-600">
                {row.cost ? formatUSDC(BigInt(row.cost)) : "—"}
              </td>
              <td className="px-4 py-3 text-right text-gray-500">
                {new Date(Number(row.timestamp) * 1000).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`https://testnet.arcscan.app/tx/${row.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 font-mono text-xs"
                >
                  {row.transactionHash.slice(0, 8)}...
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
