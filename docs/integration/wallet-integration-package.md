# ArcNS — Wallet Integration Package

**Phase:** 8D  
**Date:** 2026-04-25  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Audience:** Wallet engineering teams (MetaMask, Rainbow, Trust Wallet, and others)  
**Status:** Implementation-grade specification

---

## 1. Integration Purpose

### What wallet-native ArcNS support would enable

ArcNS maps human-readable names ending in `.arc` or `.circle` to EVM addresses on Arc Testnet. Without wallet integration, users must copy-paste raw hex addresses for every transaction. With integration, a wallet can:

- Accept `alice.arc` or `bob.circle` directly in the recipient input field and resolve it to an address before sending
- Display a user's primary ArcNS name (e.g. `alice.arc`) next to or instead of their raw address in the wallet UI
- Show primary names in transaction history for addresses that have one set

### Why it matters for UX and adoption

Raw EVM addresses are 42-character hex strings. They are error-prone to type, hard to verify visually, and meaningless to most users. Name resolution at the wallet layer is the highest-leverage integration point in the ecosystem — it is where users spend the most time and where address errors cause the most harm.

ArcNS is the naming system for Arc Testnet. Wallet support is the primary mechanism by which ArcNS names become useful to end users in practice. Without it, names are only visible inside the ArcNS app itself.

### What is already available vs what wallets must consume

| Capability | Status |
|------------|--------|
| Forward resolution (name → address) | ✅ Fully on-chain, callable via `eth_call` |
| Reverse resolution (address → primary name) | ✅ Fully on-chain, requires forward-confirmation |
| Name validation rules | ✅ Documented and implemented in `normalization.ts` |
| Public hosted resolution API | ⚠️ In progress — not yet publicly available |
| Wallet recipient input accepting `.arc`/`.circle` | ❌ Not implemented — wallet must build this |
| Address display showing primary name | ❌ Not implemented — wallet must build this |
| Transaction history showing names | ❌ Not implemented — wallet must build this |

---

## 2. Required Capabilities from the Wallet

For a wallet to support ArcNS, it must be able to do the following.

### 2.1 Recognize `.arc` / `.circle` input

The wallet's recipient input field must detect when the user has typed a name rather than an address. Detection rule:

```
input ends with ".arc"    → treat as ArcNS name
input ends with ".circle" → treat as ArcNS name
input starts with "0x" and is 42 chars → treat as address (standard)
```

Detection must be case-insensitive. `Alice.ARC` and `alice.arc` are the same name.

### 2.2 Normalize input safely

Before any resolution attempt, the wallet must normalize the input:

```
1. Trim whitespace
2. Lowercase the entire string
3. Validate the label (part before the TLD):
   - Must not be empty
   - Must not start or end with a hyphen
   - Must not have two consecutive hyphens at positions 2–3 (e.g. "ab--cd")
   - ASCII characters: only a-z, 0-9, hyphen (-), underscore (_)
   - Non-ASCII: Unicode letters, digits, and emoji are allowed
```

If validation fails, show an inline error and do not attempt resolution. Do not silently pass an invalid name to the resolution flow.

### 2.3 Resolve name → address

The wallet must call the ArcNS contracts (or a trusted adapter) to resolve the name to an address. The resolved address is what the transaction is sent to. This is a security-critical operation — the wallet must not send funds to an unverified address.

See §4.1 for the canonical safe resolution flow.

### 2.4 Verify address → primary name

When displaying an address (in the wallet UI, transaction history, or contact list), the wallet may optionally show the primary ArcNS name for that address. This is a display-only operation — it does not affect transaction routing.

The wallet must run forward-confirmation before displaying any primary name. See §4.2 for the canonical flow.

### 2.5 Handle no-result and mismatch cases safely

The wallet must handle all failure cases without misleading the user. See §6 for the full failure mode table. The key rules:

- If a name does not resolve: show a clear error. Do not send the transaction.
- If a reverse record fails forward-confirmation: show no primary name. Do not show the unverified name.
- If the resolution service is unavailable: block the send and show a retry option. Do not fall back to sending to an unresolved name.

---

## 3. Required Contracts / Endpoints

