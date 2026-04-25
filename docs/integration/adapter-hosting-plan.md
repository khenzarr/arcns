# ArcNS Resolution Adapter — Hosting Plan

**Phase:** Tier 2B  
**Date:** 2026-04-25  
**Decision:** Deploy the adapter as part of the existing Next.js app on Vercel

---

## 1. Options Evaluated

### Option A — Deploy the existing Next.js app to Vercel (recommended)

Deploy the `frontend/` directory to Vercel. The `/api/v1/*` routes are exposed automatically as Vercel Serverless Functions alongside the frontend UI.

| Criterion | Assessment |
|-----------|-----------|
| Deployment speed | Fastest — zero-config, `git push` triggers deploy |
| Complexity | Minimal — no new services, no new repos, no Docker |
| Reliability | High — Vercel global CDN, automatic HTTPS, 99.99% SLA on free/pro tier |
| Operational overhead | Very low — no server management, automatic scaling |
| Documentation/publicizing | Simple — one stable URL for both the app and the API |
| Third-party integration suitability | Good — stable HTTPS URL, CORS already configured |
| Cost | Free tier sufficient for initial public deployment |

**Tradeoff:** The adapter and frontend share the same deployment. If the frontend needs to be taken down for maintenance, the adapter goes with it. Acceptable for the current stage — decoupling can happen later if warranted.

---

### Option B — Extract adapter as a standalone Next.js or Node.js service

Create a separate minimal Next.js or Express app containing only the `/api/v1/*` routes, deploy it independently.

| Criterion | Assessment |
|-----------|-----------|
| Deployment speed | Slower — requires creating a new project, new repo or subdirectory, new deployment pipeline |
| Complexity | Higher — two deployments to manage, two sets of env vars, two monitoring surfaces |
| Reliability | Same as Option A once deployed |
| Operational overhead | Higher — separate service lifecycle |
| Documentation/publicizing | Slightly cleaner URL (no frontend path prefix) |
| Third-party integration suitability | Marginally better URL structure |
| Cost | Same |

**Tradeoff:** Better long-term separation of concerns, but adds meaningful setup overhead now with no correctness or reliability benefit at this stage.

---

### Option C — Deploy to Railway or Fly.io

Run the Next.js app as a persistent Node.js server on Railway or Fly.io instead of Vercel's serverless model.

| Criterion | Assessment |
|-----------|-----------|
| Deployment speed | Moderate — requires Dockerfile or buildpack config |
| Complexity | Moderate — server management, health checks, restart policies |
| Reliability | Good, but requires more configuration to match Vercel's zero-config reliability |
| Operational overhead | Higher than Vercel — persistent server means more to monitor |
| In-process cache benefit | Slightly better — persistent process means cache survives between requests |
| Cost | Free tier available but more limited than Vercel |

**Tradeoff:** The persistent process is a minor advantage for cache hit rates, but the added operational complexity is not worth it at this stage. The 30s in-process cache works fine on serverless — each cold start simply misses cache once.

---

## 2. Recommended Path: Option A — Vercel

**Deploy the existing `frontend/` Next.js app to Vercel.**

### Why this is the right choice now

1. **Zero additional code.** The adapter routes are already implemented and correct. No new files, no new services, no new repos.

2. **Fastest path to a public URL.** Vercel deployment from a GitHub repo takes under 5 minutes. The adapter is publicly reachable the moment the deployment completes.

3. **Correct runtime.** The v1 routes use dynamic imports (`await import(...)`) which require Node.js runtime. Vercel Serverless Functions use Node.js by default — no configuration needed.

4. **CORS already handled.** The routes return `Access-Control-Allow-Origin: *` on every response. No Vercel-specific CORS configuration is needed.

5. **HTTPS automatic.** Vercel provisions TLS certificates automatically. No certificate management.

6. **Env vars are simple.** Only two env vars are needed for the adapter (`NEXT_PUBLIC_RPC_URL`, `NEXT_PUBLIC_SUBGRAPH_URL`). Both can be set in the Vercel dashboard in under a minute.

7. **Decoupling is easy later.** If the adapter needs to be separated from the frontend in the future, the routes can be extracted into a standalone service without changing any of the adapter logic.

### What the public URL will look like

```
https://{project-name}.vercel.app/api/v1/resolve/name/alice.arc
https://{project-name}.vercel.app/api/v1/resolve/address/0x...
https://{project-name}.vercel.app/api/v1/health
```

If a custom domain is configured (e.g. `api.arcns.xyz`):
```
https://api.arcns.xyz/api/v1/resolve/name/alice.arc
```

---

## 3. Deployment Steps (for Tier 2D execution)

1. Create a Vercel account / log in at vercel.com
2. Import the GitHub repo (`khenzarr/arcns`)
3. Set root directory to `frontend/`
4. Set build command: `npm run build`
5. Set output directory: `.next`
6. Set environment variables:
   ```
   NEXT_PUBLIC_RPC_URL=https://arc-testnet.drpc.org
   NEXT_PUBLIC_RPC_URL_2=https://rpc.testnet.arc.network
   NEXT_PUBLIC_RPC_URL_3=https://rpc.quicknode.testnet.arc.network
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
   NEXT_PUBLIC_CHAIN_ID=5042002
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=b6d7afb94938b1fd9d9a72f7364fb905
   ```
7. Deploy
8. Verify `/api/v1/health` returns `{ status: "ok", chainId: 5042002 }`
9. Verify `/api/v1/resolve/name/test1.arc` returns a valid response
10. Update `docs/integration/public-adapter-api.md` with the public base URL

---

## 4. Rate Limiting on Vercel

Vercel does not provide built-in per-IP rate limiting on the free tier. Options:

**Option 1 — Vercel Edge Middleware (recommended for Tier 2C)**  
Add a `middleware.ts` file at `frontend/src/middleware.ts` that intercepts `/api/v1/*` requests and applies a simple in-memory or header-based throttle. This runs at the edge before the serverless function.

**Option 2 — Vercel Pro / Enterprise**  
Vercel Pro includes DDoS protection and rate limiting at the platform level. Not required for initial deployment.

**Option 3 — Cloudflare proxy**  
Point a custom domain through Cloudflare and use Cloudflare's rate limiting rules. Requires a custom domain.

For Tier 2C, Option 1 (Edge Middleware) is the minimal correct approach.

---

## 5. Future Decoupling Path

If the adapter needs to be separated from the frontend later:

1. Create `frontend-api/` directory with a minimal Next.js app
2. Copy the `src/app/api/v1/` routes and `src/lib/` adapter files
3. Deploy `frontend-api/` as a separate Vercel project
4. Update the public URL in all integration docs

This is a 2–4 hour task when the time comes. No adapter logic changes are needed.

---

*End of Tier 2B Adapter Hosting Plan*
