/**
 * ArcNS Name Cache
 * In-memory + localStorage cache for availability results.
 *
 * Architecture:
 *   L1: in-memory Map (instant, process lifetime)
 *   L2: localStorage (instant, survives page reload)
 *   L3: RPC via wagmi (async, source of truth)
 *
 * Strategy: cache-first, background revalidate.
 * TTL: 60s for positive results, 30s for negative (taken names change less often).
 */

const CACHE_TTL_AVAILABLE = 60_000;  // 60s
const CACHE_TTL_TAKEN     = 30_000;  // 30s — taken names can expire
const LS_KEY              = "arcns_name_cache_v1";

interface CacheEntry {
  available: boolean;
  ts: number; // epoch ms
}

type CacheMap = Record<string, CacheEntry>;

// ─── L1: in-memory ────────────────────────────────────────────────────────────

const memCache = new Map<string, CacheEntry>();

// ─── L2: localStorage helpers ─────────────────────────────────────────────────

function lsRead(): CacheMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}") as CacheMap;
  } catch {
    return {};
  }
}

function lsWrite(key: string, entry: CacheEntry): void {
  if (typeof window === "undefined") return;
  try {
    const store = lsRead();
    store[key] = entry;
    // Prune entries older than 10 min to keep localStorage lean
    const now = Date.now();
    for (const k of Object.keys(store)) {
      if (now - store[k].ts > 600_000) delete store[k];
    }
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be unavailable (private mode, quota exceeded) — ignore
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function cacheKey(label: string, tld: string): string {
  return `${label}.${tld}`;
}

/**
 * Read from cache (L1 then L2).
 * Returns the cached value if still fresh, or null if missing/stale.
 */
export function cacheGet(label: string, tld: string): boolean | null {
  const key = cacheKey(label, tld);
  const now = Date.now();

  // L1: memory
  const mem = memCache.get(key);
  if (mem) {
    const ttl = mem.available ? CACHE_TTL_AVAILABLE : CACHE_TTL_TAKEN;
    if (now - mem.ts < ttl) return mem.available;
    memCache.delete(key);
  }

  // L2: localStorage
  const store = lsRead();
  const ls = store[key];
  if (ls) {
    const ttl = ls.available ? CACHE_TTL_AVAILABLE : CACHE_TTL_TAKEN;
    if (now - ls.ts < ttl) {
      // Promote to L1
      memCache.set(key, ls);
      return ls.available;
    }
  }

  return null;
}

/**
 * Write to both L1 and L2.
 * Called when RPC returns a definitive result.
 */
export function cacheSet(label: string, tld: string, available: boolean): void {
  const key = cacheKey(label, tld);
  const entry: CacheEntry = { available, ts: Date.now() };
  memCache.set(key, entry);
  lsWrite(key, entry);
}

/**
 * Invalidate a specific entry (e.g. after successful registration).
 */
export function cacheInvalidate(label: string, tld: string): void {
  const key = cacheKey(label, tld);
  memCache.delete(key);
  try {
    const store = lsRead();
    delete store[key];
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify(store));
    }
  } catch {}
}
