# ArcNS — ArcScan Integration Package

**Phase:** 8C  
**Date:** 2026-04-25  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Audience:** ArcScan engineering team  
**Status:** Implementation-grade specification

---

## 1. Integration Purpose

### What ArcScan-native ArcNS support enables

ArcNS maps human-readable names (e.g. `alice.arc`, `bob.circle`) to EVM addresses on Arc Testnet. Without ArcScan integration, users see raw addresses everywhere — in search results, address pages, and token pages. With integration, ArcScan can:

- Accept `.arc` and `.circle` names directly in the search bar and resolve them to addresses
- Display a user's primary ArcNS name on their address page (e.g. `alice.arc` instead of `0xabc...`)
- Label ArcNS NFT token pages with the human-readable domain name
- Show registration status, expiry, and ownership on name detail pages

### Why this matters for users

Users who have registered ArcNS names expect those names to appear wherever their address appears. An explorer that shows only raw addresses makes ArcNS invisible to the broader ecosystem. ArcScan is the primary block explorer for Arc Testnet — its adoption of ArcNS is the highest-visibility integration available.

### What is already available vs what ArcScan must consume

| Capability | Status |
|------------|--------|
| Forward resolution (name → address) | ✅ Fully on-chain, callable via `eth_call` |
| Reverse resolution (address → primary name) | ✅ Fully on-chain, requires forward-confirmation |
| Ownership and expiry data | ✅ Fully on-chain and indexed in subgraph |
| NFT metadata (on-chain SVG) | ✅ Available via `tokenURI(tokenId)` |
| Name search | ✅ Computable from on-chain data |
| ArcScan search bar accepting `.arc`/`.circle` | ❌ Not implemented — ArcScan must build this |
| Address pages showing primary name | ❌ Not implemented — ArcScan must build this |
| Token pages showing domain name | ❌ Not implemented — ArcScan must build this |

---

## 2. Required Contracts / Endpoints

### 2.1 Contract addresses (Arc Testnet v3, Chain ID 5042002)

| Contract | Address | Role |
|----------|---------|------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | Maps namehash → (owner, resolver, TTL). Non-upgradeable. |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | Stores `addr` records (forward) and `name` records (reverse). UUPS proxy. |
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | Manages `addr.reverse` TLD. Non-upgradeable. |
| ArcBaseRegistrar (ERC-721) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` | `.arc` name NFTs. Non-upgradeable. |
| CircleBaseRegistrar (ERC-721) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` | `.circle` name NFTs. Non-upgradeable. |
| ArcController | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | Registration/renewal for `.arc`. UUPS proxy. |
| CircleController | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | Registration/renewal for `.circle`. UUPS proxy. |

**Key constant:**
```
ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
```
This is `namehash("addr.reverse")` — the root node for all reverse records.

### 2.2 RPC endpoints (Arc Testnet)

```
Primary:   https://rpc.testnet.arc.network
Secondary: https://rpc.blockdaemon.testnet.arc.network
Tertiary:  https://rpc.quicknode.testnet.arc.network
```

All resolution calls are standard `eth_call` — no authentication required.

### 2.3 Subgraph (optional, speed layer)

```
URL: https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

The subgraph provides fast indexed access to domain data, ownership, expiry, and registration history. It is a convenience layer — not a trust layer. See §6 for trust rules.

### 2.4 ArcNS public resolution API (future)

The ArcNS team is working toward a public hosted HTTP API. When available, it will expose:

```
GET /api/v1/resolve/name/{name}    → { name, address, owner, expiry, source }
GET /api/v1/resolve/address/{addr} → { address, name, verified, source }
```

This API is publicly hosted at `https://arcns-app.vercel.app`. ArcScan may use the v1 endpoints directly. Rate limiting is not yet implemented — coordinate with the ArcNS team before high-volume production use.

---

## 3. Required Methods / Read Flows

### 3.1 Forward resolution: name → address

Use this when a user searches for `alice.arc` or when ArcScan needs to resolve a name to display its address.

```
Input:  name (string, e.g. "alice.arc")
Output: address (string) | null
```

