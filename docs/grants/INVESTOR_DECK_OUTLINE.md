# ArcNS — Investor / Grant Reviewer Deck Outline

**8–10 slides for Circle 2026 Cohort 2 grant submission**

---

## Slide 1 — Title

**Title:** ArcNS — Independent Naming on Arc Testnet
**Subtitle:** Human-readable testnet names for Arc addresses, paid in testnet USDC
**Visual:** ArcNS logo + Arc Testnet badge
**Footer:** https://arcname.services · Arc Testnet · Pre-mainnet · Independent project

---

## Slide 2 — Problem

**Headline:** Wallet addresses are broken for humans

**Points:**
- `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` — this is what users share today
- 42 characters. Impossible to remember. Easy to mistype. Zero identity signal.
- Every on-chain interaction requires copy-pasting an address
- Arc Testnet users need an optional human-readable naming service

**Visual:** Side-by-side: hex address vs `alice.arc`

---

## Slide 3 — Solution

**Headline:** ArcNS: human-readable names for Arc

**Points:**
- Register `alice.arc` or `bob.circle` — point it to any EVM address
- Pay with USDC — no native gas token required for name purchases
- Own as an ERC-721 NFT — transferable, on-chain metadata
- Resolve entirely on-chain — no off-chain infrastructure required
- Set a primary name — verified on-chain identity for any address

**Visual:** Registration flow diagram (search → commit → register → NFT minted)

---

## Slide 4 — Why Arc / Why Circle

**Headline:** Built for Arc. Powered by USDC.

**Why Arc:**
- Arc is a high-performance EVM chain with a growing ecosystem
- ArcNS is an independent naming-service project for Arc Testnet addresses
- `.arc` is an ArcNS testnet namespace
- First mover — no competing naming protocol on Arc

**Why Circle:**
- USDC is the payment token for the entire ArcNS economy — from day one
- `.circle` is an ArcNS testnet namespace and does not imply Circle endorsement, sponsorship, affiliation, or ownership
- Planned: Circle Programmable Wallets integration
- Planned: USDC payment routing via ArcNS names
- ArcNS makes USDC more useful by giving addresses human-readable identities

---

## Slide 5 — Product Demo

**Headline:** Live on Arc Testnet at arcname.services

**Screenshots / flow:**
1. Home page — search bar with `.arc` / `.circle` TLD selector
2. Registration card — price in USDC, commit-reveal flow
3. My Domains — portfolio with expiry badges, primary name
4. Resolve page — forward resolution, owner, expiry, namehash

**Key callout:** "Everything resolves on-chain. No off-chain infrastructure required."

**Link:** https://arcname.services

---

## Slide 6 — Architecture

**Headline:** 8 contracts. UUPS upgradeable where needed. Non-upgradeable where it matters.

**Diagram:** (simplified version of the architecture diagram from README)

**Key points:**
- Registry, BaseRegistrars, PriceOracle, ReverseRegistrar — non-upgradeable (ownership ledger stability)
- Controller, Resolver — UUPS proxies (registration logic and resolver features may expand)
- Upgrades require 48-hour Timelock + 2-of-3 Safe multisig
- All deployer EOA privileges revoked

**Contracts deployed:** Arc Testnet (Chain ID: 5042002)  
**Verified on:** https://testnet.arcscan.app

---

## Slide 7 — Traction / Current Status

**Headline:** Live on Arc Testnet. Demo-ready. Pre-mainnet.

| Metric | Value |
|--------|-------|
| Contracts deployed | 8 v3 contracts (2026-04-24) |
| Security migration | Complete (2026-04-29) |
| Governance | 2-of-3 Safe + 48h Timelock |
| Contract tests | ~180 passing, 0 failures |
| Smoke tests | 10 flows verified on-chain |
| Public testnet frontend | Live at arcname.services |
| Subgraph | Live on The Graph Studio |
| External audit | Not yet completed — required before mainnet |

**Honest note:** Pre-mainnet. No real funds. External audit is the primary mainnet blocker.

---

## Slide 8 — Roadmap / Milestones

**Headline:** 3 milestones to mainnet

**Milestone 1 — Audit + Hardening (0–3 months)**
- External security audit
- Treasury migration to multisig contract
- Timelock delay increase

**Milestone 2 — Ecosystem Integration (3–6 months)**
- ArcScan integration
- Wallet integration packages (MetaMask, Rainbow, Trust Wallet)
- MetaMask Snap for ArcNS resolution
- Public resolution adapter hardened

**Milestone 3 — Mainnet (6–10 months, pending audit)**
- Deploy on Arc Mainnet with real USDC
- Circle Programmable Wallets integration
- USDC payment routing via ArcNS names

---

## Slide 9 — Grant Use of Funds

**Headline:** How Circle grant funding accelerates ArcNS

| Use | Allocation | Description |
|-----|-----------|-------------|
| External security audit | ~40% | Engage a reputable audit firm for all 8 v3 contracts |
| Ecosystem integration | ~30% | ArcScan, wallet, and dApp integration work |
| Infrastructure | ~15% | Dedicated RPC, monitoring, incident response |
| Circle integrations | ~15% | Programmable Wallets integration, USDC payment routing |

**Without grant funding:** Audit timeline extends; ecosystem integrations are slower; mainnet is delayed.  
**With grant funding:** Audit can begin immediately; ecosystem integrations can run in parallel; mainnet timeline compresses.

---

## Slide 10 — Vision

**Headline:** A proposed independent naming service for Arc Testnet users

**Vision:**
- Every Arc address has a human-readable name
- Every USDC payment on Arc can be addressed by name
- ArcNS names could provide an optional naming primitive for compatible dApps, wallets, and explorers
- The `.circle` testnet namespace remains non-official and subject to legal/brand review

**Why now:**
- Arc is growing, creating an opportunity to test optional human-readable naming infrastructure.
- USDC adoption on Arc is accelerating. ArcNS makes USDC payments more human.
- First mover advantage — no competing naming protocol on Arc.

**Call to action:** Support ArcNS in the Circle 2026 Cohort 2 grant.

---

## Supporting Materials

| Document | Link |
|----------|------|
| Live testnet app | https://arcname.services |
| GitHub | https://github.com/khenzarr/arcns |
| Demo video script | [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md) |
| Deployed addresses | [docs/final/DEPLOYED_ADDRESSES.md](../final/DEPLOYED_ADDRESSES.md) |
| Audit scope | [docs/final/AUDIT_SCOPE.md](../final/AUDIT_SCOPE.md) |
| Mainnet gap report | [docs/final/MAINNET_GAP_REPORT.md](../final/MAINNET_GAP_REPORT.md) |
| Final status | [docs/final/FINAL_STATUS.md](../final/FINAL_STATUS.md) |
