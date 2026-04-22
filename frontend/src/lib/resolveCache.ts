/**
 * resolveCache.ts — Two-layer resolution cache
 *
 * Layer 1: in-memory Map (instant, process-lifetime)
 * Layer 2: localStorage (survives page reload, TTL 90s)
 *
 * Write-through: writes go to both layers simultaneously.
 * Read: L1 first (sync), then L2 (sync), then miss.
 */

export interface ResolveCacheEntry {
  resolvedAddress: string | null;
  owner: string | null;
  resolverAddress: string | null;
  reverseName: string | null;
  ts: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const L1_TTL_MS = 15_000;  // 15s in-memory (matches subgraph staleTime)
const L2_TTL_MS = 90_000;  // 90s localStorage

// ─── Layer 1: in-memory ───────────────────────────────────────────────────────

const l1 = new Map<string, ResolveCacheEntry>();

function l1Key(name: string) { return `resolve:${name}`; }

function l1Read(name: string): ResolveCacheEntry | null {
  const entry = l1.get(l1Key(name));
  if (!entry) return null;
  if (Date.now() - entry.ts > L1_TTL_MS) { l1.delete(l1Key(name)); return null; }
  return entry;
}

function l1Write(name: string, entry: ResolveCacheEntry) {
  l1.set(l1Key(name), entry);
}

// ─── Layer 2: localStorage ────────────────────────────────────────────────────

function l2Key(name: string) { return `arcns:resolve:${name}`; }

function l2Read(name: string): ResolveCacheEntry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(l2Key(name));
    if (!raw) return null;
    const entry: ResolveCacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > L2_TTL_MS) {
      localStorage.removeItem(l2Key(name));
      return null;
    }
    return entry;
  } catch { return null; }
}

function l2Write(name: string, entry: ResolveCacheEntry) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(l2Key(name), JSON.stringify(entry)); } catch {}
}

function l2Delete(name: string) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(l2Key(name)); } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Read from L1 first, then L2. Returns null on miss. */
export function cacheRead(name: string): ResolveCacheEntry | null {
  return l1Read(name) ?? l2Read(name);
}

/** Write-through to both layers. Guards empty reverse names. */
export function cacheWrite(
  name: string,
  data: Omit<ResolveCacheEntry, "ts">
) {
  const entry: ResolveCacheEntry = {
    ...data,
    // Guard: never cache empty reverse names
    reverseName: data.reverseName && data.reverseName.length > 0 ? data.reverseName : null,
    ts: Date.now(),
  };
  l1Write(name, entry);
  l2Write(name, entry);
}

/** Invalidate both layers (call after registration). */
export function cacheInvalidate(name: string) {
  l1.delete(l1Key(name));
  l2Delete(name);
}

/** Optimistic write — sets resolvedAddress = owner immediately after registration.
 *  Uses a shorter TTL so it gets reconciled quickly by the background refresh. */
export function cacheOptimistic(
  label: string,
  tld: "arc" | "circle",
  owner: string,
  resolverAddress: string
) {
  const name = `${label}.${tld}`;
  const entry: ResolveCacheEntry = {
    resolvedAddress: owner,
    owner,
    resolverAddress,
    reverseName: null,
    ts: Date.now() - (L1_TTL_MS - 5_000), // expires in ~5s → forces quick reconcile
  };
  l1Write(name, entry);
  l2Write(name, entry);
}
