# ArcNS v3 — Canonical Masterplan

---

## Product Truth

| Property | Value |
|----------|-------|
| Product name | ArcNS (Arc Name Service) |
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Native gas token | USDC |
| USDC contract | `0x3600000000000000000000000000000000000000` |
| Supported TLDs | `.arc`, `.circle` |
| Block explorer | https://testnet.arcscan.app |

### Canonical Pricing Schedule

| Label length (Unicode codepoints) | Annual price | Raw value (6 decimals) |
|-----------------------------------|-------------|------------------------|
| 1 character | 50 USDC | 50_000_000 |
| 2 characters | 25 USDC | 25_000_000 |
| 3 characters | 15 USDC | 15_000_000 |
| 4 characters | 10 USDC | 10_000_000 |
| 5+ characters | 2 USDC | 2_000_000 |

Price formula: `base = annualPrice * duration / 365 days`

**Premium decay (v1 canonical economic rule — in scope)**: When a name has recently expired, a linear premium is added on top of the base price to discourage immediate re-registration squatting. The premium starts at 100 USDC at the moment of expiry and decays linearly to 0 over 28 days. After 28 days the premium is 0 and the name is available at base price only. New names (never registered) carry no premium. This rule is active in v1 and implemented in `ArcNSPriceOracle`.

### Canonical Namehashes

| TLD | Namehash |
|-----|---------|
| `.arc` | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| `.circle` | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| `addr.reverse` | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |

---

## Branding Truth

**Forbidden strings** (CI lint gate — release-blocking):
- `.eth`
- `on ENS`
- `ENS-grade`
- `ENS-compatible`
- `ENS-equivalent`
- `ENS-like`
- `ENS-parity`
- `Mirrors ENS`

**Allowed references** (in NatDoc comments only):
- `implements EIP-137 pattern`
- `implements EIP-1822 pattern`
- References to EIP numbers without the "ENS" product name

**Required branding**:
- Product: `ArcNS` or `Arc Name Service`
- Network: `Arc Testnet`
- NFT description: `"ArcNS domain name. Decentralized identity on Arc Testnet."`

The branding lint step runs in CI on every push and is a RELEASE-BLOCKING gate. No deployment to
Arc Testnet proceeds if the lint step fails.

---

## Contract Truth

The ArcNS v3 on-chain system consists of **8 deployed contract instances** from **6 contract types**:

| Contract | Instances | Upgradeability | Rationale |
|----------|-----------|---------------|-----------|
| ArcNSRegistry | 1 | Non-upgradeable | Ownership ledger immutability is a security property |
| ArcNSBaseRegistrar | 2 (.arc, .circle) | Non-upgradeable | ERC-721 token contract address must be stable |
| ArcNSController | 2 (.arc, .circle) | UUPS proxy | Registration logic may need post-audit fixes |
| ArcNSPriceOracle | 1 | Non-upgradeable | Price changes via `setPrices()`, no upgrade needed |
| ArcNSResolver | 1 (shared) | UUPS proxy | Feature set expands in future versions |
| ArcNSReverseRegistrar | 1 | Non-upgradeable | Reverse node ownership must be stable |

**Total deployed instances: 8** (1 Registry + 2 BaseRegistrar + 2 Controller + 1 PriceOracle + 1 Resolver + 1 ReverseRegistrar)

### Controller Roles (AccessControl)

| Role | Capabilities |
|------|-------------|
| `ADMIN_ROLE` | Set treasury, approve resolvers, general admin |
| `PAUSER_ROLE` | Pause/unpause register and renew |
| `ORACLE_ROLE` | Update PriceOracle reference |
| `UPGRADER_ROLE` | Authorize UUPS upgrades |

### Resolver Roles (AccessControl)

| Role | Capabilities |
|------|-------------|
| `ADMIN_ROLE` | Grant/revoke CONTROLLER_ROLE |
| `CONTROLLER_ROLE` | Call setAddr at registration time |
| `UPGRADER_ROLE` | Authorize UUPS upgrades |

### v1 Resolver Scope

`addr` (EVM address, coin type 60) **only**. Out of scope for v1:
- text records
- contenthash
- multicoin addresses
- name records (except reverse)
- CCIP-Read
- wildcard resolution

---

## Deployment Truth

