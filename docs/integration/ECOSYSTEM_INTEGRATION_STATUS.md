# ArcNS — Ecosystem Integration Status

**Phase:** 8F (Phase 8 Closeout)  
**Date:** 2026-04-26  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Authoritative integration readiness summary

---

## 1. What ArcNS Already Provides

### On-chain resolution truth

Everything below is live on Arc Testnet and callable by any RPC client with no authentication.

| Capability | Contract | Method |
|------------|----------|--------|
| Name → address | ArcNSResolver `0x4c3a2D...` | `addr(bytes32 node)` |
| Resolver lookup | ArcNSRegistry `0xc20B3F...` | `resolver(bytes32 node)` |
| Address → primary name | ArcNSResolver | `name(bytes32 reverseNode)` |
| NFT ownership | ArcBaseRegistrar `0xD600B8...` / CircleBaseRegistrar `0xE1fdE4...` | `ownerOf(uint256 tokenId)` |
| Name expiry | BaseRegistrar | `nameExpires(uint256 tokenId)` |
| Availability | ArcController `0xe0A67F...` / CircleController `0x4CB065...` | `available(string name)` |
| On-chain NFT metadata | BaseRegistrar | `tokenURI(uint256 tokenId)` → base64 JSON + inline SVG |

All resolution is pure `eth_call`. No authentication. No API key. No ArcNS infrastructure dependency.

### Reverse / primary name truth

The reverse resolution flow is fully on-chain:
1. Compute reverse node: `keccak256(ADDR_REVERSE_NODE || keccak256(hexAddr))`
2. Read `Resolver.name(reverseNode)` → primary name string
3. Forward-confirm: `Resolver.addr(namehash(primaryName))` must equal the queried address

Forward-confirmation is mandatory. A reverse record alone is not sufficient — it can be stale. The protocol provides everything needed to verify it correctly.

### Indexed truth via subgraph

The `arcnslatest` subgraph on The Graph Studio provides fast indexed access:

```
URL: https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

Indexed entities: `Domain`, `Account`, `Registration`, `Renewal`, `DomainEvent`, `ResolverRecord`, `ReverseRecord`.  
Typical lag: 1–5 blocks (~5–30 seconds).  
Role: speed layer for display data. Not a trust layer for reverse resolution.

### Existing adapter surfaces

| Surface | Status | Notes |
|---------|--------|-------|
| `GET /api/v1/resolve/name/{name}` | ✅ Live — `https://arcns-app.vercel.app` | Versioned, CORS, subgraph-first, RPC fallback, 30s cache. |
| `GET /api/v1/resolve/address/{address}` | ✅ Live — `https://arcns-app.vercel.app` | Forward-confirmation enforced. `verified` field on all responses. |
| `GET /api/v1/health` | ✅ Live — `https://arcns-app.vercel.app` | Returns chain context. |
| `GET /api/resolve/name/[name]` (unversioned) | ✅ Exists (legacy) | Subgraph-first, RPC fallback. No CORS, no versioning. Prefer v1 routes. |
| `GET /api/resolve/address/[address]` (unversioned) | ✅ Exists (legacy) | Missing forward-confirmation. Prefer v1 routes. |

### Existing in-app fallback UX

| Capability | Status |
|------------|--------|
| Name → address resolution (Resolve page) | ✅ Live |
| Primary name display with 3-state verification | ✅ Live (`usePrimaryName` hook) |
| Stale primary name warning (`⚠`) | ✅ Live |
| Portfolio with expiry/status per domain | ✅ Live |
| Copy resolved address CTA | ⚠️ Partial — present but not prominent |
| Unified address-or-name input | ❌ Not yet built |
| "Use in wallet" helper messaging | ❌ Not yet built |

---

## 2. What Explorers Need

### Minimum requirements for ArcScan integration

| Requirement | Complexity | ArcNS provides |
|-------------|-----------|----------------|
| Detect `.arc`/`.circle` in search bar | Low | ✅ TLD list documented |
| Namehash computation | Low | ✅ Algorithm + reference implementation |
| Forward resolution (name → address) | Low | ✅ 2-call RPC sequence documented |
| Reverse resolution + forward-confirmation | Low | ✅ 2-call RPC sequence documented |
| Ownership / expiry lookup | Low | ✅ Contract methods documented |
| NFT token page labeling | Low | ✅ `tokenURI` returns full metadata |
| Subgraph queries for bulk data | Medium | ✅ GraphQL queries documented |
| Start block for indexing | Ready | ✅ Block `38856377` |

