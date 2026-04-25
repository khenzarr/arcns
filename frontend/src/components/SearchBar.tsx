"use client";
/**
 * SearchBar.tsx — canonical ArcNS search input.
 *
 * Canonical product flow:
 *   normalize → validate → price-tier preview → availability lookup
 *
 * Emits { label, tld } to parent on every valid, debounced input.
 * Shows inline validation hints. TLD selector for .arc / .circle.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  normalizeLabel,
  validateLabel,
  priceTierFor,
  formatUSDC,
  type SupportedTLD,
  SUPPORTED_TLDS,
} from "../lib/normalization";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Called (debounced 400ms) when input is valid — triggers availability RPC */
  onSearch: (label: string, tld: SupportedTLD) => void;
  /** Called immediately on every input change — for instant card preview */
  onInput?: (label: string, tld: SupportedTLD) => void;
  /** Initial TLD selection */
  defaultTld?: SupportedTLD;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SearchBar({
  onSearch,
  onInput,
  defaultTld = "arc",
}: SearchBarProps) {
  const [raw,   setRaw]   = useState("");
  const [tld,   setTld]   = useState<SupportedTLD>(defaultTld);
  const [hint,  setHint]  = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Process input ──────────────────────────────────────────────────────────
  const processInput = useCallback((value: string, activeTld: SupportedTLD) => {
    const normalized = normalizeLabel(value);
    const error      = validateLabel(normalized);

    if (!value || value.trim() === "") {
      setHint(null);
      return;
    }

    if (error) {
      // Show hint for character/format errors; suppress for empty
      const hints: Record<string, string> = {
        LEADING_HYPHEN:     "Name cannot start with a hyphen.",
        TRAILING_HYPHEN:    "Name cannot end with a hyphen.",
        DOUBLE_HYPHEN:      "Name cannot have two consecutive hyphens at positions 3–4.",
        INVALID_CHARACTERS: "Only letters, numbers, hyphens, and underscores are allowed.",
        WHITESPACE_ONLY:    "Name cannot be whitespace only.",
      };
      setHint(hints[error] ?? null);
      return;
    }

    setHint(null);

    // Instant price-tier preview (no RPC)
    const tier = priceTierFor(normalized);

    // Notify parent immediately for card preview
    onInput?.(normalized, activeTld);

    // Debounced availability RPC trigger
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(normalized, activeTld);
    }, 400);
  }, [onSearch, onInput]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRaw(value);
    processInput(value, tld);
  }, [tld, processInput]);

  const handleTldChange = useCallback((newTld: SupportedTLD) => {
    setTld(newTld);
    processInput(raw, newTld);
  }, [raw, processInput]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeLabel(raw);
    if (!validateLabel(normalized)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSearch(normalized, tld);
    }
  }, [raw, tld, onSearch]);

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const normalized = normalizeLabel(raw);
  const isValid    = raw.length > 0 && validateLabel(normalized) === null;
  const tier       = isValid ? priceTierFor(normalized) : null;

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`flex items-center bg-white rounded-2xl border-2 shadow-sm transition-colors ${
          hint ? "border-red-300" : isValid ? "border-blue-400" : "border-gray-200"
        } focus-within:border-blue-500`}>

          {/* Text input */}
          <input
            type="text"
            value={raw}
            onChange={handleChange}
            placeholder="Search for a name…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 px-5 py-4 text-lg bg-transparent outline-none text-gray-900 placeholder-gray-400 min-w-0"
          />

          {/* TLD selector */}
          <div className="flex items-center gap-1 px-3 border-l border-gray-100">
            {SUPPORTED_TLDS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTldChange(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  tld === t
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                .{t}
              </button>
            ))}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={!isValid}
            className="m-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </form>

      {/* Validation hint */}
      {hint ? (
        <p className="mt-2 text-sm text-red-500 px-1">{hint}</p>
      ) : null}

      {/* Price-tier preview — instant, no RPC */}
      {isValid && tier ? (
        <p className="mt-2 text-sm text-gray-400 px-1">
          <span className="font-medium text-gray-600">{normalized}.{tld}</span>
          {" · "}
          {tier.label} · from {formatUSDC(tier.annualUSDC)}/year
        </p>
      ) : null}
    </div>
  );
}
