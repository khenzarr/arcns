# ArcNS v3 — Final Status

**Date:** 2026-04-25  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Version:** v3  
**Finalization phase:** COMPLETE

---

## 1. WHAT IS LIVE

### Deployed Contracts (Arc Testnet)

| Contract | Address | Upgradeable |
|----------|---------|-------------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | No |
| ArcNSBaseRegistrar (.arc) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` | No |
| ArcNSBaseRegistrar (.circle) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` | No |
| ArcNSController (.arc) proxy | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | Yes (UUPS) |
| ArcNSController (.circle) proxy | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | Yes (UUPS) |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` | No |
| ArcNSResolver proxy | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | Yes (UUPS) |
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | No |

Deployed: 2026-04-24T21:58:41Z · Deployer: `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` · No upgrades performed.

### Canonical Subgraph
- Slug: `arcnslatest`
- Query URL: `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`
- Start block: `38856377`

### Active Frontend
- Next.js 14 App Router · wagmi v2 · viem
- Pages: home/search, my-domains, resolve
- Wired exclusively to v3 contracts via `generated-contracts.ts`
- **Hosting status:** Not publicly deployed. Currently runs as a local dev server (`npm run dev`). No production domain or public URL exists yet. This is a pre-mainnet gap — see Section 6.

### Working User Flows (confirmed in live manual testing)
- `.arc` registration (full commit-reveal: approve → commit → wait → register)
- `.circle` registration
- ERC-721 NFT mint on registration
- Forward resolution (`addr` record)
- Name renewal
- Transaction history (subgraph-backed)
- Primary name set at registration time
- Dashboard-driven primary name update
- Wrong-network guard (blocks writes on incorrect chain)
- Owned-domain-only primary name selection (no free-form text entry)

---

## 2. WHAT IS CANONICAL

| Concern | Canonical location |
|---------|-------------------|
| v3 contract source | `contracts/v3/` |
| Deployed addresses | `deployments/arc_testnet-v3.json` → `frontend/src/lib/generated-contracts.ts` |
| v3 ABIs | `artifacts/contracts/v3/**/*.json` → `frontend/src/lib/abis.ts` |
| Register args shape | `frontend/src/lib/commitment.ts` — 7-param, no `bytes[] data` |
| Frontend | `frontend/src/` |
| Active hooks | `frontend/src/hooks/` (useRegistration, useRenew, usePrimaryName, useMyDomains, useAvailability) |
| Subgraph | `indexer/` |
| v3 tests | `test/v3/` + `frontend/src/__tests__/` |
| UUPS proxy manifest | `.openzeppelin/unknown-5042002.json` |
| Finalization docs | `docs/final/` |
| Config generator | `scripts/generate-frontend-config.js` |
| Deploy script | `scripts/v3/deployV3.js` |

---

## 3. WHAT IS TESTED

### Contract Tests (`test/v3/`)

**~180 passing tests across 7 test files.** Zero failures on the v3 suite.

- **ArcNSRegistry** — node ownership, authorization, operator approval, all read/write functions
- **ArcNSBaseRegistrar** — availability, register, registerWithResolver, renew, ownerOf, reclaim, tokenURI, controller management, NotLive guard
- **ArcNSPriceOracle** — all 5 pricing tiers, pro-rated duration, premium decay (new/recent/decayed), setPrices
- **ArcNSResolver** — setAddr/addr round-trip, setName/name, CONTROLLER_ROLE authorization, setController, UUPS upgrade guard
- **ArcNSReverseRegistrar** — setName, setReverseRecord, node computation, claimWithResolver, independent per-address records
- **ArcNSController** — full commitment lifecycle (CommitmentTooNew, CommitmentExpired, CommitmentNotFound, replay, wrong sender, wrong secret), name validation (all invalid cases), payment (PriceExceedsMaxCost, insufficient balance, exact treasury transfer), resolver integration, reverse record (set, failure non-blocking), NFT ownership, renew, all admin functions, pause/unpause, UUPS upgrade guard
- **Integration** — deployment wiring, `.arc` and `.circle` full lifecycle, independent TLDs, resolver addr chain, reverse/primary name, renewal/expiry/grace, replay rejection, premium decay, maxCost protection, deploy script smoke test

### Frontend Tests (`frontend/src/__tests__/`)

**~30 passing unit/smoke tests.** 2 pre-existing failures (see below).

- Error taxonomy, user-facing messages (no ENS wording), retryable classification
- `makeCommitment` 7-param shape, `buildRegisterArgs` 7-element tuple, `reverseNodeFor`, `maxCostWithSlippage`
- Commitment hash consistency, arg shape consistency
- **2 pre-existing failing tests** (`preservationTests.test.ts`, `bugConditionExploration.test.tsx`) — reference archived hooks, no production impact, must be fixed before mainnet

### Live / Manual Smoke Tests

**10 flows tested, all passed.** See `docs/final/SMOKE_TEST_RESULTS.md` for step-level results.

---

## 4. WHAT IS ARCHIVED / REFERENCE-ONLY

### Archived (not imported by any active file)
```
frontend/src/hooks/_archive/
├── useArcNS.ts                    — v1 monolithic hook
├── useArcNSV2.ts                  — v2 hook
├── useDomainResolutionPipeline.ts — v2 resolution pipeline
└── useRegistrationPipeline.ts     — v2 registration pipeline
```

### Reference-Only (in repo, not active)
```
contracts/registrar/    — v1/v2 contracts
contracts/registry/     — v1/v2 registry
contracts/resolver/     — v1/v2 resolver
contracts/proxy/        — v2 proxy contract
test/ArcNS.test.js      — v1 test suite
test/ArcNSV2.test.js    — v2 test suite
deployments/arc_testnet-v2.json  — v2 address baseline
audit/AUDIT_REPORT.md   — pre-v3 internal audit (findings addressed in v3)
masterplan.md           — rebuild planning doc (superseded by docs/final/)
```

### Stale (safe to delete, deferred)
```
abis/ArcNSController.json   — v1 ABI stub
src/arc-ns-controller.ts    — root-level subgraph handler stub
tests/                      — root-level matchstick tests for old stub
generated/                  — root-level generated subgraph types
build/                      — root-level subgraph build output
schema.graphql              — root-level schema stub
subgraph.yaml               — root-level manifest stub
arcns/                      — empty package directory
```

---

## 5. WHAT IS DEMO-READY

### Safe to Show in a Founder Demo
- `.arc` registration (full flow, live on-chain)
- `.circle` registration
- NFT proof on ArcScan
- Forward resolution (Resolve page)
- Primary name set and displayed
- Portfolio view (My Domains)
- Transaction history
- Wrong-network guard behavior

### Demo Caveats
- **62-second commit wait** is real and visible — use it to explain the anti-frontrun mechanism
- **Subgraph lag** (5–30 seconds after registration) — refresh after 30 seconds if history is empty
- **Public RPC congestion** — occasional txpool delays; retry after 30–60 seconds; use a private RPC for important demos
- **Primary name selector** requires subgraph to be indexed — if empty, shows a message; RPC fallback does not provide domain labels

### If Testnet Conditions Are Noisy
See `docs/final/FOUNDER_DEMO_FALLBACKS.md` — covers txpool busy, subgraph lag, wrong network, slow registration, and how to explain testnet constraints without undermining confidence.

---

## 6. WHAT IS NOT MAINNET-READY YET

The five most important blockers (full list in `docs/final/MAINNET_GAP_REPORT.md`):

1. **No external security audit.** No external audit has been performed. This is a hard blocker.
2. **Single-EOA role concentration.** All admin roles, upgrade authority, and treasury are controlled by one key. Must be replaced with multisigs before mainnet.
3. **No upgrade time-lock.** UPGRADER_ROLE allows immediate upgrades with no delay. A time-lock is required.
4. **Mainnet USDC address unconfirmed.** Testnet USDC (`0x3600...0000`) is not mainnet USDC. Contracts must be redeployed with the confirmed mainnet address.
5. **Public RPC dependency.** The frontend relies on public Arc Testnet RPCs. Dedicated infrastructure is required for mainnet.

Additionally: 2 failing frontend tests must be fixed, reentrancy adversarial tests must be added, and automated UUPS storage layout verification must be in CI.

### Ecosystem Integration (not yet integrated, not a protocol blocker)
- **Explorer-native name search** — ArcScan does not yet support searching by name (e.g. `test1.arc`). Users must search by address or transaction hash.
- **Wallet-native recipient resolution** — typing `.arc` or `.circle` names directly into a wallet's recipient input field is not yet supported. Wallets must integrate the ArcNS resolver to enable this.

These are ecosystem integration items that require third-party adoption (ArcScan, wallet providers). The protocol and resolver are fully functional — the integration surface is not yet built out.

---

## 7. NEXT LOGICAL MILESTONE

**Milestone: Audit + Hardening + Mainnet Preparation**

Concrete deliverables for this milestone:

1. Engage external security auditor — scope: all 6 v3 contracts
2. Resolve all audit findings
3. Implement upgrade time-lock contract
4. Transfer all admin roles to multisig
5. Transfer treasury to multisig
6. Confirm mainnet USDC address
7. Add reentrancy adversarial tests + automated storage layout check to CI
8. Fix 2 failing frontend tests
9. Deploy subgraph to decentralized hosting
10. Deploy frontend to production domain
11. Provision dedicated RPC for mainnet
12. Redeploy all contracts on mainnet
13. Complete mainnet smoke test matrix
14. Publish audit report and mainnet addresses

**Estimated scope:** 6–10 weeks depending on audit timeline.

**Gate:** All 25 acceptance criteria in `docs/final/MAINNET_GAP_REPORT.md` Section 6 must be met before mainnet launch.

---

## Finalization Package Index

All finalization documents are in `docs/final/`:

| Document | Purpose |
|----------|---------|
| `active-path-lockdown.md` | Verified canonical import graph, no legacy leakage |
| `repo-canonicalization.md` | Full repo classification, cleanup applied |
| `RELEASE_SUMMARY.md` | What is live, what works, what is v1-scope-only |
| `DEPLOYED_ADDRESSES.md` | All contract addresses, subgraph URL, explorer links |
| `ENVIRONMENT_GUIDE.md` | `.env` vs `.env.local` split, what to update after redeploy |
| `SUBGRAPH_GUIDE.md` | Subgraph build/deploy, frontend consumption, fallback behavior |
| `SMOKE_TEST_RESULTS.md` | Live manual test results, caveats |
| `FOUNDER_DEMO_SCRIPT.md` | 9-step demo flow with talking points |
| `FOUNDER_DEMO_CHECKLIST.md` | Pre-demo setup checklist |
| `FOUNDER_DEMO_FALLBACKS.md` | Recovery guide for live testnet conditions |
| `AUDIT_SCOPE.md` | In-scope contracts, out-of-scope items, operational dependencies |
| `THREAT_MODEL_SUMMARY.md` | Trust boundaries, invariants, attacker models |
| `UPGRADE_POLICY.md` | Upgradeable vs non-upgradeable rationale, upgrade process |
| `ROLE_PERMISSION_MATRIX.md` | Full privilege map, concentration summary, mainnet recommendations |
| `TEST_COVERAGE_SUMMARY.md` | Coverage by contract and flow, known gaps |
| `MAINNET_GAP_REPORT.md` | Prioritized gap analysis, go/no-go checklist |
