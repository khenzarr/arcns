# ArcNS v3 — Test Coverage Summary

**Test runner:** Hardhat + Mocha + Chai  
**Frontend tests:** Vitest  
**Status:** Core flows covered; not yet hardened to mainnet audit standard

---

## Contract Test Files

| File | Contract(s) covered |
|------|-------------------|
| `test/v3/Registry.test.js` | ArcNSRegistry |
| `test/v3/BaseRegistrar.test.js` | ArcNSBaseRegistrar |
| `test/v3/PriceOracle.test.js` | ArcNSPriceOracle |
| `test/v3/Resolver.test.js` | ArcNSResolver |
| `test/v3/ReverseRegistrar.test.js` | ArcNSReverseRegistrar |
| `test/v3/Controller.test.js` | ArcNSController |
| `test/v3/Integration.test.js` | Full system (all contracts) |

---

## Coverage by Contract

### ArcNSRegistry
- Node ownership: `setOwner`, `setSubnodeOwner`, `setSubnodeRecord`, `setRecord`
- Resolver and TTL: `setResolver`, `setTTL`
- Operator approval: `setApprovalForAll`, `isApprovedForAll`
- Authorization: `NotAuthorised` revert for unauthorized callers
- Read functions: `owner`, `resolver`, `ttl`, `recordExists`

### ArcNSBaseRegistrar
- Deployment: name, symbol, registry, baseNode, tld, GRACE_PERIOD
- `available()`: new name, active name, during grace period, after grace period
- `register()`: happy path, NFT mint, nameExpires, registry subnode, NameRegistered event, NotController revert, NameNotAvailable revert
- `registerWithResolver()`: resolver set in registry, event, NotController revert
- `renew()`: expiry extension, NameRenewed event, past grace period revert, during grace period success
- `ownerOf()`: active name, expired name (NameExpired revert)
- `reclaim()`: token owner can reclaim, non-owner NotTokenOwner revert
- `tokenURI()`: base64 JSON structure, description, SVG image, TLD attribute, Expiry attribute, Status attribute
- `NotLive`: registrar not owning baseNode reverts

### ArcNSPriceOracle
- All five pricing tiers (1–5+ chars)
- Pro-rated duration pricing
- Premium decay: new name (zero premium), recently expired (non-zero), fully decayed (zero)
- `setPrices()`: owner can update, non-owner reverts
- `ZeroDuration` revert

### ArcNSResolver
- `setAddr` / `addr` round-trip
- Authorization: node owner, approved operator, CONTROLLER_ROLE
- `setName` / `name` round-trip (CONTROLLER_ROLE only)
- `setController`: grant/revoke CONTROLLER_ROLE
- UUPS upgrade: UPGRADER_ROLE required, unauthorized reverts
- `NotAuthorised` revert for unauthorized callers

### ArcNSReverseRegistrar
- `setName()`: dashboard-driven primary name update
- `setReverseRecord()`: registration-time path
- `node()`: reverse node computation
- `claimWithResolver()`: custom resolver
- `setDefaultResolver()`: owner only
- Independent reverse records per address

### ArcNSController
- Initialization: cannot initialize twice, state variables, role grants
- `makeCommitment()`: deterministic, sender-bound, secret-bound, name-bound, resolver-bound
- `commit()`: stores timestamp, CommitmentMade event, CommitmentAlreadyUsed, CommitmentAlreadyExists, re-commit after expiry, paused revert
- `register()` — commitment lifecycle: CommitmentTooNew, CommitmentExpired, CommitmentNotFound, replay rejection, wrong sender, wrong secret, wrong resolverAddr
- `register()` — name validation: valid names, InvalidName (leading hyphen, trailing hyphen, double hyphen, uppercase, space), DurationTooShort
- `register()` — payment: PriceExceedsMaxCost, insufficient allowance, insufficient balance, exact payment to treasury
- `register()` — resolver: no resolver (no addr record), approved resolver (addr record set), ResolverNotApproved
- `register()` — reverse record: reverseRecord=true sets name, reverseRecord=true with no resolver (no revert), reverse record failure silently swallowed
- `register()` — NFT: owner holds NFT, nameExpires set, NameRegistered event
- `renew()`: happy path, NameRenewed event, PriceExceedsMaxCost, payment to treasury, DurationTooShort
- Admin: setTreasury (ZeroAddress revert, TreasuryUpdated event), setApprovedResolver, setPriceOracle, pause/unpause
- UUPS upgrade: UPGRADER_ROLE required

