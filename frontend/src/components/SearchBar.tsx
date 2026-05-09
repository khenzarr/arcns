"use client";
/**
 * SearchBar.tsx — canonical ArcNS search input.
 *
 * Phase 6 visual redesign: ArcNS brandkit applied.
 *
 * LOGIC IS UNCHANGED:
 *   - normalizeLabel, validateLabel, priceTierFor, formatUSDC imports untouched
 *   - processInput, handleChange, handleTldChange, handleSubmit handlers untouched
 *   - debounce ref and cleanup untouched
 *   - onSearch / onInput / defaultTld props untouched
 *   - SUPPORTED_TLDS iteration untouched
 *
 * Only JSX structure and visual classes were updated.
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

// ─── Types — UNCHANGED ────────────────────────────────────────────────────────

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
  // ── State — UNCHANGED ──────────────────────────────────────────────────────
  const [raw,  setRaw]  = useState("");
  const [tld,  setTld]  = useState<SupportedTLD>(defaultTld);
  const [hint, setHint] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── processInput — UNCHANGED ───────────────────────────────────────────────
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

  // ── Handlers — UNCHANGED ───────────────────────────────────────────────────
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

  // Cleanup debounce on unmount — UNCHANGED
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // ── Derived state — UNCHANGED ──────────────────────────────────────────────
  const normalized = normalizeLabel(raw);
  const isValid    = raw.length > 0 && validateLabel(normalized) === null;
  const tier       = isValid ? priceTierFor(normalized) : null;

  // ── TLD badge colors ───────────────────────────────────────────────────────
  const tldActiveStyle: Record<SupportedTLD, React.CSSProperties> = {
    arc:    { background: "rgba(37, 99, 255, 0.20)", color: "#8FB3FF", border: "1px solid rgba(37,99,255,0.40)" },
    circle: { background: "rgba(0, 230, 194, 0.16)", color: "#7FFFE3", border: "1px solid rgba(0,230,194,0.36)" },
  };

    return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div
          className="arcns-searchbar-shell"
          data-valid={isValid && !hint ? "true" : "false"}
          data-error={hint ? "true" : "false"}
        >
          <div className="arcns-searchbar-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle
                cx="10.5"
                cy="10.5"
                r="6.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M15.5 15.5L21 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <input
            type="text"
            value={raw}
            onChange={handleChange}
            placeholder="Search for a name..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="arcns-searchbar-input"
            aria-label="Search for an ArcNS name"
          />

          <div className="arcns-searchbar-divider" aria-hidden="true" />

          <div className="arcns-searchbar-tlds">
            {SUPPORTED_TLDS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTldChange(t)}
                className="arcns-searchbar-tld"
                data-active={tld === t ? "true" : "false"}
                data-tld={t}
                aria-pressed={tld === t}
              >
                .{t}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="arcns-searchbar-button"
          >
            Search
          </button>
        </div>
      </form>

      {hint ? (
        <p className="mt-3 text-sm px-1" style={{ color: "var(--arcns-danger)" }}>
          {hint}
        </p>
      ) : null}

      {isValid && tier ? (
        <p className="mt-3 text-sm px-1" style={{ color: "var(--arcns-text-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--arcns-text-primary)" }}>
            {normalized}.{tld}
          </span>
          {" · "}
          {tier.label} · from {formatUSDC(tier.annualUSDC)}/year
        </p>
      ) : null}
    </div>
  );
}