**Step 1 — Normalize the name**
```
label = name.split(".")[0].trim().toLowerCase()
tld   = name.split(".").slice(1).join(".")  // "arc" or "circle"
normalizedName = label + "." + tld
```
Reject if: empty, leading/trailing hyphen, double-hyphen at positions 2–3, characters outside `[a-z0-9\-_]` plus Unicode letters/digits/emoji.

**Step 2 — Compute namehash**
```
namehash("") = 0x0000...0000
namehash(name) = keccak256(namehash(parent) || keccak256(label))

// Example: namehash("alice.arc")
//   = keccak256(namehash("arc") || keccak256("alice"))
//   = keccak256(0x9a7ad1c5... || keccak256("alice"))
```

**Step 3 — Get resolver from Registry**
```solidity
// eth_call
ArcNSRegistry.resolver(bytes32 node) → address resolverAddr
```
If `resolverAddr == address(0)`: name has no resolver set → return `null`.

**Step 4 — Get address from Resolver**
```solidity
// eth_call
ArcNSResolver.addr(bytes32 node) → address payable
```
If result is `address(0)`: no address record set → return `null`.

**Result:** The returned address is the canonical resolved address for this name.

---

### 3.2 Reverse resolution: address → primary name

Use this when displaying an address page and wanting to show the human-readable primary name.

```
Input:  address (string, e.g. "0xabc...")
Output: { name: string | null, verified: boolean }
```

**Step 1 — Compute reverse node**
```
hexAddr    = address.toLowerCase().slice(2)   // 40 hex chars, no 0x prefix
labelHash  = keccak256(hexAddr)               // keccak256 of the hex string
reverseNode = keccak256(ADDR_REVERSE_NODE || labelHash)
```

**Step 2 — Get name from Resolver**
```solidity
// eth_call
ArcNSResolver.name(bytes32 reverseNode) → string
```
If result is `""`: no primary name set → return `{ name: null, verified: false }`.

**Step 3 — Forward-confirm (mandatory)**
```
forwardNode  = namehash(returnedName)
resolvedAddr = ArcNSResolver.addr(forwardNode)

if resolvedAddr == address:
    return { name: returnedName, verified: true }
else:
    return { name: null, verified: false }   // stale record — do not display
```

**Do not skip step 3.** A reverse record can be stale (name transferred or expired). Displaying an unverified name is incorrect. See §6 for the full trust model.

---

### 3.3 Verifying that a reverse name is valid

This is the same as step 3 above, expressed as a standalone check. Use this when ArcScan has cached a primary name and needs to re-validate it before display.

```
function verifyPrimary(address, name) → boolean:
    forwardNode  = namehash(name)
    resolvedAddr = ArcNSResolver.addr(forwardNode)
    return resolvedAddr.toLowerCase() == address.toLowerCase()
```

Both the forward and reverse checks must pass. If either fails, the name is stale and must not be displayed.

---

### 3.4 Ownership and expiry

Use this for name detail pages and token pages.

**Get ERC-721 owner:**
```solidity
tokenId = uint256(keccak256(label))   // label only, not full name

// Check expiry first — ownerOf reverts on expired tokens
ArcNSBaseRegistrar.nameExpires(uint256 tokenId) → uint256 expiry

// If expiry > block.timestamp:
ArcNSBaseRegistrar.ownerOf(uint256 tokenId) → address owner
```

**Expiry states:**
```
now = block.timestamp

if expiry > now:                              → Active
if expiry <= now && expiry + 90 days > now:  → Grace Period (owner may still renew)
if expiry + 90 days <= now:                  → Expired (available for re-registration)
```

**Registry owner (may differ from NFT owner):**
```solidity
ArcNSRegistry.owner(bytes32 node) → address
```
The Registry owner can differ from the ERC-721 owner if `reclaim()` was called. For display purposes, the ERC-721 owner from `BaseRegistrar.ownerOf()` is the canonical ownership record.

---

### 3.5 Name search by typed query

Use this when a user types `alice.arc` or `alice` into the ArcScan search bar.

```
Input:  query string (e.g. "alice.arc" or "alice" or "bob.circle")
Output: { name, address, owner, expiry, expiryState, tokenId, tld } | null
```