### 3.1 Contract addresses (Arc Testnet v3, Chain ID 5042002)

| Contract | Address | Role |
|----------|---------|------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | Maps namehash → resolver address. Non-upgradeable. |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | Stores `addr` records (forward) and `name` records (reverse). UUPS proxy. |
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | Manages `addr.reverse` TLD. Non-upgradeable. |

The wallet only needs these three contracts for resolution. The BaseRegistrar and Controller contracts are not needed for read-only resolution.

**Key constant:**
```
ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
```
This is `namehash("addr.reverse")` — the root node for all reverse records.

### 3.2 RPC endpoints (Arc Testnet)

```
Primary:   https://rpc.testnet.arc.network
Secondary: https://rpc.blockdaemon.testnet.arc.network
Tertiary:  https://rpc.quicknode.testnet.arc.network
```

All resolution calls are standard `eth_call` — no authentication required. The wallet should implement a fallback transport across at least two endpoints.

### 3.3 ArcNS public resolution API (future)

The ArcNS team is working toward a public hosted HTTP API:

```
GET /api/v1/resolve/name/{name}
→ { name, address, owner, expiry, source, error }

GET /api/v1/resolve/address/{address}
→ { address, name, verified, source, error }
```

The `/address/` endpoint will include a `verified` field — `true` only if forward-confirmation passed. Wallets must check `verified: true` before displaying a primary name.

This API is not yet publicly hosted. Wallets should implement direct RPC resolution now and optionally switch to the hosted API when it is available and has a documented SLA.

### 3.4 Minimum ABI required

A wallet implementing direct RPC resolution needs only two function signatures:

**ArcNSRegistry**
```json
[
  {
    "name": "resolver",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "node", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "address" }]
  }
]
```

**ArcNSResolver**
```json
[
  {
    "name": "addr",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "node", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "address" }]
  },
  {
    "name": "name",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "node", "type": "bytes32" }],
    "outputs": [{ "name": "", "type": "string" }]
  }
]
```

---

## 4. Safe Resolution Flows

### 4.1 Recipient input: name → address

This flow is used when a user types a `.arc` or `.circle` name into the send/recipient field. The result is the address the transaction will be sent to. Treat this as security-critical.

```
Input:  name string (e.g. "alice.arc")
Output: address string | error
```

**Step 1 — Normalize and validate**
```
label = name.split(".")[0].trim().toLowerCase()
tld   = name.split(".").slice(1).join(".")

Reject if:
  - label is empty
  - label starts or ends with "-"
  - label[2] == "-" && label[3] == "-"  (double-hyphen rule)
  - label contains ASCII chars outside [a-z0-9\-_]
  - tld not in ["arc", "circle"]
```

**Step 2 — Compute namehash**
```
// EIP-137 recursive namehash
namehash("") = 0x0000000000000000000000000000000000000000000000000000000000000000

namehash(name):
  node = 0x0000...0000
  for label in name.split(".").reverse():
    node = keccak256(node || keccak256(utf8Bytes(label)))
  return node
```

**Step 3 — Get resolver**
```
eth_call:
  to:   0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A  (Registry)
  data: resolver(namehash(name))
  → resolverAddr

if resolverAddr == address(0):
  → error: "Name has no resolver set"
```

**Step 4 — Get address**
```
eth_call:
  to:   0x4c3a2D4245346732CE498937fEAD6343e77Eb097  (Resolver)
  data: addr(namehash(name))
  → resolvedAddr

if resolvedAddr == address(0):
  → error: "Name has no address record"
```

**Step 5 — Confirm with user before sending**
```
Show: "alice.arc resolves to 0xabc...def"
      [Confirm] [Cancel]
```

The user must see and confirm the resolved address before the transaction is submitted. Never silently resolve and send.

---

### 4.2 Address display: address → primary name

This flow is used when displaying an address in the wallet UI (contact list, transaction history, receive screen). It is display-only — it does not affect transaction routing.

```
Input:  address string (e.g. "0xabc...")
Output: { name: string | null, verified: boolean }
```

