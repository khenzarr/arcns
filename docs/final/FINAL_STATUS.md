# ArcNS — Final Status

**Date:** 2026-05-09  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Version:** v3  
**Production App:** https://arcns-app.vercel.app

---

## Current Status: Live on Arc Testnet · Demo-Ready · Pre-Mainnet

ArcNS is fully deployed and operational on Arc Testnet. The production frontend is live at https://arcns-app.vercel.app. Core registration, renewal, resolution, and primary-name flows are working end-to-end.

This is a testnet deployment. No real funds are at risk. ArcNS is not a financial product. Mainnet deployment is gated on an external security audit and operational hardening.

---

## What Is Working

| Component | Status | Notes |
|-----------|--------|-------|
| `.arc` registration (commit-reveal) | ✅ Working | USDC payment, NFT mint, registry node assignment |
| `.circle` registration (commit-reveal) | ✅ Working | Same flow as `.arc` |
| Renewal | ✅ Working | Any address can renew; expiry extended |
| Forward resolution (name → address) | ✅ Working | `Resolver.addr(node)` |
| Reverse resolution (address → primary name) | ✅ Working | `Resolver.name(reverseNode)` with forward-confirmation |
| Primary name set (My Domains) | ✅ Working | `ReverseRegistrar.setName()` |
| NFT ownership (ERC-721) | ✅ Working | `BaseRegistrar.ownerOf(tokenId)` |
| On-chain SVG metadata | ✅ Working | `tokenURI` returns base64 JSON + inline SVG |
| Subgraph (`arcnslatest`) | ✅ Working | Indexed on The Graph Studio |
| Portfolio view (My Domains) | ✅ Working | Subgraph-first, RPC fallback |
| Transaction history | ✅ Working | Registrations and renewals |
| Wrong-network guard | ✅ Working | Blocks writes on wrong chain |
| Resolve page — owner display | ✅ Working | Reads `registrar.ownerOf(tokenId)`, not `registry.owner(node)` |
| Resolve page — no-address-record case | ✅ Working | Shows "No address record" for registered names without a forward record |
| Public resolution API | ✅ Live | `/api/v1/resolve/name/{name}`, `/api/v1/resolve/address/{address}`, `/api/v1/health` |
| Multisig (2-of-3 Safe) | ✅ Live | All deployer EOA privileges revoked |
| Timelock (48h upgrade delay) | ✅ Live | `UPGRADER_ROLE` on all three UUPS proxies |

---

## What Is Not Yet Done (Pre-Mainnet)

| Item | Type | Notes |
|------|------|-------|
| External security audit | Required | All 8 v3 contracts. Not yet engaged. |
| Treasury migration to multisig contract | Operational | Treasury is currently an EOA. Known gap. |
| Timelock delay increase (72h+ for mainnet) | Operational | 48h is appropriate for testnet. |
| Mainnet USDC address | Configuration | Replace MockUSDC with real USDC on mainnet. |
| Dedicated RPC / infra hardening | Operational | Currently using public Arc Testnet RPC. |
| Monitoring and incident response | Operational | No alerting or on-call process yet. |
| Reentrancy adversarial tests | Testing | Testing gap only; no code defect. |
| UUPS storage layout verification in CI | Testing | Testing gap only; no code defect. |
| Resolve empty-state visual polish | UX | Search bar and empty-state card alignment deferred. Not a blocker. |

See [MAINNET_GAP_REPORT.md](MAINNET_GAP_REPORT.md) for the full prioritized checklist.

---

## Resolve Page — Owner Display Correctness

The Resolve page reads the domain owner from `registrar.ownerOf(tokenId)` (the ERC-721 NFT owner), not from `registry.owner(node)`. This is the correct source of truth because:

- `registry.owner(node)` for a managed second-level name returns the **registrar contract address**, not the user's wallet.
- `registrar.ownerOf(tokenId)` returns the **actual NFT holder** — the user who registered or received the name.

This distinction matters for correct owner display, expiry display, and the "no receiving address" notice shown to the domain owner.

---

## Known Future Polish (Not a Blocker)

The Resolve page empty-state (search bar and Identity Inspector card) has minor alignment and visual polish deferred. This does not affect functionality or correctness.

---

## Honest Gaps Summary

- **Not mainnet.** This is Arc Testnet. No real USDC. No real funds.
- **External audit pending.** No external audit has been completed. The protocol has undergone internal review and security hardening, but external audit is required before mainnet.
- **Treasury is an EOA.** Registration fees go to an EOA treasury. Migration to a multisig-controlled contract is planned.
- **No ecosystem integrations yet.** ArcScan, wallets, and third-party dApps have not yet integrated ArcNS. Integration packages are ready and documented.

---

*This document is the authoritative live status for ArcNS v3. For the full gap analysis, see [MAINNET_GAP_REPORT.md](MAINNET_GAP_REPORT.md).*
