# ArcNS Resolution Adapter — Implementation Audit

**Phase:** Tier 1A  
**Date:** 2026-04-25  
**Audited against:** Phase 8B Resolution Adapter Design (`docs/integration/resolution-adapter-design.md`)  
**Status:** Gaps identified — Tier 1B implementation required

---

## 1. Files Audited

| File | Role |
|------|------|
| `frontend/src/app/api/resolve/name/[name]/route.ts` | HTTP route — forward resolution |
| `frontend/src/app/api/resolve/address/[address]/route.ts` | HTTP route — reverse resolution |
| `frontend/src/lib/graphql.ts` | Resolution logic — `resolveName()`, `resolveAddress()` |
| `frontend/src/lib/namehash.ts` | Hashing — `namehash()`, `reverseNodeFor()` |
| `frontend/src/lib/normalization.ts` | Validation — `normalizeLabel()`, `validateLabel()`, `SUPPORTED_TLDS` |
| `frontend/src/lib/contracts.ts` | Contract descriptors and address exports |

---

## 2. Gap Analysis

### 2.1 CRITICAL — Forward-confirmation missing on reverse lookup

**File:** `graphql.ts` → `resolveAddress()` and `route.ts` → `/api/resolve/address/[address]`

**What the design requires:**
```
Step 1: Get reverse record → name
Step 2: namehash(name) → forwardNode
Step 3: Resolver.addr(forwardNode) must equal the queried address
Step 4: Only if step 3 passes → return name with verified: true
```

**What the implementation does:**
- Subgraph path: returns `rev.name` directly from the subgraph `ReverseRecord` entity with no forward-confirmation
- RPC path: reads `Resolver.name(reverseNode)` and returns the result with no forward-confirmation
- Response: returns `{ address, name, source }` — no `verified` field at all

**Impact:** Any consumer of this endpoint receives a primary name that may be stale (name transferred or expired). The endpoint is actively unsafe for primary name display. This is the single most important correctness gap.

---

### 2.2 CRITICAL — No `verified` field in address response

**File:** `route.ts` → `/api/resolve/address/[address]`

**What the design requires:**
```json
{ "address": "0x...", "name": "alice.arc", "verified": true, "source": "rpc" }
```

**What the implementation returns:**
```json
{ "address": "0x...", "name": "alice.arc", "source": "subgraph" }
```

**Impact:** Consumers cannot distinguish between a verified primary name and an unverified one. The `verified` field is the critical signal that the Phase 8 design defines as mandatory.

---

### 2.3 HIGH — No name normalization in the name route

**File:** `route.ts` → `/api/resolve/name/[name]`

**What the design requires:**
- Normalize: `name.trim().toLowerCase()`
- Validate label against ArcNS rules (leading/trailing hyphen, double-hyphen, invalid chars)
- Validate TLD is `arc` or `circle`
- Return structured error on validation failure

**What the implementation does:**
- Applies `.toLowerCase()` only
- Validates only `name.length < 3` — no structural validation
- No TLD validation — `alice.eth`, `alice.`, `alice` all pass through
- No label validation — `--alice.arc`, `-bad.arc` pass through

**Impact:** Invalid names reach the subgraph and RPC layer. Unsupported TLDs are silently processed. Malformed names produce silent null results rather than structured errors.

---

### 2.4 HIGH — No TLD validation in either route

**File:** both routes

**What the design requires:**
- Reject names with TLDs outside `["arc", "circle"]`
- Return `{ error: "UNSUPPORTED_TLD", hint: "..." }` with HTTP 400

**What the implementation does:**
- No TLD check in either route
- `alice.eth` would be processed as a valid name query

---

### 2.5 HIGH — No resolver existence check in forward resolution

**File:** `graphql.ts` → `resolveName()` RPC path

**What the design requires:**
```
resolverAddr = Registry.resolver(node)
if resolverAddr == address(0): return { address: null } // no resolver set
```

**What the implementation does:**
- RPC path: checks `resolverAddr === ZERO` and returns null — this part is correct
- Subgraph path: returns `domain.resolvedAddress ?? domain.resolverRecord?.addr ?? null` — does not distinguish "no resolver set" from "resolver set but no addr record"

**Impact:** Minor for correctness (both cases return `null`), but the response cannot distinguish the two states, which matters for error messaging to consumers.

---

### 2.6 MEDIUM — No versioning on routes

**File:** both routes

**What the design requires:**
- Routes should be at `/api/v1/resolve/name/[name]` and `/api/v1/resolve/address/[address]`
- Versioning allows breaking changes without breaking existing consumers

**What the implementation has:**
- `/api/resolve/name/[name]` — no version prefix
- `/api/resolve/address/[address]` — no version prefix

---

### 2.7 MEDIUM — No CORS headers

**File:** both routes

**What the design requires:**
- `Access-Control-Allow-Origin: *` (or configurable allowlist) for public API consumption
- Without CORS headers, browser-based third-party consumers cannot call the API

