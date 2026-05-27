# Goldsky Integration Plan for ArcNS (Arc Testnet)

Status: **Read-only assessment + safe rollout plan**
Repo: `C:\Users\mertb\Desktop\NODE\ArcNameServices\arcns`
Network: **Arc Testnet** (`chainId = 5042002`)
Goldsky chain slug to use: **`arc-testnet`** (must be re-verified in Goldsky UI/CLI before deploy)

---

## 1) Safety scope applied for this assessment

This review followed the requested constraints:

- No contract changes
- No frontend logic changes
- No package/lockfile changes
- No `.env` or secret changes
- No Goldsky deployment executed
- No blockchain transactions
- No commit / push

This document is planning-only and validation-focused.

---

## 2) Subgraph targets discovered (ArcNS has two indexing targets)

## A) Product/frontend subgraph target

Two product-facing subgraph definitions exist:

1. **Legacy root subgraph**
   - `subgraph.yaml`
   - `schema.graphql`
   - `src/arc-ns-controller.ts`
   - Purpose: only indexes proxy `Upgraded` events for `ArcNSController`

2. **Canonical frontend indexer**
   - `indexer/subgraph.yaml`
   - `indexer/schema.graphql`
   - `indexer/src/*.ts`
   - `indexer/abis/*.json`
   - Purpose: full ArcNS v3 app-facing indexing for `.arc` + `.circle`

## B) BENS / Blockscout-compatible subgraph target

- `bens-subgraph/subgraph.yaml`
- `bens-subgraph/schema.graphql`
- `bens-subgraph/src/*.ts`
- `bens-subgraph/abis/*.json`
- `bens-subgraph/README.md`

Purpose: ENS-like schema required by Blockscout/BENS services.

---

## 3) Per-target technical report

## Target A1 — Root legacy subgraph (`subgraph.yaml`)

- **Current network in manifest:** `arc-testnet`
- **Goldsky network slug required:** `arc-testnet`
- **Contracts indexed:**
  - `ArcNSController` `0x1bd377A2762510c00dd0ec2142E42829e7053C80`
- **startBlock:** `38332349`
- **Entities indexed:** `Upgraded`
- **Event handlers:**
  - `Upgraded(indexed address)` → `handleUpgraded`
- **Build/codegen expectation:** likely passes (simple schema/mapping)
- **Schema/mapping risk:** low technical risk, but **low product value** (not the frontend domain/resolution data model)
- **Safe to deploy to Goldsky as-is?:** yes technically, **not recommended as first ArcNS app target**

## Target A2 — Product canonical subgraph (`indexer/`)

- **Current network in manifest:** `arc-testnet` (all data sources)
- **Goldsky network slug required:** `arc-testnet`
- **Contracts indexed:**
  - `ArcController` `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`
  - `CircleController` `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`
  - `ArcRegistrar` `0xD600B8D80e921ec48845fC1769c292601e5e90C4`
  - `CircleRegistrar` `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`
  - `Resolver` `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`
  - `Registry` `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`
  - `ReverseRegistrar` `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57`
- **startBlock:** `38856377` (all data sources)
- **Entities indexed (from schema):**
  - `Account`, `Domain`, `Registration`, `Renewal`, `DomainEvent`, `ResolverRecord`, `ReverseRecord`, `LabelhashIndex`
- **Event handlers:**
  - Controller:
    - `NameRegistered` → `handleArcNameRegistered` / `handleCircleNameRegistered`
    - `NameRenewed` → `handleArcNameRenewed` / `handleCircleNameRenewed`
  - Registrar:
    - `Transfer` → `handleArcTransfer` / `handleCircleTransfer`
  - Resolver:
    - `AddrChanged` → `handleAddrChanged`
    - `NameChanged` → `handleNameChanged`
  - Registry:
    - `Transfer` → `handleTransfer`
    - `NewResolver` → `handleNewResolver`
  - ReverseRegistrar:
    - `ReverseClaimed` → `handleReverseClaimed`
- **Build/codegen expectation:** should pass if pinned Graph toolchain versions in `indexer/package.json` remain unchanged.
- **Schema/mapping risk:**
  - Moderate: reverse-record correctness depends on ordering/consistency between `ReverseClaimed` and `NameChanged` indexing and frontend’s RPC verification fallback.
  - Moderate: any future ReverseRegistrar address migration must be reflected in manifest before redeploy.
- **Safe to deploy to Goldsky as-is?:** **yes (recommended first deploy target)**, parallel to existing endpoint.

## Target B — BENS-compatible subgraph (`bens-subgraph/`)

- **Current network in manifest:** `arc-testnet` (all data sources)
- **Goldsky network slug required:** `arc-testnet`
- **Contracts indexed:**
  - `ArcController` `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`
  - `CircleController` `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`
  - `ArcRegistrar` `0xD600B8D80e921ec48845fC1769c292601e5e90C4`
  - `CircleRegistrar` `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`
  - `Registry` `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`
  - `Resolver` `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`
  - `ReverseRegistrar` `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` ✅ matches required current address
