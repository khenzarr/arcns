# ArcNS Public Resolution Adapter — API Reference

**Version:** v1  
**Network:** Arc Mainnet (Chain ID: 5042)
**Status:** Live · Publicly hosted  
**Public base URL:** `https://arcname.services`
**Base path:** `/api/v1`

---

## Public Endpoints

The adapter is live and publicly accessible:

| Endpoint | URL |
|----------|-----|
| Health | `https://arcname.services/api/v1/health` |
| Name resolution | `https://arcname.services/api/v1/resolve/name/{name}` |
| Address resolution | `https://arcname.services/api/v1/resolve/address/{address}` |

---

## Purpose

The ArcNS Resolution Adapter is the canonical HTTP interface for resolving ArcNS names and addresses. It wraps the on-chain resolution protocol in a simple, versioned REST API that explorers, wallets, and third-party integrators can consume without implementing namehash computation or direct RPC calls.

The adapter does not replace on-chain resolution — it implements it against the deployed Arc Mainnet contracts. Resolution is ultimately grounded in on-chain resolver records. The indexed data layer is used as a speed layer, with direct RPC fallback.

## Five-minute integration

No API key, SDK, contract ABI, or namehash implementation is required for the HTTP integration.

```ts
const API = "https://arcname.services/api/v1";

export async function resolveArcNSName(name: string) {
  const normalized = name.trim().toLowerCase();
  const response = await fetch(
    `${API}/resolve/name/${encodeURIComponent(normalized)}`,
    { headers: { Accept: "application/json" } },
  );
  const result = await response.json();

  if (!response.ok || result.status !== "ok") {
    throw new Error(result.hint ?? "ArcNS resolution failed");
  }

  return result.address as `0x${string}`;
}
```

For recipient fields, resolve again immediately before constructing the transaction and show both the entered name and the complete destination address before requesting a signature. Always retain direct `0x` address input as a fallback.

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
| `"error"` | 400 / 429 / 503 / 500 | Request failed; `code` and `hint` describe the failure |

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
| `RATE_LIMITED` | 429 | Too many requests from the current client; respect `Retry-After` |
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
X-RateLimit-Limit: <endpoint limit>
X-RateLimit-Remaining: <requests remaining in the current window>
X-RateLimit-Reset: <Unix timestamp>
```

Cached `ok` and `not_found` resolution responses also include `X-Cache: HIT | MISS`. Validation and upstream-error responses may omit it. The health endpoint does not use the resolution cache.

Current published limits are 60 resolution requests per minute per IP and 120 health requests per minute per IP. Enforcement is per running edge instance, so consumers must treat the headers as the current instance's limit rather than as a global quota guarantee. A rate-limited request returns HTTP 429:

```json
{
  "status": "error",
  "code": "RATE_LIMITED",
  "hint": "Too many requests. Please slow down and retry after the reset time."
}
```

The response includes `Retry-After`. High-volume explorers, trading terminals, activity feeds, and portfolio tables should use a backend proxy with caching and request coalescing instead of making one browser request per rendered row. Contact the ArcNS team before relying on the public adapter for sustained high-volume traffic.

---

## `GET /api/v1/resolve/name/{name}`

Resolves a full ArcNS name to its EVM address record.

**Name rules:**
- Must end in `.arc` or `.circle`
- Label is normalized to lowercase before lookup
- Leading/trailing hyphens, double-hyphen at positions 2–3, and invalid ASCII characters are rejected

### Successful resolution

```
GET /api/v1/resolve/name/iscander.arc
```

```json
{
  "status":  "ok",
  "name":    "iscander.arc",
  "address": "0x503B20B4342261a205830Fd55794788463bdE74B",
  "owner":   "0x503B20B4342261a205830Fd55794788463bdE74B",
  "expiry":  null,
  "source":  "rpc"
}
```

`source` is `"subgraph"` when the result came from the indexed data layer, `"rpc"` when it came from a direct contract call.

`owner` and `expiry` are nullable context fields. Consumers must use `address` as the resolution result and must not treat missing ownership or expiry context as a failed resolution.

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
GET /api/v1/resolve/address/0x503B20B4342261a205830Fd55794788463bdE74B
```

```json
{
  "status":   "ok",
  "address":  "0x503b20b4342261a205830fd55794788463bde74b",
  "name":     "iscander.arc",
  "verified": true,
  "source":   "rpc"
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

HTTP 200. This covers "no primary name set", "reverse record exists but forward-confirmation failed (stale)", and the safe fallback where the adapter cannot establish a verified candidate. Consumers should treat all of these identically for display — do not display a name. Retry or use direct RPC if the product must distinguish temporary upstream failure from a genuinely absent primary name.

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
  "chainId":   5042,
  "network":   "arc_mainnet",
  "version":   "v1",
  "timestamp": 1789645660
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

## Integration semantics

### Name to address

Use forward resolution when a user enters `name.arc` or `name.circle` as a recipient:

```text
name.arc -> 0x destination address
```

### Address to primary name

Use verified reverse resolution to decorate an existing address in profiles, transaction history, activity feeds, leaderboards, portfolio views, and account menus:

```text
0x address -> verified primary name
```

Display the returned name only when `status === "ok"` and `verified === true`. For transaction review, multisig approval, allowlists, withdrawals, and other security-sensitive screens, show the primary name alongside the full address rather than replacing the address.

### Multiple names and apparent name-to-name mapping

Several ArcNS names may resolve to the same address, but an address has at most one primary name. ArcNS does not provide a direct name-to-name redirect. An interface may derive an alias relationship by composing the two APIs:

```text
alias.arc -> 0x address -> verified primary.circle
```

Do not describe this as an on-chain redirect from `alias.arc` to `primary.circle`; it is a forward lookup followed by a verified reverse lookup.

## Production checklist

- Normalize and URL-encode names before calling the API.
- Accept only `.arc` and `.circle` names; keep direct `0x` input available.
- Use a short timeout and handle `not_found`, `429`, and `503` separately.
- Cache display-only lookups briefly and respect response headers.
- Re-resolve recipients immediately before transaction construction.
- Show the entered name and full resolved address on the final confirmation screen.
- Display reverse names only when `verified: true`.
- Use a backend proxy and request coalescing for list-heavy or high-volume products.
- Monitor API version, latency, error rate, and fallback behavior.

---

## Intended Consumers

| Consumer | Primary use |
|----------|-------------|
| ArcNS app (frontend) | Forward resolution, reverse resolution, primary name display |
| ArcScan (block explorer) | Name search, address page primary name, token page labels |
| Wallet teams | Recipient name resolution, address display labels |
| Third-party dApps | Resolve names before sending transactions |

For security-critical operations (e.g. wallet recipient resolution before sending funds), consumers should independently verify the returned address via direct RPC rather than relying solely on the adapter response.
