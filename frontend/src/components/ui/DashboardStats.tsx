"use client";
/**
 * DashboardStats.tsx — My Domains dashboard stat strip.
 * Reads from useMyDomains + usePrimaryName. No new fetches.
 * Shows: Total Names, Primary Name, Expiring Soon.
 * Safe fallbacks when data is unavailable.
 */
import { useAccount } from "wagmi";
import { useMyDomains } from "../../hooks/useMyDomains";
import { usePrimaryName } from "../../hooks/usePrimaryName";

export function DashboardStats() {
  const { address, isConnected } = useAccount();
  const { domains, isLoading } = useMyDomains();
  const { primaryName } = usePrimaryName(address);

  if (!isConnected) return null;

  const totalNames = isLoading ? null : domains.length;
  const expiringSoon = isLoading ? null : domains.filter(
    d => d.expiryState === "expiring-soon" || d.expiryState === "grace"
  ).length;

  const stats = [
    {
      label: "Total Names",
      value: totalNames === null ? "—" : String(totalNames),
      accent: "var(--arcns-cyan)",
      icon: "◈",
    },
    {
      label: "Primary Name",
      value: primaryName ?? "Not set",
      accent: "#8FB3FF",
      icon: "◎",
      mono: !!primaryName,
    },
    {
      label: "Expiring Soon",
      value: expiringSoon === null ? "—" : expiringSoon === 0 ? "None" : String(expiringSoon),
      accent: expiringSoon ? "var(--arcns-warning)" : "var(--arcns-green)",
      icon: "⏱",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="rounded-[var(--arcns-radius-xl)] px-5 py-4"
          style={{
            background: "var(--arcns-bg-surface)",
            border: "1px solid var(--arcns-border-default)",
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span style={{ color: s.accent, fontSize: "1rem" }} aria-hidden="true">{s.icon}</span>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--arcns-text-muted)" }}>
              {s.label}
            </p>
          </div>
          <p
            className={`text-lg font-bold truncate ${s.mono ? "font-mono text-sm" : ""}`}
            style={{ color: s.accent }}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}