### Active-Canonical Paths

- Contracts: `contracts/v3/`
- Frontend: `frontend/src/`
- Subgraph: `indexer/`
- Deployment JSON: `deployments/arc_testnet-v3.json`
- OZ manifest: `.openzeppelin/unknown-5042002.json`

### Deployment JSON Format

```json
{
  "network": "arc_testnet",
  "chainId": 5042002,
  "version": "v3",
  "deployedAt": "<ISO timestamp>",
  "deployer": "<deployer EOA>",
  "contracts": {
    "usdc":                "0x3600000000000000000000000000000000000000",
    "registry":            "<address>",
    "resolver":            "<proxy address>",
    "resolverImpl":        "<impl address>",
    "priceOracle":         "<address>",
    "arcRegistrar":        "<address>",
    "circleRegistrar":     "<address>",
    "reverseRegistrar":    "<address>",
    "treasury":            "<address>",
    "arcController":       "<proxy address>",
    "arcControllerImpl":   "<impl address>",
    "circleController":    "<proxy address>",
    "circleControllerImpl":"<impl address>"
  },
  "namehashes": {
    "arc":    "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae",
    "circle": "0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084"
  },
  "upgrades": []
}
```

### Upgrade Entry Format

```json
{
  "timestamp": "<ISO timestamp>",
  "contract": "arcController",
  "proxyAddress": "<proxy address>",
  "oldImpl": "<old impl address>",
  "newImpl": "<new impl address>",
  "description": "Human-readable description of changes"
}
```

### Frontend Config Generation

`scripts/generate-frontend-config.js` reads `deployments/arc_testnet-v3.json` and writes
`frontend/src/lib/generated-contracts.ts`. The frontend imports contract addresses exclusively
from this generated file.

---

## Cleanup Truth

### Five-Category Classification Scheme

| Category | Definition |
|----------|-----------|
| `active-canonical` | Authoritative source for the rebuild. Earns this status only when explicitly adopted. |
| `reference-only` | Retained for lessons/history. Not canonical source. |
| `archive-legacy` | Superseded v1 files moved to `_archive/` before rebuild. |
| `delete` | Stale generated outputs, empty dirs, root-level duplicates. Removed before rebuild. |
| `unknown/review` | Requires human decision. No rebuild work may begin on these paths. |

### Archive List (move to `_archive/` before rebuild)

- `contracts/registrar/ArcNSRegistrarController.sol`
- `contracts/registrar/ArcNSPriceOracle.sol`
- `contracts/resolver/ArcNSResolver.sol`
- `scripts/deploy.js`
- `test/ArcNS.test.js`
- `test/RentPriceCheck.js`

### Delete List (remove before rebuild)

- `src/arc-ns-controller.ts`
- `generated/` (root-level)
- `build/` (root-level)
- `schema.graphql` (root-level)
- `subgraph.yaml` (root-level)
- `abis/ArcNSController.json`
- `arcns/` (empty package directory)

### Reference-Only List (retain in place, not canonical)

- `contracts/proxy/ArcNSRegistrarControllerV2.sol`
- `contracts/resolver/ArcNSResolverV2.sol`
- `contracts/registrar/ArcNSPriceOracleV2.sol`
- `contracts/registrar/ArcNSReverseRegistrar.sol`
- `contracts/registrar/ArcNSBaseRegistrar.sol`
- `contracts/registry/ArcNSRegistry.sol`
- `scripts/deployV2.js`, `scripts/upgradeV2.js`
- `deployments/arc_testnet-v2.json`
- `.openzeppelin/unknown-5042002.json`

---

## Nine Rebuild Phases

### Phase 1: Current State Audit

**Goal**: Classify every top-level path in the repository before any destructive changes.

**Acceptance criteria**:
- [ ] `docs/rebuild/current-state-audit.md` written with complete 5-category classification table.
- [ ] All ENS-branded strings in source files identified and recorded.
- [ ] v2 deployment addresses from `deployments/arc_testnet-v2.json` recorded as reference baseline.
- [ ] Every top-level path classified — no `unknown/review` items remaining.

---

### Phase 2: Canonical Master Plan

**Goal**: Single authoritative masterplan document approved before any rebuild code is written.

