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
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        {/* Search input container */}
        <div
          className="flex items-center rounded-[var(--arcns-radius-xl)] border-2 transition-all duration-200"
          style={{
            background: "var(--arcns-bg-surface)",
            borderColor: hint
              ? "rgba(255, 92, 122, 0.60)"
              : isValid
                ? "var(--arcns-border-strong)"
                : "var(--arcns-border-default)",
            boxShadow: isValid && !hint
              ? "var(--arcns-shadow-glow-soft)"
              : undefined,
          }}
        >
          {/* Text input — all attributes UNCHANGED */}
          <input
            type="text"
            value={raw}
            onChange={handleChange}
            placeholder="Search for a name…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="flex-1 px-5 py-4 text-lg bg-transparent outline-none min-w-0"
            style={{
              color: "var(--arcns-text-primary)",
            }}
            aria-label="Search for an ArcNS name"
          />

          {/* TLD selector — handleTldChange UNCHANGED */}
          <div
            className="flex items-center gap-1 px-3 border-l"
            style={{ borderColor: "var(--arcns-border-default)" }}
          >
            {SUPPORTED_TLDS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => handleTldChange(t)}
                className="px-3 py-1.5 rounded-[var(--arcns-radius-sm)] text-sm font-bold font-mono transition-all duration-150"
                style={
                  tld === t
                    ? tldActiveStyle[t]
                    : { color: "var(--arcns-text-muted)", background: "transparent" }
                }
                aria-pressed={tld === t}
              >
                .{t}
              </button>
            ))}
          </div>

          {/* Search button — disabled logic UNCHANGED */}
          <button
            type="submit"
            disabled={!isValid}
            className="m-2 px-5 py-2.5 text-white rounded-[var(--arcns-radius-md)] font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--arcns-gradient-primary)" }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Validation hint — UNCHANGED logic */}
      {hint ? (
        <p className="mt-2 text-sm px-1" style={{ color: "var(--arcns-danger)" }}>
          {hint}
        </p>
      ) : null}

      {/* Price-tier preview — instant, no RPC — UNCHANGED logic */}
      {isValid && tier ? (
        <p className="mt-2 text-sm px-1" style={{ color: "var(--arcns-text-muted)" }}>
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
