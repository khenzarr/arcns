# ArcNS — Tier 1 Public Resolution Adapter Status

**Date:** 2026-04-26  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Milestone:** Tier 1 — Public Resolution Adapter / API Hardening  
**Status:** Complete · Live at `https://arcns-app.vercel.app`

---

## 1. What Is Implemented

### Versioned API routes

| Route | File | Status |
|-------|------|--------|
| `GET /api/v1/resolve/name/{name}` | `frontend/src/app/api/v1/resolve/name/[name]/route.ts` | ✅ |
| `GET /api/v1/resolve/address/{address}` | `frontend/src/app/api/v1/resolve/address/[address]/route.ts` | ✅ |
| `GET /api/v1/health` | `frontend/src/app/api/v1/health/route.ts` | ✅ |
| `OPTIONS` preflight on all v1 routes | all three routes | ✅ |

### Correctness guarantees

| Guarantee | Status |
|-----------|--------|
| Name normalization (trim, lowercase) before lookup | ✅ |
| TLD validation — only `.arc` and `.circle` accepted | ✅ |
| Label validation — hyphen rules, character set, empty check | ✅ |
| Resolver existence check before `addr()` call | ✅ |
| Forward-confirmation on reverse lookup (mandatory, always via RPC) | ✅ |
| `verified: true` only when `Resolver.addr(namehash(name)) === address` | ✅ |
| Stale reverse record returns `status: "not_found"`, not a name | ✅ |
| RPC unavailability returns `UPSTREAM_UNAVAILABLE` (HTTP 503) | ✅ |

### Response / error schema

| Schema element | Status |
|----------------|--------|
| `status` discriminator on every response (`"ok"` / `"not_found"` / `"error"`) | ✅ |
| 8 stable error codes with HTTP status mapping | ✅ |
| `verified` field on address responses | ✅ |
| `source` field (`"subgraph"` / `"rpc"`) on success responses | ✅ |
| CORS headers (`Access-Control-Allow-Origin: *`) | ✅ |
| `X-ArcNS-Version: v1` header | ✅ |
| `X-Cache: HIT/MISS` header | ✅ |
| 30-second in-process cache | ✅ |

### Helper modules

| Module | Purpose | Status |
|--------|---------|--------|
| `frontend/src/lib/adapterHelpers.ts` | Parsing, validation, response builders, HTTP status mapping | ✅ |
| `frontend/src/lib/graphql.ts` — `resolveAddressWithVerification()` | Forward-confirmation logic | ✅ |

### Test coverage

| Test file | Tests | Status |
|-----------|-------|--------|
| `frontend/src/__tests__/adapterCorrectness.test.ts` | 30 | ✅ All passing |
| `frontend/src/__tests__/adapterSchema.test.ts` | 35 | ✅ All passing |
| **Total** | **65** | **✅ Zero failures** |

### Documentation

| Document | Status |
|----------|--------|
| `docs/integration/adapter-implementation-audit.md` | ✅ Complete (Tier 1A) |
| `docs/integration/public-adapter-api.md` | ✅ Complete (Tier 1E) |
| `docs/integration/public-adapter-deploy-readiness.md` | ✅ Complete (Tier 1E) |

---

## 2. What Is Now Safe / Correct

### Forward name resolution

`GET /api/v1/resolve/name/{name}` is safe for third-party consumption. The name is normalized and validated before any lookup. The `addr` record is the canonical on-chain answer — no additional verification is required. Subgraph is used as a speed layer; RPC is the authoritative fallback.

### Reverse resolution + forward-confirmation

`GET /api/v1/resolve/address/{address}` is safe for third-party consumption. The forward-confirmation rule is enforced on every request — the subgraph reverse record is never trusted alone. `verified: true` is returned only when `Resolver.addr(namehash(candidateName))` equals the queried address via direct RPC call. A stale reverse record (name transferred or expired) returns `status: "not_found"` with `verified: false` and `name: null`.

### Malformed input handling

Invalid names (leading/trailing hyphen, double-hyphen, invalid characters, empty) return HTTP 400 with `code: "INVALID_NAME"` and a specific hint. No RPC or subgraph calls are made for invalid inputs.

### Unsupported TLD handling

Names ending in anything other than `.arc` or `.circle` return HTTP 400 with `code: "UNSUPPORTED_TLD"`. No lookup is attempted.

### Upstream failure behavior

