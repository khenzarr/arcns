# ArcNS v3 — Mainnet Gap Report

**Date:** 2026-04-25  
**Status:** Testnet live · Mainnet not yet ready  
**Honest assessment:** The protocol is architecturally sound and functionally complete for testnet. It is not yet ready for mainnet. The gaps below are real and must be addressed before a responsible mainnet launch.

---

## 1. READY / ALREADY SOLVED ON TESTNET

These items are working well and carry forward to mainnet without significant rework.

### Protocol / Contracts
- Commit-reveal anti-frontrun scheme — implemented, tested, and verified live
- `usedCommitments` mapping — prevents commitment replay permanently
- `maxCost` slippage guard on `register()` and `renew()` — prevents price oracle race
- Resolver allowlist (`approvedResolvers`) — prevents resolver injection
- Storage-based reentrancy guard — avoids slot conflicts in upgradeable layout
- UUPS proxy pattern for Controller and Resolver — upgrade path exists
- Non-upgradeable Registry and BaseRegistrar — correct by design
- 90-day grace period — implemented and tested
- Premium decay (100 USDC → 0 over 28 days) — implemented and tested
- `ZeroAddress` check on `setTreasury()` — prevents accidental fee burn
- `_disableInitializers()` on implementation contracts — prevents direct initialization
- `__gap[50]` storage reservation on upgradeable contracts — safe upgrade path
- On-chain SVG tokenURI — fully on-chain, no external dependency
- AccessControl role separation (ADMIN, PAUSER, ORACLE, UPGRADER) — structure is correct
- `Pausable` on Controller — emergency stop exists

### Frontend / Runtime
- 7-param canonical v3 register ABI — ABI/args mismatch fixed and verified
- Owned-domain-only primary name selection — no free-form text entry
- Wrong-network guard — blocks writes on incorrect chain ID
- Subgraph-first with RPC fallback — resilient to subgraph downtime
- Error taxonomy (ARC_ERR codes) — no raw Solidity strings shown to users
- ArcNS branding — no ENS strings in any user-facing surface
- `generated-contracts.ts` as single address source of truth — no manual env vars for addresses
- Diagnostic logging before register/primary name submit — observable in browser console

### Deployment Discipline
- `deployments/arc_testnet-v3.json` — canonical deployment record committed
- `.openzeppelin/unknown-5042002.json` — UUPS proxy manifest committed
- `scripts/generate-frontend-config.js` — reproducible frontend config generation
- Deployment timestamp and deployer address recorded

---

## 2. MUST-HAVE BEFORE MAINNET

These are hard blockers. Mainnet launch without addressing these would be irresponsible.

### 2.1 External Security Audit
**Gap:** No external audit has been performed. The pre-v3 internal audit findings were addressed in v3 design, but this has not been independently verified.  
**Required:** Full audit of all 6 in-scope v3 contracts by a qualified external firm. Audit findings must be resolved before launch.  
**Why it blocks:** Any undetected vulnerability in the Controller or Resolver could result in loss of user funds (USDC) or name ownership.

### 2.2 Admin Role Distribution (Multisig)
**Gap:** All roles (ADMIN, PAUSER, ORACLE, UPGRADER, Ownable owner) are held by a single deployer EOA. This is a single point of failure.  
**Required:**
- All privileged roles transferred to a multisig (minimum 2-of-3, recommended 3-of-5)
- UPGRADER_ROLE on a time-locked multisig (minimum 48-hour delay)
- PAUSER_ROLE on a faster-response operational multisig
- Deployer EOA revoked from DEFAULT_ADMIN_ROLE after role distribution  
**Why it blocks:** A compromised deployer key can drain treasury, upgrade contracts maliciously, or pause the protocol indefinitely.

### 2.3 Treasury Multisig
**Gap:** Treasury is currently a deployer EOA. All USDC registration fees flow to this address.  
**Required:** Treasury must be a multisig before mainnet. No single key should control accumulated protocol revenue.  
**Why it blocks:** Compromised treasury key = all protocol revenue lost.

### 2.4 Mainnet USDC Address Verification
**Gap:** Testnet uses `0x3600000000000000000000000000000000000000` (Arc Testnet native USDC). Mainnet USDC address must be confirmed with Circle/Arc team.  
**Required:** Confirm canonical mainnet USDC address. Redeploy contracts with correct address. Regenerate `generated-contracts.ts`.  
**Why it blocks:** Wrong USDC address = all payments fail or go to wrong token.

### 2.5 Mainnet Redeployment
**Gap:** Current deployment is testnet-only. Mainnet requires a fresh deployment with mainnet addresses, mainnet USDC, and mainnet chain ID.  
**Required:**
- Full redeployment on mainnet chain
- All post-deploy wiring steps (controller authorization, resolver CONTROLLER_ROLE, TLD node ownership, reverse node ownership)
- New `deployments/mainnet-v3.json` committed
- New `generated-contracts.ts` generated and committed
- All contracts verified on mainnet block explorer  
**Why it blocks:** Obvious — testnet contracts are not mainnet contracts.