**Step 1 — Compute reverse node**
```
hexAddr     = address.toLowerCase().slice(2)   // 40 hex chars, no 0x
labelHash   = keccak256(utf8Bytes(hexAddr))
reverseNode = keccak256(ADDR_REVERSE_NODE || labelHash)

// ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
```

**Step 2 — Get name from Resolver**
```
eth_call:
  to:   0x4c3a2D4245346732CE498937fEAD6343e77Eb097  (Resolver)
  data: name(reverseNode)
  → primaryName

if primaryName == "":
  → { name: null, verified: false }  // no primary name set
```

**Step 3 — Forward-confirm (mandatory)**
```
forwardNode  = namehash(primaryName)
eth_call:
  to:   0x4c3a2D4245346732CE498937fEAD6343e77Eb097  (Resolver)
  data: addr(forwardNode)
  → resolvedAddr

if resolvedAddr.toLowerCase() == address.toLowerCase():
  → { name: primaryName, verified: true }   // safe to display
else:
  → { name: null, verified: false }          // stale — do not display
```

### 4.3 Why forward-confirmation is mandatory

A reverse record can become stale in two ways:

1. **Name transferred:** The address set `alice.arc` as its primary name, then transferred the `alice.arc` NFT to a different address. The reverse record still says `alice.arc`, but `alice.arc` now resolves to the new owner's address — not the original address.

2. **Name expired:** The name expired and was not renewed. The reverse record still exists on-chain, but the name is no longer controlled by the address.

In both cases, displaying the unverified name would show the wrong identity. The forward-confirmation check catches both cases with a single additional `eth_call`.

**This check is not optional.** A wallet that displays primary names without forward-confirmation is displaying potentially incorrect identity information to its users.

---

## 5. Integration Approaches

### Option A: Native wallet integration (direct RPC)

The wallet implements ArcNS resolution natively — namehash computation, contract calls, and forward-confirmation are all built into the wallet codebase.

**Pros:**
- No dependency on ArcNS infrastructure beyond the deployed contracts.
- Works offline from ArcNS servers — only needs Arc Testnet RPC.
- Highest trust — wallet controls the full resolution pipeline.
- No latency from an intermediate API.

**Cons:**
- Engineering effort: wallet team must implement namehash, validation, and the two-step resolution flow.
- Must be updated if ArcNS contracts are upgraded (though the v3 Resolver is a stable proxy — the address does not change on upgrade).
- Must handle RPC fallback and timeout logic.

**Trust tradeoffs:** Full trust in the on-chain contracts. No trust assumptions about ArcNS infrastructure.

**Implementation complexity:** Medium. The resolution logic is ~100 lines of code. The main complexity is integrating it into the wallet's existing send flow and UX.

**Likely adoption path:** Best for wallets that already support ENS or similar naming systems and have an existing resolution abstraction layer. The ArcNS resolution logic is structurally identical to ENS — the contracts and namehash algorithm are the same pattern.

---

### Option B: Snap / plugin-style integration (MetaMask Snaps)

For MetaMask specifically, ArcNS resolution can be packaged as a MetaMask Snap — a sandboxed JavaScript plugin that runs inside MetaMask and intercepts name resolution requests.

**Pros:**
- Does not require changes to MetaMask core.
- ArcNS team can publish and maintain the Snap independently.
- Users opt in by installing the Snap.
- Snap can be updated without a MetaMask release.

**Cons:**
- Requires MetaMask Flask or Snaps-enabled MetaMask (not all users have this).
- Snap runs in a sandboxed environment with limited access to wallet internals.
- User must explicitly install the Snap — not automatic.
- Snap API surface for name resolution is still evolving in MetaMask.

**Trust tradeoffs:** The Snap runs in a sandbox. MetaMask controls what the Snap can access. The Snap itself would implement the same direct RPC resolution as Option A — no additional trust assumptions.

**Implementation complexity:** Medium-high. Requires familiarity with the MetaMask Snaps API. The resolution logic is the same as Option A, but the integration surface is different.

**Likely adoption path:** Viable as a near-term path for MetaMask users while waiting for native integration. The ArcNS team could publish an official Snap.

---

### Option C: Wallet consumption of the ArcNS public resolution API

