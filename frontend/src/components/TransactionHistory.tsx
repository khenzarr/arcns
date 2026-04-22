"use client";

import { useTransactionHistory } from "../hooks/useArcNSV2";
import { formatUSDC } from "../lib/namehash";

export default function TransactionHistory() {
  const { history, loading } = useTransactionHistory();

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-center text-gray-400 py-8">No transactions yet</p>;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Domain</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Cost</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Tx</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map(tx => (
            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{tx.domain.name}</td>
              <td className="px-4 py-3 text-right text-gray-600">{formatUSDC(BigInt(tx.cost))}</td>
              <td className="px-4 py-3 text-right text-gray-500">
                {new Date(Number(tx.timestamp) * 1000).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`https://testnet.arcscan.app/tx/${tx.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 font-mono text-xs"
                >
                  {tx.transactionHash.slice(0, 8)}...
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
