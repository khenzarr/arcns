# ArcNS — Circle 2026 Cohort 2 Grant Application

**One-line summary:** ArcNS is a USDC-native decentralized naming protocol for Arc — it maps human-readable `.arc` and `.circle` names to on-chain addresses, issued as ERC-721 NFTs, paid for in USDC.

---

## Problem

Wallet addresses are 42-character hex strings. They are impossible to remember, easy to mistype, and create friction for every on-chain interaction. This friction is a barrier to adoption — especially for users new to crypto.

Existing naming solutions (ENS, Unstoppable Domains) are built for Ethereum and do not natively support Arc. Arc users have no human-readable identity layer.

---

## Solution

ArcNS provides a naming protocol purpose-built for Arc:

- **Register** a human-readable name (`alice.arc`, `bob.circle`) and point it to any EVM address
- **Pay with USDC** — no native gas token required for name purchases
- **Own as an NFT** — every name is an ERC-721 token with on-chain SVG metadata
- **Resolve on-chain** — forward resolution (name → address) and reverse resolution (address → primary name) are both fully on-chain
- **Set a primary name** — any address can set a verified primary name; the protocol enforces forward-confirmation

---

## Why Arc

Arc is a high-performance EVM-compatible chain with a growing ecosystem. ArcNS is the identity layer that Arc needs to make addresses human-readable. The `.arc` TLD is native to Arc. The `.circle` TLD is a dedicated namespace for Circle-aligned use cases.

---

## Why Circle / USDC

ArcNS is USDC-native from day one:

- All registration and renewal fees are paid in USDC
- The `.circle` TLD is a first-class namespace for Circle-aligned identities
- The protocol is designed to integrate with Circle's payment infrastructure
- Planned: USDC payment flows for dApps using ArcNS names as payment identifiers
- Planned: Circle Programmable Wallets integration for seamless onboarding

Circle's USDC is the payment token for the entire ArcNS economy. This is not a retrofit — it is the design.

---

## Current Status

**Live on Arc Testnet · Demo-ready · Pre-mainnet**

| Component | Status |
|-----------|--------|
| All 8 v3 contracts | Deployed on Arc Testnet (2026-04-24) |
| Security migration | Complete (2026-04-29) |
| Multisig (2-of-3 Safe) | Live |
| Timelock (48h upgrade delay) | Live |
| Subgraph (`arcnslatest`) | Published on The Graph Studio |
| Production frontend | Live at https://arcns-app.vercel.app |
| Contract test suite | ~180 passing tests, zero failures |
| External security audit | Not yet completed — required before mainnet |

---

## Live App

**https://arcns-app.vercel.app**

- Home/Search: search and register `.arc` and `.circle` names
- My Domains: portfolio, transaction history, primary name management
- Resolve: forward resolution and identity inspection for any name

---

## GitHub Repo

**https://github.com/khenzarr/arcns**

- `contracts/v3/` — all 8 v3 contracts
- `deployments/arc_testnet-v3.json` — canonical deployed addresses
- `frontend/` — Next.js 14 production frontend
- `indexer/` — The Graph subgraph
- `docs/` — full documentation

---

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` |
| ArcNSReverseRegistrar | `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` |
| ArcBaseRegistrar (.arc) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` |
| CircleBaseRegistrar (.circle) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` |
| ArcController (proxy) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` |
| CircleController (proxy) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` |
| USDC (Arc Testnet) | `0x3600000000000000000000000000000000000000` |

Full address table: [docs/final/DEPLOYED_ADDRESSES.md](../final/DEPLOYED_ADDRESSES.md)

---

## Circle Products Currently Integrated

| Product | Integration |
|---------|-------------|
| USDC (Arc Testnet) | Payment token for all registrations and renewals |
| `.circle` TLD | Dedicated namespace for Circle-aligned identities |

---

## Planned Circle Integrations

| Integration | Description | Timeline |
|-------------|-------------|----------|
| Mainnet USDC | Replace testnet MockUSDC with real USDC on Arc Mainnet | Post-audit |
| Circle Programmable Wallets | Seamless onboarding — users get an ArcNS name with their wallet | 6–12 months |
| USDC payment routing | dApps can use ArcNS names as USDC payment identifiers | 6–12 months |
| Circle CCTP | Cross-chain name resolution for USDC transfers | 12+ months |

---

## Roadmap / Milestones

**Milestone 1 — Audit + Hardening (0–3 months)**
- Engage external security auditor
- Resolve audit findings
- Treasury migration to multisig contract
- Timelock delay increase

**Milestone 2 — Ecosystem Integration (3–6 months)**
- ArcScan integration (name search, address labels)
- Wallet integration packages delivered to MetaMask, Rainbow, Trust Wallet
- Public resolution adapter hardened and rate-limited
- MetaMask Snap for ArcNS resolution

**Milestone 3 — Mainnet (6–10 months, pending audit)**
- Deploy on Arc Mainnet with real USDC
- Dedicated RPC and monitoring
- Reserved names policy
- Circle Programmable Wallets integration

---

## Demo Flow

See [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md) for the full 3–5 minute demo script.

**Quick summary:**
1. Home page — search for a name
2. Register a name (commit-reveal, USDC payment)
3. My Domains — portfolio and primary name
4. Resolve — forward resolution and identity inspection
5. `thebstoftimes.arc` — registered name with no address record (demonstrates correctness)
6. ArcScan — verified contracts
7. Circle alignment — USDC-native, `.circle` TLD, planned integrations

---

## Honest Gaps

| Gap | Notes |
|-----|-------|
| External audit pending | Required before mainnet. Audit prep package is ready. |
| Treasury is an EOA | Migration to multisig contract is planned. |
| No ecosystem integrations yet | Integration packages are ready. Adoption requires third-party work. |
| Not mainnet | Arc Testnet only. No real funds. |
| Resolve empty-state polish | Minor UX polish deferred. Not a blocker. |

Full gap analysis: [docs/final/MAINNET_GAP_REPORT.md](../final/MAINNET_GAP_REPORT.md)

---

## Links

| Resource | URL |
|----------|-----|
| Live app | https://arcns-app.vercel.app |
| GitHub | https://github.com/khenzarr/arcns |
| Explorer | https://testnet.arcscan.app |
| Subgraph | https://api.studio.thegraph.com/query/1748590/arcnslatest/v3 |
| Demo script | [DEMO_VIDEO_SCRIPT.md](DEMO_VIDEO_SCRIPT.md) |
| Deck outline | [INVESTOR_DECK_OUTLINE.md](INVESTOR_DECK_OUTLINE.md) |
| Deployed addresses | [docs/final/DEPLOYED_ADDRESSES.md](../final/DEPLOYED_ADDRESSES.md) |
| Audit scope | [docs/final/AUDIT_SCOPE.md](../final/AUDIT_SCOPE.md) |
| Mainnet gap report | [docs/final/MAINNET_GAP_REPORT.md](../final/MAINNET_GAP_REPORT.md) |