The wallet calls the ArcNS-hosted HTTP API instead of making direct RPC calls.

```
GET https://api.arcns.xyz/v1/resolve/name/alice.arc
→ { name: "alice.arc", address: "0x...", source: "rpc", error: null }

GET https://api.arcns.xyz/v1/resolve/address/0xabc...
→ { address: "0x...", name: "alice.arc", verified: true, source: "rpc", error: null }
```

**Pros:**
- Minimal implementation effort for the wallet team — just HTTP calls.
- No namehash implementation required.
- No direct RPC dependency.

**Cons:**
- Dependency on ArcNS API availability and uptime.
- Trust assumption: the wallet trusts the ArcNS API to return correct results. If the API is compromised or returns wrong data, the wallet sends funds to the wrong address.
- The API is not yet publicly hosted or production-ready.
- Adds latency from an intermediate HTTP hop.
- Not suitable for security-critical resolution without additional verification.

**Trust tradeoffs:** This approach introduces a trusted third party (ArcNS) into the resolution path. For display-only operations (primary name display), this is acceptable. For transaction routing (recipient resolution), wallets should prefer Option A or B to avoid trusting an external API with fund routing.

**Mitigation:** If using the API for recipient resolution, the wallet should independently verify the returned address by calling `Resolver.addr(namehash(name))` directly before sending. The API result should be treated as a hint, not a final answer.

**Likely adoption path:** Acceptable for primary name display (low-stakes). Not recommended as the sole mechanism for recipient resolution (high-stakes). Best used as a fallback when direct RPC is unavailable.

---

### Recommendation

| Use case | Recommended approach |
|----------|---------------------|
| Recipient name resolution (send flow) | Option A (direct RPC) or Option B (Snap) |
| Primary name display (address labels) | Option A, B, or C (API acceptable for display) |
| Transaction history name labels | Option C (API acceptable — display only, cached) |

---

## 6. Failure Modes / UX Requirements

### 6.1 Name not found

**Condition:** `Registry.resolver(node)` returns `address(0)`, or `Resolver.addr(node)` returns `address(0)`.  
**User message:** "Name not found. `alice.arc` does not have an address record set."  
**Wallet behavior:** Block the send. Do not proceed. Offer to paste an address manually.

### 6.2 Malformed name

**Condition:** Input fails normalization (leading hyphen, double-hyphen, invalid characters, unsupported TLD).  
**User message examples:**
- Leading hyphen: "Invalid name: names cannot start with a hyphen."
- Unsupported TLD: "Unsupported name format. ArcNS supports `.arc` and `.circle` names."
- Invalid characters: "Invalid name: only letters, numbers, hyphens, and underscores are allowed."  
**Wallet behavior:** Show inline validation error as the user types. Do not attempt resolution.

### 6.3 No resolver set

**Condition:** `Registry.resolver(node)` returns `address(0)`.  
**User message:** "Name has no resolver configured. `alice.arc` cannot be resolved to an address."  
**Wallet behavior:** Block the send. This is a valid on-chain state — not a network error.

### 6.4 Stale reverse record

**Condition:** `Resolver.name(reverseNode)` returns a name, but forward-confirmation fails.  
**User message:** Show no primary name. Do not show the unverified name with a disclaimer.  
**Wallet behavior:** Silently omit the primary name. The address is still valid — only the display name is affected.

### 6.5 Resolution service unavailable

**Condition:** All RPC endpoints are timing out, or the ArcNS API returns an error.  
**User message:** "Unable to resolve name. Check your connection and try again."  
**Wallet behavior:** Block the send. Do not fall back to sending to an unresolved name. Offer a retry button.

### 6.6 Wrong network

**Condition:** The wallet is connected to a network other than Arc Testnet (Chain ID 5042002).  
**User message:** "ArcNS names are only supported on Arc Testnet. Switch networks to resolve this name."  
**Wallet behavior:** Block the send. Do not attempt resolution on the wrong network — the contracts do not exist there.

### 6.7 Unsupported TLD

