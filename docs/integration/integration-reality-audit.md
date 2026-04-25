# ArcNS v3 — Integration Reality Audit

**Date:** 2026-04-25  
**Phase:** 8A  
**Purpose:** Establish exactly what ArcNS already provides on-chain and off-chain, what external tools do not yet consume, and what an integration partner needs.

---

## 1. On-Chain Resolution Surface (Protocol Truth)

Everything below is live on Arc Testnet and callable by any RPC client with no authentication.

### 1.1 Forward Resolution: name → address

**Step 1 — Compute namehash**
```
node = namehash(name)
// e.g. namehash("alice.arc") = keccak256(namehash("arc") || keccak256("alice"))
```

**Step 2 — Get resolver from Registry**
```solidity
ArcNSRegistry.resolver(bytes32 node) → address resolverAddr
```
- Contract: `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`
- Returns `address(0)` if no resolver is set for this node

**Step 3 — Get address from Resolver**
```solidity
ArcNSResolver.addr(bytes32 node) → address payable
```
- Contract (proxy): `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`
- Returns `address(0)` if no addr record is set
- v1 scope: EVM address (coin type 60) only

**Availability check (optional)**
```solidity
ArcNSBaseRegistrar.nameExpires(uint256 tokenId) → uint256 expiry
// tokenId = uint256(keccak256(label))
// name is active if: expiry > block.timestamp
// name is in grace if: expiry <= block.timestamp && expiry + 90 days > block.timestamp
// name is available if: expiry + 90 days <= block.timestamp
```
- ArcRegistrar: `0xD600B8D80e921ec48845fC1769c292601e5e90C4`
- CircleRegistrar: `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`

---

### 1.2 Reverse Resolution: address → primary name

**Step 1 — Compute reverse node**
```
hexAddr = address.toLowerCase().slice(2)  // 40 hex chars, no 0x
labelHash = keccak256(hexAddr)
reverseNode = keccak256(ADDR_REVERSE_NODE || labelHash)
// ADDR_REVERSE_NODE = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2
```

**Step 2 — Get name from Resolver**
```solidity
ArcNSResolver.name(bytes32 reverseNode) → string
```
- Returns `""` if no primary name is set

**Step 3 — Verify (mandatory for trust)**
```
forwardNode = namehash(returnedName)
resolvedAddr = ArcNSResolver.addr(forwardNode)
// Primary name is valid only if resolvedAddr == queried address
// If resolvedAddr != queried address: name is stale (transferred or expired)
```

---

### 1.3 Ownership / NFT

```solidity
// ERC-721 ownership
ArcNSBaseRegistrar.ownerOf(uint256 tokenId) → address
// Reverts if name is expired — use nameExpires() first

// Registry ownership (may differ from NFT owner if reclaim() was called)
ArcNSRegistry.owner(bytes32 node) → address
```

---

### 1.4 Availability / Pricing

```solidity
ArcNSController.available(string name_) → bool
ArcNSController.rentPrice(string name_, uint256 duration) → Price { base, premium }
```
- ArcController: `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`
- CircleController: `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`

---

## 2. Indexed Truth (Subgraph Surface)

The `arcnslatest` subgraph on The Graph Studio provides fast, queryable indexed data.

**Query URL:** `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`

### Available queries

| Query | Returns |
|-------|---------|
| `domains(where: { name: $name })` | Full domain record: name, labelName, owner, expiry, resolvedAddress, registrationType |
| `domains(where: { owner: $owner })` | All domains owned by an address |
| `reverseRecord(id: $address)` | Primary name for an address |
| `registrations(where: { registrant: $address })` | Registration history |
| `renewals(where: { domain_: { owner: $address } })` | Renewal history |

### Key indexed fields

```graphql
type Domain {
  id: ID!              # namehash hex
  name: String!        # full name e.g. "alice.arc"
  labelName: String!   # label only e.g. "alice"
  owner: Account!      # current ERC-721 owner
  expiry: BigInt!      # Unix timestamp
  resolvedAddress: Bytes  # addr record (from AddrChanged events)
  registrationType: RegistrationType!  # ARC | CIRCLE
}

type ReverseRecord {
  id: ID!       # lowercase address
  name: String! # primary name e.g. "alice.arc"
  node: Bytes!  # reverse node hash
}
```

### Subgraph lag
Typically 1–5 blocks behind chain head (~5–30 seconds). Not suitable as the sole source of truth for time-sensitive operations. Always verify with RPC for critical flows.

---

## 3. HTTP Resolution API (Already Exists)

The ArcNS frontend already exposes two HTTP endpoints when the app is running:

