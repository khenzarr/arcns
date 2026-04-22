"use client";

import { useState } from "react";
import { keccak256, stringToBytes } from "viem";
import { useSetPrimaryName } from "../hooks/useArcNS";
import { formatUSDC, formatExpiry } from "../lib/namehash";
import type { RegistrationResult } from "../hooks/useArcNS";

interface SuccessModalProps {
  result: RegistrationResult;
  onClose: () => void;
  onSetPrimary?: () => void;
}

export default function SuccessModal({ result, onClose, onSetPrimary }: SuccessModalProps) {
  const { setPrimary, loading, done } = useSetPrimaryName();
  const [copied, setCopied] = useState(false);

  // Derive tokenId from label (keccak256 of the label part)
  const label = result.name.split(".")[0];
  const tokenId = BigInt(keccak256(stringToBytes(label))).toString();
  const tokenIdShort = `${tokenId.slice(0, 8)}...${tokenId.slice(-6)}`;

  const tld = result.name.split(".").pop() ?? "arc";
  const registrarAddr = tld === "arc"
    ? "0xb156d9726661E92C541e3a267ee8710Fdcd24969"
    : "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e";

  const arcScanTxUrl  = `https://testnet.arcscan.app/tx/${result.txHash}`;
  const arcScanNFTUrl = `https://testnet.arcscan.app/token/${registrarAddr}?a=${tokenId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.name);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPrimary = async () => {
    await setPrimary(result.name);
    onSetPrimary?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-white">Registration Successful!</h2>
          <p className="text-blue-100 text-sm mt-1">Your domain is live on Arc Testnet</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Domain name */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{result.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              Expires {formatExpiry(result.expires)}
            </p>
          </div>

          {/* Details grid */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total paid</span>
              <span className="font-semibold text-gray-900">{formatUSDC(result.cost)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">NFT ownership</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-700 font-medium text-xs">ERC-721 minted</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Token ID</span>
              <span className="font-mono text-xs text-gray-600">{tokenIdShort}</span>
            </div>
          </div>

          {/* Set primary name */}
          {!done ? (
            <button
              onClick={handleSetPrimary}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
            >
              {loading ? "Setting primary name..." : "⭐ Set as Primary Name"}
            </button>
          ) : (
            <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl font-semibold text-center text-sm border border-green-100">
              ✓ Primary name set to {result.name}
            </div>
          )}

          {/* Action links */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={arcScanTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              View Tx ↗
            </a>
            <a
              href={arcScanNFTUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 text-center text-sm font-medium text-purple-600 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              View NFT ↗
            </a>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            {copied ? "✓ Copied to clipboard!" : "Copy domain name"}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