**Condition:** User types a name ending in `.eth`, `.ens`, `.crypto`, or any TLD other than `.arc` or `.circle`.  
**User message:** "Unsupported name format. ArcNS supports `.arc` and `.circle` names on Arc Testnet."  
**Wallet behavior:** Do not attempt resolution. Treat the input as an unknown format.

### 6.8 Name in grace period or expired

**Condition:** The name's expiry has passed (detectable via `BaseRegistrar.nameExpires(tokenId)`).  
**Relevance:** A name in the grace period or expired may still have an `addr` record set on the Resolver — the record is not automatically cleared on expiry. The wallet will resolve it successfully.  
**Wallet behavior:** Resolution proceeds normally. The `addr` record is still valid on-chain. Expiry state is not relevant to the send flow — only to ownership. The wallet does not need to check expiry for recipient resolution.

### 6.9 Summary table

| Failure mode | Block send? | Show primary name? | User message |
|-------------|-------------|-------------------|--------------|
| Name not found | Yes | N/A | "Name not found" |
| Malformed name | Yes | N/A | Specific validation error |
| No resolver set | Yes | N/A | "Name has no resolver" |
| Stale reverse record | N/A | No | (silent — omit name) |
| RPC unavailable | Yes | No | "Unable to resolve — retry" |
| Wrong network | Yes | No | "Switch to Arc Testnet" |
| Unsupported TLD | Yes | N/A | "Unsupported name format" |

---

## 7. What ArcNS Can Provide vs What the Wallet Must Build

### What ArcNS can hand over today

| Item | Status | Notes |
|------|--------|-------|
| Contract addresses (v3, stable) | ✅ Ready | See §3.1 |
| Minimum ABI (2 functions per contract) | ✅ Ready | See §3.4 |
| Namehash algorithm specification | ✅ Documented | EIP-137 recursive keccak256. See §4.1. |
| Reverse node computation | ✅ Documented | See §4.2. |
| Forward-confirmation rule | ✅ Documented | See §4.3. |
| Name validation rules | ✅ Documented | See §2.2. |
| RPC endpoints | ✅ Ready | Three Arc Testnet endpoints. See §3.2. |
| Test names for integration testing | ✅ Available on request | ArcNS team can register test names. |
| Reference implementation (TypeScript) | ✅ Available | `frontend/src/lib/namehash.ts` and `normalization.ts` in the ArcNS repo. |
| Public hosted resolution API | ❌ Not yet available | In progress. ETA to be confirmed. |

### What the wallet vendor must build

| Item | Complexity | Notes |
|------|-----------|-------|
| TLD detection in recipient input | Low | String suffix check: `.arc` or `.circle`. |
| Name normalization and validation | Low | ~30 lines. Reference: `normalization.ts`. |
| Namehash computation | Low | ~15 lines. Reference: `namehash.ts`. |
| Reverse node computation | Low | ~5 lines. Reference: `namehash.ts`. |
| `eth_call` to Registry and Resolver | Low | Two standard contract reads. |
| Forward-confirmation check | Low | One additional `eth_call`. |
| RPC fallback transport | Medium | Retry across multiple endpoints. |
| UX: resolution loading state | Medium | Show spinner while resolving. |
| UX: resolved address confirmation | Medium | Show "alice.arc → 0xabc..." before send. |
| UX: primary name display | Medium | Badge or label next to address. |
| UX: error states (all failure modes) | Medium | See §6. |
| Network detection (Chain ID 5042002) | Low | Standard wallet capability. |

### What is blocked on third-party adoption

| Capability | Blocked on |
|------------|-----------|
| `.arc`/`.circle` in MetaMask recipient input | MetaMask team or Snap publication |
| `.arc`/`.circle` in Rainbow recipient input | Rainbow team |
| `.arc`/`.circle` in Trust Wallet | Trust Wallet team |
| Primary name display in any wallet | Each wallet team independently |
| Transaction history showing names | Each wallet team independently |

ArcNS cannot unilaterally deliver wallet integration. The protocol is complete. The integration package is complete. Adoption requires each wallet team to implement the flows described in this document.

The ArcNS team is available to support wallet teams during integration, provide test infrastructure, and review implementations before launch.

---

*End of ArcNS Wallet Integration Package — Phase 8D*
