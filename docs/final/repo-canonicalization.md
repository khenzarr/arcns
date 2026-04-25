# ArcNS v3 — Repository Canonicalization

**Date:** 2026-04-25  
**Status:** COMPLETE  
**Phase:** Finalization Phase 2

---

## 1. Canonical Active Paths

These are the only paths that matter for demo, audit, and mainnet planning.

### Contracts
```
contracts/v3/
├── controller/ArcNSController.sol       ← deployed, UUPS proxy
├── registrar/ArcNSBaseRegistrar.sol     ← deployed, non-upgradeable
├── registrar/ArcNSPriceOracle.sol       ← deployed, non-upgradeable
├── registrar/ArcNSReverseRegistrar.sol  ← deployed, non-upgradeable
├── registry/ArcNSRegistry.sol           ← deployed, non-upgradeable
├── resolver/ArcNSResolver.sol           ← deployed, UUPS proxy
├── interfaces/                          ← v3 interface definitions
└── mocks/                               ← test mocks only
```

### Frontend
```
frontend/src/
├── app/                    ← Next.js App Router pages
├── components/             ← UI components (all v3-wired)
├── hooks/                  ← v3 wagmi hooks
│   ├── useAvailability.ts
│   ├── useRegistration.ts
│   ├── useRenew.ts
│   ├── usePrimaryName.ts
│   ├── useMyDomains.ts
│   └── _archive/           ← superseded v1/v2 hooks (not imported)
└── lib/
    ├── generated-contracts.ts  ← ADDRESS SOURCE OF TRUTH
    ├── abis.ts                 ← ABI SOURCE OF TRUTH (imports from artifacts/contracts/v3/)
    ├── contracts.ts            ← typed contract descriptors
    ├── commitment.ts           ← 7-param v3 commitment builder
    ├── errors.ts               ← ArcNS error taxonomy
    ├── normalization.ts        ← label validation + pricing
    ├── namehash.ts             ← namehash + labelToTokenId
    ├── graphql.ts              ← subgraph client (arcnslatest)
    ├── publicClient.ts         ← detached viem client
    ├── wagmiConfig.ts          ← wagmi config
    └── chains.ts               ← Arc Testnet chain definition
```

### Subgraph
```
indexer/
├── schema.graphql      ← v3 entity schema
├── subgraph.yaml       ← v3 manifest (arcnslatest)
└── src/                ← v3 event handlers
```

### Deployment Truth
```
deployments/arc_testnet-v3.json          ← CANONICAL deployment record
.openzeppelin/unknown-5042002.json       ← OZ UUPS proxy manifest
scripts/generate-frontend-config.js      ← generates generated-contracts.ts
```

### Tests
```
test/v3/                ← v3 contract test suite
frontend/src/__tests__/ ← frontend unit tests (block1, block2, PBT)
```

---

## 2. Full Classification Table

### Top-Level Directories

