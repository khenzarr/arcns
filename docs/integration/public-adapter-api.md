# ArcNS Public Resolution Adapter — API Reference

**Version:** v1  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Live · Publicly hosted  
**Public base URL:** `https://arcns-app.vercel.app`  
**Base path:** `/api/v1`

---

## Public Endpoints

The adapter is live and publicly accessible:

| Endpoint | URL |
|----------|-----|
| Health | `https://arcns-app.vercel.app/api/v1/health` |
| Name resolution | `https://arcns-app.vercel.app/api/v1/resolve/name/{name}` |
| Address resolution | `https://arcns-app.vercel.app/api/v1/resolve/address/{address}` |

---

## Purpose

The ArcNS Resolution Adapter is the canonical HTTP interface for resolving ArcNS names and addresses. It wraps the on-chain resolution protocol in a simple, versioned REST API that explorers, wallets, and third-party integrators can consume without implementing namehash computation or direct RPC calls.

The adapter does not replace on-chain resolution — it implements it correctly. All resolution is ultimately grounded in `eth_call` against Arc Testnet contracts. The subgraph is used as a speed layer only.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/v1/resolve/name/{name}` | Resolve ArcNS name → EVM address |
| `GET` | `/api/v1/resolve/address/{address}` | Resolve EVM address → verified primary name |
| `GET` | `/api/v1/health` | Adapter liveness and chain context |

All endpoints support `OPTIONS` for CORS preflight.

---

## Response Schema

Every response has a top-level `status` field. Consumers should switch on `status` first.

| `status` | HTTP | Meaning |
|----------|------|---------|
| `"ok"` | 200 | Request succeeded; result fields are populated |
| `"not_found"` | 200 | Request was valid but no on-chain result exists |
| `"error"` | 400 / 503 / 500 | Request failed; `code` and `hint` describe the failure |

---

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `INVALID_NAME` | 400 | Name fails normalization or label validation |
| `INVALID_ADDRESS` | 400 | Address is not a valid 0x hex string |
| `UNSUPPORTED_TLD` | 400 | TLD is not `.arc` or `.circle` |
| `MALFORMED_INPUT` | 400 | Input is missing or wrong type |
| `NOT_FOUND` | 400 | Reserved for explicit not-found error cases |
| `VERIFICATION_FAILED` | 400 | Reserved for explicit verification failure cases |
| `UPSTREAM_UNAVAILABLE` | 503 | RPC or subgraph is unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected adapter-level failure |

---

## Response Headers

All v1 responses include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Cache-Control: public, max-age=30   (0 for health)
X-ArcNS-Version: v1
X-Cache: HIT | MISS
```

---

## `GET /api/v1/resolve/name/{name}`

Resolves a full ArcNS name to its EVM address record.

**Name rules:**
- Must end in `.arc` or `.circle`
- Label is normalized to lowercase before lookup
- Leading/trailing hyphens, double-hyphen at positions 2–3, and invalid ASCII characters are rejected

### Successful resolution

```
GET /api/v1/resolve/name/alice.arc
```

```json
{
  "status":  "ok",
  "name":    "alice.arc",
  "address": "0xabc123def456abc123def456abc123def456abc1",
  "owner":   "0xabc123def456abc123def456abc123def456abc1",
  "expiry":  1800000000,
  "source":  "subgraph"
}
```

`source` is `"subgraph"` when the result came from the indexed data layer, `"rpc"` when it came from a direct contract call.

### Name exists but no address record set

```
GET /api/v1/resolve/name/unset.arc
```

```json
{
  "status": "not_found",
  "hint":   "Name has no address record set."
}
```

### Invalid name — label validation failure

```
GET /api/v1/resolve/name/-bad.arc
```

```json
{
  "status": "error",
  "code":   "INVALID_NAME",
  "hint":   "Name cannot start with a hyphen."
}
```

### Unsupported TLD

```
GET /api/v1/resolve/name/alice.eth
```

```json
{
  "status": "error",
  "code":   "UNSUPPORTED_TLD",
  "hint":   "Unsupported TLD \".eth\". ArcNS supports: .arc, .circle"
}
```

### Upstream unavailable

```json
{
  "status": "error",
  "code":   "UPSTREAM_UNAVAILABLE",
  "hint":   "Resolution service is temporarily unavailable."
}
```

HTTP 503.

---

## `GET /api/v1/resolve/address/{address}`

Resolves an EVM address to its verified primary ArcNS name.

