# ArcNS v3 — Subgraph Guide

---

## Canonical Subgraph

| Property | Value |
|----------|-------|
| Slug | `arcnslatest` |
| Studio URL | https://thegraph.com/studio/subgraph/arcnslatest |
| Query URL | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |
| Network | `arc-testnet` |
| Start block | `38856377` (v3 deployment block) |
| Version tag | `v3` |

---

## What the Subgraph Indexes

| Event | Source | Entity produced |
|-------|--------|----------------|
| `NameRegistered` | ArcController, CircleController | `Domain`, `Registration`, `DomainEvent` |
| `NameRenewed` | ArcController, CircleController | `Renewal`, `DomainEvent` |
| `Transfer` (ERC-721) | ArcRegistrar, CircleRegistrar | `Domain.owner`, `DomainEvent` |
| `Transfer` (Registry node) | Registry | `Domain.owner` |
| `NewResolver` | Registry | `Domain.resolver` |
| `AddrChanged` | Resolver | `ResolverRecord.addr`, `Domain.resolvedAddress` |
| `NameChanged` | Resolver | `ReverseRecord.name` |
| `ReverseClaimed` | ReverseRegistrar | `ReverseRecord` |

**v1 scope only:** text records, contenthash, multicoin addresses, and CCIP-Read are not indexed.

---

## How the Frontend Consumes the Subgraph

The frontend reads `NEXT_PUBLIC_SUBGRAPH_URL` from `frontend/.env.local` at build time.

```
frontend/.env.local
  NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
      ↓
frontend/src/lib/graphql.ts
  const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL
      ↓
  getDomainsByOwner(), getRegistrationHistory(), getReverseRecord(), etc.
```

All subgraph calls are **failsafe** — every function catches errors and returns `null` or `[]`. The frontend always falls back to RPC reads silently if the subgraph is unavailable or returns empty.

---

## Subgraph Build and Deploy

### Prerequisites
```bash
cd indexer
npm install
npm install -g @graphprotocol/graph-cli
```

### Build
```bash
graph codegen && graph build
```

### Deploy to The Graph Studio
```bash
graph deploy arcnslatest \
  --studio \
  --version-label v3
```

You will be prompted for your Studio deploy key.

### After Redeploy
Update `NEXT_PUBLIC_SUBGRAPH_URL` in `frontend/.env.local` if the version label changes. The current URL uses the `v3` version tag:
```
https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

---

## Expected Sync Behavior

| Scenario | Expected behavior |
|----------|-----------------|
| Normal operation | Subgraph lags 1–5 blocks behind chain head. Portfolio and history may show registrations 5–30 seconds after tx confirmation. |
| Subgraph unavailable | Frontend falls back to RPC. Portfolio shows token IDs without human-readable names. History tab shows empty state. |
| Subgraph returns empty for new registration | Normal — indexing lag. Refresh after 30 seconds. |
| Primary name selection shows no domains | Subgraph not yet indexed for this address. RPC fallback shows a message. |

---

## Fallback Behavior

The frontend has a two-tier read strategy:

1. **Subgraph-first** — fast, returns human-readable names, expiry, history
2. **RPC fallback** — reads Transfer events from BaseRegistrar contracts directly; returns token IDs without labels; slower

The fallback activates automatically when:
- `NEXT_PUBLIC_SUBGRAPH_URL` is empty or contains `YOUR_ID`
- The subgraph returns an empty array for a known-registered address
- The subgraph fetch times out (8 second timeout)

---

## ⚠ Known Issue: Subgraph ABI Reference

`indexer/subgraph.yaml` references `ArcNSRegistrarControllerV2.json` as the controller ABI. This works because the v3 controller emits the same `NameRegistered` and `NameRenewed` event signatures. However, the file name is misleading. Before mainnet, update the subgraph to reference the v3 controller ABI directly.