**Step 1 — Parse the query**
```
if query contains ".":
    label = query.split(".")[0].toLowerCase()
    tld   = query.split(".").slice(1).join(".")
    if tld not in ["arc", "circle"]: return null  // unsupported TLD
else:
    label = query.toLowerCase()
    tld   = "arc"  // default to .arc; optionally search both
```

**Step 2 — Compute identifiers**
```
tokenId      = uint256(keccak256(label))
namehashNode = namehash(label + "." + tld)
```

**Step 3 — Get expiry**
```solidity
expiry = BaseRegistrar.nameExpires(tokenId)
```
If `expiry == 0`: name has never been registered → show as available.

**Step 4 — Get owner (if not expired)**
```solidity
if expiry > block.timestamp:
    owner = BaseRegistrar.ownerOf(tokenId)
```

**Step 5 — Get resolved address**
```solidity
resolverAddr = Registry.resolver(namehashNode)
if resolverAddr != address(0):
    addr = Resolver.addr(namehashNode)
```

**Step 6 — Return result**
```json
{
  "name": "alice.arc",
  "label": "alice",
  "tld": "arc",
  "tokenId": "12345...",
  "owner": "0x...",
  "expiry": 1800000000,
  "expiryState": "active",
  "resolvedAddress": "0x..."
}
```

**Subgraph shortcut:** For step 3–5, ArcScan may query the subgraph instead of making multiple RPC calls:
```graphql
query($name: String!) {
  domains(where: { name: $name }, first: 1) {
    id name labelName owner { id } expiry resolvedAddress registrationType
  }
}
```
Always fall back to RPC if the subgraph is unavailable or returns no result.

---

## 4. Event / Indexing Requirements

If ArcScan runs its own indexer (rather than querying the ArcNS subgraph), these are the events to index.

### 4.1 Events by contract

**ArcController / CircleController**
```
NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires)
NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires)
```
- `NameRegistered`: creates a new domain record. Captures name, owner, cost, expiry.
- `NameRenewed`: updates expiry and cost on an existing domain.

**ArcBaseRegistrar / CircleBaseRegistrar (ERC-721)**
```
Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
```
- `from == address(0)`: mint (new registration) — already captured by `NameRegistered`.
- `from != address(0)` and `to != address(0)`: ownership transfer — update owner.
- `to == address(0)`: burn — should not occur in normal operation.

**ArcNSResolver**
```
AddrChanged(bytes32 indexed node, address a)
NameChanged(bytes32 indexed node, string name)
```
- `AddrChanged`: updates the resolved address for a name node.
- `NameChanged`: updates the primary name record for a reverse node. Used to track primary name changes.

**ArcNSRegistry**
```
Transfer(bytes32 indexed node, address owner)
NewResolver(bytes32 indexed node, address resolver)
```
- `Transfer`: Registry-level ownership change (may differ from ERC-721 transfer if `reclaim()` was called).
- `NewResolver`: resolver address changed for a node.

**ArcNSReverseRegistrar**
```
ReverseClaimed(address indexed addr, bytes32 indexed node)
```
- Emitted when an address claims its reverse node. Precedes `NameChanged` on the Resolver.

### 4.2 Indexing priority for ArcScan

| Event | Priority | Why |
|-------|----------|-----|
| `NameRegistered` | High | Core registration data |
| `Transfer` (ERC-721) | High | Ownership changes |
| `AddrChanged` | High | Resolved address updates |
| `NameChanged` | High | Primary name updates |
| `NameRenewed` | Medium | Expiry updates |
| `NewResolver` | Medium | Resolver changes |
| `ReverseClaimed` | Medium | Reverse node claims |
| `Transfer` (Registry) | Low | Registry-level ownership (rarely differs from ERC-721) |

### 4.3 Start block

All v3 contracts were deployed at block `38856377` on Arc Testnet. ArcScan should start indexing from this block.

---

## 5. Minimum UI Support Recommendations

### 5.1 Search bar

**Behavior when user types a `.arc` or `.circle` name:**

1. Detect that the query ends in `.arc` or `.circle` (case-insensitive).
2. Normalize: trim, lowercase.
3. Resolve via forward resolution (§3.1).
4. If resolved: redirect to the address page for the resolved address, with the name displayed prominently.
5. If not resolved (no addr record): show a name detail page with ownership/expiry info and a "no address record set" notice.
6. If name does not exist (never registered or expired): show "Name not found" or "Available for registration" with a link to the ArcNS app.