**Acceptance criteria**:
- [ ] `masterplan.md` written at repository root (this document).
- [ ] Product truth, contract truth, deployment truth, branding truth, cleanup truth all defined.
- [ ] Nine rebuild phases enumerated with acceptance criteria per phase.
- [ ] Design-phase checkpoint: all 6 design documents listed below approved before contract coding begins.

**Design-phase checkpoint** — all 6 documents must be approved:
- [ ] `docs/design/system-architecture.md`
- [ ] `docs/design/contract-interaction-map.md`
- [ ] `docs/design/storage-upgrade-model.md`
- [ ] `docs/design/frontend-runtime-model.md`
- [ ] `docs/design/subgraph-design.md`
- [ ] `docs/design/canonical-directory-structure.md`

---

### Phase 3: Cleanup Before Rebuild

**Goal**: Archive v1 files, delete stale artifacts, de-brand remaining source files.

**Acceptance criteria**:
- [ ] All archive-list files moved to `_archive/`.
- [ ] All delete-list files and directories removed.
- [ ] No occurrences of forbidden branding strings in any non-archived source file.
- [ ] `deployments/arc_testnet-v2.json` preserved as reference.
- [ ] No root-level duplicate of `schema.graphql`, `subgraph.yaml`, or generated subgraph output.

---

### Phase 4: Contract Rebuild

**Goal**: Implement all v3 contracts under `contracts/v3/` per the design documents.

**Acceptance criteria**:
- [ ] `ArcNSRegistry` implemented and unit-tested.
- [ ] `ArcNSBaseRegistrar` implemented with on-chain SVG tokenURI, ArcNS-branded metadata.
- [ ] `ArcNSPriceOracle` implemented with canonical round-number prices (50/25/15/10/2 USDC).
- [ ] `ArcNSController` implemented with commit-reveal, USDC payment, maxCost guard, UUPS, AccessControl, Pausable, storage-based reentrancy guard.
- [ ] `ArcNSResolver` v1 implemented with addr-only scope, UUPS, storage gaps for future expansion.
- [ ] `ArcNSReverseRegistrar` implemented.
- [ ] `ArcNSNormalization` library implemented (Unicode codepoint counting, case-fold, validation rules).
- [ ] All contracts pass the branding lint step.
- [ ] All contracts have NatDoc comments using `implements EIP-NNN pattern` form (not "mirrors ENS").
- [ ] Full test suite passes (see Phase 9 for test matrix).

---

### Phase 5: Deployment Discipline

**Goal**: Canonical, reproducible deployment with full address documentation.

**Acceptance criteria**:
- [ ] `scripts/deployV3.js` written and tested on a local fork.
- [ ] `docs/runbooks/deploy-runbook.md` written with every deployment step in order.
- [ ] Deployment to Arc Testnet produces `deployments/arc_testnet-v3.json` with all addresses.
- [ ] All contracts verified on ArcScan block explorer.
- [ ] All roles, controller approvals, and TLD node ownership configured in post-deploy setup.
- [ ] `scripts/generate-frontend-config.js` generates `frontend/src/lib/generated-contracts.ts`.
- [ ] `.openzeppelin/unknown-5042002.json` committed alongside deployment JSON.

---

### Phase 6: Subgraph Rebuild

**Goal**: Rebuild the subgraph under `indexer/` per the subgraph design document.

**Acceptance criteria**:
- [ ] `indexer/schema.graphql` matches the v3 entity schema.
- [ ] All v1-scope event handlers implemented (NameRegistered, NameRenewed, Transfer, NewResolver, AddrChanged, ReverseClaimed).
- [ ] `indexer/subgraph.yaml` generated from `deployments/arc_testnet-v3.json` with correct start blocks.
- [ ] Subgraph deployed to self-hosted Graph Node targeting Arc Testnet.
- [ ] `NameRegistered` event produces correct `Domain` and `Registration` entities.
- [ ] `AddrChanged` event updates `Domain.resolvedAddress`.
- [ ] `ReverseClaimed` event creates/updates `ReverseRecord`.
- [ ] No ENS-branded entity names or handler names.

---

### Phase 7: Frontend Rebuild

**Goal**: Rebuild the frontend under `frontend/src/` per the frontend runtime model.

