"use client";
/**
 * PrimaryName.tsx — v3 primary name UI.
 *
 * Wired exclusively to v3 usePrimaryName hook.
 * No v1/v2 imports. No ENS-branded strings.
 */

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrimaryName } from "../hooks/usePrimaryName";

export default function PrimaryName() {
  const { address, isConnected } = useAccount();
  const [input, setInput] = useState("");

  const {
    primaryName,
    status,
    isLoading,
    setStep,
    setError,
    setPrimaryName,
    resetSet,
  } = usePrimaryName(address);

  if (!isConnected) return null;

  const handleSet = async () => {
    const clean = input.trim().toLowerCase();
    if (!clean.includes(".")) return;
    await setPrimaryName(clean);
    setInput("");
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
        {primaryName ? (
          <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-1.5">
            {primaryName}
            {status === "verified" ? (
              <span className="text-xs text-green-600">✓</span>
            ) : status === "stale" ? (
              <span className="text-xs text-amber-500">⚠</span>
            ) : null}
          </span>
        ) : null}
      </div>

      {setStep === "success" ? (
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-sm text-green-700 font-medium text-center">
          ✓ Primary name updated
          <button onClick={resetSet} className="ml-2 text-xs text-green-600 underline">Dismiss</button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value.toLowerCase())}
            onKeyDown={e => e.key === "Enter" && handleSet()}
            placeholder={primaryName || "alice.arc"}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
          <button
            onClick={handleSet}
            disabled={setStep === "setting" || !input.includes(".")}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {setStep === "setting" ? "Setting…" : primaryName ? "Update" : "Set"}
          </button>
        </div>
      )}

      {setError ? (
        <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{setError}</p>
      ) : null}

      {!primaryName && setStep !== "success" ? (
        <p className="mt-2 text-xs text-gray-400">
          No primary name set. Register a domain first, then set it here.
        </p>
      ) : null}

      {status === "stale" && primaryName ? (
        <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          ⚠ This name no longer resolves to your address. Update or clear it.
        </p>
      ) : null}
    </div>
  );
}
