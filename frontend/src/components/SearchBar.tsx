"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { isValidLabel, getValidationHint, type SupportedTLD } from "../lib/domain";

interface SearchBarProps {
  /** Fired after 300ms debounce — triggers RPC availability check */
  onSearch: (label: string, tld: SupportedTLD) => void;
  /** Fired immediately on every keystroke — used for instant card render */
  onInput?: (label: string, tld: SupportedTLD) => void;
}

export default function SearchBar({ onSearch, onInput }: SearchBarProps) {
  const [input, setInput] = useState("");
  const [tld, setTld]     = useState<SupportedTLD>("arc");
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const normalise = (raw: string) =>
    raw.trim().toLowerCase().replace(/\.(arc|circle)$/, "");

  const hint = getValidationHint(normalise(input));

  const handleChange = (raw: string) => {
    setInput(raw);
    const label = normalise(raw);
    // Instant callback — no debounce, no RPC
    onInput?.(label, tld);
  };

  // Debounced RPC trigger — fires 300ms after typing stops
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const label = normalise(input);
    if (!isValidLabel(label)) return;

    debounceRef.current = setTimeout(() => {
      onSearch(label, tld);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [input, tld]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const label = normalise(input);
    if (!isValidLabel(label)) return;
    onSearch(label, tld);
  }, [input, tld, onSearch]);

  const handleTldChange = (newTld: SupportedTLD) => {
    setTld(newTld);
    const label = normalise(input);
    onInput?.(label, newTld);
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl mx-auto">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="Search for a name..."
          autoComplete="off"
          spellCheck={false}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        />
        <select
          value={tld}
          onChange={e => handleTldChange(e.target.value as SupportedTLD)}
          className="px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
        >
          <option value="arc">.arc</option>
          <option value="circle">.circle</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          Search
        </button>
      </div>

      {input && hint ? (
        <p className="text-sm text-gray-400 px-1">{hint}</p>
      ) : null}
    </div>
  );
}