### `GET /api/resolve/name/{name}`
```
GET /api/resolve/name/alice.arc
→ { name: "alice.arc", address: "0x...", owner: "0x...", expiry: "...", source: "subgraph"|"rpc"|null }
```
- Subgraph-first, RPC fallback
- 30-second in-process cache
- Returns `address: null` if not resolved

### `GET /api/resolve/address/{address}`
```
GET /api/resolve/address/0xabc...
→ { address: "0x...", name: "alice.arc"|null, source: "subgraph"|"rpc"|null }
```
- Subgraph-first, RPC fallback
- 30-second in-process cache

**Current limitation:** These endpoints are only available when the ArcNS frontend is running. They are not a public hosted API. They are not documented for external consumption. They have no CORS policy, no rate limiting, and no versioning.

---

## 4. What External Tools Do Not Yet Consume

### ArcScan (block explorer)
| Capability | Status |
|------------|--------|
| Search by address | ✅ Works (standard EVM) |
| Search by transaction hash | ✅ Works (standard EVM) |
| Search by name (e.g. `alice.arc`) | ❌ Not implemented |
| Address page shows primary name | ❌ Not implemented |
| Token page shows domain name (not just token ID) | ❌ Not implemented |
| NFT metadata display (on-chain SVG) | Unknown — depends on ArcScan NFT support |

### Wallets (MetaMask, Rainbow, Trust, etc.)
| Capability | Status |
|------------|--------|
| Recipient input accepts `.arc` / `.circle` names | ❌ Not implemented |
| Address display shows primary name | ❌ Not implemented |
| Transaction history shows names | ❌ Not implemented |

### Third-party dApps
| Capability | Status |
|------------|--------|
| Any dApp resolving ArcNS names | ❌ No standard integration exists yet |
| Any dApp showing primary names for addresses | ❌ No standard integration exists yet |

---

## 5. Minimum Integration Data Model

An external explorer or wallet needs the following to support ArcNS natively:

### For name → address resolution
```
Input:  string name (e.g. "alice.arc")
Output: address | null

Steps:
1. node = namehash(name)
2. resolverAddr = Registry.resolver(node)
3. if resolverAddr == address(0): return null
4. addr = Resolver.addr(node)
5. return addr != address(0) ? addr : null
```

### For address → primary name (with verification)
```
Input:  address
Output: string name | null

Steps:
1. reverseNode = keccak256(ADDR_REVERSE_NODE || keccak256(hexAddr))
2. name = Resolver.name(reverseNode)
3. if name == "": return null
4. forwardNode = namehash(name)
5. resolvedAddr = Resolver.addr(forwardNode)
6. return resolvedAddr == address ? name : null  // MUST verify
```

### For name search (explorer)
```
Input:  string query (e.g. "alice.arc" or "alice")
Output: { name, address, owner, expiry, tokenId, tld }

Steps:
1. Parse TLD from query (default to "arc" if no dot)
2. Compute tokenId = uint256(keccak256(label))
3. expiry = BaseRegistrar.nameExpires(tokenId)
4. owner = BaseRegistrar.ownerOf(tokenId) [if not expired]
5. node = namehash(name)
6. resolverAddr = Registry.resolver(node)
7. addr = Resolver.addr(node) [if resolver set]
```

### Minimum contract calls required
| Operation | Contracts called |
|-----------|-----------------|
| Forward resolve | Registry + Resolver (2 calls) |
| Reverse resolve + verify | Resolver × 2 (2 calls) |
| Name search | BaseRegistrar + Registry + Resolver (3 calls) |
| Availability check | Controller (1 call) |

---

## 6. Protocol-Level Blockers for Integration

**None.** The protocol is fully functional. All resolution data is available on-chain via standard `eth_call`. No protocol changes are required for explorer or wallet integration.

The only blockers are:
1. **Third-party adoption** — ArcScan and wallet teams must implement ArcNS support
2. **Public hosted API** — the HTTP resolution endpoints are not yet publicly hosted
3. **No standard integration spec** — no published document for integration partners to follow

---

## 7. Summary

| Surface | Available | Consumed by external tools |
|---------|-----------|---------------------------|
| On-chain forward resolution | ✅ | ❌ |
| On-chain reverse resolution | ✅ | ❌ |
| On-chain ownership / expiry | ✅ | ❌ |
| Subgraph indexed data | ✅ | ❌ |
| HTTP resolution API | ✅ (local only) | ❌ |
| ArcScan name search | ❌ | N/A |
| Wallet name resolution | ❌ | N/A |

The protocol provides everything needed. The gap is entirely in ecosystem tooling and integration packaging.
