# ArcNS Documentation Index

**Network:** Arc Testnet (Chain ID: 5042002)  
**Version:** v3  
**Status:** Live on testnet · Pre-mainnet

---

## Where to Start

| I want to... | Go to |
|-------------|-------|
| Understand what is live and working | [FINAL_STATUS.md](../FINAL_STATUS.md) |
| See all deployed contract addresses | [final/DEPLOYED_ADDRESSES.md](final/DEPLOYED_ADDRESSES.md) |
| Run a founder or investor demo | [final/FOUNDER_DEMO_SCRIPT.md](final/FOUNDER_DEMO_SCRIPT.md) |
| Understand mainnet blockers | [final/MAINNET_GAP_REPORT.md](final/MAINNET_GAP_REPORT.md) |
| Review audit scope and threat model | [final/AUDIT_SCOPE.md](final/AUDIT_SCOPE.md) |
| Integrate ArcNS into ArcScan | [integration/arcscan-integration-package.md](integration/arcscan-integration-package.md) |
| Integrate ArcNS into a wallet | [integration/wallet-integration-package.md](integration/wallet-integration-package.md) |
| Understand ecosystem integration status | [integration/ECOSYSTEM_INTEGRATION_STATUS.md](integration/ECOSYSTEM_INTEGRATION_STATUS.md) |

---

## Finalization & Deployment

| Document | Purpose |
|----------|---------|
| [final/DEPLOYED_ADDRESSES.md](final/DEPLOYED_ADDRESSES.md) | All contract addresses, subgraph URL, explorer links |
| [final/RELEASE_SUMMARY.md](final/RELEASE_SUMMARY.md) | What is live, what is v1-scope-only, what is not yet mainnet-ready |
| [final/ENVIRONMENT_GUIDE.md](final/ENVIRONMENT_GUIDE.md) | `.env` and `.env.local` variable reference |
| [final/SUBGRAPH_GUIDE.md](final/SUBGRAPH_GUIDE.md) | Subgraph build, deploy, and frontend consumption |
| [final/SMOKE_TEST_RESULTS.md](final/SMOKE_TEST_RESULTS.md) | Live manual test results on Arc Testnet |
| [final/active-path-lockdown.md](final/active-path-lockdown.md) | Verified canonical import graph, no legacy leakage |
| [final/repo-canonicalization.md](final/repo-canonicalization.md) | Full repo classification and cleanup record |

---

## Audit & Security

| Document | Purpose |
|----------|---------|
| [final/AUDIT_SCOPE.md](final/AUDIT_SCOPE.md) | In-scope contracts, out-of-scope items, operational dependencies |
| [final/THREAT_MODEL_SUMMARY.md](final/THREAT_MODEL_SUMMARY.md) | Trust boundaries, invariants, attacker models |
| [final/UPGRADE_POLICY.md](final/UPGRADE_POLICY.md) | Upgradeable vs non-upgradeable rationale, upgrade process |
| [final/ROLE_PERMISSION_MATRIX.md](final/ROLE_PERMISSION_MATRIX.md) | Full privilege map, concentration summary, mainnet recommendations |
| [final/TEST_COVERAGE_SUMMARY.md](final/TEST_COVERAGE_SUMMARY.md) | Coverage by contract and flow, known gaps |
| [final/MAINNET_GAP_REPORT.md](final/MAINNET_GAP_REPORT.md) | Prioritized gap analysis, go/no-go checklist |

---

## Demo

| Document | Purpose |
|----------|---------|
| [final/FOUNDER_DEMO_SCRIPT.md](final/FOUNDER_DEMO_SCRIPT.md) | 9-step live demo flow with talking points |
| [final/FOUNDER_DEMO_CHECKLIST.md](final/FOUNDER_DEMO_CHECKLIST.md) | Pre-demo setup checklist |
| [final/FOUNDER_DEMO_FALLBACKS.md](final/FOUNDER_DEMO_FALLBACKS.md) | Recovery guide for live testnet conditions |

---

## Ecosystem Integration

| Document | Purpose |
|----------|---------|
| [integration/ECOSYSTEM_INTEGRATION_STATUS.md](integration/ECOSYSTEM_INTEGRATION_STATUS.md) | Phase 8 closeout — integration readiness and next execution order |
| [integration/resolution-adapter-design.md](integration/resolution-adapter-design.md) | Canonical public resolution adapter design and verification rules |
| [integration/arcscan-integration-package.md](integration/arcscan-integration-package.md) | Implementation-grade ArcScan integration spec |
| [integration/wallet-integration-package.md](integration/wallet-integration-package.md) | Implementation-grade wallet integration spec |
| [integration/dapp-fallback-ux.md](integration/dapp-fallback-ux.md) | In-app fallback UX while native ecosystem support is pending |
| [integration/integration-reality-audit.md](integration/integration-reality-audit.md) | Phase 8A — what is available on-chain vs what external tools consume |

---

## Architecture & Design

| Document | Purpose |
|----------|---------|
| [design/system-architecture.md](design/system-architecture.md) | Full system architecture overview |
| [design/contract-interaction-map.md](design/contract-interaction-map.md) | Contract interaction flows |
| [design/frontend-runtime-model.md](design/frontend-runtime-model.md) | Frontend provider topology and runtime model |
| [design/storage-upgrade-model.md](design/storage-upgrade-model.md) | UUPS storage layout and upgrade safety |
| [design/subgraph-design.md](design/subgraph-design.md) | Subgraph schema and event handler design |
| [design/canonical-directory-structure.md](design/canonical-directory-structure.md) | Canonical repo directory structure |

---

## Release Operations

| Document | Purpose |
|----------|---------|
| [release/RUNBOOK.md](release/RUNBOOK.md) | Deployment runbook |
| [release/RELEASE_CHECKLIST.md](release/RELEASE_CHECKLIST.md) | Release checklist |
| [release/SMOKE_TEST_MATRIX.md](release/SMOKE_TEST_MATRIX.md) | Smoke test matrix |
