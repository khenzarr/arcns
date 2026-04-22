"use client";

import { useAccount, useReadContracts } from "wagmi";
import { useState } from "react";
import { CONTRACTS, REGISTRAR_ABI, RESOLVER_ABI } from "../lib/contracts";
import { namehash, labelToTokenId, formatUSDC } from "../lib/namehash";
import { useSetPrimaryName } from "../hooks/useArcNS";

// Known domains for the connected wallet (in production, use an indexer)
// This is a simplified view — a full implementation would use The Graph
export default function MyDomains() {
  const { address, isConnected } = useAccount();
  const { setPrimary: setReverse, loading } = useSetPrimaryName();
  const [searchLabel, setSearchLabel] = useState("");

  if (!isConnected) {
    return (
      <div className="text-center py-12 text-gray-500">
        Connect your wallet to view your domains
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Full domain listing requires an indexer (The Graph).
          Enter a domain name below to check ownership and manage it.
        </p>
      </div>

      {/* Manual domain lookup */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-3">Manage a domain</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchLabel}
            onChange={e => setSearchLabel(e.target.value.toLowerCase())}
            placeholder="e.g. alice.arc"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchLabel.includes(".") && (
          <DomainManager domain={searchLabel} walletAddress={address!} />
        )}
      </div>

      {/* Reverse record */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1">Primary Name</h3>
        <p className="text-sm text-gray-500 mb-3">
          Set which ArcNS name represents your wallet address
        </p>
        <ReverseRecord address={address!} onSet={setReverse} loading={loading} />
      </div>
    </div>
  );
}

function DomainManager({ domain, walletAddress }: { domain: string; walletAddress: `0x${string}` }) {
  const node = namehash(domain);
  const parts = domain.split(".");
  const label = parts[0];
  const tld = parts[parts.length - 1] as "arc" | "circle";
  const registrar = tld === "arc" ? CONTRACTS.arcRegistrar : CONTRACTS.circleRegistrar;
  const tokenId = labelToTokenId(label);

  const { data } = useReadContracts({
    contracts: [
      { address: registrar, abi: REGISTRAR_ABI, functionName: "nameExpires", args: [tokenId] },
      { address: CONTRACTS.resolver, abi: RESOLVER_ABI, functionName: "addr", args: [node] },
      { address: CONTRACTS.resolver, abi: RESOLVER_ABI, functionName: "text", args: [node, "email"] },
      { address: CONTRACTS.resolver, abi: RESOLVER_ABI, functionName: "text", args: [node, "url"] },
    ],
  });

  const expiry = data?.[0]?.result as bigint | undefined;
  const resolvedAddr = data?.[1]?.result as string | undefined;
  const email = data?.[2]?.result as string | undefined;
  const url = data?.[3]?.result as string | undefined;

  const expiryDate = expiry ? new Date(Number(expiry) * 1000) : null;
  const isOwner = resolvedAddr?.toLowerCase() === walletAddress.toLowerCase();

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs mb-1">Expires</p>
          <p className="font-medium">{expiryDate ? expiryDate.toLocaleDateString() : "—"}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-500 text-xs mb-1">Resolved address</p>
          <p className="font-medium font-mono text-xs truncate">{resolvedAddr || "—"}</p>
        </div>
        {email && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Email</p>
            <p className="font-medium">{email}</p>
          </div>
        )}
        {url && (
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-gray-500 text-xs mb-1">Website</p>
            <p className="font-medium">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ReverseRecord({
  address,
  onSet,
  loading,
}: {
  address: `0x${string}`;
  onSet: (name: string) => void;
  loading: boolean;
}) {
  const reverseNode = `0x${"0".repeat(64)}` as `0x${string}`; // simplified
  const [name, setName] = useState("");

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="alice.arc"
        className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={() => onSet(name)}
        disabled={loading || !name}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Setting..." : "Set"}
      </button>
    </div>
  );
}
