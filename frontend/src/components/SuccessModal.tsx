"use client";
/**
 * SuccessModal.tsx — post-registration success modal.
 *
 * Wired exclusively to v3 usePrimaryName hook.
 * No v1/v2 imports. No ENS-branded strings.
 */

import { useState, useRef } from "react";
import { keccak256, stringToBytes } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { usePrimaryName } from "../hooks/usePrimaryName";
import { formatUSDC, formatExpiry } from "../lib/normalization";
import { RESOLVER_CONTRACT } from "../lib/contracts";
import { namehash } from "../lib/namehash";
import type { RegistrationResult } from "../hooks/useRegistration";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 15_000;

interface SuccessModalProps {
  result: RegistrationResult;
  reverseRecord?: boolean;
  onClose: () => void;
  onSetPrimary?: () => void;
}

export default function SuccessModal({ result, reverseRecord = false, onClose, onSetPrimary }: SuccessModalProps) {
  const { setStep, setPrimaryName } = usePrimaryName();
  const { address: connectedAddress } = useAccount();
  const [copied, setCopied] = useState(false);
  const startTime = useRef(Date.now());
  const [timedOut, setTimedOut] = useState(false);

  const label = result.name.split(".")[0];
  const tokenId = BigInt(keccak256(stringToBytes(label))).toString();
  const tokenIdShort = `${tokenId.slice(0, 8)}...${tokenId.slice(-6)}`;

  const tld = result.tld ?? result.name.split(".").pop() ?? "arc";

  const fullName = `${result.name}.${tld}`;
  const nameNode = namehash(fullName) as `0x${string}`;
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  const { data: registeredAddr, isFetched } = useReadContract({
    ...RESOLVER_CONTRACT,
    functionName: "addr",
    args: [nameNode],
    query: {
      staleTime: 0,
      refetchOnWindowFocus: false,
      refetchInterval: () => {
        if (timedOut) return false;
        if (
          registeredAddr &&
          connectedAddress &&
          (registeredAddr as string).toLowerCase() === connectedAddress.toLowerCase()
        ) {
          return false;
        }
        if (Date.now() - startTime.current > POLL_TIMEOUT_MS) {
          setTimedOut(true);
          return false;
        }
        return POLL_INTERVAL_MS;
      },
    },
  });

  const resolvedToWallet =
    isFetched &&
    !!registeredAddr &&
    (registeredAddr as string) !== ZERO_ADDRESS &&
    !!connectedAddress &&
    (registeredAddr as string).toLowerCase() === connectedAddress.toLowerCase();
  const registrarAddr = tld === "arc"
    ? "0xb156d9726661E92C541e3a267ee8710Fdcd24969"
    : "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e";

  const arcScanTxUrl  = `https://testnet.arcscan.app/tx/${result.txHash}`;
  const arcScanNFTUrl = `https://testnet.arcscan.app/token/${registrarAddr}?a=${tokenId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${result.name}.${tld}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSetPrimary = async () => {
    await setPrimaryName(`${result.name}.${tld}`);
    onSetPrimary?.();
  };

  const primaryDone = setStep === "success";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="rounded-2xl w-full max-w-md overflow-hidden border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-border-subtle)' }}>
        {/* Header */}
        <div className="p-6 text-center" style={{ background: 'linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ring-2 ring-white/30" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="text-3xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold text-white">Registration Successful!</h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {resolvedToWallet ? "Registered and resolving to your wallet" : "Your domain is live on Arc Testnet"}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Domain name */}
          <div className="rounded-xl p-4 text-center" style={{ background: 'var(--color-surface-elevated)' }}>
            <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              {result.name}.<span style={{ color: 'var(--color-text-accent)' }}>{tld}</span>
            </p>
            {result.expires > 0n ? (
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Expires {formatExpiry(result.expires)}</p>
            ) : null}
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: 'var(--color-text-secondary)' }}>Total paid</span>
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{formatUSDC(result.cost)} USDC</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--color-text-secondary)' }}>NFT ownership</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="font-medium text-xs" style={{ color: 'var(--color-success)' }}>ERC-721 minted</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--color-text-secondary)' }}>Token ID</span>
              <span className="font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>{tokenIdShort}</span>
            </div>
          </div>

          {/* Receiving address confirmation — only when primary was checked and name resolves */}
          {reverseRecord && resolvedToWallet && connectedAddress ? (
            <div
              className="rounded-xl p-3 text-sm"
              style={{ background: 'var(--color-success-surface)', color: 'var(--color-success)' }}
            >
              ✓ This name is now active for receiving transfers.
            </div>
          ) : null}

          {/* Set primary name */}
          {!primaryDone ? (
            <button
              onClick={handleSetPrimary}
              disabled={setStep === "setting"}
              className="w-full py-3 text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity hover:opacity-90 text-sm"
              style={{ background: 'var(--color-accent-primary)' }}
            >
              {setStep === "setting" ? "Setting primary name…" : "⭐ Set as Primary Name"}
            </button>
          ) : (
            <div className="w-full py-3 rounded-xl font-semibold text-center text-sm border" style={{ background: 'var(--color-success-surface)', borderColor: 'var(--color-success-border)', color: 'var(--color-success)' }}>
              ✓ Primary name set to {result.name}.{tld}
            </div>
          )}

          {/* Action links */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={arcScanTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 text-center text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
              style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--color-text-accent)' }}
            >
              View Tx ↗
            </a>
            <a
              href={arcScanNFTUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 text-center text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--color-accent-secondary)' }}
            >
              View NFT ↗
            </a>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2.5 text-sm font-medium rounded-xl transition-opacity hover:opacity-80"
            style={{ background: 'var(--color-surface-overlay)', color: 'var(--color-text-secondary)' }}
          >
            {copied ? "✓ Copied to clipboard!" : "Copy domain name"}
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