**What the implementation has:**
- No CORS headers on any response

---

### 2.8 MEDIUM — Inconsistent and unstructured error responses

**File:** both routes

**What the design requires:**
```json
{ "error": "INVALID_NAME", "hint": "Names cannot start with a hyphen." }
```

**What the implementation returns:**
```json
{ "error": "invalid name" }   // name route
{ "error": "invalid address" } // address route
```

- No machine-readable error codes
- No `hint` field
- No distinction between `INVALID_NAME`, `UNSUPPORTED_TLD`, `MALFORMED_INPUT`

---

### 2.9 MEDIUM — No health endpoint

**What the design requires:**
- `GET /api/v1/health` returning `{ status: "ok", chainId: 5042002, blockNumber: N }`

**What exists:**
- No health endpoint

---

### 2.10 LOW — `resolveAddress()` uses `namehash()` for reverse node instead of `reverseNodeFor()`

**File:** `graphql.ts` → `resolveAddress()` RPC path

**What the implementation does:**
```typescript
const reverseNode = namehash(`${hexAddr}.addr.reverse`) as `0x${string}`;
```

**What `namehash.ts` provides:**
```typescript
export function reverseNodeFor(addr: `0x${string}`): `0x${string}`
// Uses: keccak256(NAMEHASH_ADDR_REVERSE || keccak256(hexAddr))
```

Both approaches produce the same result for well-formed addresses. However, `reverseNodeFor()` is the canonical function and uses the pre-computed `NAMEHASH_ADDR_REVERSE` constant from `generated-contracts.ts`. The `graphql.ts` implementation bypasses this and constructs the string manually. This is a consistency issue, not a correctness bug — but it should be unified.

---

### 2.11 LOW — Cache does not distinguish verified vs unverified results

**File:** both routes

The 30-second in-process cache stores raw results. After the forward-confirmation fix is applied, the cache must store the `verified` state alongside the name. A cached `verified: true` result that was correct 30 seconds ago may no longer be correct if the name was transferred in that window. This is acceptable for display latency but must be documented.

---

### 2.12 LOW — No rate limiting

**File:** both routes

No per-IP or per-key rate limiting. Acceptable for local use; required before public hosting.

---

## 3. Summary Table

| Gap | Severity | Route(s) affected | Blocks public use? |
|-----|----------|------------------|-------------------|
| No forward-confirmation on reverse lookup | CRITICAL | `/address/` | Yes |
| No `verified` field in response | CRITICAL | `/address/` | Yes |
| No name normalization | HIGH | `/name/` | Yes |
| No TLD validation | HIGH | both | Yes |
| No resolver existence distinction | HIGH | `/name/` | Partial |
| No versioning | MEDIUM | both | No (but required before handoff) |
| No CORS headers | MEDIUM | both | Yes (for browser consumers) |
| Unstructured error responses | MEDIUM | both | No (but degrades DX) |
| No health endpoint | MEDIUM | — | No |
| `reverseNodeFor()` not used | LOW | `/address/` | No |
| Cache doesn't store `verified` | LOW | `/address/` | No (after fix) |
| No rate limiting | LOW | both | No (local only) |

---

## 4. What Is Correct

The following aspects of the current implementation are correct and should be preserved:

- `namehash()` implementation in `namehash.ts` — correct EIP-137 recursive keccak256
- `reverseNodeFor()` in `namehash.ts` — correct reverse node computation
- `normalizeLabel()` and `validateLabel()` in `normalization.ts` — correct and complete; just not called from the API routes
- `SUPPORTED_TLDS` in `normalization.ts` — correct; just not used in the routes
- RPC fallback transport in `publicClient.ts` — correct three-endpoint fallback
- Subgraph-first strategy in `resolveName()` — correct pattern; just needs normalization applied before it
- `resolverAddr === ZERO` guard in `resolveName()` RPC path — correct
- 30-second cache with `X-Cache` headers — acceptable for display use

---

## 5. Implementation Plan for Tier 1B–1D

The following changes are required, in priority order:

1. **Add forward-confirmation to `resolveAddress()`** in `graphql.ts` — after getting the reverse name, call `Resolver.addr(namehash(name))` and compare to the queried address
2. **Add `verified: boolean` to the address route response**
3. **Add name normalization and TLD validation to the name route** — use existing `normalizeLabel()`, `validateLabel()`, and `SUPPORTED_TLDS` from `normalization.ts`
4. **Add TLD validation to the address route** (not applicable — address routes don't take names)
5. **Create versioned routes** at `/api/v1/resolve/name/[name]` and `/api/v1/resolve/address/[address]`
6. **Add CORS headers** to all v1 route responses
7. **Standardize error response schema** with machine-readable codes
8. **Add health endpoint** at `/api/v1/health`
9. **Switch `resolveAddress()` to use `reverseNodeFor()`** from `namehash.ts`

---

*End of Tier 1A Adapter Implementation Audit*
