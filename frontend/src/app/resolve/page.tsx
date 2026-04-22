"use client";

import { useState } from "react";
import { useResolveAddress, useNameExpiry } from "../../hooks/useArcNS";
import { namehash, getTLD, getExpiryState, expiryBadge, formatExpiry } from "../../lib/namehash";
import { labelToTokenId } from "../../lib/namehash";
import { CONTRACTS, REGISTRAR_ABI } from "../../lib/contracts";
import { isValidLabel } from "../../lib/domain";
import { useReadContract } from "wagmi";

export default function ResolvePage() {
  const [domain, setDomain] = useState("");
  const [queried, setQueried] = useState("");

  const { data: resolvedAddr, isLoading } = useResolveAddress(queried);

  // Phase 29: also show expiry + NFT owner
  const tld = getTLD(queried);
  const label = queried.split(".")[0];
  const registrar = tld === "arc" ? CONTRACTS.arcRegistrar : CONTRACTS.circleRegistrar;
  const tokenId = label ? labelToTokenId(label) : 0n;

  const { data: expiry } = useReadContract({
    address: registrar as `0x${string}`,
    abi: REGISTRAR_ABI,
    functionName: "nameExpires",
    args: [tokenId],
    query: { enabled: !!tld && isValidLabel(label), staleTime: 30_000, refetchOnWindowFocus: false },
  });

  const expiryTs = (expiry as bigint | undefined) ?? 0n;
  const expiryState = getExpiryState(expiryTs);
  const badge = expiryBadge(expiryState);

  const handleResolve = () => setQueried(domain.trim().toLowerCase());
  const node = namehash(queried);
  const hasResult = !!queried && queried.includes(".");
  const addr = resolvedAddr as string | undefined;
  const hasAddr = addr && addr !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resolve</h1>
        <p className="text-gray-500 mt-1">Look up any ArcNS name</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleResolve()}
            placeholder="alice.arc"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-sm"
          />
          <button
            onClick={handleResolve}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-sm"
          >
            Resolve
          </button>
        </div>

        {hasResult && (
          <div className="space-y-3">
            {/* Resolved address */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Resolved Address
              </p>
              {isLoading ? (
                <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
              ) : hasAddr ? (
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-gray-900 break-all">{addr}</p>
                  <a
                    href={`https://testnet.arcscan.app/address/${addr}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs shrink-0 hover:underline"
                  >↗</a>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No address record set</p>
              )}
            </div>

            {/* Expiry + status */}
            {expiryTs > 0n && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Expiry</p>
                  <p className="text-sm text-gray-900">{formatExpiry(expiryTs)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
            )}

            {/* Namehash */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Namehash</p>
              <p className="font-mono text-xs text-gray-500 break-all">{node}</p>
            </div>

            {/* ArcScan link */}
            {hasAddr && (
              <a
                href={`https://testnet.arcscan.app/token/${registrar}?a=${tokenId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm text-blue-600 hover:text-blue-700 py-2"
              >
                View NFT on ArcScan ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
