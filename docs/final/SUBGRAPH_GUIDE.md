# ArcNS — Subgraph Guide

**Subgraph name:** `arcnslatest`  
**Query URL:** `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`  
**Hosted on:** The Graph Studio  
**Source:** `indexer/` directory

---

## Overview

The `arcnslatest` subgraph indexes ArcNS contract events on Arc Testnet and provides fast, queryable access to domain registrations, renewals, transfers, address records, and reverse records.

The subgraph is a **speed layer** — it provides indexed data for display purposes. It is not a trust layer. For security-sensitive operations (availability checks, ownership verification, transaction routing), always verify with direct RPC calls.

---

## Indexed Data

| Entity | Description |
|--------|-------------|
| `Domain` | Full domain record: name, owner, expiry, resolved address, TLD |
| `Account` | Address with associated domains and reverse record |
| `Registration` | Registration event: registrant, cost, timestamp |
| `Renewal` | Renewal event: domain, cost, new expiry, timestamp |
| `DomainEvent` | All domain lifecycle events |
| `ResolverRecord` | Address record changes (`AddrChanged` events) |
| `ReverseRecord` | Primary name changes (`NameChanged` events) |

---

## Build and Deploy

### Prerequisites

```bash
cd indexer
npm install
```

Graph CLI must be installed globally or available via npx:
```bash
npm install -g @graphprotocol/graph-cli
```

### Step 1 — Verify addresses in `subgraph.yaml`

All data source addresses in `indexer/subgraph.yaml` must match `deployments/arc_testnet-v3.json`. Check all 7 data sources:

- Registry: `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`
- ArcRegistrar: `0xD600B8D80e921ec48845fC1769c292601e5e90C4`
- CircleRegistrar: `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`
- ArcController: `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`
- CircleController: `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`
- Resolver: `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`
- ReverseRegistrar: `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304`

### Step 2 — Generate AssemblyScript types

```bash
cd indexer
graph codegen
```

### Step 3 — Build WASM mappings

```bash
graph build
```

### Step 4 — Authenticate with Graph Studio

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

The deploy key is available in The Graph Studio dashboard. Never store it in files or commit it.

### Step 5 — Deploy

```bash
graph deploy arcnslatest
```

You will be prompted for a version label (e.g. `v3`, `v3.1`).

### Step 6 — Verify sync

- Open The Graph Studio dashboard
- Confirm `arcnslatest` is syncing
- Wait for sync to reach the current block before switching the frontend URL

---

## Updating the Frontend Subgraph URL

After deploying a new subgraph version:

1. Get the new query URL from The Graph Studio (format: `https://api.studio.thegraph.com/query/<ID>/arcnslatest/<version>`)
2. Update `frontend/.env.local`:
   ```
   NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/<new-version>
   ```
3. Update the Vercel environment variable in the Vercel project settings
4. Redeploy the frontend

---

## Example Queries

### Get domains for an address

```graphql
query DomainsForAddress($owner: String!) {
  domains(where: { owner: $owner }) {
    id
    name
    labelName
    expiry
    resolvedAddress
    registrationType
  }
}
```

### Get primary name for an address

```graphql
query PrimaryName($address: String!) {
  reverseRecord(id: $address) {
    name
    node
  }
}
```

### Get registration history for an address

```graphql
query RegistrationHistory($registrant: String!) {
  registrations(where: { registrant: $registrant }, orderBy: registrationDate, orderDirection: desc) {
    domain { name }
    registrationDate
    expiryDate
    cost
  }
}
```

---

## Updating `startBlock` After Redeployment

If contracts are redeployed at new block numbers:

1. Get the deploy block from ArcScan or the deploy script output
2. Update all `startBlock` values in `indexer/subgraph.yaml` to the new deploy block
3. Re-run the build and deploy steps above

Setting `startBlock` too early wastes sync time. Setting it after the deploy block misses events. Use the exact deploy block or 1 block before.

---

## Subgraph Lag

The subgraph typically lags 1–5 blocks behind chain head (~5–30 seconds). This is acceptable for display data. For time-sensitive operations, always verify with direct RPC calls.

---

## Fallback Behavior

The ArcNS frontend uses the subgraph as the primary data source and falls back to direct RPC calls when the subgraph is unavailable or returns no data. The portfolio view shows an `RPC` badge when operating in fallback mode.