**Critical:** `verified: true` requires both:
1. `Resolver.name(reverseNode)` returns a non-empty name
2. `Resolver.addr(namehash(name))` equals the queried address (forward-confirmation via RPC)

Consumers **must** check `status === "ok"` before displaying a primary name. A `status: "not_found"` response means either no primary name is set, or the reverse record exists but is stale.

### Verified primary name found

```
GET /api/v1/resolve/address/0xabc123def456abc123def456abc123def456abc1
```

```json
{
  "status":   "ok",
  "address":  "0xabc123def456abc123def456abc123def456abc1",
  "name":     "alice.arc",
  "verified": true,
  "source":   "subgraph"
}
```

### No verified primary name (not set, or stale record)

```json
{
  "status":   "not_found",
  "address":  "0xabc123def456abc123def456abc123def456abc1",
  "name":     null,
  "verified": false,
  "hint":     "No verified primary name for this address."
}
```

HTTP 200. This covers both "no primary name set" and "reverse record exists but forward-confirmation failed (stale)". Consumers should treat both identically — do not display a name.

### Invalid address

```
GET /api/v1/resolve/address/notanaddress
```

```json
{
  "status": "error",
  "code":   "INVALID_ADDRESS",
  "hint":   "Address must be a 0x-prefixed 42-character hex string."
}
```

HTTP 400.

---

## `GET /api/v1/health`

Returns adapter liveness and chain context. Does not make RPC calls.

```json
{
  "status":    "ok",
  "chainId":   5042002,
  "network":   "arc_testnet",
  "version":   "v1",
  "timestamp": 1745600000
}
```

`status` is `"ok"` when the adapter process is alive and configured correctly. `"degraded"` is reserved for future use (e.g. RPC reachability check).

For a deeper liveness check, call `/api/v1/resolve/name/{known-name}` and verify a non-error response.

---

## Verification / Trust Model

### Forward resolution (`/resolve/name`)

The `addr` record is set by the name owner via an authenticated on-chain transaction. No additional verification is required. The result of `Resolver.addr(namehash(name))` is the canonical answer.

**Subgraph role:** Speed layer. The subgraph `resolvedAddress` field is used first to avoid unnecessary RPC calls. If the subgraph is unavailable or returns no result, the adapter falls back to direct RPC.

**Trust:** Full trust in the on-chain `addr` record. Subgraph result is accepted for display latency; RPC is the authoritative fallback.

### Reverse resolution (`/resolve/address`)

The reverse record (`Resolver.name(reverseNode)`) can become stale if the name is transferred or expires after the reverse record was set. The adapter enforces the forward-confirmation rule on every request:

```
Step 1: Get reverse record → candidateName  (subgraph-first, RPC fallback)
Step 2: Compute forwardNode = namehash(candidateName)
Step 3: resolvedAddr = Resolver.addr(forwardNode)  (always via RPC)
Step 4: verified = (resolvedAddr.toLowerCase() === address.toLowerCase())
Step 5: if verified → return { status: "ok", name: candidateName, verified: true }
        if not verified → return { status: "not_found", name: null, verified: false }
```

Step 3 is **always performed via RPC** — never from the subgraph. The subgraph `ReverseRecord` entity is not forward-confirmed and must not be trusted alone.

**What the adapter trusts:**
- `Resolver.addr(node)` — full trust (on-chain, authenticated)
- `Resolver.name(reverseNode)` — partial trust (can be stale; always forward-confirmed)
- Subgraph `resolvedAddress` — convenience only (speed layer for forward resolution)
- Subgraph `ReverseRecord.name` — convenience only (speed layer for reverse lookup step 1 only)

**What the adapter does not trust:**
- Subgraph alone for primary name display
- Cached results for correctness-critical operations

### Cache TTL

The adapter uses a 30-second in-process cache. A `verified: true` result cached at time T may become stale if the name is transferred within the TTL window. This is acceptable for display latency. Consumers requiring real-time accuracy should not rely on cached results and should call the adapter with cache-busting or implement direct RPC.

---

## Intended Consumers

| Consumer | Primary use |
|----------|-------------|
| ArcNS app (frontend) | Forward resolution, reverse resolution, primary name display |
| ArcScan (block explorer) | Name search, address page primary name, token page labels |
| Wallet teams | Recipient name resolution, address display labels |
| Third-party dApps | Resolve names before sending transactions |

For security-critical operations (e.g. wallet recipient resolution before sending funds), consumers should independently verify the returned address via direct RPC rather than relying solely on the adapter response.