| Path | Classification | Notes |
|------|---------------|-------|
| `contracts/v3/` | **active-canonical** | Deployed v3 contracts |
| `frontend/src/` | **active-canonical** | Live frontend |
| `indexer/` | **active-canonical** | Live subgraph (arcnslatest) |
| `deployments/arc_testnet-v3.json` | **active-canonical** | Deployment truth |
| `.openzeppelin/unknown-5042002.json` | **active-canonical** | UUPS proxy manifest |
| `scripts/v3/` | **active-canonical** | v3 deploy script |
| `scripts/generate-frontend-config.js` | **active-canonical** | Config generator |
| `test/v3/` | **active-canonical** | v3 test suite |
| `docs/final/` | **active-canonical** | Finalization docs |
| `docs/design/` | **reference-only** | Architecture design docs (approved, historical) |
| `docs/release/` | **reference-only** | Release checklists (pre-finalization) |
| `masterplan.md` | **reference-only** | Rebuild planning doc — superseded by finalization docs |
| `contracts/registrar/` | **reference-only** | v1/v2 contracts — not deployed in v3 |
| `contracts/registry/` | **reference-only** | v1/v2 registry — not deployed in v3 |
| `contracts/resolver/` | **reference-only** | v1/v2 resolver — not deployed in v3 |
| `contracts/proxy/` | **reference-only** | v2 proxy contract — not deployed in v3 |
| `contracts/interfaces/` | **reference-only** | v1/v2 interfaces — v3 has own under contracts/v3/interfaces/ |
| `contracts/governance/` | **reference-only** | Treasury contract — deployed but not in v3 controller path |
| `contracts/mocks/` | **reference-only** | v1/v2 mocks |
| `contracts/security/` | **reference-only** | Empty directory |
| `deployments/arc_testnet-v2.json` | **reference-only** | v2 address baseline |
| `deployments/hardhat-v3.json` | **reference-only** | Local hardhat deployment |
| `scripts/deploy.js` | **reference-only** | v1 deploy script |
| `scripts/deployV2.js` | **reference-only** | v2 deploy script |
| `scripts/upgradeV2.js` | **reference-only** | v2 upgrade script |
| `scripts/verify.js` | **reference-only** | v1 verify script |
| `scripts/verifyV2.js` | **reference-only** | v2 verify script |
| `scripts/backfillAddr.js` | **reference-only** | One-time migration script |
| `test/ArcNS.test.js` | **reference-only** | v1 test suite |
| `test/ArcNSV2.test.js` | **reference-only** | v2 test suite |
| `test/ArcNSPhases20to22.test.js` | **reference-only** | v2 phase tests |
| `test/RentPriceCheck.js` | **reference-only** | v1 price check |
| `test/ShortNameFix.test.js` | **reference-only** | v1 fix test |
| `audit/AUDIT_REPORT.md` | **reference-only** | Pre-v3 audit findings (all addressed in v3) |
| `frontend/src/hooks/_archive/` | **archive-legacy** | Superseded v1/v2 hooks |
| `abis/ArcNSController.json` | **archive-legacy** | Stale v1 ABI — superseded by artifacts/contracts/v3/ |
| `src/arc-ns-controller.ts` | **archive-legacy** | Root-level subgraph handler stub — superseded by indexer/ |
| `tests/` | **archive-legacy** | Root-level matchstick tests for old subgraph stub |
| `generated/` | **archive-legacy** | Root-level generated subgraph types — superseded by indexer/generated/ |
| `build/` | **archive-legacy** | Root-level subgraph build output — superseded by indexer/build/ |
| `schema.graphql` | **archive-legacy** | Root-level schema stub — superseded by indexer/schema.graphql |
| `subgraph.yaml` | **archive-legacy** | Root-level manifest stub — superseded by indexer/subgraph.yaml |
| `arcns/` | **archive-legacy** | Empty package directory — no active content |
| `scripts/test-rentprice.cjs` | **archive-legacy** | Stale test script |
| `scripts/test-rentprice.js` | **archive-legacy** | Stale test script |
| `scripts/verifyProxy.js` | **reference-only** | May be useful for future upgrades |
| `scripts/verifyResolution.js` | **reference-only** | Useful for smoke testing |
| `scripts/verifySubgraphAndResolution.js` | **reference-only** | Useful for smoke testing |
| `scripts/update-subgraph-env.js` | **reference-only** | Subgraph env helper |
| `scripts/pre-deploy-check.ps1` | **active-canonical** | Pre-deploy validation script |

---

## 3. Cleanup Applied in This Phase

### README.md
- Removed `"ENS-parity"` from the opening description
- Removed "Key Differences from ENS" comparison table
- Removed RainbowKit reference (not used in v3)
- Updated Project Structure to reflect v3 reality with canonical path markers

### frontend/src/hooks/useAvailability.ts
- Removed stale `"Extracted from v1 useArcNS"` comment

### No destructive deletions applied
The archive-legacy items listed above were **not deleted** in this phase. Rationale:
- `abis/`, `src/`, `tests/`, `generated/`, `build/`, `schema.graphql`, `subgraph.yaml`, `arcns/` are all clearly stale but are not near the active path and do not cause confusion during demo or audit
- Deleting them is safe but deferred — they should be cleaned in a dedicated cleanup commit before mainnet, not during finalization documentation

---

## 4. Remaining Ambiguity (Deferred)

| Item | Issue | Recommendation |
|------|-------|---------------|
| `contracts/registrar/`, `contracts/registry/`, etc. | v1/v2 contracts sit alongside `contracts/v3/` | Add a `contracts/README.md` noting v3 is canonical; or move v1/v2 to `contracts/_legacy/` before mainnet |
| `test/` root | v1/v2 tests alongside `test/v3/` | Move v1/v2 tests to `test/_legacy/` before mainnet |
| `audit/AUDIT_REPORT.md` | Pre-v3 findings — could be confused with current audit scope | Superseded by `docs/final/AUDIT_SCOPE.md` (Phase 5) |
| `abis/ArcNSController.json` | Stale v1 ABI at root level | Safe to delete; deferred |
| `src/`, `tests/`, `generated/`, `build/` | Root-level subgraph stub artifacts | Safe to delete; deferred |
| `masterplan.md` | Rebuild planning doc — still accurate but now superseded | Retain as historical reference |

---

## 5. Canonical Path Summary

| Concern | Canonical location |
|---------|-------------------|
| v3 contract source | `contracts/v3/` |
| v3 deployed addresses | `deployments/arc_testnet-v3.json` → `frontend/src/lib/generated-contracts.ts` |
| v3 ABIs | `artifacts/contracts/v3/**/*.json` → `frontend/src/lib/abis.ts` |
| Frontend | `frontend/src/` |
| Subgraph | `indexer/` |
| Subgraph URL | `NEXT_PUBLIC_SUBGRAPH_URL` in `frontend/.env.local` |
| v3 tests | `test/v3/` + `frontend/src/__tests__/` |
| Finalization docs | `docs/final/` |
| UUPS proxy manifest | `.openzeppelin/unknown-5042002.json` |