### 2.6 Upgrade Time-Lock
**Gap:** UPGRADER_ROLE currently allows immediate upgrades with no delay.  
**Required:** Implement a time-lock contract (minimum 48 hours) between upgrade proposal and execution. This gives users time to exit if a malicious upgrade is proposed.  
**Why it blocks:** Without a time-lock, a compromised UPGRADER key can silently replace contract logic.

### 2.7 Dedicated RPC Infrastructure
**Gap:** Frontend currently uses public Arc Testnet RPCs (`arc-testnet.drpc.org`, `rpc.testnet.arc.network`). These have occasional txpool saturation.  
**Required:** Dedicated/private RPC endpoint for mainnet frontend. Public RPCs are not acceptable for production user experience.  
**Why it blocks:** Txpool saturation on a public RPC causes user-visible failures during registration. On mainnet with real money, this is unacceptable.

### 2.8 Reentrancy Adversarial Testing
**Gap:** The storage-based reentrancy guard is correctly implemented but has not been adversarially tested (no reentrancy attack simulation in the test suite).  
**Required:** Add reentrancy attack tests for `register()` and `renew()` using a malicious USDC mock or malicious treasury contract.  
**Why it blocks:** Reentrancy is a critical vulnerability class. The guard must be verified to hold under attack.

### 2.9 UUPS Storage Layout Automated Verification
**Gap:** Storage layout compatibility for upgrades is currently verified manually. No automated check in CI.  
**Required:** Integrate `@openzeppelin/upgrades-core` storage layout check into the test/CI pipeline. Any upgrade that breaks storage layout must fail CI.  
**Why it blocks:** A storage layout violation in an upgrade corrupts all proxy state and is not recoverable.

### 2.10 Stale Test Cleanup
**Gap:** `preservationTests.test.ts` and `bugConditionExploration.test.tsx` reference archived hooks and fail at runtime. These are pre-existing failures.  
**Required:** Update or remove these tests before mainnet. A failing test suite is not acceptable for a production system.  
**Why it blocks:** Failing tests in CI undermine confidence in the test suite and may mask real regressions.

---

## 3. SHOULD-HAVE BEFORE MAINNET

These are not hard blockers but are strongly recommended. Launching without them creates meaningful operational or user experience risk.

### 3.1 Subgraph Decentralized Hosting
**Gap:** Subgraph is hosted on The Graph Studio (centralized, rate-limited, single point of failure).  
**Recommended:** Deploy to The Graph's decentralized network or a self-hosted Graph Node before mainnet.  
**Risk if skipped:** Subgraph downtime = portfolio and history unavailable. RPC fallback works but degrades UX significantly.

### 3.2 Frontend Production Deployment
**Gap:** Frontend is not deployed to a production domain. Currently runs as a local dev server.  
**Recommended:** Deploy to a stable production URL (Vercel, Netlify, or self-hosted) with a custom domain before mainnet.  
**Risk if skipped:** No stable URL for users to access the protocol.

### 3.3 `_validName()` Unicode Hardening
**Gap:** On-chain `_validName()` only validates ASCII (a-z, 0-9, hyphen, underscore). Unicode normalization is handled off-chain by the frontend. A user who bypasses the frontend can register names with Unicode characters that the frontend cannot display correctly.  
**Recommended:** Either extend on-chain validation to cover Unicode normalization rules, or document the off-chain normalization as the canonical gate and accept the on-chain permissiveness.  
**Risk if skipped:** Names registered via direct contract interaction may be unresolvable or display incorrectly in the frontend.

### 3.4 Subgraph ABI Reference Cleanup
**Gap:** `indexer/subgraph.yaml` uses `ArcNSRegistrarControllerV2.json` as the controller ABI. This works (same event signatures) but is misleading.  
**Recommended:** Update to reference the v3 controller ABI directly before mainnet.  
**Risk if skipped:** Confusion for anyone reading the subgraph manifest. Low functional risk.

### 3.5 Monitoring and Alerting
**Gap:** No on-chain monitoring or alerting is configured. No alerts for: large USDC flows to treasury, unexpected pauses, upgrade events, or unusual registration patterns.  
**Recommended:** Set up monitoring (e.g., OpenZeppelin Defender, Tenderly) for critical contract events before mainnet.  
**Risk if skipped:** Protocol incidents may go undetected for extended periods.

### 3.6 Frontend Error Recovery UX
**Gap:** Some error states (e.g., txpool saturation, commitment maturity timeout) show generic error messages. Recovery paths are not always obvious to users.  
**Recommended:** Improve error messages and recovery CTAs for the most common failure modes before mainnet.  
**Risk if skipped:** User confusion and support burden on mainnet.

