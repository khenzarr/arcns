# ArcNS Goldsky Phase 2 Product Deploy Report

Date: 2026-05-27
Repo: `C:\Users\mertb\Desktop\NODE\ArcNameServices\arcns`
Scope: **Parallel deploy only** for product/frontend subgraph target from `indexer/`

---

## 1) Was Goldsky product subgraph deployed?

**Yes.** Deployment completed successfully.

---

## 2) Subgraph name/version

`arcns-product/v0.1.0`

---

## 3) Goldsky endpoint URL

`https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`

---

## 4) Goldsky CLI version

`13.3.4`

---

## 5) Goldsky project name

`arcns`

---

## 6) Preflight codegen result

Command:

```powershell
cd indexer
npm run codegen
```

Result: **PASS** (`Types generated successfully`)

---

## 7) Preflight build result

Command:

```powershell
cd indexer
npm run build
```

Result: **PASS** (`Build completed: build\subgraph.yaml`)
Build artifact check: **PASS** (`indexer/build/subgraph.yaml` found)

---

## 8) Status/list output summary

- `goldsky subgraph list` before deploy: no subgraphs found.
- Post-deploy: `arcns-product/v0.1.0` listed as healthy/active.
- Chain reported by Goldsky: `arc-testnet`.
- Latest observed sync state during validation:
  - `Synced: 5.48%`
  - `Blocks indexed: 38856376 -> 39147849`

Note on CLI syntax: in installed CLI (`13.3.4`), `goldsky subgraph status` is not available; `goldsky subgraph list [nameAndVersion]` was used for status/sync visibility.

---

## 9) Query/parity test results

Endpoints used:

- Old/current endpoint (from docs):
  `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`
- New Goldsky endpoint:
  `https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`

Names tested:

- `flowpay.arc`
- `thebstoftimes.arc` (proof-point; correct spelling)
- `bob.arc`
- `dnyelfy.circle`

Initial query attempt via `curl` in PowerShell failed due to JSON escaping. Re-ran successfully with `Invoke-RestMethod`.

Observed results:

- **Old endpoint** returned expected populated entities for all four names.
- **Goldsky endpoint** returned `domains: []` for these specific names at test time.
- Goldsky `COUNT_SAMPLE` query returned non-empty domain data (e.g., `test1.circle`, `testt.arc`, `test1.arc`, etc.), confirming endpoint is live and indexing data.

Interpretation:

- This is consistent with **early sync lag** (Goldsky had only reached ~5.48% at capture time), not a hard deploy failure.
- Full parity for proof-point names is **not yet reached** at this snapshot.

---

## 10) Any indexing lag or sync issue

**Yes (expected during initial catch-up):** subgraph is healthy but still syncing, and key parity names are not yet present on Goldsky at current indexed block range.

---

## 11) Any schema/query mismatch

No blocking schema mismatch detected in deployed endpoint behavior.
The query shape executed successfully against both endpoints once request serialization was corrected.

---

## 12) Whether frontend can safely use this endpoint later

**Yes, potentially later** — but **not yet** for primary switch.
Recommendation: wait until Goldsky sync progresses enough to include proof-point/parity names (`thebstoftimes.arc`, `flowpay.arc`, etc.) and parity checks pass.

---

## 13) What was NOT changed

- No contract files modified
- No frontend app logic modified
- No package.json / package-lock.json modified
- No `.env` or secrets modified
- No blockchain transactions executed
- No BENS deployment performed
- No frontend endpoint switch (`NEXT_PUBLIC_SUBGRAPH_URL` unchanged)
- No commit, no push

---

## 14) Files changed

- `docs/integration/GOLDSKY_PHASE2_PRODUCT_DEPLOY_REPORT.md` (new)

---

## 15) `git status --short`

Captured output:

```text
?? docs/grants/demo-output/
?? docs/integration/GOLDSKY_ARCNS_INTEGRATION_PLAN.md
?? docs/integration/GOLDSKY_PHASE1_BUILD_READINESS.md
```

---

## 16) Recommended next step

1. Allow `arcns-product/v0.1.0` to continue syncing on Goldsky.
2. Re-run parity queries for:
   - `flowpay.arc`
   - `thebstoftimes.arc`
   - `bob.arc` (if present)
   - `dnyelfy.circle`
3. Confirm proof-point expectations for `thebstoftimes.arc` on Goldsky:
   - registered/active
   - owner visible
   - expiry visible
   - no receiving address set
4. Only after parity sign-off, prepare a separate controlled plan for optional frontend endpoint switch.

---

Stop for review.