**Behavior when user types a bare label (e.g. `alice`):**

Optionally: search both `alice.arc` and `alice.circle` and show results for both. This is a UX enhancement, not a requirement.

**Do not:**
- Silently fail when a `.arc`/`.circle` name is typed.
- Treat a `.arc` name as a transaction hash or contract address search.

### 5.2 Address pages

**When displaying an address page:**

1. Call `lookupAddress(address)` (§3.2) — reverse resolution with forward-confirmation.
2. If `verified == true`: display the primary name prominently near the address (e.g. `alice.arc` as a badge or subtitle).
3. If `verified == false` or no primary name: display nothing. Do not show an unverified name.
4. Optionally: show a "Owns N ArcNS names" count with a link to a names tab.

**Display format:**
```
Address: 0xabc...def
         alice.arc  ← primary name badge (only if verified)
```

**Do not:**
- Display a primary name without forward-confirmation.
- Display a stale name with a disclaimer — just omit it.

### 5.3 Name detail pages

When a user navigates to a name (via search or a direct link), show:

| Field | Source | Notes |
|-------|--------|-------|
| Full name | Input | e.g. `alice.arc` |
| TLD | Parsed | `.arc` or `.circle` |
| Status | Computed from expiry | Active / Grace Period / Expired |
| Owner | `BaseRegistrar.ownerOf(tokenId)` | Show as address + primary name if available |
| Expiry date | `BaseRegistrar.nameExpires(tokenId)` | Human-readable date |
| Resolved address | `Resolver.addr(node)` | The address this name points to |
| Token ID | `uint256(keccak256(label))` | For NFT page linking |
| Registration type | Subgraph `registrationType` | ARC or CIRCLE |

### 5.4 Token / NFT pages

ArcNS names are ERC-721 tokens on the BaseRegistrar contracts. When ArcScan displays an NFT from these contracts:

- Show the domain name (e.g. `alice.arc`) as the token name, not just the token ID.
- The token ID is `uint256(keccak256(label))` — it is not human-readable on its own.
- `tokenURI(tokenId)` returns a base64-encoded JSON metadata object with `name`, `description`, `image` (inline SVG), and `attributes` fields. ArcScan can render this directly.
- The `image` field is a `data:image/svg+xml;base64,...` URI — no external fetch required.

### 5.5 Avoiding misleading output

| Scenario | Correct behavior |
|----------|-----------------|
| Reverse record exists but forward-confirmation fails | Show no primary name. Do not show the unverified name. |
| Name is in grace period | Show "Grace Period" status, not "Active". Owner can still renew. |
| Name is expired | Show "Expired" status. Do not show the previous owner as the current owner. |
| Resolver set but no addr record | Show "No address record" — not an error, just unset. |
| Name has never been registered | Show "Available" — not "Not found". |
| User searches `alice.xyz` | Reject — `.xyz` is not an ArcNS TLD. Show "Unsupported name format". |

---

## 6. Verification / Trust Rules

### 6.1 Reverse names must not be trusted without forward verification

The reverse record (`Resolver.name(reverseNode)`) is set by the address owner. It can become stale if:
- The name was transferred to another address after the reverse record was set.
- The name expired and was not renewed.

**Rule:** Never display a primary name from a reverse record without running the forward-confirmation check (§3.3). This applies whether the reverse record came from RPC or from the subgraph.

### 6.2 What can come from the indexer (subgraph)

The following data is safe to read from the subgraph without additional RPC verification:

| Data | Why it is safe |
|------|---------------|
| Domain name, label, TLD | Set at registration time. Immutable. |
| Registration type (ARC/CIRCLE) | Set at registration time. Immutable. |
| Registration cost and timestamp | Indexed from immutable events. |
| Expiry timestamp | Updated by `NameRenewed` events. Acceptable lag for display. |
| Owner address | Updated by `Transfer` events. Acceptable lag for display. |
| Resolved address (`resolvedAddress`) | Updated by `AddrChanged` events. Acceptable lag for display. |

### 6.3 What must be verified directly or via a trustworthy adapter

