# ArcNS — Tier 2 Public Adapter Deployment Status

**Date:** 2026-04-26  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Milestone:** Tier 2 — Public Adapter Deployment  
**Status:** Complete · Live at `https://arcns-app.vercel.app`

---

## 1. What Is Now Publicly Reachable

**Public base URL:** `https://arcns-app.vercel.app`

| Endpoint | Status |
|----------|--------|
| `GET https://arcns-app.vercel.app/api/v1/health` | ✅ Live |
| `GET https://arcns-app.vercel.app/api/v1/resolve/name/{name}` | ✅ Live |
| `GET https://arcns-app.vercel.app/api/v1/resolve/address/{address}` | ✅ Live |

**Hosting surface:** The adapter is co-located with the ArcNS Next.js frontend on Vercel. The `/api/v1/*` routes are standard Next.js App Router API routes served from the same deployment. This is acceptable for the current testnet phase.

**Deployment note:** The Vercel build requires ABI artifact JSON files at `frontend/src/lib/abis/`. The v3 ABI artifacts were copied from the repo-root `artifacts/` path into that directory, and `frontend/src/lib/abis.ts` imports were updated accordingly. The hosted build cannot resolve paths outside the `frontend/` tree.

---

## 2. What Guarantees the Live Adapter Provides

### Versioning and stability

- All public routes are under `/api/v1/`. The v1 response schema will not have breaking changes without a v2 path.
- Every response carries `X-ArcNS-Version: v1`.

### Input validation

- Names are normalized (trimmed, lowercased) before any lookup.
- TLD validation enforced — only `.arc` and `.circle` are accepted. All other TLDs return `UNSUPPORTED_TLD` (HTTP 400).
- Label validation enforced — leading/trailing hyphens, double-hyphen at positions 2–3, invalid characters, and empty labels are rejected with `INVALID_NAME` (HTTP 400).
- Addresses are validated as 0x-prefixed 42-character hex strings before any lookup. Invalid inputs return `INVALID_ADDRESS` (HTTP 400).
- No RPC or subgraph calls are made for invalid inputs.

### Forward resolution correctness

- `GET /api/v1/resolve/name/{name}` returns the canonical `Resolver.addr(namehash(name))` value.
- Subgraph is used as a speed layer; RPC is the authoritative fallback.
- A name that exists on-chain but has no `addr` record set returns `status: "not_found"` — this is correct behavior, not an error.

### Reverse resolution + forward-confirmation

- `GET /api/v1/resolve/address/{address}` enforces forward-confirmation on every request.
- The subgraph reverse record is never trusted alone. Step 3 (`Resolver.addr(namehash(candidateName))`) is always performed via direct RPC.
- `verified: true` is returned only when the forward-confirmed address matches the queried address.
- A stale reverse record (name transferred or expired after the reverse record was set) returns `status: "not_found"` with `verified: false` and `name: null`. Consumers must not display a name in this case.

### Response and error schema

- Every response has a top-level `status` field: `"ok"` / `"not_found"` / `"error"`.
- 8 stable error codes with consistent HTTP status mapping (`INVALID_NAME`, `INVALID_ADDRESS`, `UNSUPPORTED_TLD`, `MALFORMED_INPUT`, `NOT_FOUND`, `VERIFICATION_FAILED`, `UPSTREAM_UNAVAILABLE`, `INTERNAL_ERROR`).
- `source` field (`"subgraph"` / `"rpc"`) on all success responses.
- `verified` field on all address resolution responses.

### CORS and caching

- `Access-Control-Allow-Origin: *` on all responses — safe for browser-based consumers.
- `OPTIONS` preflight handlers on all v1 routes.
- 30-second in-process cache with `X-Cache: HIT/MISS` header.
- Health endpoint served with `Cache-Control: public, max-age=0`.

### Upstream failure behavior

- If both subgraph and RPC are unavailable, the name route returns HTTP 503 with `UPSTREAM_UNAVAILABLE`.
- The address route returns `status: "not_found"` as a safe default when RPC is unreachable.

### What is not yet hardened