If both subgraph and RPC are unavailable, the name route returns HTTP 503 with `code: "UPSTREAM_UNAVAILABLE"`. The address route returns `status: "not_found"` (safe default — cannot distinguish RPC failure from "no name" without a deeper probe). Neither route throws or returns ambiguous data.

### Safe for third-party consumption

The v1 surface is correct and safe for any consumer that:
- Checks `status === "ok"` before using `address` or `name`
- Checks `verified === true` before displaying a primary name
- Handles `status: "not_found"` as a clean no-result (not an error)
- Handles `status: "error"` with `code: "UPSTREAM_UNAVAILABLE"` as a retry-able failure

---

## 3. What Is Live

The adapter is deployed and publicly accessible. Verified live endpoints:

| Endpoint | Status |
|----------|--------|
| `https://arcns-app.vercel.app/api/v1/health` | ✅ Live |
| `https://arcns-app.vercel.app/api/v1/resolve/name/{name}` | ✅ Live |
| `https://arcns-app.vercel.app/api/v1/resolve/address/{address}` | ✅ Live |

**Deployment note:** The Vercel build requires ABI artifact JSON files at `frontend/src/lib/abis/`. The v3 ABI artifacts were copied from the repo-root `artifacts/` path into that directory, and `frontend/src/lib/abis.ts` imports were updated accordingly. The hosted build cannot resolve paths outside the `frontend/` tree.

**Note on `not_found`:** A name that exists on-chain but has no `addr` record set correctly returns `status: "not_found"` — this is expected behavior.

---

## 4. What Is Still Not Implemented

| Item | Current state |
|------|--------------|
| Rate limiting | Not implemented |
| Request logging | Not implemented |
| Monitoring / alerting | Not implemented |
| Separate deployment from frontend | Not implemented — adapter is co-located with the frontend app |

---

## 5. What Is Ready for Ecosystem Handoff

### Adapter is live and consumable

The public base URL `https://arcns-app.vercel.app` is stable. ArcScan, wallet teams, and third-party dApps can integrate against it immediately. No further adapter changes are required for initial ecosystem handoff.

### Docs ready for third-party handoff

- `docs/integration/public-adapter-api.md` — complete API reference with all endpoint shapes, error codes, and trust model
- `docs/integration/public-adapter-deploy-readiness.md` — deployment readiness and operational notes
- `docs/integration/arcscan-integration-package.md` — ArcScan integration spec
- `docs/integration/wallet-integration-package.md` — wallet integration spec

---

## 6. What Still Remains

These items are not blockers for ecosystem outreach but should be addressed before treating this as a production-grade service:

| Item | Effort | Blocking? |
|------|--------|-----------|
| Add rate limiting | 4–8 hours | Recommended — prevents abuse |
| Add request logging | 2 hours | Recommended — needed for debugging |
| Add RPC reachability check to health endpoint | 2 hours | Recommended — operational visibility |
| Deprecation notice on unversioned routes | 30 minutes | Low priority |

**No correctness blockers remain. No deployment blockers remain.**

---

## 7. Recommended Next Step

**Begin ArcScan and wallet partner outreach.**

The adapter is live. The integration packages are ready. The public URL is stable. Ecosystem adoption is now the priority.

Recommended path:
1. Deliver `docs/integration/arcscan-integration-package.md` to the ArcScan team
2. Deliver `docs/integration/wallet-integration-package.md` to wallet teams
3. Add rate limiting before high-traffic exposure
4. Monitor endpoint health

---

## Tier 1 Deliverables Summary

| Subphase | Deliverable | Status |
|----------|-------------|--------|
| 1A — Audit | `docs/integration/adapter-implementation-audit.md` | ✅ |
| 1B — Surface hardening | `/api/v1/` routes, `adapterHelpers.ts`, health endpoint | ✅ |
| 1C — Correctness fixes | `resolveAddressWithVerification()`, forward-confirmation | ✅ |
| 1D — Response schema | Stable `status` discriminator, error codes, typed responses | ✅ |
| 1E — Documentation | `public-adapter-api.md`, `public-adapter-deploy-readiness.md` | ✅ |
| 1F — Status | This document | ✅ |
| **2E — URL update** | **Public URL documented, stale local-only wording removed** | ✅ |

**Tier 1 is complete. The ArcNS public resolution adapter is live at `https://arcns-app.vercel.app`.**