| Data | Why direct verification is required |
|------|-------------------------------------|
| Primary name (reverse lookup) | Subgraph does not forward-confirm. Must use RPC. |
| Availability | Time-sensitive. Subgraph lag can show an expired name as taken. Use `Controller.available(name)`. |
| Resolver address | Not reliably indexed. Use `Registry.resolver(node)` via RPC. |
| Ownership for access control | Subgraph may lag. Use `BaseRegistrar.ownerOf(tokenId)` via RPC. |

### 6.4 Subgraph lag

The ArcNS subgraph is typically 1–5 blocks behind chain head (~5–30 seconds). This is acceptable for display purposes. It is not acceptable for:
- Availability checks (use RPC)
- Forward-confirmation of reverse records (use RPC)
- Any operation where a user is about to submit a transaction based on the result

---

## 7. Integration Options

### Option A: Direct RPC integration

ArcScan makes `eth_call` requests directly to Arc Testnet RPC endpoints for all resolution operations.

**Pros:**
- No dependency on ArcNS infrastructure beyond the deployed contracts.
- Always reads from chain head — no indexer lag.
- Fully self-contained.

**Cons:**
- Multiple RPC calls per page load (2 for forward resolution, 2 for reverse + confirmation, 3 for name search).
- No access to historical data (registration history, renewal history) without building an indexer.

**When to use:** For correctness-critical operations (reverse resolution, availability). Always use RPC for forward-confirmation.

**Minimum call sequence for address page:**
```
1. reverseNode = computeReverseNode(address)
2. name = Resolver.name(reverseNode)
3. if name != "":
   forwardNode = namehash(name)
   resolvedAddr = Resolver.addr(forwardNode)
   if resolvedAddr == address: display name
```

### Option B: Subgraph-backed with RPC verification (recommended)

ArcScan queries the ArcNS subgraph for bulk data (domain lists, ownership, expiry, registration history) and uses RPC only for correctness-critical operations.

**Pros:**
- Single GraphQL query returns all domain metadata.
- Efficient for pages that display many names.
- Historical data (registrations, renewals) available without building a separate indexer.

**Cons:**
- Dependency on the ArcNS subgraph availability.
- Subgraph lag (1–5 blocks) for display data.
- Must still use RPC for forward-confirmation.

**When to use:** For domain detail pages, address portfolio views, registration history. Always supplement with RPC for reverse verification.

**Recommended query for name search:**
```graphql
query ResolveName($name: String!) {
  domains(where: { name: $name }, first: 1) {
    id
    name
    labelName
    owner { id }
    expiry
    resolvedAddress
    registrationType
    registrations(first: 1, orderBy: timestamp, orderDirection: desc) {
      cost
      timestamp
      transactionHash
    }
  }
}
```

**Recommended query for address page:**
```graphql
query LookupAddress($address: String!) {
  reverseRecord(id: $address) {
    name
    node
  }
  domains(where: { owner: $address }, orderBy: expiry, orderDirection: asc, first: 50) {
    name
    expiry
    resolvedAddress
    registrationType
  }
}
```
After receiving `reverseRecord.name`, always run forward-confirmation via RPC before displaying it.

### Option C: ArcNS public resolution API (future)

When the ArcNS public API is available, ArcScan can call:
```
GET /api/v1/resolve/name/{name}
GET /api/v1/resolve/address/{address}
```

The `/address/` endpoint will return a `verified` field indicating whether forward-confirmation passed. ArcScan must check `verified: true` before displaying the name.

**When to use:** Once the API is publicly hosted, stable, and has documented SLA. Not available yet.

---

## 8. Failure Modes / Edge Cases

### 8.1 Subgraph lag

**Symptom:** Subgraph returns stale data (e.g. old owner after a transfer, old expiry before a renewal).  
**Mitigation:** For display data, lag of a few blocks is acceptable. For correctness-critical data, always use RPC. The `source` field in API responses indicates whether data came from the subgraph or RPC.

### 8.2 Stale reverse record

**Symptom:** `Resolver.name(reverseNode)` returns a name, but `Resolver.addr(namehash(name))` returns a different address.  
**Cause:** Name was transferred or expired after the reverse record was set.  
**Correct behavior:** Do not display the name. Return no primary name for this address.

