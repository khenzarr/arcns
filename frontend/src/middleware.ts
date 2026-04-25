/**
 * middleware.ts — ArcNS public adapter rate limiting
 *
 * Applies a sliding-window rate limit to all /api/v1/* requests.
 * Runs at the Next.js middleware layer (before serverless functions).
 *
 * ─── Rate limit policy ───────────────────────────────────────────────────────
 *
 * /api/v1/resolve/*  — 60 requests per minute per IP
 * /api/v1/health     — 120 requests per minute per IP
 *
 * On limit exceeded: HTTP 429 with Retry-After header.
 *
 * ─── Local vs hosted behavior ────────────────────────────────────────────────
 *
 * Local (npm run dev):
 *   Middleware runs in the Next.js dev server. The in-memory counter is
 *   per-process and resets on restart. Rate limiting is active but the
 *   counter is not shared across processes (single process in dev).
 *
 * Vercel (production):
 *   Middleware runs as a Vercel Edge Function before the serverless function.
 *   The in-memory counter is per-edge-instance. Vercel may route requests
 *   across multiple edge instances, so the effective limit per IP may be
 *   higher than the configured value in high-traffic scenarios. This is
 *   acceptable for the current deployment scale. A Redis-backed counter
 *   can be added later if precise global rate limiting is required.
 *
 * ─── IP detection ────────────────────────────────────────────────────────────
 *
 * Uses x-forwarded-for (set by Vercel/CDN) with fallback to x-real-ip.
 * Falls back to "unknown" if neither header is present (e.g. local dev
 * without a proxy). The "unknown" bucket is rate-limited as a single IP.
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Config ───────────────────────────────────────────────────────────────────

const WINDOW_MS        = 60_000; // 1 minute sliding window
const LIMIT_RESOLVE    = 60;     // requests per window for /api/v1/resolve/*
const LIMIT_HEALTH     = 120;    // requests per window for /api/v1/health

// ─── In-memory counter ────────────────────────────────────────────────────────
// Map<ip:path_bucket, { count: number; windowStart: number }>
// Entries are cleaned up lazily when the window expires.

const counters = new Map<string, { count: number; windowStart: number }>();

function getLimit(pathname: string): number {
  if (pathname.startsWith("/api/v1/health")) return LIMIT_HEALTH;
  return LIMIT_RESOLVE;
}

function checkRateLimit(ip: string, pathname: string): {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number; // Unix seconds
} {
  const limit      = getLimit(pathname);
  const bucket     = `${ip}:${pathname.startsWith("/api/v1/health") ? "health" : "resolve"}`;
  const now        = Date.now();
  const entry      = counters.get(bucket);

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // New window
    counters.set(bucket, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetAt: Math.ceil((now + WINDOW_MS) / 1000) };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  const resetAt   = Math.ceil((entry.windowStart + WINDOW_MS) / 1000);

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  return { allowed: true, remaining, resetAt };
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to /api/v1/* routes
  if (!pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }

  const ip     = getClientIp(req);
  const result = checkRateLimit(ip, pathname);

  // Always add rate limit headers to v1 responses
  const headers = new Headers();
  headers.set("X-RateLimit-Limit",     String(getLimit(pathname)));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset",     String(result.resetAt));

  if (!result.allowed) {
    headers.set("Retry-After", String(result.resetAt - Math.floor(Date.now() / 1000)));
    headers.set("Content-Type", "application/json");
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("X-ArcNS-Version", "v1");

    return new NextResponse(
      JSON.stringify({
        status: "error",
        code:   "RATE_LIMITED",
        hint:   "Too many requests. Please slow down and retry after the reset time.",
      }),
      { status: 429, headers }
    );
  }

  // Pass through with rate limit headers injected
  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
// Only run middleware on /api/v1/* paths.
// Excludes static files, _next internals, and non-API routes.

export const config = {
  matcher: ["/api/v1/:path*"],
};
