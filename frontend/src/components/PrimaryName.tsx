"use client";

import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { keccak256, stringToBytes, concat } from "viem";
import { useSetPrimaryName } from "../hooks/useArcNS";
import { CONTRACTS, RESOLVER_ABI, REVERSE_REGISTRAR_ABI } from "../lib/contracts";

// Compute addr.reverse node for an address — mirrors on-chain logic
function computeReverseNode(address: string): `0x${string}` {
  const ADDR_REVERSE_NODE = "0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2" as `0x${string}`;
  const addrHex = address.toLowerCase().replace("0x", "");
  const addrLabel = keccak256(stringToBytes(addrHex));
  return keccak256(concat([ADDR_REVERSE_NODE, addrLabel]));
}

export default function PrimaryName() {
  const { address, isConnected } = useAccount();
  const [input, setInput] = useState("");
  const { setPrimary, loading, error, done } = useSetPrimaryName();

  // Fetch current primary name from resolver
  const reverseNode = address ? computeReverseNode(address) : undefined;
  const { data: currentName, refetch } = useReadContract({
    address: CONTRACTS.resolver,
    abi: RESOLVER_ABI,
    functionName: "name",
    args: [reverseNode!],
    query: { enabled: !!reverseNode },
  });

  const current = currentName as string | undefined;

  if (!isConnected) return null;

  const handleSet = async () => {
    const clean = input.trim().toLowerCase();
    if (!clean.includes(".")) return;
    await setPrimary(clean);
    // Refetch after setting
    setTimeout(() => refetch(), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Primary Name</h3>
            <p className="text-xs text-gray-400">Your wallet's human-readable identity</p>
          </div>
        </div>
        {/* Current primary name display */}
        {current && (
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            {current}
          </span>
        )}
      </div>

      {done ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700 font-medium text-center">
          ✓ Primary name set to <strong>{input}</strong>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === "Enter" && handleSet()}
            placeholder={current || "alice.arc"}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <button
            onClick={handleSet}
            disabled={loading || !input.includes(".")}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? "Setting..." : current ? "Update" : "Set"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {!current && !done && (
        <p className="mt-2 text-xs text-gray-400">
          No primary name set. Register a domain first, then set it here.
        </p>
      )}
    </div>
  );
}
