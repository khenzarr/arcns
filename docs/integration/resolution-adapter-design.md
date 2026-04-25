# ArcNS Resolution Adapter — Integration Design

**Phase:** 8B  
**Date:** 2026-04-25  
**Status:** Design / Documentation  
**Scope:** Public resolution adapter surface — design and documentation only. No protocol changes. No contract rewrites.

---

## 1. Adapter Purpose

The ArcNS Resolution Adapter is the canonical integration surface through which external consumers resolve ArcNS names and addresses. It is not a new protocol layer — it is a defined, documented contract for how to correctly query the ArcNS protocol.

### Who consumes it

| Consumer | Primary need |
|----------|-------------|
| ArcNS app (frontend) | Forward resolution, reverse resolution, primary name display |
| ArcScan (block explorer) | Name search, address → primary name display, token page labels |
| Wallet teams (MetaMask, Rainbow, Trust, etc.) | Recipient input accepts `.arc`/`.circle`, address display shows primary name |
| Third-party dApps | Resolve names before sending transactions, display primary names for addresses |
| Indexers / analytics tools | Bulk name → address mapping, ownership queries |

### What the adapter is not

- It is not a new smart contract.
- It is not a hosted API service (yet — see §7).
- It is not a replacement for direct RPC calls. It defines the correct sequence of those calls.
- It does not add any new on-chain state.

---

## 2. Canonical Interface

The adapter defines five public operations. Each operation has a defined input, output, data source strategy, and verification rule.

### 2.1 `resolveName(name) → address | null`

Resolves a full ArcNS name (e.g. `alice.arc`) to its EVM address record.

```typescript
interface ResolveNameResult {
  address: string | null;   // checksummed EVM address, or null
  owner:   string | null;   // current ERC-721 owner, or null
  expiry:  number | null;   // Unix timestamp, or null
  source:  "rpc" | "subgraph" | null;
}

function resolveName(name: string): Promise<ResolveNameResult>
```

**Authoritative source:** RPC (on-chain `addr` record).  
**Subgraph role:** Speed layer — used first to avoid unnecessary RPC calls.  
**Verification:** None required for forward resolution. The `addr` record is set by the name owner and is the canonical answer.

---

### 2.2 `lookupAddress(address) → primaryName | null`

Resolves an EVM address to its primary ArcNS name, with mandatory forward-confirmation.

```typescript
interface LookupAddressResult {
  name:     string | null;   // full primary name e.g. "alice.arc", or null
  verified: boolean;         // true only if forward-confirmation passed
  source:   "rpc" | "subgraph" | null;
}

function lookupAddress(address: string): Promise<LookupAddressResult>
```

**Authoritative source:** RPC (reverse record + forward confirmation).  
**Subgraph role:** Speed layer for the reverse lookup step only.  
**Verification:** Mandatory. See §4.3 for the forward-confirmation rule.  
**Critical:** `verified: false` results MUST NOT be displayed as the address's name. They indicate a stale or mismatched reverse record.

---

### 2.3 `getResolver(name) → resolverAddress | null`

Returns the resolver contract address set for a given name node in the Registry.

```typescript
interface GetResolverResult {
  resolver: string | null;   // resolver contract address, or null if not set
  node:     string;          // namehash of the name (hex)
}

function getResolver(name: string): Promise<GetResolverResult>
```

**Authoritative source:** RPC only (`ArcNSRegistry.resolver(node)`).  
**Subgraph role:** None — resolver address is not reliably indexed in the current subgraph schema.  
**Use case:** Integrators that need to call the resolver directly (e.g. to read future record types not yet surfaced by the adapter).

---

### 2.4 `verifyPrimary(address, name) → boolean`

Explicitly verifies that a given name is the valid primary name for a given address. This is the forward-confirmation check as a standalone operation.

```typescript
function verifyPrimary(address: string, name: string): Promise<boolean>
```

Returns `true` only if:
1. The reverse record for `address` returns `name`.
2. The forward resolution of `name` returns `address`.

Both conditions must hold. Either failing returns `false`.