### 3.7 Name Transfer UI
**Gap:** No dedicated name transfer UI. Transfer is possible via direct contract interaction only.  
**Recommended:** Add a basic transfer flow to the My Domains page before mainnet.  
**Risk if skipped:** Users who want to transfer names must use a block explorer or external tool.

---

## 4. POST-MAINNET / LATER PHASE

These are intentionally outside the initial mainnet scope. They are not gaps — they are planned future work.

| Feature | Notes |
|---------|-------|
| Resolver text records | Storage slot reserved; no public functions in v1 |
| Resolver contenthash | Storage slot reserved; no public functions in v1 |
| Multicoin address resolution (EIP-2304) | Storage slot reserved; no public functions in v1 |
| CCIP-Read / wildcard resolution | Not in v1 scope |
| Subdomain registration | Not in v1 scope |
| Governance / DAO | Treasury governance, parameter voting |
| Name marketplace / secondary sales | Separate product layer |
| Mobile wallet optimization | UX improvement |
| Bulk registration | UX improvement |
| Renewal reminders / notifications | Product feature |
| Analytics dashboard | Operational tooling |
| Multi-language frontend | Internationalization |

---

## 5. PRIORITIZED ACTION PLAN

### P0 — Mandatory Blockers (must be complete before mainnet launch)

| # | Action |
|---|--------|
| P0-1 | External security audit — full scope, all 6 v3 contracts |
| P0-2 | Resolve all audit findings |
| P0-3 | Confirm mainnet USDC address with Circle/Arc team |
| P0-4 | Redeploy all contracts on mainnet with correct addresses |
| P0-5 | Transfer all admin roles to multisig |
| P0-6 | Transfer treasury to multisig |
| P0-7 | Implement upgrade time-lock (minimum 48 hours) |
| P0-8 | Provision dedicated/private RPC for mainnet frontend |
| P0-9 | Add reentrancy adversarial tests |
| P0-10 | Add automated UUPS storage layout check to CI |
| P0-11 | Fix or remove stale failing tests |
| P0-12 | Regenerate `generated-contracts.ts` from mainnet deployment |
| P0-13 | Verify all contracts on mainnet block explorer |

### P1 — Strongly Recommended Before Launch

| # | Action |
|---|--------|
| P1-1 | Deploy subgraph to decentralized hosting |
| P1-2 | Deploy frontend to production domain |
| P1-3 | Set up on-chain monitoring and alerting |
| P1-4 | Update subgraph ABI reference to v3 controller ABI |
| P1-5 | Improve error recovery UX for common failure modes |
| P1-6 | Add basic name transfer UI |

### P2 — Post-Launch / Later Milestones

| # | Action |
|---|--------|
| P2-1 | Unicode hardening in `_validName()` or formal off-chain normalization policy |
| P2-2 | Resolver v2: text records, contenthash, multicoin |
| P2-3 | Subdomain registration |
| P2-4 | Governance / DAO |
| P2-5 | All post-mainnet features listed in Section 4 |

---

## 6. ACCEPTANCE CRITERIA FOR MAINNET GO/NO-GO

The following must all be true before ArcNS is called mainnet-ready:

### Security
- [ ] External audit completed by a qualified firm
- [ ] All critical and high audit findings resolved
- [ ] All medium audit findings resolved or formally accepted with documented rationale
- [ ] Reentrancy adversarial tests pass
- [ ] UUPS storage layout check passes in CI

### Operational Controls
- [ ] All admin roles held by multisig (minimum 2-of-3)
- [ ] UPGRADER_ROLE on time-locked multisig (minimum 48-hour delay)
- [ ] Treasury is a multisig
- [ ] Deployer EOA revoked from DEFAULT_ADMIN_ROLE
- [ ] No single key controls any critical protocol function

### Deployment
- [ ] All contracts deployed on mainnet with correct addresses
- [ ] Mainnet USDC address confirmed and used in deployment
- [ ] All post-deploy wiring verified (controller authorization, CONTROLLER_ROLE, TLD node ownership)
- [ ] All contracts verified on mainnet block explorer
- [ ] `deployments/mainnet-v3.json` committed
- [ ] `generated-contracts.ts` regenerated from mainnet deployment
- [ ] `.openzeppelin/mainnet.json` (or equivalent) committed

### Testing
- [ ] All contract tests pass with zero failures
- [ ] All frontend tests pass with zero failures
- [ ] Integration test suite passes on mainnet fork
- [ ] Smoke test matrix completed on mainnet (manual)

### Infrastructure
- [ ] Dedicated/private RPC provisioned for mainnet frontend
- [ ] Frontend deployed to production domain
- [ ] Subgraph deployed and synced on mainnet
- [ ] On-chain monitoring and alerting configured

### Documentation
- [ ] Audit report published
- [ ] Mainnet deployment addresses published
- [ ] User-facing documentation updated for mainnet
