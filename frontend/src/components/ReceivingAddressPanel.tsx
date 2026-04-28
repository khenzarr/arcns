"use client";
/**
 * DEPRECATED — ReceivingAddressPanel.tsx
 *
 * This component is no longer rendered anywhere in the application.
 * It was removed as part of the arcns-primary-name-receiving-address refactor.
 *
 * The receiving address is now primary-name-linked and is not independently
 * user-managed. All manual receiving-address write surfaces have been removed.
 * This file is kept for reference only and can be safely deleted.
 *
 * ReceivingAddressPanel.tsx — inline receiving address management for a domain row.
 *
 * Owner view: full address display, "Set to connected wallet" button,
 *             "Update receiving address" input + confirm, success/error banners.
 * Non-owner view: read-only address display only.
 *
 * Uses "Receiving Address" terminology only — no resolver jargon.
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { useReceivingAddress } from "../hooks/useReceivingAddress";
import { isValidEvmAddress } from "../lib/domain";

export interface ReceivingAddressPanelProps {
  /** The namehash of the domain */
  node: `0x${string}`;
  /** Whether the connected wallet is the Registry owner of this node */
  isOwner: boolean;
}

export function ReceivingAddressPanel({ node, isOwner }: ReceivingAddressPanelProps) {
  const { address: connectedAddress } = useAccount();
  const { receivingAddress, setStep, setError, setReceivingAddress, resetSet } =
    useReceivingAddress(node);

  const [inputValue, setInputValue] = useState("");
  const [inputTouched, setInputTouched] = useState(false);

  const inputValid = isValidEvmAddress(inputValue);
  const showInputError = inputTouched && inputValue.length > 0 && !inputValid;
  const isSetting = setStep === "setting";
  const alreadySynced = !!receivingAddress && !!connectedAddress && receivingAddress.toLowerCase() === connectedAddress.toLowerCase();

  function handleSetToWallet() {
    if (!connectedAddress) return;
    setReceivingAddress(connectedAddress);
  }

  async function handleUpdate() {
    if (!inputValid) return;
    await setReceivingAddress(inputValue as `0x${string}`);
    if (setStep !== "failed") setInputValue("");
  }

  return (
    <div
      className="mt-2 rounded-xl border p-4 text-sm"
      style={{
        background: "var(--color-surface-elevated)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {/* Current address display */}
      <div className="mb-3">
        <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
          Receiving Address
        </span>
        <div className="mt-1 font-mono text-xs break-all" style={{ color: receivingAddress ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
          {receivingAddress ?? "Not set"}
        </div>
      </div>

      {/* Success banner */}
      {setStep === "success" && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 text-xs"
          style={{
            background: "var(--color-success-surface)",
            border: "1px solid var(--color-success-border)",
            color: "var(--color-success)",
          }}
        >
          <span>Receiving address updated.</span>
          <button
            onClick={resetSet}
            className="ml-2 underline text-xs"
            style={{ color: "var(--color-success)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {setStep === "failed" && setError && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 text-xs"
          style={{
            background: "var(--color-error-surface)",
            border: "1px solid var(--color-error-border)",
            color: "var(--color-error)",
          }}
        >
          <span>{setError}</span>
          <button
            onClick={resetSet}
            className="ml-2 underline text-xs"
            style={{ color: "var(--color-error)" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Owner write controls */}
      {isOwner && (
        <div className="space-y-3">
          {/* Set to connected wallet */}
          {alreadySynced ? (
            <div
              className="w-full py-2 rounded-lg text-xs font-medium text-center"
              style={{
                background: "var(--color-success-surface)",
                color: "var(--color-success)",
                border: "1px solid var(--color-success-border)",
              }}
            >
              ✓ Already set to connected wallet
            </div>
          ) : (
            <button
              onClick={handleSetToWallet}
              disabled={isSetting || !connectedAddress}
              className="w-full py-2 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
              style={{
                background: "var(--color-accent-primary)",
                color: "#fff",
              }}
            >
              {isSetting ? "Setting…" : "Set to connected wallet"}
            </button>
          )}

          {/* Update receiving address */}
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Update receiving address
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setInputTouched(true); }}
                onBlur={() => setInputTouched(true)}
                placeholder="0x…"
                className="flex-1 rounded-lg border px-3 py-1.5 text-xs font-mono outline-none"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: showInputError ? "var(--color-error)" : "var(--color-border-subtle)",
                  color: "var(--color-text-primary)",
                }}
              />
              <button
                onClick={handleUpdate}
                disabled={!inputValid || isSetting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
                style={{
                  background: "var(--color-accent-primary)",
                  color: "#fff",
                }}
              >
                {isSetting ? "Updating…" : "Update"}
              </button>
            </div>
            {showInputError && (
              <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
                Enter a valid wallet address (0x…)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