**Authoritative source:** RPC only.  
**Use case:** Wallets and explorers that cache primary names and need to re-validate them before display.

---

### 2.5 `getDomainMetadata(name) → metadata | null` *(optional helper)*

Returns ownership and expiry metadata for a name. Useful for explorers displaying token pages.

```typescript
interface DomainMetadata {
  name:             string;
  labelName:        string;
  tld:              "arc" | "circle";
  tokenId:          string;          // uint256 as decimal string
  owner:            string | null;
  expiry:           number | null;   // Unix timestamp
  expiryState:      "active" | "expiring-soon" | "grace" | "expired";
  resolvedAddress:  string | null;
  registrationType: "ARC" | "CIRCLE";
}

function getDomainMetadata(name: string): Promise<DomainMetadata | null>
```

**Authoritative source:** Subgraph-first for metadata fields (owner, expiry, registrationType). RPC for `resolvedAddress` if subgraph is unavailable.  
**Note:** `expiryState` is computed client-side from the expiry timestamp — it is not a contract value.

---

## 3. Data Source Strategy

### 3.1 Authoritative source per question

| Question | Authoritative source | Rationale |
|----------|---------------------|-----------|
| What address does this name resolve to? | RPC — `Resolver.addr(node)` | The `addr` record is the canonical on-chain truth. Subgraph may lag. |
| What is the primary name for this address? | RPC — `Resolver.name(reverseNode)` | Reverse record must be verified on-chain. Subgraph reverse records are not verified. |
| Does the primary name forward-confirm? | RPC — `Resolver.addr(forwardNode)` | Forward confirmation is a contract read. Cannot be delegated to an indexer. |
| Who owns this name? | Subgraph-first, RPC fallback | Ownership is indexed reliably. RPC fallback via `Registry.owner(node)`. |
| When does this name expire? | Subgraph-first, RPC fallback | Expiry is indexed reliably. RPC fallback via `BaseRegistrar.nameExpires(tokenId)`. |
| Is this name available? | RPC only — `Controller.available(name)` | Availability is time-sensitive. Subgraph lag makes it unsuitable as the sole source. |
| What is the resolver address for this name? | RPC only — `Registry.resolver(node)` | Not reliably indexed in current subgraph. |

### 3.2 Subgraph-first + RPC verification (default strategy)

Used for: `resolveName`, `lookupAddress`, `getDomainMetadata`.

```
1. Query subgraph (timeout: 8s)
2. If subgraph returns data → use it as the fast answer
3. If subgraph is unavailable or returns null → fall back to RPC
4. For lookupAddress: always run forward-confirmation via RPC regardless of source
```

The subgraph is a speed layer, not a trust layer. It reduces RPC load and latency for the common case. It is never the final word on correctness for reverse resolution.

### 3.3 RPC-only (for correctness-critical operations)

Used for: `getResolver`, `verifyPrimary`, availability checks, forward-confirmation step of `lookupAddress`.

These operations are always resolved via direct `eth_call` to the Arc Testnet RPC. No subgraph involvement.

### 3.4 RPC transport

The adapter uses a fallback transport across three Arc Testnet RPC endpoints:

```
Primary:   https://rpc.testnet.arc.network
Secondary: https://rpc.blockdaemon.testnet.arc.network
Tertiary:  https://rpc.quicknode.testnet.arc.network
```

Timeout per endpoint: 10 seconds. Retry count: 3 (primary), 2 (secondary/tertiary). This matches the existing `publicClient.ts` configuration.

---

## 4. Verification Rules

### 4.1 Forward resolution verification

Forward resolution (`resolveName`) does not require additional verification. The `addr` record is set by the name owner via an authenticated transaction. The result is the canonical on-chain answer.

**Rule:** `Resolver.addr(namehash(name))` is the authoritative resolved address. If it returns `address(0)`, the name has no address record set.

### 4.2 Reverse resolution — the stale record problem

A reverse record (`Resolver.name(reverseNode)`) can become stale in two ways:

1. **Name transferred:** The address set a primary name, then transferred the name NFT to another address. The reverse record still points to the old name, but the address no longer owns it.
2. **Name expired:** The name expired and entered the grace period or became available. The reverse record still exists on-chain but the name is no longer controlled by the address.

