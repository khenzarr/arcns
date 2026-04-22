"use client";

import { useAccount } from "wagmi";
import { useState } from "react";
import { usePortfolio, useExpiryAlerts, useBulkRenew, useRentPriceV2 } from "../hooks/useArcNSV2";
import { formatUSDC, DURATION_OPTIONS } from "../lib/namehash";
import { GQLDomain } from "../lib/graphql";

export default function Portfolio() {
  const { address, isConnected } = useAccount();
  const { domains, loading, error } = usePortfolio();
  const expiring = useExpiryAlerts(30);
  const { bulkRenew, loading: renewLoading, results } = useBulkRenew();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(BigInt(365 * 24 * 60 * 60));

  if (!isConnected) {
    return (
      <div className="text-center py-12 text-gray-500">
        Connect your wallet to view your portfolio
      </div>
    );
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkRenew = () => {
    const toRenew = domains
      .filter(d => selected.has(d.id))
      .map(d => ({
        label: d.name.split(".")[0],
        tld: d.tld as "arc" | "circle",
        cost: BigInt(d.cost),
      }));
    bulkRenew(toRenew, duration);
  };

  const now = Math.floor(Date.now() / 1000);

  return (
    <div className="space-y-6">
      {/* Expiry Alerts */}
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-600 font-semibold">⚠️ Expiring Soon</span>
          </div>
          <div className="space-y-1">
            {expiring.map(d => {
              const daysLeft = Math.floor((Number(d.expiresAt) - now) / 86400);
              return (
                <div key={d.id} className="flex justify-between text-sm">
                  <span className="font-medium text-amber-800">{d.name}</span>
                  <span className="text-amber-600">
                    {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-blue-700">{selected.size} domain(s) selected</span>
          <div className="flex gap-2 items-center">
            <select
              value={duration.toString()}
              onChange={e => setDuration(BigInt(e.target.value))}
              className="text-sm px-3 py-1.5 rounded-lg border border-blue-200 bg-white"
            >
              {DURATION_OPTIONS.map(o => (
                <option key={o.seconds} value={o.seconds}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkRenew}
              disabled={renewLoading}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {renewLoading ? "Renewing..." : "Bulk Renew"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk renew results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-1">
          {results.map(r => (
            <div key={r.name} className="flex justify-between text-sm">
              <span>{r.name}</span>
              <span className={r.success ? "text-green-600" : "text-red-500"}>
                {r.success ? "✓ Renewed" : "✗ Failed"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Domain list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-1/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
          Failed to load domains from indexer. {error}
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No domains registered yet
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(domain => (
            <DomainRow
              key={domain.id}
              domain={domain}
              selected={selected.has(domain.id)}
              onToggle={() => toggleSelect(domain.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DomainRow({
  domain,
  selected,
  onToggle,
}: {
  domain: GQLDomain;
  selected: boolean;
  onToggle: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = Number(domain.expiresAt);
  const daysLeft = Math.floor((expiresAt - now) / 86400);
  const isExpired = expiresAt < now;
  const isExpiringSoon = daysLeft <= 30 && !isExpired;

  return (
    <div
      className={`bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer transition-colors ${
        selected ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-gray-200"
      }`}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        onClick={e => e.stopPropagation()}
        className="w-4 h-4 rounded border-gray-300 text-blue-600"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 truncate">{domain.name}</span>
          {isExpired && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Expired</span>
          )}
          {isExpiringSoon && (
            <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
              {daysLeft}d left
            </span>
          )}
        </div>
        {domain.addrRecord && (
          <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
            → {domain.addrRecord.addr}
          </p>
        )}
      </div>
      <div className="text-right text-sm text-gray-500 shrink-0">
        <p>{isExpired ? "Expired" : new Date(expiresAt * 1000).toLocaleDateString()}</p>
        <p className="text-xs">{formatUSDC(BigInt(domain.cost))}</p>
      </div>
    </div>
  );
}