### What ArcNS can hand ArcScan today

- ✅ `docs/integration/arcscan-integration-package.md` — complete implementation-grade spec
- ✅ All contract addresses and ABIs
- ✅ Subgraph URL and schema
- ✅ Step-by-step read flows with pseudocode
- ✅ Event list and indexing priority table
- ✅ Failure mode handling guide
- ✅ Test names available on request

### What ArcScan must still build

- Name detection and routing in the search bar
- Forward resolution call sequence
- Reverse resolution + forward-confirmation call sequence
- Name detail page UI
- Primary name badge on address pages
- NFT token page domain name labeling

---

## 3. What Wallets Need

### Minimum requirements for wallet-native recipient resolution

| Requirement | Complexity | ArcNS provides |
|-------------|-----------|----------------|
| Detect `.arc`/`.circle` in recipient input | Low | ✅ Detection rule documented |
| Name normalization and validation | Low | ✅ Rules + reference implementation (`normalization.ts`) |
| Namehash computation | Low | ✅ Algorithm + reference implementation (`namehash.ts`) |
| Forward resolution (2 RPC calls) | Low | ✅ Exact call sequence documented |
| Reverse resolution + forward-confirmation | Low | ✅ Exact call sequence documented |
| Minimum ABI (2 functions per contract) | Ready | ✅ Documented in wallet package |
| RPC endpoints | Ready | ✅ Three Arc Testnet endpoints documented |
| Network detection (Chain ID 5042002) | Low | ✅ Chain ID documented |

### What ArcNS can hand wallet teams today

- ✅ `docs/integration/wallet-integration-package.md` — complete implementation-grade spec
- ✅ Minimum ABI (4 function signatures total)
- ✅ Namehash and reverse node pseudocode
- ✅ Safe resolution flow with security notes
- ✅ All failure mode UX guidance with user message copy
- ✅ Three integration approach options (native RPC, Snap, API) with tradeoffs
- ✅ Test names available on request

### What wallet vendors must still build

- TLD detection in recipient input
- Normalization and validation (~30 lines)
- Namehash computation (~15 lines)
- Two `eth_call` reads for forward resolution
- Two `eth_call` reads for reverse + forward-confirmation
- UX: loading state, resolved address confirmation, error states
- UX: primary name badge on address display

---

## 4. What a Public Resolution Adapter Can Solve

### What it solves

A canonical public ArcNS resolution API removes the need for every third-party integrator to implement namehash computation and multi-step RPC call sequences themselves. It provides:

- Simple HTTP GET for name → address: `GET /api/v1/resolve/name/{name}`
- Simple HTTP GET for address → primary name: `GET /api/v1/resolve/address/{address}`
- `verified: boolean` field on address lookups — forward-confirmation already done server-side
- Consistent error schema across all consumers
- Caching layer to reduce RPC load

### What it cannot solve without explorer/wallet cooperation

- ArcScan still needs to call the API and integrate results into its UI
- Wallets still need to call the API (or RPC) and integrate into their send flow
- The API reduces implementation complexity but does not eliminate the need for third-party engineering work

### Which operations require direct verification vs indexer convenience

| Operation | Can use API | Must use direct RPC |
|-----------|-------------|---------------------|
| Name → address (display) | ✅ API acceptable | — |
| Address → primary name (display) | ✅ API acceptable if `verified: true` | — |
| Address → primary name (transaction routing) | ⚠️ API as hint only | ✅ Verify with `Resolver.addr()` before sending |
| Availability check | ❌ | ✅ `Controller.available()` only |
| Ownership for access control | ❌ | ✅ `BaseRegistrar.ownerOf()` only |

### Current adapter status

The v1 adapter is live at `https://arcns-app.vercel.app`. The `/api/v1/resolve/name/{name}`, `/api/v1/resolve/address/{address}`, and `/api/v1/health` endpoints are publicly accessible. Forward-confirmation, name normalization, TLD validation, CORS, versioning, and stable error schema are all implemented and deployed. Rate limiting and request logging are not yet implemented.

---

## 5. What the ArcNS App Can Solve Today

### Current fallback UX capabilities

The ArcNS app is the only place today where users can:
- Resolve any `.arc` or `.circle` name to an address
- See a verified primary name for any address (with forward-confirmation)
- Get a clear warning when a primary name is stale
- Copy a resolved address to use in their wallet

These capabilities exist today and work correctly. They bridge the gap while native wallet and explorer support is pending.