In both cases, the reverse record is technically present on-chain but semantically invalid. An adapter that returns it without verification is returning a lie.

### 4.3 Forward-confirmation rule (mandatory for `lookupAddress`)

```
Given: address A, reverse record returns name N

Step 1: Compute forwardNode = namehash(N)
Step 2: resolvedAddr = Resolver.addr(forwardNode)
Step 3: if resolvedAddr == A → primary name is VALID, return N
        if resolvedAddr != A → primary name is STALE, return null (or verified: false)
```

This rule is non-negotiable. Any consumer that displays a primary name without running this check is displaying potentially incorrect data.

**The subgraph `ReverseRecord` entity does NOT perform this check.** It reflects what was indexed at event time. It does not re-verify on every query. Do not trust it alone.

### 4.4 Resolver existence check

Before calling `Resolver.addr(node)`, the adapter must check that a resolver is set:

```
resolverAddr = Registry.resolver(node)
if resolverAddr == address(0): return null  // no resolver set
```

Calling `addr()` on `address(0)` will revert or return garbage. Always check the resolver first.

### 4.5 Name normalization before hashing

All names passed to the adapter must be normalized before namehash computation:

```
normalizedName = name.trim().toLowerCase()
```

The adapter must reject names that fail the ArcNS validation rules (leading/trailing hyphen, double-hyphen at positions 2–3, invalid characters). See `normalization.ts` for the canonical pipeline.

---

## 5. Failure / Fallback Model

### 5.1 Subgraph lag

**Condition:** Subgraph is 1–5 blocks behind chain head (normal). Subgraph is minutes behind (degraded).

**Behavior:**
- For `resolveName` and `getDomainMetadata`: subgraph result is used as-is. Lag of a few blocks is acceptable for display purposes.
- For `lookupAddress`: forward-confirmation always runs via RPC, so subgraph lag does not affect correctness.
- For availability checks: subgraph is never used. RPC only.

**Indicator:** The `source` field in results indicates whether the answer came from `"subgraph"` or `"rpc"`. Consumers may use this to display a freshness indicator.

### 5.2 RPC is slow or unavailable

**Condition:** All three RPC endpoints are timing out or returning errors.

**Behavior:**
- `resolveName`: returns `{ address: null, source: null }` — do not display a resolved address.
- `lookupAddress`: returns `{ name: null, verified: false, source: null }` — do not display a primary name.
- `getResolver`: returns `{ resolver: null }`.
- `verifyPrimary`: returns `false`.

**Never throw to the consumer.** All adapter operations catch errors internally and return null-safe results.

### 5.3 Reverse exists but forward mismatch

**Condition:** `Resolver.name(reverseNode)` returns a name, but `Resolver.addr(namehash(name))` does not return the queried address.

**Behavior:** `lookupAddress` returns `{ name: null, verified: false, source: "rpc" }`.

The stale name MUST NOT be surfaced to the consumer as the address's primary name. The consumer may optionally log or display a "primary name not verified" state, but must not display the unverified name as fact.

### 5.4 No resolver set

**Condition:** `Registry.resolver(node)` returns `address(0)`.

**Behavior:** `resolveName` returns `{ address: null }`. The name exists in the registry but has no resolver configured. This is a valid state — not an error.

### 5.5 No primary name set

**Condition:** `Resolver.name(reverseNode)` returns `""`.

**Behavior:** `lookupAddress` returns `{ name: null, verified: false }`. This is the normal state for addresses that have never set a primary name.

### 5.6 Malformed or invalid name input

**Condition:** Input name fails normalization or validation (e.g. empty string, unsupported TLD, invalid characters).

**Behavior:** Return immediately with `{ address: null, source: null }` and an `error` field describing the validation failure. Do not make any RPC or subgraph calls.

```typescript
interface AdapterError {
  error: "INVALID_NAME" | "INVALID_ADDRESS" | "UNSUPPORTED_TLD";
  hint:  string;
}
```

---

## 6. Security / Trust Model