### Integration Tests (full system)
- Deployment wiring: TLD node ownership, controller authorization, CONTROLLER_ROLE grants, resolver approval
- `.arc` full lifecycle: commit → wait → register, availability, registry subnode, event, payment
- `.circle` full lifecycle: same as `.arc`
- Independent TLDs: same label in both `.arc` and `.circle`
- Resolver addr flow: registration-time, forward resolution chain, no resolver, owner update
- Reverse / primary name: registration-time, dashboard setName, overwrite, independent per address, failure non-blocking
- Renewal and expiry: extends expiry, event, grace period, post-grace availability, ownerOf revert, renewal during grace, renewal after grace revert
- Replay rejection: same commitment, different sender, expired commitment
- Premium decay: new name, recently expired, fully decayed, re-registration with premium
- maxCost protection: PriceExceedsMaxCost (.arc and .circle), insufficient balance, exact cost
- Deploy script smoke test: `deployV3.js` runs on hardhat network, output JSON validated

---

## Frontend Tests

| File | Coverage |
|------|---------|
| `frontend/src/__tests__/block1.test.ts` | Error taxonomy (ARC_ERR codes), user-facing messages (no ENS wording), retryable vs non-retryable classification |
| `frontend/src/__tests__/block2.test.ts` | `makeCommitment` (7-param, no data[]), `buildRegisterArgs` (7-element tuple), `reverseNodeFor`, `maxCostWithSlippage`, error message branding |
| `frontend/src/__tests__/identityConsistency.test.ts` | Commitment hash consistency, arg shape consistency |
| `frontend/src/__tests__/preservationTests.test.ts` | **FAILING** — references archived hooks (`useArcNS.ts`, `useDomainResolutionPipeline.ts`). Pre-existing failure, no production impact. |
| `frontend/src/__tests__/bugConditionExploration.test.tsx` | **FAILING** — references archived hook (`useArcNS.ts`). Pre-existing failure, no production impact. |

---

## What Is Not Yet Covered

| Gap | Priority for mainnet |
|-----|---------------------|
| Reentrancy attack simulation | High — storage-based guard is correct but not adversarially tested |
| UUPS upgrade storage layout verification (automated) | High — currently manual only |
| Pause/unpause under concurrent load | Medium |
| Grace period re-registration with premium at exact boundary | Medium |
| `_validName()` Unicode edge cases (emoji, multi-byte) | Medium — on-chain validation is ASCII-only; Unicode handled off-chain |
| Treasury drain via `setTreasury` (role compromise scenario) | High — threat model documents it; no test |
| Resolver injection with malicious CONTROLLER_ROLE holder | High |
| `claimWithResolver()` with arbitrary owner/resolver | Medium |
| Frontend integration tests (wagmi mock) | Medium |
| Stale test cleanup (`preservationTests`, `bugConditionExploration`) | Low — pre-existing, non-blocking |

---

## ⚠ Known Test Issues

1. `preservationTests.test.ts` and `bugConditionExploration.test.tsx` reference archived hooks by file path. These tests fail at runtime. They are pre-existing failures from the v1→v3 migration and have no production impact. They should be updated or removed before mainnet.

2. The deploy script smoke test in `Integration.test.js` (test 10) runs `deployV3.js` via `execSync`. This is slow and environment-dependent. It should be replaced with a proper fixture-based test before mainnet.
