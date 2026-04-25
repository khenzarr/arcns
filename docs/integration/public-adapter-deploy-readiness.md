# ArcNS Public Resolution Adapter — Deployment Readiness

**Date:** 2026-04-26  
**Status:** Live · Publicly hosted on Vercel  
**Public base URL:** `https://arcns-app.vercel.app`

---

## 1. Current State

### What is implemented and live

The adapter is deployed and publicly accessible at `https://arcns-app.vercel.app`. The following endpoints are verified live:

| Endpoint | Status |
|----------|--------|
| `https://arcns-app.vercel.app/api/v1/health` | ✅ Live |
| `https://arcns-app.vercel.app/api/v1/resolve/name/{name}` | ✅ Live |
| `https://arcns-app.vercel.app/api/v1/resolve/address/{address}` | ✅ Live |

**Note on `not_found` responses:** A name that exists on-chain but has no `addr` record set (e.g. `test1.arc`) correctly returns `status: "not_found"` with hint `"Name has no address record set."` — this is expected and correct behavior, not a bug.

**Deployment note:** The Vercel build requires ABI artifact JSON files to be present at `frontend/src/lib/abis/`. The v3 ABI artifacts were copied from the repo-root `artifacts/` path into that directory, and `frontend/src/lib/abis.ts` imports were updated accordingly. The hosted build cannot resolve paths outside the `frontend/` tree.

| Capability | Status |
|------------|--------|
| `GET /api/v1/resolve/name/{name}` | ✅ Implemented and live |
| `GET /api/v1/resolve/address/{address}` | ✅ Implemented and live |
| `GET /api/v1/health` | ✅ Implemented and live |
| Name normalization and TLD validation | ✅ Implemented |
| Forward-confirmation on reverse lookup | ✅ Implemented |
| `verified` field on address responses | ✅ Implemented |
| Stable `status` discriminator on all responses | ✅ Implemented |
| Stable error codes (`INVALID_NAME`, `UNSUPPORTED_TLD`, etc.) | ✅ Implemented |
| CORS headers (`Access-Control-Allow-Origin: *`) | ✅ Implemented |
| `X-ArcNS-Version: v1` header | ✅ Implemented |
| CORS preflight (`OPTIONS`) handlers | ✅ Implemented |
| In-process 30s cache with `X-Cache` header | ✅ Implemented |
| HTTP 503 for upstream unavailability | ✅ Implemented |
| Subgraph-first with RPC fallback | ✅ Implemented |
| 65 passing adapter tests | ✅ Passing |

### What is still not implemented

| Item | Current state |
|------|--------------|
| Rate limiting | Not implemented |
| Request logging | Not implemented |
| Monitoring / alerting | Not implemented |
| Separate deployment from frontend | Not implemented — adapter is co-located with the frontend app |

---

## 2. What Remains Before Full Production Readiness

The adapter is publicly accessible. The following items are not yet implemented and should be addressed before treating this as a production-grade public service.

### 2.1 Hosting model

The adapter is co-located with the Next.js frontend on Vercel. This is acceptable for the current testnet phase. For production:

**Option B — Extract the adapter as a standalone service**  
Move the adapter routes to a separate Next.js or Node.js service with its own deployment. This decouples adapter availability from frontend availability and allows independent scaling.

### 2.2 CORS policy

CORS is already implemented with `Access-Control-Allow-Origin: *`. This is correct for a public read-only API. No changes needed unless a restricted allowlist is required.

### 2.3 Rate limiting

Not yet implemented. Required before public exposure to prevent abuse.

**Recommendation:** Add per-IP rate limiting at the edge or middleware layer.
- Suggested limit: 60 requests/minute per IP for resolution endpoints
- Suggested limit: 120 requests/minute per IP for health endpoint
- Implementation options: Vercel Edge Middleware, Cloudflare Workers, or a Next.js middleware with an in-memory or Redis-backed counter

### 2.4 Health and readiness

The `/api/v1/health` endpoint is implemented and returns chain context. It does not make RPC calls.

For a production deployment, consider adding:
- An RPC reachability check to the health endpoint (returns `status: "degraded"` if all RPC endpoints are unreachable)
- A `/api/v1/ready` endpoint that confirms the subgraph is reachable and not severely lagged

### 2.5 Monitoring and logging

Not yet implemented. Recommended before public exposure:
- Request logging: method, path, status code, response time, `X-Cache` value
- Error rate alerting: alert if 5xx rate exceeds threshold
- Upstream availability monitoring: periodic health checks against Arc Testnet RPC endpoints

