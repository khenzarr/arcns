# ArcNS Goldsky Phase 3 Sync & Parity Report

Date: 2026-05-27
Repo: `C:\Users\mertb\Desktop\NODE\ArcNameServices\arcns`
Phase: 3 (post parallel Goldsky deploy)

---

## 1) Goldsky subgraph name/version

`arcns-product/v0.1.0`

---

## 2) Goldsky endpoint URL

`https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`

Old/current endpoint (from prior docs/report):

`https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`

---

## 3) Current sync status

From command:

```powershell
npx -y @goldskycom/cli subgraph list arcns-product/v0.1.0
```

Captured status snapshot:

- Synced: **42.0%**
- Blocks indexed: **38856376 -> 41092891**
- Chain: **arc-testnet**

Interpretation:

- Sync is actively progressing and significantly ahead of prior 5.48% snapshot.

---

## 4) Current health status

From same Goldsky status/list output:

- Health: **healthy**
- State: **Active**
- Chain: **arc-testnet**
- Indexing errors: **none reported in output**

---

## 5) Query results for each proof name (Goldsky)

Query shape used (read-only):

```graphql
{
  domains(where:{name:"<name>"}, first:1) {
    id
    name
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
- Name: `flowpay.arc`
- Owner: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- Expiry: `1935118075`
- Resolved address: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- Registration status/type: `ARC` (registered)
- TLD separation: `.arc` correct

### B) `thebstoftimes.arc`

- Entity exists: **Yes**
- Name: `thebstoftimes.arc`
- Owner: `0x0b943fe9f1f8135e0751ba8b43dc0cd688ad209d`
- Expiry: `1809867643`
- Resolved address: `0x0000000000000000000000000000000000000000`
- Resolver record addr: `0x0000000000000000000000000000000000000000`
- No-address state: **Correct (zero-address / effectively unset receiving address)**
- Registration status/type: `ARC` (registered)
- TLD separation: `.arc` correct

### C) `bob.arc`

- Entity exists: **Yes**
- Name: `bob.arc`
- Owner: `0xce42bd12330d30b55a1d5a366bda64f5736b54ac`
- Expiry: `1809886716`
- Resolved address: `null`
- Resolver record: `null`
- Registration status/type: `ARC` (registered)
- TLD separation: `.arc` correct

### D) `dnyelfy.circle`

- Entity exists: **Yes**
- Name: `dnyelfy.circle`
- Owner: `0x15dc3c8131a351f307ca5eb04d227ea0fe01ac71`
- Expiry: `1809001230`
- Resolved address: `0x15dc3c8131a351f307ca5eb04d227ea0fe01ac71`
- Registration status/type: `CIRCLE` (registered)
- TLD separation: `.circle` correct

---

## 6) Old endpoint vs Goldsky comparison

Same query shape was run against both endpoints for all four proof names.

Comparison result:

- Entity presence: **Match** (all 4 present on both)
- Owner: **Match**
- Expiry: **Match**
- Resolved address / no-address behavior: **Match**
- TLD separation: **Match** (`.arc` vs `.circle`)
- Registration status/type: **Match** (`ARC` / `CIRCLE`)

No discrepancies observed for the proof set.

---

## 7) Whether proof names are available on Goldsky

**Yes.** All required proof names are now available on Goldsky:

- `flowpay.arc`
- `thebstoftimes.arc`
- `bob.arc`
- `dnyelfy.circle`

---

## 8) Whether `thebstoftimes.arc` no-address state is correct

**Yes.** Goldsky returns zero-address for both `resolvedAddress` and `resolverRecord.addr`, matching old endpoint behavior and expected no-address semantics.

---

## 9) Whether frontend can safely switch now

**Not yet recommended for primary switch at this exact checkpoint**, because Goldsky sync is still incomplete (**42.0%**).
Even though proof-name parity currently passes, full historical/state catch-up is not finished.

---

## 10) Recommendation

Based on decision rules and current evidence:

1. **Wait** for further sync progress toward full catch-up.
2. **Rerun parity** once sync reaches a near/full state (or operator-defined threshold).
3. Since basic proof parity now passes, **prepare optional frontend fallback config in a later PR** (no immediate switch).
4. **Do not switch primary endpoint yet** until sync completion confidence is established.

Decision summary:

- Parity status for proof set: **PASS (for sampled names)**
- Full sync status: **PENDING FULL SYNC**
- Primary endpoint switch: **HOLD**

---

## 11) Files changed

- `docs/integration/GOLDSKY_PHASE3_SYNC_PARITY_REPORT.md` (new)

---

## 12) `git status --short`

Captured after report creation:

```text
?? docs/grants/demo-output/
?? docs/integration/GOLDSKY_ARCNS_INTEGRATION_PLAN.md
?? docs/integration/GOLDSKY_PHASE1_BUILD_READINESS.md
?? docs/integration/GOLDSKY_PHASE2_PRODUCT_DEPLOY_REPORT.md
?? docs/integration/GOLDSKY_PHASE3_SYNC_PARITY_REPORT.md
```

---

Stop for review.
No contract/frontend/env/package modifications performed.
No deploy, no transactions, no commit, no push.