- **startBlock:** `38856377` (all data sources)
- **Entities indexed (ENS/BENS-like):**
  - `Domain`, `Registration`, `Account`, `Resolver`
  - Domain events: `Transfer`, `NewOwner`, `NewResolver`, `NewTTL`, `WrappedTransfer`, `NameWrapped`, `NameUnwrapped`, `FusesSet`, `ExpiryExtended`
  - Registration events: `NameRegistered`, `NameRenewed`, `NameTransferred`
  - Resolver events: `AddrChanged`, `MulticoinAddrChanged`, `NameChanged`, `AbiChanged`, `PubkeyChanged`, `TextChanged`, `ContenthashChanged`, `InterfaceChanged`, `AuthorisationChanged`, `VersionChanged`
  - `WrappedDomain`
- **Event handlers currently wired in manifest:**
  - `NameRegistered` / `NameRenewed` (arc + circle)
  - `Transfer` (arc + circle registrar)
  - `Transfer` + `NewResolver` (registry)
  - `AddrChanged` + `NameChanged` (resolver)
  - `ReverseClaimed` (reverse registrar)
- **Build/codegen expectation:** should pass; README documents successful `codegen/build` flow.
- **Schema/mapping risk:**
  - Moderate/high integration sensitivity: BENS reverse-resolution semantics depend on not corrupting reverse domain naming rules (README explicitly warns).
  - If BENS backend reads directly from graph-node PostgreSQL, Goldsky-hosted deployment alone may not replace that workflow without adapter changes.
- **Safe to deploy to Goldsky as-is?:** **yes for indexing validation**, but production BENS server integration path must be confirmed separately.

---

## 4) Frontend/API subgraph endpoint usage and fallback model

## Environment variables

- `frontend/.env.local`
  - `NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`
  - Chain/RPC values configured for Arc Testnet

- `frontend/.env.local.example`
  - documents `NEXT_PUBLIC_SUBGRAPH_URL` as The Graph Studio URL pattern

## Query functions/hooks using subgraph

- Core client: `frontend/src/lib/graphql.ts`
  - `SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || ""`
  - `SUBGRAPH_ENABLED` guard
  - `gqlQuery()` fails closed (returns null) and never throws
  - key calls: `getDomainByName`, `getDomainsByOwner`, `getReverseRecord`, `getRegistrationHistory`, `getRenewalHistory`, `getExpiringDomains`

## Existing RPC fallback (already robust)

- `frontend/src/lib/publicClient.ts`
  - viem fallback transport over 3 Arc testnet RPC endpoints
- `frontend/src/lib/graphql.ts`
  - `resolveName`: subgraph-first, then registry+resolver RPC fallback
  - `resolveAddress`: subgraph reverse first, then RPC fallback
  - `resolveAddressWithVerification`: mandatory forward-confirmation via RPC even when subgraph provides candidate reverse name

This means the current architecture is already resilient to stale or unavailable subgraph endpoints.

## Safe endpoint fallback strategy (later, optional)

Do **not** change logic now. Later, after parity:

1. Keep current The Graph endpoint as primary while validating Goldsky in parallel.
2. Add optional second env var (e.g. `NEXT_PUBLIC_SUBGRAPH_URL_FALLBACK`) and a thin query wrapper that retries the same query against fallback URL on timeout/error.
3. Preserve existing RPC fallback exactly as-is (must remain ultimate truth path).
4. Switch primary only after parity KPIs pass.

---

## 5) No-break integration phases

## Phase 1 — Parallel Goldsky deployment

