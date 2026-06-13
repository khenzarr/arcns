# ArcNS Goldsky Phase 3 Final Sync & Parity Report

Date: 2026-05-27
Repo: `https://github.com/khenzarr/arcns`
Phase: 3 Final (post full sync)

---

## 1) Goldsky subgraph name/version

`arcns-product/v0.1.0`

---

## 2) Goldsky endpoint URL

`https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`

---

## 3) Current sync status

Goldsky CLI status check command:

```powershell
npx -y @goldskycom/cli subgraph list arcns-product/v0.1.0
```

Observed snapshot:

- Synced: **100%**
- Blocks indexed: **38856376 -> 44181863**
- Chain: **arc-testnet**

Interpretation: full sync is complete at time of validation.

---

## 4) Current health status

From same Goldsky CLI output:

- Health: **healthy**
- State: **Active**
- Indexing errors: **none shown in CLI output**

---

## 5) Indexed/latest block status

- Indexed/start block: **38856376**
- Latest/target block (at capture): **44181863**
- Sync percentage: **100%**

---

## 6) Query results for each proof name

Read-only GraphQL query shape used across both endpoints:

```graphql
query($name:String!){
  domains(where:{name:$name}, first:1){
    id
    name
    labelName
    owner { id }
    expiry
    resolvedAddress
    registrationType
    resolverRecord { addr }
  }
}
```

### A) `flowpay.arc`

- Entity exists: **Yes**
- Name / label: `flowpay.arc` / `flowpay`
- Owner: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- Expiry: `1935118075`
- Resolved address: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- No-address state: **No** (address set)
- TLD separation: `.arc` correct
- Registration status/type: `ARC` (registered)

### B) `thebstoftimes.arc` (special proof-point)

- Entity exists: **Yes**
- Name / label: `thebstoftimes.arc` / `thebstoftimes`
- Owner: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- Expiry: `1809867643`
- Resolved address: `0x0000000000000000000000000000000000000000`
- Resolver record addr: `0x0000000000000000000000000000000000000000`
- No-address state: **Yes** (zero-address/unset receiving address semantics)
- TLD separation: `.arc` correct
- Registration status/type: `ARC` (registered)

### C) `bob.arc`

- Entity exists: **Yes**
- Name / label: `bob.arc` / `bob`
- Owner: `0xce42bd12330d30b55a1d5a366bda64f5736b54ac`
- Expiry: `1809886716`
- Resolved address: `null`
- Resolver record: `null`
- No-address state: **Yes** (no receiving address set)
- TLD separation: `.arc` correct
- Registration status/type: `ARC` (registered)

### D) `dnyelfy.circle`

- Entity exists: **Yes**
- Name / label: `dnyelfy.circle` / `dnyelfy`
- Owner: `0x15dc3c8131a351f307ca5eb04d227ea0fe01ac71`
- Expiry: `1809001230`
- Resolved address: `0x15dc3c8131a351f307ca5eb04d227ea0fe01ac71`
- No-address state: **No** (address set)
- TLD separation: `.circle` correct
- Registration status/type: `CIRCLE` (registered)

---

## 7) Old endpoint vs Goldsky comparison

Old/current endpoint:

`https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`

Goldsky endpoint:

`https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`

Comparison for all four proof names:

- Entity presence: **Match**
- Name/label: **Match**
- Owner: **Match**
- Expiry: **Match**
- Resolved address / no-address behavior: **Match**
- TLD separation (`.arc` vs `.circle`): **Match**
- Registration type/status (`ARC` / `CIRCLE`): **Match**

Mismatches detected: **None** for proof set.

---

## 8) Whether proof names are available on Goldsky

**Yes.** All required proof names are present on Goldsky:

- `flowpay.arc`
- `thebstoftimes.arc`
- `bob.arc`
- `dnyelfy.circle`

---

## 9) Whether `thebstoftimes.arc` no-address state is correct

**Yes.** It is present and registered, with owner and expiry populated, while both `resolvedAddress` and `resolverRecord.addr` are zero-address.

This confirms it remains distinct from unregistered/non-existent names (entity exists and is active/registered despite no receiving address set).

Note: validation intentionally used **`thebstoftimes.arc`** and did **not** use `thebestoftimes.arc`.

---

## 10) Aggregate sanity checks

### 10.1 Count check

`*Connection.totalCount` is not supported by this schema (`Type Query has no field domainsConnection/registrationsConnection/renewalsConnection`).

Fallback count-sanity query used:

```graphql
{
  domainsCount: domains(first: 1000) { id }
  registrationsCount: registrations(first: 1000) { id }
  renewalsCount: renewals(first: 1000) { id }
}
```

Observed counts (returned list lengths):

- Old endpoint: `domains=861`, `registrations=861`, `renewals=35`
- Goldsky: `domains=861`, `registrations=861`, `renewals=35`

Result: **Match**.

### 10.2 Sample latest domains (both endpoints matched)

Sample rows included:

- `archestration.circle` (`CIRCLE`)
- `archestration.arc` (`ARC`)
- `cacatherine.circle` (`CIRCLE`)
- `cacatherine.arc` (`ARC`)
- `string.arc` (`ARC`)

### 10.3 `.arc` vs `.circle` separation sample

Goldsky sample query returned distinct sets under each type:

- ARC sample: `archestration.arc`, `cacatherine.arc`, `string.arc`
- CIRCLE sample: `archestration.circle`, `cacatherine.circle`, `annoluk.circle`

### 10.4 Latest registration/renewal events

Goldsky latest registration sample includes:

- `archestration.circle`
- `archestration.arc`
- `cacatherine.circle`
- `cacatherine.arc`
- `string.arc`

Goldsky latest renewal sample includes:

- `desmart.circle`
- `ukamaka.arc`
- `vader.arc`
- `vader.arc`
- `man4ik.circle`

Result: registration/renewal event streams are queryable and coherent.

---

## 11) Whether frontend can safely prepare fallback config

**Yes.**

Given full sync and passing proof-name parity, frontend can safely prepare an **optional fallback config PR** (without switching primary endpoint yet), consistent with the phased plan.

---

## 12) Whether frontend can safely switch primary endpoint now

**Not recommended yet as the preferred immediate action.**

Even with full sync/parity pass, the safer sequence remains:
1. prepare optional fallback/rollback configuration first,
2. validate query shape/operational behavior in staging/controlled rollout,
3. only then consider primary switch.

So: primary switch is **possible after fallback path is in place and rollout controls are confirmed**, but **do not perform direct immediate switch from this report step**.

---

## 13) Recommended next step

Per decision rule and preferred rollout order:

**Decision summary (final):**

- Full sync complete: **Yes**
- Health: **healthy / Active**
- Proof-name parity: **pass**
- `thebstoftimes.arc` no-address state: **correct**
- Frontend fallback config: **safe to prepare in a later PR**
- Primary endpoint switch: **not recommended as the immediate next step**

**Recommend:** “Prepare optional Goldsky fallback config PR, keeping the current endpoint as primary and RPC fallback intact.”

Do **not** do a direct primary switch as the next immediate step from this checkpoint.

---

## 14) Files changed

- `docs/integration/GOLDSKY_PHASE3_FINAL_SYNC_PARITY_REPORT.md` (new)

---

## 15) `git status --short`

Captured after report creation (see command output section below).

---

Stop for review.
No contract/frontend/env/package modifications performed.
No deploy, no transactions, no commit, no push.