### Near-term recommended improvements

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| Unified "address or ArcNS name" input on Resolve page | Low | High — single lookup for both directions |
| Prominent "Copy address" button on all resolved addresses | Low | High — primary bridge to wallet usage |
| "Use in wallet" helper message after resolution | Low | Medium — sets correct expectations |
| Resolved address per domain in portfolio view | Low | Medium — shows what each name points to |
| Standardized verified-name badge component | Low | Medium — consistent trust signaling |

### How this reduces dependence on native ecosystem support

Users who know about the Resolve page can use ArcNS names effectively today — they resolve the name in the app, copy the address, and paste it into their wallet. This is not as seamless as native wallet support, but it is functional and safe. The near-term improvements above make this flow more discoverable and less friction-heavy.

---

## 6. What Remains Blocked on Third-Party Adoption

These capabilities cannot be delivered by ArcNS unilaterally. They require engineering work from third-party teams.

| Capability | Blocked on | Current status |
|------------|-----------|----------------|
| `.arc`/`.circle` in MetaMask recipient input | MetaMask team | ❌ Not started |
| `.arc`/`.circle` in Rainbow recipient input | Rainbow team | ❌ Not started |
| `.arc`/`.circle` in Trust Wallet | Trust Wallet team | ❌ Not started |
| Primary name display in any wallet | Each wallet team | ❌ Not started |
| Transaction history showing names | Each wallet team | ❌ Not started |
| ArcScan name search | ArcScan team | ❌ Not started |
| ArcScan address pages showing primary name | ArcScan team | ❌ Not started |
| ArcScan token pages showing domain name | ArcScan team | ❌ Not started |
| Any third-party dApp resolving ArcNS names | Each dApp team | ❌ No integrations yet |

The protocol is complete. The integration packages are complete. The gap is entirely in ecosystem adoption.

---

## 7. Recommended Next Execution Order

The following is the practical execution order after Phase 8, prioritized by impact and ArcNS team control.

### Tier 1 — ArcNS team can execute unilaterally

1. ✅ **Fixed the address resolution API route** — forward-confirmation added, `verified: boolean` returned.
2. ✅ **Added name normalization and TLD validation** to the name resolution route.
3. ✅ **Deployed the adapter as a public hosted service** — live at `https://arcns-app.vercel.app`. Versioning, CORS, health endpoint all in place.
4. **Add the unified address-or-name input to the Resolve page** — low effort, high user value, no third-party dependency.
5. **Add prominent copy-address CTA and "use in wallet" helper** — makes the fallback UX discoverable and sets correct expectations.
6. **Add rate limiting** — required before high-traffic public exposure.

### Tier 2 — Requires ArcScan coordination

6. **Deliver the ArcScan integration package** (`docs/integration/arcscan-integration-package.md`) to the ArcScan team and open a conversation about timeline.
7. **Provision test names on Arc Testnet** for ArcScan to use during integration development.
8. **Review ArcScan's implementation** before it goes live to verify forward-confirmation is implemented correctly.

### Tier 3 — Requires wallet vendor coordination

9. **Deliver the wallet integration package** (`docs/integration/wallet-integration-package.md`) to MetaMask, Rainbow, and Trust Wallet teams.
10. **Publish an official MetaMask Snap** for ArcNS resolution — this is the fastest path to MetaMask support without waiting for native integration.
11. **Support wallet teams during integration** — provide test infrastructure, answer questions, review implementations.

### Tier 4 — Ongoing ecosystem development

12. **Publish integration documentation publicly** — make the integration packages discoverable to any third-party dApp developer.
13. **Announce ArcScan and wallet integrations** when they go live.
14. **Track ecosystem adoption** and update integration packages as the protocol evolves.

---

## Phase 8 Deliverables Summary

| Document | Phase | Status |
|----------|-------|--------|
| `docs/integration/integration-reality-audit.md` | 8A | ✅ Complete |
| `docs/integration/resolution-adapter-design.md` | 8B | ✅ Complete |
| `docs/integration/arcscan-integration-package.md` | 8C | ✅ Complete |
| `docs/integration/wallet-integration-package.md` | 8D | ✅ Complete |
| `docs/integration/dapp-fallback-ux.md` | 8E | ✅ Complete |
| `docs/integration/ECOSYSTEM_INTEGRATION_STATUS.md` | 8F | ✅ Complete |

Phase 8 is complete. The ArcNS protocol is integration-ready. The documentation package is complete. Execution now moves to adapter hardening, public deployment, and ecosystem partner outreach.

---

*End of ArcNS Ecosystem Integration Status — Phase 8F*
