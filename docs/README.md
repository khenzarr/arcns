# ArcNS Documentation Index

**Network:** Arc Testnet (Chain ID: 5042002)  
**Version:** v3  
**Status:** Live on testnet · Pre-mainnet  
**Production App:** https://arcns-app.vercel.app

---

## Start Here

| I want to... | Go to |
|-------------|-------|
| Understand what is live and working | [final/FINAL_STATUS.md](final/FINAL_STATUS.md) |
| See all deployed contract addresses | [final/DEPLOYED_ADDRESSES.md](final/DEPLOYED_ADDRESSES.md) |
| Run a founder or investor demo | [final/FOUNDER_DEMO_SCRIPT.md](final/FOUNDER_DEMO_SCRIPT.md) |
| Understand mainnet blockers | [final/MAINNET_GAP_REPORT.md](final/MAINNET_GAP_REPORT.md) |
| Review audit scope and threat model | [final/AUDIT_SCOPE.md](final/AUDIT_SCOPE.md) |
| Review the Circle grant application | [grants/CIRCLE_GRANT_README.md](grants/CIRCLE_GRANT_README.md) |
| Integrate ArcNS into ArcScan | [integration/arcscan-integration-package.md](integration/arcscan-integration-package.md) |
| Integrate ArcNS into a wallet | [integration/wallet-integration-package.md](integration/wallet-integration-package.md) |
| Understand ecosystem integration status | [integration/ECOSYSTEM_INTEGRATION_STATUS.md](integration/ECOSYSTEM_INTEGRATION_STATUS.md) |

---

## Product Overview

ArcNS is a decentralized naming protocol for Arc. It maps human-readable `.arc` and `.circle` names to on-chain addresses, issues names as ERC-721 NFTs, and lets any address set a verified primary name. Registration and renewal fees are paid in USDC.

- **Live app:** https://arcns-app.vercel.app
- **GitHub:** https://github.com/khenzarr/arcns
- **Explorer:** https://testnet.arcscan.app
- **Subgraph:** https://api.studio.thegraph.com/query/1748590/arcnslatest/v3

---

## Live Deployment

| Document | Purpose |
|----------|---------|
| [final/DEPLOYED_ADDRESSES.md](final/DEPLOYED_ADDRESSES.md) | All contract addresses, subgraph URL, explorer links |
| [final/RELEASE_SUMMARY.md](final/RELEASE_SUMMARY.md) | What is live, what is v1-scope-only, what is not yet mainnet-ready |
| [final/FINAL_STATUS.md](final/FINAL_STATUS.md) | Authoritative live status — what works, what is tested, what is not mainnet-ready |
| [final/ENVIRONMENT_GUIDE.md](final/ENVIRONMENT_GUIDE.md) | `.env` and `.env.local` variable reference |
| [final/SUBGRAPH_GUIDE.md](final/SUBGRAPH_GUIDE.md) | Subgraph build, deploy, and frontend consumption |
| [final/SMOKE_TEST_RESULTS.md](final/SMOKE_TEST_RESULTS.md) | Live manual test results on Arc Testnet |

---

## Demo

| Document | Purpose |
|----------|---------|
| [final/FOUNDER_DEMO_SCRIPT.md](final/FOUNDER_DEMO_SCRIPT.md) | 9-step live demo flow with talking points |
| [final/FOUNDER_DEMO_CHECKLIST.md](final/FOUNDER_DEMO_CHECKLIST.md) | Pre-demo setup checklist |
| [final/FOUNDER_DEMO_FALLBACKS.md](final/FOUNDER_DEMO_FALLBACKS.md) | Recovery guide for live testnet conditions |

---

## Technical Architecture

| Document | Purpose |
|----------|---------|
| [design/system-architecture.md](design/system-architecture.md) | Full system architecture overview |
| [design/contract-interaction-map.md](design/contract-interaction-map.md) | Contract interaction flows |
| [design/frontend-runtime-model.md](design/frontend-runtime-model.md) | Frontend provider topology and runtime model |
| [design/storage-upgrade-model.md](design/storage-upgrade-model.md) | UUPS storage layout and upgrade safety |
| [design/subgraph-design.md](design/subgraph-design.md) | Subgraph schema and event handler design |
| [design/canonical-directory-structure.md](design/canonical-directory-structure.md) | Canonical repo directory structure |

---

## Security & Audit

| Document | Purpose |
|----------|---------|
| [final/AUDIT_SCOPE.md](final/AUDIT_SCOPE.md) | In-scope contracts, out-of-scope items, operational dependencies |
| [final/THREAT_MODEL_SUMMARY.md](final/THREAT_MODEL_SUMMARY.md) | Trust boundaries, invariants, attacker models |
| [final/UPGRADE_POLICY.md](final/UPGRADE_POLICY.md) | Upgradeable vs non-upgradeable rationale, upgrade process |
| [final/ROLE_PERMISSION_MATRIX.md](final/ROLE_PERMISSION_MATRIX.md) | Full privilege map, concentration summary, mainnet recommendations |
| [final/TEST_COVERAGE_SUMMARY.md](final/TEST_COVERAGE_SUMMARY.md) | Coverage by contract and flow, known gaps |
| [final/MAINNET_GAP_REPORT.md](final/MAINNET_GAP_REPORT.md) | Prioritized gap analysis, go/no-go checklist |
| [audit/ARCNS_V3_AUDIT_PACKAGE.md](audit/ARCNS_V3_AUDIT_PACKAGE.md) | Full external audit preparation package |
| [audit/ARCNS_V3_DEPLOYMENT_INVENTORY.md](audit/ARCNS_V3_DEPLOYMENT_INVENTORY.md) | Deployment inventory with proxy/impl relationships |
| [audit/ARCNS_V3_GOVERNANCE_AND_PRIVILEGE_MODEL.md](audit/ARCNS_V3_GOVERNANCE_AND_PRIVILEGE_MODEL.md) | Role assignments, multisig, timelock |
| [audit/ARCNS_V3_KNOWN_LIMITATIONS_AND_OUT_OF_SCOPE.md](audit/ARCNS_V3_KNOWN_LIMITATIONS_AND_OUT_OF_SCOPE.md) | Known limitations and deferred items |

---

## Release Operations

| Document | Purpose |
|----------|---------|
| [release/RUNBOOK.md](release/RUNBOOK.md) | Deployment runbook |
| [release/RELEASE_CHECKLIST.md](release/RELEASE_CHECKLIST.md) | Release checklist |
| [release/SMOKE_TEST_MATRIX.md](release/SMOKE_TEST_MATRIX.md) | Smoke test matrix |

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

## Grant Reviewer Pack

| Document | Purpose |
|----------|---------|
| [grants/CIRCLE_GRANT_README.md](grants/CIRCLE_GRANT_README.md) | Circle 2026 Cohort 2 grant application overview |
| [grants/DEMO_VIDEO_SCRIPT.md](grants/DEMO_VIDEO_SCRIPT.md) | 3–5 minute demo video script |
| [grants/INVESTOR_DECK_OUTLINE.md](grants/INVESTOR_DECK_OUTLINE.md) | 8–10 slide deck outline |
