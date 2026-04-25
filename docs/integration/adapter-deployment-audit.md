# ArcNS Resolution Adapter — Deployment Audit

**Phase:** Tier 2A  
**Date:** 2026-04-25  
**Purpose:** Identify everything needed to deploy the adapter publicly

---

## 1. Current Stack

The adapter is implemented as Next.js 14 App Router API routes inside the `frontend/` directory. It is a standard Next.js application with no custom server, no Docker requirement, and no non-standard build steps.

```
frontend/
├── src/app/api/v1/
│   ├── resolve/name/[name]/route.ts
│   ├── resolve/address/[address]/route.ts
│   └── health/route.ts
├── src/lib/
│   ├── adapterHelpers.ts
│   ├── graphql.ts              (resolveAddressWithVerification)
│   ├── publicClient.ts         (RPC transport)
│   ├── namehash.ts
│   ├── normalization.ts
│   ├── contracts.ts
│   └── generated-contracts.ts  (deployed addresses)
├── next.config.js
└── package.json
```

**Build command:** `npm run build` (`next build`)  
**Start command:** `npm run start` (`next start`)  
**Node.js requirement:** 18+ (Next.js 14 requirement)

---

## 2. Environment Variable Dependencies

### Required at runtime

| Variable | Used by | Default if missing | Notes |
|----------|---------|-------------------|-------|
| `NEXT_PUBLIC_RPC_URL` | `publicClient.ts` | `https://rpc.testnet.arc.network` | Primary Arc Testnet RPC |
| `NEXT_PUBLIC_RPC_URL_2` | `publicClient.ts` | `https://rpc.blockdaemon.testnet.arc.network` | Secondary RPC fallback |
| `NEXT_PUBLIC_RPC_URL_3` | `publicClient.ts` | `https://rpc.quicknode.testnet.arc.network` | Tertiary RPC fallback |
| `NEXT_PUBLIC_SUBGRAPH_URL` | `graphql.ts` | `""` (subgraph disabled) | Subgraph query URL |
| `NEXT_PUBLIC_CHAIN_ID` | frontend UI | `5042002` | Not used by adapter routes directly |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | frontend UI | — | Not used by adapter routes |

### Adapter-specific notes

- All three RPC variables have hardcoded fallback defaults in `publicClient.ts`. The adapter will function without them, using the public Arc Testnet RPC endpoints.
- `NEXT_PUBLIC_SUBGRAPH_URL` has no hardcoded default. If not set, `SUBGRAPH_ENABLED` is `false` in `graphql.ts` and all resolution falls back to RPC. This is correct behavior — slower but still functional.
- No secrets are required by the adapter routes. All operations are read-only `eth_call`.

### Minimum viable env for adapter-only deployment

```
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

Everything else has safe defaults or is not used by the adapter routes.

---

## 3. Build and Runtime Assumptions

### Next.js webpack config

`next.config.js` sets `resolve.fallback` for Node.js polyfills required by wagmi/viem (`fs`, `net`, `tls`, wallet SDK deps). These are needed for the frontend UI but do not affect the API routes, which run in the Node.js server runtime (not the browser bundle).

### API route runtime

The v1 adapter routes use standard Next.js App Router API route conventions. They run in the Node.js runtime (not Edge Runtime). No `export const runtime = "edge"` is set — this is intentional, as the routes use dynamic imports (`await import(...)`) which are not supported in Edge Runtime.

**Implication:** The routes cannot be deployed to Vercel Edge Functions or Cloudflare Workers as-is. They require a Node.js runtime. Vercel Serverless Functions (the default) are compatible.

### In-process cache

The adapter uses `new Map()` for in-process caching (30s TTL). This cache is:
- Per-process (not shared across instances)
- Lost on cold starts
- Acceptable for a single-instance deployment

For multi-instance deployments, the cache provides no cross-instance benefit but causes no correctness issues — each instance independently caches its own results.

### Dynamic imports in graphql.ts

`resolveAddressWithVerification()` uses `await import("./publicClient")` and `await import("./contracts")` for lazy loading. This is compatible with Next.js serverless functions but adds a small cold-start latency on first call. Subsequent calls within the same function instance are fast.

---

## 4. Deployment Dependencies

### No external services required beyond

- Arc Testnet RPC (public endpoints available, no auth)
- The Graph Studio subgraph (public query URL, no auth for read queries)

### No secrets required

The adapter is entirely read-only. No private keys, API keys, or authentication tokens are needed for the adapter routes to function.

### No database required

The adapter has no persistent storage. The in-process cache is ephemeral.

---

## 5. Hosting Compatibility

| Platform | Compatible | Notes |
|----------|-----------|-------|
| Vercel | ✅ Yes | Standard Next.js deployment. Serverless functions. Recommended. |
| Railway | ✅ Yes | Node.js server. `npm run build && npm run start`. |
| Fly.io | ✅ Yes | Node.js server. Dockerfile or buildpack. |
| Render | ✅ Yes | Node.js web service. |
| Netlify | ⚠️ Partial | Next.js support via `@netlify/plugin-nextjs`. Dynamic imports may need testing. |
| Cloudflare Workers | ❌ No | Edge Runtime only. Dynamic imports not supported. |
| Self-hosted VPS | ✅ Yes | `npm run build && npm run start` on Node.js 18+. |

**Recommended: Vercel.** Zero-config Next.js deployment, automatic HTTPS, global CDN, serverless functions with Node.js runtime, free tier sufficient for initial public deployment.

---

## 6. What Is Not Needed for Deployment

- No Docker
- No database
- No Redis (in-process cache is sufficient for initial deployment)
- No custom server
- No build-time secrets
- No contract changes
- No subgraph changes

---

## 7. Gaps to Address Before Deployment

| Gap | Severity | Notes |
|-----|----------|-------|
| Rate limiting | Medium | Not implemented. Required before public announcement. Can be added via Vercel middleware or after initial deployment. |
| Request logging | Low | Not implemented. Useful for debugging. Can be added post-deployment. |
| Public URL not documented | Low | Update `public-adapter-api.md` after deployment. |
| `package.json` description contains "ENS-equivalent" | Low | Minor branding issue — not a deployment blocker. |

No blockers to deployment. The adapter can be deployed to Vercel today with the existing code.

---

*End of Tier 2A Adapter Deployment Audit*