- Rate limiting: not implemented. The adapter is open to abuse at high request volumes.
- Request logging: not implemented.
- Monitoring / alerting: not implemented.
- The in-process cache does not survive process restarts and is not shared across instances.

---

## 3. What Third Parties Can Consume Right Now

### Explorers (e.g. ArcScan)

ArcScan can integrate against the live adapter today:

- Name search: detect `.arc` / `.circle` suffix, call `GET /api/v1/resolve/name/{name}`, display `address` on `status: "ok"`.
- Address page primary name: call `GET /api/v1/resolve/address/{address}`, display `name` only when `status: "ok"` and `verified: true`.
- No namehash computation or RPC client required — the adapter handles it.

**Caveat:** Rate limiting is not yet implemented. ArcScan should not drive high-volume automated requests against the adapter until rate limiting is in place. Coordinate with the ArcNS team before production-scale use.

### Wallets

Wallet teams can use the adapter for display-layer resolution:

- Recipient name resolution: call `GET /api/v1/resolve/name/{name}` to resolve a typed name to an address for display confirmation.
- Primary name display: call `GET /api/v1/resolve/address/{address}` and display `name` only when `verified: true`.

**Security caveat:** For transaction routing (sending funds), wallets must independently verify the returned address via direct `Resolver.addr()` RPC call before executing the transaction. The adapter is acceptable as a display hint; it is not a substitute for on-chain verification in security-critical flows.

### Third-party dApps

Any dApp on Arc Testnet can call the adapter via simple HTTP GET with no API key, no authentication, and no ArcNS SDK dependency. CORS is open. The response schema is stable and versioned.

**Caveat:** The adapter is testnet-only. It resolves names on Arc Testnet (Chain ID: 5042002) only. There is no mainnet deployment.

---

## 4. What Still Remains Before Full Ecosystem Handoff

### Operational hardening (no correctness impact)

| Item | Impact if missing | Effort |
|------|-------------------|--------|
| Rate limiting | Adapter is open to abuse; high-volume consumers could degrade RPC capacity | ~1 day |
| Request logging | No visibility into usage patterns or error rates | ~2 hours |
| RPC reachability check in health endpoint | Health endpoint does not reflect actual upstream availability | ~2 hours |
| Monitoring / alerting | No automated notification if the adapter goes down | Depends on infra |

None of these affect the correctness of resolution results. They are operational requirements for treating this as a production-grade public service.

### Hosting model

The adapter is co-located with the frontend on Vercel. This is acceptable for testnet. For production:
- A dedicated deployment decouples adapter availability from frontend availability.
- A shared cache layer (Redis) would be required for multi-instance deployments.
- No SLA or uptime commitment exists today.

### Third-party adoption

The adapter being live does not automatically produce ecosystem integrations. ArcScan, wallet teams, and dApp developers must each independently build against it. The integration packages are ready; the outreach has not yet begun.

---

## 5. Recommended Next Step

**Begin ArcScan outreach.**

ArcScan is the highest-leverage first integration. A block explorer showing ArcNS names on address pages and in search results is immediately visible to all Arc Testnet users and provides concrete proof of ecosystem adoption. The integration package (`docs/integration/arcscan-integration-package.md`) is complete and ready to hand off.

Parallel to outreach: add rate limiting before ArcScan or any partner drives meaningful traffic against the adapter.

After ArcScan outreach is initiated, the next priority is wallet partner outreach using `docs/integration/wallet-integration-package.md`.

---

## Tier 2 Deliverables Summary

| Subphase | Deliverable | Status |
|----------|-------------|--------|
| 2A — Hosting plan | `docs/integration/adapter-hosting-plan.md` | ✅ |
| 2B — Deployment audit | `docs/integration/adapter-deployment-audit.md` | ✅ |
| 2C — ABI artifact fix | `frontend/src/lib/abis/` populated, `abis.ts` imports updated | ✅ |
| 2D — Vercel deployment | Adapter live at `https://arcns-app.vercel.app` | ✅ |
| 2E — Docs / URL update | All integration docs updated with live URL, stale wording removed | ✅ |
| 2F — Final status | This document | ✅ |

**Tier 2 is complete. The ArcNS public resolution adapter is live, correct, and ready for ecosystem integration outreach.**