### 6.1 What the adapter trusts

| Source | Trust level | Rationale |
|--------|-------------|-----------|
| `Registry.resolver(node)` | Full trust | Non-upgradeable contract. Ownership ledger is immutable. |
| `Resolver.addr(node)` | Full trust | Set by authenticated name owner. Cryptographically grounded. |
| `Resolver.name(reverseNode)` | Partial trust | Set by address owner, but can become stale. Must be forward-confirmed. |
| `BaseRegistrar.nameExpires(tokenId)` | Full trust | Non-upgradeable contract. Expiry is a contract-enforced value. |
| `Controller.available(name)` | Full trust | Availability is computed from expiry + grace period on-chain. |
| Subgraph `Domain.resolvedAddress` | Convenience only | Indexed from events. May lag. Not used for forward-confirmation. |
| Subgraph `ReverseRecord.name` | Convenience only | Indexed from events. Not verified. Never used as the sole source for primary name display. |

### 6.2 What the adapter does not trust

- **Subgraph alone for reverse resolution.** The subgraph `ReverseRecord` entity reflects what was indexed at event time. It does not re-verify. A stale reverse record in the subgraph looks identical to a valid one.
- **Cached results for correctness-critical operations.** The 30-second in-process cache in the current API routes is acceptable for display latency. It is not acceptable for transaction-time resolution (e.g. a wallet resolving a recipient address before sending funds). Consumers must be aware of cache TTLs.
- **Any off-chain source for availability.** Availability is time-sensitive. Only `Controller.available(name)` is authoritative.
- **The `owner` field from the subgraph for access control.** The subgraph `owner` field reflects the last indexed `Transfer` event. It may lag. For access control decisions, use `Registry.owner(node)` or `BaseRegistrar.ownerOf(tokenId)` directly.

### 6.3 Cryptographically grounded vs indexer convenience

| Operation | Grounded in | Notes |
|-----------|-------------|-------|
| Forward resolution | Smart contract state (`eth_call`) | Fully on-chain. No trust assumptions beyond the RPC node. |
| Reverse resolution + forward-confirmation | Smart contract state (`eth_call`) | Both steps are on-chain reads. |
| Ownership / expiry | Smart contract state (`eth_call`) | Non-upgradeable contracts. |
| Subgraph domain data | Event indexing | Convenience layer. Correct under normal conditions. Not suitable for trust-critical decisions. |
| HTTP API results | Adapter logic + subgraph + RPC | Correct if the adapter implements the verification rules in §4. |

### 6.4 RPC node trust

The adapter trusts the configured Arc Testnet RPC endpoints to return correct `eth_call` results. This is the same trust assumption made by any Ethereum client. Consumers operating in high-security contexts (e.g. custody wallets) should run their own Arc Testnet node rather than relying on public RPC endpoints.

---

## 7. Existing Implementation Starting Point

### 7.1 Current local API routes

The ArcNS frontend already exposes two HTTP endpoints via Next.js App Router:

#### `GET /api/resolve/name/[name]`

**File:** `frontend/src/app/api/resolve/name/[name]/route.ts`

**What it does:**
- Accepts a URL-encoded name (e.g. `alice.arc`)
- Validates: rejects names shorter than 3 characters
- Calls `resolveName(name)` from `graphql.ts` (subgraph-first, RPC fallback)
- Returns: `{ name, address, owner, expiry, source }`
- In-process cache: 30-second TTL
- Cache headers: `Cache-Control: public, max-age=30`, `X-Cache: HIT|MISS`

**What it does not do:**
- Does not normalize the name before hashing (relies on caller to pass a valid name)
- Does not validate TLD
- Does not check resolver existence before returning
- Does not perform forward-confirmation (not needed for forward resolution)

#### `GET /api/resolve/address/[address]`

**File:** `frontend/src/app/api/resolve/address/[address]/route.ts`

**What it does:**
- Accepts a lowercase hex address (e.g. `0xabc...`)
- Validates: must start with `0x` and be 42 characters
- Calls `resolveAddress(address)` from `graphql.ts` (subgraph-first, RPC fallback)
- Returns: `{ address, name, source }`
- In-process cache: 30-second TTL
- Cache headers: `Cache-Control: public, max-age=30`, `X-Cache: HIT|MISS`