- Deploy **indexer/** subgraph to Goldsky without touching frontend config.
- Optionally deploy `bens-subgraph/` to Goldsky for parallel observability.
- Keep The Graph endpoint active for production frontend.

## Phase 2 — Endpoint parity tests (old vs Goldsky)

- Run identical queries against both endpoints.
- Compare owner, expiry, resolved address, reverse name behavior, counts.

## Phase 3 — Optional frontend fallback config

- Add env-only configurability for secondary subgraph endpoint.
- No contract or write-flow changes.

## Phase 4 — Controlled primary switch

- Point `NEXT_PUBLIC_SUBGRAPH_URL` to Goldsky **only after parity sign-off**.
- Keep rollback path (restore previous URL) ready.

## Phase 5 — Goldsky Turbo pipelines (later)

- Use Turbo for analytics/alerts/derived datasets after core query parity is proven.

---

## 6) Example command set (DO NOT run yet)

These are examples only for the next operator step.

```bash
# 0) Verify Goldsky CLI availability
npx -y @goldskycom/cli --version

# 1) Login (interactive)
npx -y @goldskycom/cli login

# 2) Verify supported chains/slugs (confirm arc-testnet exists)
npx -y @goldskycom/cli subgraph list-chains
```

### Product subgraph deploy (recommended first)

```bash
cd indexer
npm run codegen
npm run build

# Example slug format; replace org/name/version as needed
npx -y @goldskycom/cli subgraph deploy arcns-product/arcns-indexer/v1 --path .
```

### BENS-compatible subgraph deploy (parallel)

```bash
cd bens-subgraph
npm run codegen
npm run build

npx -y @goldskycom/cli subgraph deploy arcns-product/arcns-bens/v1 --path .
```

### List/status

```bash
npx -y @goldskycom/cli subgraph list
npx -y @goldskycom/cli subgraph status arcns-product/arcns-indexer/v1
npx -y @goldskycom/cli subgraph status arcns-product/arcns-bens/v1
```

---

## 7) Parity test plan (required)

## Test names

- `flowpay.arc`
- `thebstoftimes.arc`
- `bob.arc` (if present)
- one `.circle` name (example from BENS docs: `dnyelfy.circle`)

## Checks

For each endpoint (old + Goldsky), verify:

1. owner
2. expiry
3. resolved address
4. no-address state behavior
5. registration status
6. TLD separation (`.arc` vs `.circle`)
7. aggregate count consistency

## Example parity queries

```bash
# Set endpoints
OLD="https://api.studio.thegraph.com/query/1748590/arcnslatest/v3"
NEW="https://api.goldsky.com/api/public/project_closure/subgraphs/arcns-indexer/latest/gn"

# Domain query (example: flowpay.arc)
QUERY='{"query":"query($name:String!){domains(where:{name:$name},first:1){id name owner{id} expiry resolvedAddress registrationType resolverRecord{addr}}}","variables":{"name":"flowpay.arc"}}'

curl -s -X POST "$OLD" -H "content-type: application/json" -d "$QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$QUERY"
```

```bash
# Count consistency
COUNT_QUERY='{"query":"{ domains(first: 1) { id } }"}'
curl -s -X POST "$OLD" -H "content-type: application/json" -d "$COUNT_QUERY"
curl -s -X POST "$NEW" -H "content-type: application/json" -d "$COUNT_QUERY"
```

Notes:
- Replace `NEW` with the actual Goldsky query URL issued at deploy time.
- Use exact same GraphQL documents across endpoints.

---

## 8) Final report / recommendations

## Is Goldsky useful for ArcNS?

**Yes.** It is useful as a parallel managed indexing endpoint for Arc Testnet and can improve operational resilience and endpoint optionality.

## Which Goldsky product should be used first?

**Goldsky Subgraphs first** (core indexing/query parity).
Defer **Turbo** until stable parity and production confidence are established.

## Does this break existing ArcNS architecture?

**No, if rolled out in parallel-first mode.** ArcNS already uses a subgraph-as-speed-layer model with RPC truth fallback and forward verification.

## Which subgraph should be deployed first?

1. **First:** `indexer/` (product/frontend canonical model)
2. **Second:** `bens-subgraph/` (explorer/BENS compatibility)
3. **Optional/low-priority:** root legacy `subgraph.yaml` (upgrade-only indexer)

## What exact files need changes later (if any)?

No immediate code changes required for parallel deployment.

If/when switching endpoint strategy later:

- `frontend/.env.local` (or deployment env vars only):
  - `NEXT_PUBLIC_SUBGRAPH_URL`
  - optional fallback var (new)
- potentially `frontend/src/lib/graphql.ts` only if adding endpoint retry/fallback wrapper

## What should stay unchanged?

- All contracts and on-chain addresses
- frontend write flows
- existing RPC fallback in `frontend/src/lib/publicClient.ts`
- verification logic in `resolveAddressWithVerification`
- package/lockfiles unless explicit dependency work is approved

## Recommended next command sequence (operator runbook)

1. Verify Goldsky chain slug availability for `arc-testnet`
2. Build + deploy `indexer/` to Goldsky (parallel)
3. Run parity query matrix against The Graph vs Goldsky
4. If parity passes, optionally deploy `bens-subgraph/` to Goldsky
5. Only then propose frontend env switch plan

## Risks and rollback plan

### Risks

- Reverse resolution edge cases during catch-up lag
- Potential divergence if ReverseRegistrar address changes again and manifests are not updated
- BENS backend coupling to graph-node/Postgres flow (for Blockscout integration)

### Rollback

- Keep The Graph endpoint as active primary until parity sign-off
- If switched and issues appear: revert `NEXT_PUBLIC_SUBGRAPH_URL` to previous known-good endpoint
- Keep RPC fallback unchanged to preserve user-facing resolution continuity

---

## Stop for review

Per instruction, this process stops here for review.
No deployment, no commit, and no push were performed.