**Acceptance criteria**:
- [ ] Next.js 14 App Router with pages: home/search, my-domains, resolve.
- [ ] wagmi v2 + viem, WalletConnect v2, MetaMask-first.
- [ ] Chain enforcement: hard-block writes if `chainId ≠ 5042002`.
- [ ] Registration pipeline state machine fully implemented (idle → approving → committing → waiting → ready → registering → success/failed).
- [ ] Error classification taxonomy implemented (INFRA_FAILURE / SEMANTIC_FAILURE / USER_REJECTION).
- [ ] Provider topology: wallet connector for writes, primary public client + fallback for reads.
- [ ] `NEXT_PUBLIC_PRIVATE_RPC_URL` founder-demo override implemented.
- [ ] Contract addresses loaded exclusively from `generated-contracts.ts`.
- [ ] No ENS branding in any UI copy, error messages, or metadata.
- [ ] Primary name three-state display: no name / verified / stale.

---

### Phase 8: Runtime Reliability

**Goal**: Harden the frontend against Arc Testnet infrastructure failures.

**Acceptance criteria**:
- [ ] `docs/spec/runtime-reliability.md` written.
- [ ] 3× exponential backoff (1s/2s/4s) for INFRA_FAILURE errors.
- [ ] No retry for SEMANTIC_FAILURE or USER_REJECTION.
- [ ] Post-submission tx visibility proof (getTransaction polling, 20s window).
- [ ] Receipt timeout forensics implemented.
- [ ] All error codes map to human-readable user-facing messages.
- [ ] No raw Solidity revert strings or hex error data shown to users.
- [ ] Founder-demo runbook section in `docs/spec/runtime-reliability.md`.

---

### Phase 9: Testing and Audit Readiness

**Goal**: Full test suite and audit documentation.

**Acceptance criteria**:
- [ ] Contract tests cover: registration happy path, renewal, commitment replay prevention, commitment expiry, slippage guard, resolver injection prevention, pause/unpause, name validation edge cases, expiry/grace period transitions.
- [ ] PriceOracle tests cover all five length tiers and pro-rated durations.
- [ ] Resolver round-trip test: `setAddr` then `addr` returns same value.
- [ ] ReverseRegistrar round-trip test: `setName` then `name(reverseNode(addr))` returns set name.
- [ ] Frontend tests cover registration pipeline state machine (all paths).
- [ ] Frontend tests cover provider retry logic.
- [ ] Subgraph tests verify `NameRegistered` → correct `Domain` and `Registration` entities.
- [ ] CI pipeline produces green build before any deployment.
- [ ] `docs/audit/threat-model.md` written.
- [ ] `docs/audit/audit-readiness.md` written.
- [ ] Branding lint step passes (no forbidden strings in non-archived files).

---

## Implementation Readiness Gate

**No contract implementation code may be written until all of the following are true**:

1. Phase 1 (Current State Audit) acceptance criteria are met.
2. Phase 2 (Canonical Master Plan) acceptance criteria are met — this document is approved.
3. All 6 design documents in the design-phase checkpoint are approved.
4. Phase 3 (Cleanup) acceptance criteria are met.

This gate ensures the rebuild starts from a clean, unambiguous baseline with a fully reviewed
technical design.

---

## v2 Reference Baseline

The following addresses are the live v2 deployment on Arc Testnet. They are reference-only and
are NOT the rebuild's deployment target.

```json
{
  "registry":         "0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a",
  "resolver":         "0xE62De42eAcb270D2f2465c017C30bbf24F3f9350",
  "resolverImpl":     "0xA637a1574dC4CF9da40D3B36B21eBaB301e64bC3",
  "priceOracle":      "0x18EE0175504e033D72486235F8A2552038EF4ce6",
  "arcRegistrar":     "0xb156d9726661E92C541e3a267ee8710Fdcd24969",
  "circleRegistrar":  "0xBdfF2790Dd72E86C3510Cc8374EaC5E2E0659c5e",
  "reverseRegistrar": "0x97DEf95ADE4b67cD877725282d872d1eD2b4D489",
  "treasury":         "0xbbDF5bC7D63B1b7223556d4899905d56589A682d",
  "arcController":    "0x1bd377A2762510c00dd0ec2142E42829e7053C80",
  "circleController": "0xfBFE553633AB91b6B32A0E6296341000Bf03DB95"
}
```