**What it does not do:**
- Does not perform forward-confirmation. The `name` field in the response is the raw reverse record result — it may be stale.
- Does not return a `verified` field.
- Does not distinguish between "no primary name" and "stale primary name".

**This is the most important gap to close before these routes are used as a public integration surface.**

### 7.2 What is required to make these routes a public integration surface

The following changes are required before these routes can be documented and offered to external consumers:

#### Correctness gaps (must fix)

| Gap | Route | Fix required |
|-----|-------|-------------|
| No forward-confirmation on reverse lookup | `/api/resolve/address/[address]` | Add forward-confirmation step. Return `verified: boolean` in response. |
| No name normalization | `/api/resolve/name/[name]` | Normalize and validate name before processing. Return `error` on invalid input. |
| No TLD validation | both | Reject names with unsupported TLDs. |
| No resolver existence check | `/api/resolve/name/[name]` | Check `Registry.resolver(node)` before calling `Resolver.addr(node)`. |

#### Production readiness gaps (required before public exposure)

| Requirement | Current state | What is needed |
|-------------|--------------|----------------|
| Versioning | None | Add `/v1/` prefix to all routes (e.g. `/api/v1/resolve/name/[name]`) |
| CORS policy | None | Add explicit `Access-Control-Allow-Origin` headers. For public API: `*` or a configurable allowlist. |
| Rate limiting | None | Add per-IP rate limiting (e.g. 60 req/min). Next.js middleware or edge config. |
| Error response schema | Inconsistent | Standardize: `{ error: string, hint?: string }` for all 4xx responses. |
| Documentation | None | OpenAPI / JSON schema spec for each route. |
| Availability expectations | None | Define SLA, uptime target, and maintenance window policy. |
| Hosting | Local only | Must be deployed to a stable public host (not the same process as the frontend app). |
| Health endpoint | None | Add `GET /api/v1/health` returning `{ status: "ok", chainId: 5042002, blockNumber: N }`. |

#### Response schema changes (for v1 public API)

**`GET /api/v1/resolve/name/{name}`**
```json
{
  "name": "alice.arc",
  "address": "0x...",
  "owner": "0x...",
  "expiry": 1800000000,
  "source": "subgraph",
  "error": null
}
```

**`GET /api/v1/resolve/address/{address}`**
```json
{
  "address": "0x...",
  "name": "alice.arc",
  "verified": true,
  "source": "rpc",
  "error": null
}
```

The `verified` field is the critical addition. Consumers must check `verified: true` before displaying a primary name. A response with `verified: false` means the reverse record exists but failed forward-confirmation — the `name` field should be treated as `null` by the consumer.

### 7.3 What still depends on third-party ecosystem adoption

The adapter design is complete and implementable today. The following capabilities require action from third parties and cannot be unilaterally delivered by ArcNS:

| Capability | Dependency |
|------------|-----------|
| `.arc`/`.circle` names in wallet recipient input | Wallet teams (MetaMask, Rainbow, Trust) must integrate the adapter |
| Primary name display in wallets | Wallet teams must call `lookupAddress` and respect `verified` |
| Name search in ArcScan | ArcScan team must implement name search using `resolveName` or direct RPC |
| Address pages showing primary names in ArcScan | ArcScan team must call `lookupAddress` with forward-confirmation |
| Any dApp resolving ArcNS names | dApp developers must integrate the adapter or call the public API |

The protocol provides everything needed. The adapter design provides the correct integration specification. Ecosystem adoption is the remaining gap.

---

## 8. Contract Addresses (Arc Testnet, v3)

For reference — these are the on-chain addresses the adapter calls:

| Contract | Address |
|----------|---------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` |
| ArcRegistrar | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` |
| CircleRegistrar | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` |
| ArcController | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` |
| CircleController | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` |
| Subgraph URL | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |

`ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2`

---

*End of ArcNS Resolution Adapter Design — Phase 8B*
