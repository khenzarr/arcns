"use client";
/**
 * PrimaryName.tsx — ArcNS primary name panel.
 *
 * Product-level visual redesign with custom branded dropdown.
 *
 * LOGIC PRESERVED:
 * - useAccount, usePrimaryName, useMyDomains hooks preserved
 * - selectableDomains, ownedNameSet, canSubmit logic preserved
 * - handleSet behavior preserved
 * - setStep / addrSyncStep / error / stale states preserved
 *
 * Native <select> removed to avoid browser white dropdown artifacts.
 */

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import { usePrimaryName } from "../hooks/usePrimaryName";
import { useMyDomains } from "../hooks/useMyDomains";

type DomainOption = {
  fullName: string;
  labelName: string;
  tld: string;
  isCurrent: boolean;
};

function PrimaryIcon() {
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-2xl border"
      style={{
        background:
          "radial-gradient(circle at 50% 40%, rgba(37,99,255,0.20), rgba(0,212,255,0.07) 48%, rgba(11,18,36,0.75) 100%)",
        borderColor: "rgba(120,160,255,0.22)",
        boxShadow:
          "0 0 26px rgba(0,212,255,0.12), inset 0 0 18px rgba(37,99,255,0.10)",
      }}
      aria-hidden="true"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.5l2.45 5.1 5.55.8-4 3.92.94 5.53L12 16.22 7.06 18.85 8 13.32 4 9.4l5.55-.8L12 3.5z"
          stroke="url(#primary-star-gradient)"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient
            id="primary-star-gradient"
            x1="4"
            y1="3.5"
            x2="20"
            y2="19"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#FBBF24" />
            <stop offset="0.55" stopColor="#00D4FF" />
            <stop offset="1" stopColor="#2563FF" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.2l2.7 2.7 6.3-6.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 160ms ease",
      }}
    >
      <path
        d="M4.5 7L9 11.5L13.5 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DomainSelectDropdown({
  options,
  value,
  primaryName,
  disabled,
  onChange,
}: {
  options: DomainOption[];
  value: string | null;
  primaryName: string | null;
  disabled: boolean;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const selected = value
    ? options.find(option => option.fullName === value) ?? null
    : null;

  return (
    <div
      className="relative flex-1 min-w-0"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        className="group flex h-14 w-full items-center justify-between gap-3 rounded-[var(--arcns-radius-lg)] border px-5 text-left transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,18,36,0.82), rgba(8,14,31,0.88))",
          borderColor: open
            ? "rgba(0,212,255,0.62)"
            : "rgba(120,160,255,0.18)",
          color: selected
            ? "var(--arcns-text-primary)"
            : "var(--arcns-text-muted)",
          boxShadow: open
            ? "0 0 0 1px rgba(0,212,255,0.14), 0 0 32px rgba(0,212,255,0.14)"
            : "inset 0 0 0 1px rgba(255,255,255,0.01)",
        }}
      >
        <span className="min-w-0 truncate text-sm font-semibold">
          {selected ? (
            <>
              <span>{selected.labelName}</span>
              <span style={{ color: selected.tld === "circle" ? "var(--arcns-teal)" : "var(--arcns-cyan)" }}>
                .{selected.tld}
              </span>
              {selected.fullName === primaryName ? (
                <span className="ml-2 text-xs" style={{ color: "var(--arcns-green)" }}>
                  current
                </span>
              ) : null}
            </>
          ) : (
            "Choose a domain to set as primary"
          )}
        </span>

        <span style={{ color: open ? "var(--arcns-cyan)" : "var(--arcns-text-muted)" }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-80 overflow-y-auto rounded-[var(--arcns-radius-lg)] border p-2 shadow-2xl [scrollbar-color:rgba(0,212,255,0.45)_rgba(11,18,36,0.72)] [scrollbar-width:thin]"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,17,35,0.98), rgba(7,12,27,0.98))",
            borderColor: "rgba(0,212,255,0.36)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.46), 0 0 38px rgba(0,212,255,0.14)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={value === null}
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-[var(--arcns-radius-md)] px-4 py-3 text-left text-sm font-semibold transition-colors duration-150"
            style={{
              color: value === null ? "var(--arcns-cyan)" : "var(--arcns-text-muted)",
              background: value === null ? "rgba(37,99,255,0.12)" : "transparent",
            }}
          >
            <span>— choose a domain —</span>
          </button>

          {options.map(option => {
            const active = option.fullName === value;
            const isCircle = option.tld === "circle";

            return (
              <button
                key={option.fullName}
                type="button"
                role="option"
                aria-selected={active}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  onChange(option.fullName);
                  setOpen(false);
                }}
                className="mt-1 flex w-full items-center justify-between gap-3 rounded-[var(--arcns-radius-md)] px-4 py-3 text-left transition-colors duration-150 hover:bg-[rgba(37,99,255,0.10)]"
                style={{
                  background: active ? "rgba(0,212,255,0.10)" : "transparent",
                  border: active ? "1px solid rgba(0,212,255,0.22)" : "1px solid transparent",
                }}
              >
                <span className="min-w-0 truncate text-sm font-semibold">
                  <span style={{ color: "var(--arcns-text-primary)" }}>
                    {option.labelName}
                  </span>
                  <span style={{ color: isCircle ? "var(--arcns-teal)" : "var(--arcns-cyan)" }}>
                    .{option.tld}
                  </span>
                </span>

                <span className="flex items-center gap-2">
                  {option.isCurrent ? (
                    <span
                      className="rounded-[var(--arcns-radius-pill)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{
                        background: "rgba(37,99,255,0.16)",
                        color: "#8FB3FF",
                        border: "1px solid rgba(37,99,255,0.28)",
                      }}
                    >
                      Primary
                    </span>
                  ) : null}

                  {active ? (
                    <span style={{ color: "var(--arcns-green)" }}>
                      <CheckIcon />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function PrimaryName() {
  // ── Hooks — preserved ──────────────────────────────────────────────────────
  const { address, isConnected } = useAccount();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const {
    primaryName,
    status,
    isLoading: primaryLoading,
    setStep,
    setError,
    setPrimaryName,
    resetSet,
    addrSynced,
    addrSyncStep,
    addrSyncError,
  } = usePrimaryName(address);

  const { domains, isLoading: domainsLoading } = useMyDomains();

  // ── Derived state — preserved ──────────────────────────────────────────────
  const selectableDomains = useMemo(
    () => domains.filter(d => d.labelName !== null && d.expiryState !== "expired"),
    [domains],
  );

  const ownedNameSet = useMemo(
    () => new Set(selectableDomains.map(d => `${d.labelName}.${d.tld}`)),
    [selectableDomains],
  );

  useMemo(() => {
    if (selectedDomain && !ownedNameSet.has(selectedDomain)) {
      setSelectedDomain(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedNameSet]);

  const domainOptions: DomainOption[] = useMemo(
    () =>
      selectableDomains.map(d => {
        const fullName = `${d.labelName}.${d.tld}`;
        return {
          fullName,
          labelName: d.labelName ?? "",
          tld: d.tld,
          isCurrent: fullName === primaryName,
        };
      }),
    [selectableDomains, primaryName],
  );

  const isOwnedSelection = selectedDomain !== null && ownedNameSet.has(selectedDomain);
  const isAlreadyPrimary = isOwnedSelection && selectedDomain === primaryName;
  const isLoading = primaryLoading || domainsLoading;
  const canSubmit =
    isOwnedSelection && !isAlreadyPrimary && setStep !== "setting" && !isLoading;

  // ── handleSet — preserved ──────────────────────────────────────────────────
  const handleSet = async () => {
    if (!isOwnedSelection || !selectedDomain) return;

    console.log("[ArcNS:primaryName] pre-submit diagnostic", {
      selectedDomain,
      isOwnedSelection,
      isCurrentPrimary: isAlreadyPrimary,
      buttonEnabled: canSubmit,
    });

    await setPrimaryName(selectedDomain);
    setSelectedDomain(null);
  };

  if (!isConnected) return null;

  return (
    <div
      className="relative overflow-visible rounded-[28px] border p-6 md:p-7"
      style={{
        background:
          "radial-gradient(circle at 8% 20%, rgba(251,191,36,0.08), transparent 24%), linear-gradient(180deg, rgba(11,18,36,0.78), rgba(8,14,31,0.72))",
        borderColor: "rgba(120,160,255,0.18)",
        boxShadow: "0 24px 90px rgba(0,0,0,0.22)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-y-6 right-[28%] hidden w-px md:block"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(120,160,255,0.22), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="grid gap-6 md:grid-cols-[1fr_280px] md:items-center">
        <div className="min-w-0">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <PrimaryIcon />

              <div className="min-w-0">
                <h3
                  className="text-xl font-bold tracking-[-0.035em]"
                  style={{
                    color: "var(--arcns-text-primary)",
                    fontFamily: "var(--arcns-font-display)",
                  }}
                >
                  Primary Name
                </h3>
                <p
                  className="mt-1 text-sm"
                  style={{ color: "var(--arcns-text-secondary)" }}
                >
                  Your wallet&apos;s human-readable identity.
                </p>
              </div>
            </div>

            {primaryName ? (
              <span
                className="hidden shrink-0 items-center gap-2 rounded-[var(--arcns-radius-pill)] px-4 py-2 text-sm font-bold md:inline-flex"
                style={{
                  background: "rgba(37,99,255,0.14)",
                  border: "1px solid rgba(37,99,255,0.32)",
                  color: "#8FB3FF",
                }}
                title={primaryName}
              >
                <span className="max-w-[180px] truncate">{primaryName}</span>
                {status === "verified" ? (
                  <span style={{ color: "var(--arcns-green)" }}>
                    <CheckIcon />
                  </span>
                ) : status === "stale" ? (
                  <span style={{ color: "var(--arcns-warning)" }}>⚠</span>
                ) : null}
              </span>
            ) : null}
          </div>

          {setStep === "success" ? (
            <div>
              <div
                className="rounded-[var(--arcns-radius-lg)] border p-4 text-sm font-semibold"
                style={{
                  background: "rgba(20,241,149,0.08)",
                  borderColor: "rgba(20,241,149,0.24)",
                  color: "var(--arcns-green)",
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>✓ Primary name updated</span>
                  <button
                    onClick={resetSet}
                    className="text-xs underline"
                    style={{ color: "var(--arcns-green)" }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {addrSyncStep === "syncing" ? (
                <p className="mt-3 text-xs" style={{ color: "var(--arcns-text-muted)" }}>
                  Syncing receiving address…
                </p>
              ) : addrSyncStep === "synced" && addrSynced ? (
                <p
                  className="mt-3 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
                  style={{
                    background: "rgba(20,241,149,0.08)",
                    color: "var(--arcns-green)",
                  }}
                >
                  ✓ Receiving address updated for this name.
                </p>
              ) : addrSyncStep === "partial-success" ? (
                <div
                  className="mt-3 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    color: "var(--arcns-warning)",
                  }}
                >
                  <p>
                    Primary Name set, but receiving address could not be synced.
                    {addrSyncError ? ` ${addrSyncError}` : ""}
                  </p>
                </div>
              ) : null}
            </div>
          ) : selectableDomains.length > 0 ? (
            <DomainSelectDropdown
              options={domainOptions}
              value={selectedDomain}
              primaryName={primaryName}
              disabled={isLoading || setStep === "setting"}
              onChange={value => {
                setSelectedDomain(value && ownedNameSet.has(value) ? value : null);
              }}
            />
          ) : isLoading ? (
            <div
              className="h-14 animate-pulse rounded-[var(--arcns-radius-lg)]"
              style={{ background: "rgba(120,160,255,0.06)" }}
            />
          ) : (
            <p className="text-sm" style={{ color: "var(--arcns-text-muted)" }}>
              {domains.length === 0
                ? "No domains found. Register a .arc or .circle name first."
                : "Domain names are not yet resolved. Primary name selection will be available once the subgraph is indexed."}
            </p>
          )}

          {setError ? (
            <p
              className="mt-3 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
              style={{
                background: "rgba(255,92,122,0.08)",
                color: "var(--arcns-danger)",
              }}
            >
              {setError}
            </p>
          ) : null}

          {isAlreadyPrimary && selectedDomain ? (
            <p className="mt-3 text-xs" style={{ color: "var(--arcns-text-muted)" }}>
              {selectedDomain} is already your primary name.
            </p>
          ) : null}

          {status === "stale" && primaryName ? (
            <p
              className="mt-3 rounded-[var(--arcns-radius-sm)] px-3 py-2 text-xs"
              style={{
                background: "rgba(251,191,36,0.08)",
                color: "var(--arcns-warning)",
              }}
            >
              ⚠ This name no longer resolves to your address. Select a different domain to update it.
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 md:pl-6">
          {primaryName ? (
            <div
              className="inline-flex w-fit max-w-full items-center gap-2 self-start rounded-[var(--arcns-radius-pill)] px-4 py-2 text-sm font-bold md:self-auto"
              style={{
                background: "rgba(37,99,255,0.14)",
                border: "1px solid rgba(37,99,255,0.32)",
                color: "#8FB3FF",
              }}
              title={primaryName}
            >
              <span className="truncate">{primaryName}</span>
              {status === "verified" ? (
                <span style={{ color: "var(--arcns-green)" }}>
                  <CheckIcon />
                </span>
              ) : status === "stale" ? (
                <span style={{ color: "var(--arcns-warning)" }}>⚠</span>
              ) : null}
            </div>
          ) : (
            <div
              className="inline-flex w-fit rounded-[var(--arcns-radius-pill)] px-4 py-2 text-sm font-bold"
              style={{
                background: "rgba(100,112,132,0.10)",
                border: "1px solid rgba(100,112,132,0.20)",
                color: "var(--arcns-text-muted)",
              }}
            >
              Not set
            </div>
          )}

          <button
            onClick={handleSet}
            disabled={!canSubmit}
            className="h-14 rounded-[var(--arcns-radius-lg)] px-6 text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: "var(--arcns-gradient-primary)" }}
          >
            {setStep === "setting"
              ? "Updating…"
              : primaryName
                ? "Update Primary"
                : "Set as Primary"}
          </button>

          <p className="text-sm leading-relaxed" style={{ color: "var(--arcns-text-muted)" }}>
            This name will represent you across ArcNS and supported apps.
          </p>
        </div>
      </div>
    </div>
  );
}