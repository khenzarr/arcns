# ArcNS — Public Package Status

**Phase:** Final Public Packaging Pass  
**Date:** 2026-04-25  
**Network:** Arc Testnet (Chain ID: 5042002)

---

## What Was Improved

### README.md — full rewrite

The previous README had three factual errors and several presentation gaps:

| Issue | Fix applied |
|-------|-------------|
| Pricing table was wrong ($640/$160/$40/$10/$2) | Corrected to canonical values ($50/$25/$15/$10/$2) |
| Resolver described as supporting text/contenthash/multicoin | Corrected to v1 scope: `addr` only |
| Architecture diagram showed incorrect pricing tiers | Corrected |
| No documentation navigation | Added full docs table with links |
| No ecosystem integration section | Added with links to all Phase 8 docs |
| No live deployment table | Added with all 8 contract addresses |
| No roadmap | Added honest pre-mainnet roadmap |
| No collaboration/audit/integration entry points | Added |

### docs/README.md — new documentation index

Created a single-page documentation index at `docs/README.md` that groups all documents by purpose:
- Finalization & Deployment
- Audit & Security
- Demo
- Ecosystem Integration
- Architecture & Design
- Release Operations

A reviewer can find any document in under 10 seconds.

---

## What the README Now Communicates

1. **What ArcNS is** — one crisp paragraph, no comparative framing
2. **What it enables** — `.arc`/`.circle` identity, USDC registration, resolution, primary name, NFT ownership, portfolio
3. **Current status** — live on testnet, demo-ready, pre-mainnet, honest about audit gap
4. **Core capabilities** — registration, renewal, resolver v1 scope, reverse/primary name, NFT, subgraph
5. **Architecture** — clean ASCII diagram, upgradeability rationale
6. **Live deployment** — all 8 contract addresses, subgraph URL, canonical address source
7. **Correct pricing** — $2/$10/$15/$25/$50 per year by label length
8. **Repo structure** — canonical paths only, legacy paths noted as reference-only
9. **Developer quickstart** — install, env, compile, test, deploy, frontend, subgraph
10. **Documentation map** — all docs linked by category
11. **Roadmap** — honest, short, audit-gated
12. **Collaboration entry points** — audit, explorer integration, wallet integration, grant/hackathon reviewers

---

## What Docs Are Discoverable and Where

### Entry points for different audiences

| Audience | Primary entry point |
|----------|-------------------|
| First-time visitor | README.md |
| Grant / hackathon reviewer | README.md → FINAL_STATUS.md → MAINNET_GAP_REPORT.md |
| Auditor | README.md → AUDIT_SCOPE.md → THREAT_MODEL_SUMMARY.md |
| Explorer integration team | README.md → arcscan-integration-package.md |
| Wallet integration team | README.md → wallet-integration-package.md |
| Ecosystem partner | README.md → ECOSYSTEM_INTEGRATION_STATUS.md |
| Developer onboarding | README.md → ENVIRONMENT_GUIDE.md → SUBGRAPH_GUIDE.md |
| Demo preparation | README.md → FOUNDER_DEMO_SCRIPT.md → FOUNDER_DEMO_CHECKLIST.md |

All documents are reachable from README.md in one click. The `docs/README.md` index provides a second entry point for anyone navigating the docs directory directly.

---

## What Remains Intentionally Outside This Pass

| Item | Reason not included |
|------|---------------------|
| Core contract changes | Out of scope — protocol is finalized |
| Frontend refactor | Out of scope — frontend is functional |
| Public API deployment | Requires hosting infrastructure decision |
| ArcScan / wallet outreach | Requires external coordination |
| Fixing 2 failing frontend tests | Tracked in FINAL_STATUS.md §3 — pre-mainnet blocker, not a packaging issue |
| Stale root-level files (`abis/`, `src/`, `tests/`, `generated/`, `build/`, `schema.graphql`, `subgraph.yaml`, `arcns/`) | Safe to delete but deferred — no public-facing impact |

---

## Repo Readiness Assessment

| Audience | Ready? | Notes |
|----------|--------|-------|
| Founder sharing | ✅ Yes | README is clean, status is honest, demo docs are complete |
| Grant submission | ✅ Yes | FINAL_STATUS.md + MAINNET_GAP_REPORT.md provide honest technical depth |
| Hackathon judging | ✅ Yes | Live deployment, working flows, clean README, test suite documented |
| Ecosystem partner handoff | ✅ Yes | Integration packages are complete and implementation-grade |
| Audit intro conversations | ✅ Yes | AUDIT_SCOPE.md + THREAT_MODEL_SUMMARY.md + ROLE_PERMISSION_MATRIX.md are ready |
| Mainnet launch | ❌ Not yet | Gated on external audit — see MAINNET_GAP_REPORT.md |
