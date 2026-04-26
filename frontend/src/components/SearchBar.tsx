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
        <div
          className="flex items-center rounded-2xl border-2 transition-colors"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: hint
              ? 'rgba(239,68,68,0.6)'
              : isValid
                ? 'var(--color-border-accent)'
                : 'var(--color-border-subtle)',
          }}
        >
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
            className="flex-1 px-5 py-4 text-lg bg-transparent outline-none placeholder-gray-500 min-w-0"
            style={{ color: 'var(--color-text-primary)' }}
          />

          {/* TLD selector */}
          <div className="flex items-center gap-1 px-3 border-l" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {SUPPORTED_TLDS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTldChange(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${tld === t ? 'text-white' : ''}`}
                style={tld === t
                  ? { background: 'var(--color-accent-primary)' }
                  : { color: 'var(--color-text-secondary)', background: 'transparent' }
                }
              >
                .{t}
              </button>
            ))}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={!isValid}
            className="m-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity hover:opacity-90"
            style={{ background: 'var(--color-accent-primary)' }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Validation hint */}
      {hint ? (
        <p className="mt-2 text-sm px-1" style={{ color: 'var(--color-error)' }}>{hint}</p>
      ) : null}

      {/* Price-tier preview — instant, no RPC */}
      {isValid && tier ? (
        <p className="mt-2 text-sm px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{normalized}.{tld}</span>
          {" · "}
          {tier.label} · from {formatUSDC(tier.annualUSDC)}/year
        </p>
      ) : null}
    </div>
  );
}