### 2.6 API stability and versioning

The `/api/v1/` prefix is in place. The response schema is stable as of Tier 1D. Before public announcement:
- Document the stability guarantee: v1 schema will not have breaking changes without a v2 path
- Define a deprecation policy for the unversioned routes (`/api/resolve/*`)

### 2.7 Cache TTL review

The current 30-second in-process cache is acceptable for display latency. For a public deployment:
- Consider whether the TTL should be configurable via environment variable
- Document the cache TTL in the API reference so consumers understand freshness expectations
- The in-process cache does not survive process restarts — acceptable for a single-instance deployment; not suitable for multi-instance without a shared cache layer (Redis)

---

## 3. Security and Abuse Considerations

### Read-only surface

The adapter is entirely read-only. It makes no write transactions. There is no authentication surface to attack.

### RPC endpoint exposure

The adapter calls Arc Testnet RPC endpoints. If the adapter is publicly hosted, it acts as a proxy for RPC calls. This means:
- A high-volume attacker could use the adapter to amplify RPC load
- Rate limiting (§2.3) is the primary mitigation
- Consider using a private/dedicated RPC endpoint for the adapter rather than the public endpoints

### Subgraph dependency

The subgraph is used as a speed layer. If the subgraph is unavailable, the adapter falls back to RPC. This is correct behavior. The subgraph is not a security-critical dependency.

### Cache poisoning

The in-process cache stores resolution results. A malicious name or address cannot inject incorrect data — the cache is populated only from on-chain reads and subgraph queries. No user-supplied data is stored in the cache without first being validated and normalized.

### Input validation

All inputs are validated before any lookup:
- Names: normalized, TLD-checked, label-validated
- Addresses: hex-validated, length-checked

Malformed inputs are rejected at the validation layer with HTTP 400. No RPC or subgraph calls are made for invalid inputs.

---

## 4. Operational Recommendations

1. **Use a dedicated RPC endpoint** for the adapter in production — not the public Arc Testnet RPC. This prevents the adapter from competing with user transactions for RPC capacity.

2. **Deploy the adapter separately from the frontend** once traffic warrants it. The frontend and adapter have different scaling profiles.

3. **Set `NEXT_PUBLIC_SUBGRAPH_URL` in the deployment environment.** Without it, the subgraph is disabled and all resolution falls back to RPC. This is correct but slower.

4. **Monitor the subgraph lag.** If the subgraph falls significantly behind chain head, forward resolution results may be stale. The `source: "rpc"` field in responses indicates when RPC was used as fallback.

5. **Do not cache the health endpoint.** It is already configured with `Cache-Control: public, max-age=0`.

6. **Document the public URL** in `docs/integration/public-adapter-api.md` once a stable host is chosen.

---

## 5. Readiness Checklist

### Done

- [x] Versioned API surface (`/api/v1/`)
- [x] Stable response schema with `status` discriminator
- [x] All 8 error codes defined and mapped to HTTP status codes
- [x] CORS headers on all responses
- [x] Forward-confirmation on reverse lookup
- [x] Name normalization and TLD validation
- [x] Subgraph-first with RPC fallback
- [x] In-process cache with `X-Cache` header
- [x] CORS preflight (`OPTIONS`) handlers
- [x] Health endpoint
- [x] 65 passing adapter tests
- [x] **Deployed to public host** — `https://arcns-app.vercel.app`
- [x] **Public endpoints verified live**

### Ready with small changes

- [ ] Rate limiting — add Next.js middleware or edge config (~1 day)
- [ ] RPC reachability check in health endpoint (~2 hours)
- [ ] Request logging — add middleware (~2 hours)
- [ ] Cache TTL configurable via env var (~1 hour)
- [ ] Deprecation notice on unversioned routes (~30 minutes)

### Not yet done (post-testnet / production path)

- [ ] Dedicated RPC endpoint for production
- [ ] Multi-instance cache (Redis) if horizontal scaling is needed
- [ ] Monitoring and alerting infrastructure
- [ ] SLA / uptime commitment
- [ ] Separate adapter deployment from frontend

---

## 6. Time to Public Deployment

**Deployment is complete.** The adapter is live at `https://arcns-app.vercel.app`.

The remaining work items (rate limiting, logging, monitoring) are operational improvements for production hardening, not blockers for ecosystem integration outreach.