### 8.3 No resolver set

**Symptom:** `Registry.resolver(node)` returns `address(0)`.  
**Cause:** Name was registered but no resolver was configured (unusual in v3 — the Controller sets a resolver at registration time).  
**Correct behavior:** Show "No resolver set" on the name detail page. Do not attempt to call `Resolver.addr()`.

### 8.4 Resolver set but no addr record

**Symptom:** `Registry.resolver(node)` returns a valid address, but `Resolver.addr(node)` returns `address(0)`.  
**Cause:** The name owner has not set an address record, or cleared it.  
**Correct behavior:** Show "No address record set" on the name detail page. This is a valid state, not an error.

### 8.5 Expired domain

**Symptom:** `BaseRegistrar.nameExpires(tokenId)` returns a timestamp in the past.  
**Cause:** Name expired and was not renewed.  
**Correct behavior:**
- If within 90-day grace period: show "Grace Period" status. The previous owner can still renew.
- If past grace period: show "Expired / Available". Do not show the previous owner as the current owner. `ownerOf()` will revert — do not call it.

### 8.6 Malformed input

**Symptom:** User types something that looks like a name but is not valid ArcNS syntax.  
**Examples:** `alice.xyz`, `alice.`, `.arc`, `alice..arc`, `--alice.arc`  
**Correct behavior:**
- `.xyz`: unsupported TLD — show "Unsupported name format. ArcNS supports .arc and .circle."
- `alice.` or `.arc`: malformed — show "Invalid name format."
- `--alice.arc`: leading hyphen — show "Invalid name: names cannot start with a hyphen."
- Do not attempt resolution on invalid input.

### 8.7 Unsupported name search formats

ArcScan should only attempt ArcNS resolution for names ending in `.arc` or `.circle`. All other TLDs should be treated as unknown and not forwarded to ArcNS contracts.

### 8.8 RPC unavailability

**Symptom:** All Arc Testnet RPC endpoints are timing out.  
**Correct behavior:** Show a degraded state indicator. Do not show stale cached data as current. Do not show an error that implies the name does not exist — it may simply be unreachable.

### 8.9 Name with no registration history

**Symptom:** Subgraph returns no `Domain` entity for a name, and `BaseRegistrar.nameExpires(tokenId)` returns `0`.  
**Cause:** Name has never been registered.  
**Correct behavior:** Show "Available for registration" with a link to the ArcNS app (`https://app.arcns.xyz` or equivalent).

---

## 9. Handoff Section

### What ArcScan needs from us

| Item | Status | Notes |
|------|--------|-------|
| Contract addresses (v3) | ✅ Ready | See §2.1 |
| ABI for each contract | ✅ Ready | Available in repo at `artifacts/contracts/v3/` |
| Subgraph URL | ✅ Ready | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |
| Namehash algorithm | ✅ Documented | EIP-137 recursive keccak256. See §3.1. |
| Reverse node computation | ✅ Documented | See §3.2. |
| Forward-confirmation rule | ✅ Documented | See §3.3 and §6.1. |
| Expiry state logic | ✅ Documented | See §3.4. |
| Start block for indexing | ✅ Ready | Block `38856377` |
| Public hosted resolution API | ❌ Not yet available | In progress. ArcScan should use direct RPC or subgraph in the meantime. |
| Testnet faucet / test names | ⚠️ Coordinate | ArcNS team can register test names for ArcScan to use during integration testing. |

### What we need from ArcScan

| Item | Why |
|------|-----|
| Confirmation of integration timeline | So we can coordinate public API availability with ArcScan's release. |
| Confirmation of which integration option (A, B, or C) ArcScan will use | So we can prioritize the public API if needed. |
| Test environment access | So ArcNS team can verify the integration before it goes live. |
| Notification when name search is live | So ArcNS team can announce ArcScan integration to users. |
| Feedback on any gaps in this document | This package is implementation-grade but may have gaps that only surface during integration. |

### Contact

For integration questions, contract ABI clarifications, or test name provisioning, contact the ArcNS team directly. This document is the canonical integration reference — if anything in it is unclear or incorrect, we want to know.

---

*End of ArcNS ArcScan Integration Package — Phase 8C*
