# ArcNS — Arc Name Service

ArcNS is a decentralized naming protocol built for Arc Testnet. It maps human-readable names ending in `.arc` and `.circle` to on-chain addresses, issues names as ERC-721 NFTs, and lets any address set a verified primary name for its on-chain identity.

Names are registered with USDC, owned as NFTs, and resolved entirely on-chain. No off-chain infrastructure is required to read or verify a name.

---

## What ArcNS Enables

- **Human-readable identity** — register `alice.arc` or `bob.circle` and point it to any EVM address
- **USDC-native registration** — pay with USDC on Arc Testnet; no native gas token required for name purchases
- **On-chain resolution** — forward resolution (`name → address`) and reverse resolution (`address → primary name`) are both fully on-chain
- **NFT ownership** — every registered name is an ERC-721 token with on-chain SVG metadata
- **Primary name** — any address can set a verified primary name; the protocol enforces forward-confirmation so stale records are detectable
- **Portfolio and history** — subgraph-backed domain portfolio, registration history, and renewal tracking
- **Annual renewal model** — names are registered for a chosen duration with a 90-day grace period on expiry

---

## Current Status

**Live on Arc Testnet · Demo-ready · Pre-mainnet**

| Component | Status |
|-----------|--------|
| All 8 v3 contracts | Deployed on Arc Testnet (2026-04-24) |
| Subgraph (`arcnslatest`) | Published on The Graph Studio |
| Frontend (Next.js) | Functional, v3-wired, local dev |
| Contract test suite | ~180 passing tests, zero failures |
| Live smoke tests | 10 flows verified on-chain |
| External security audit | Not yet completed — required before mainnet |

The protocol is fully functional on testnet. Mainnet deployment is gated on an external security audit and operational hardening. See [Mainnet Gap Report](docs/final/MAINNET_GAP_REPORT.md) for the full checklist.

---

## Core Capabilities

### Registration
Commit-reveal scheme prevents front-running. Users commit a hash, wait 60 seconds, then register. USDC is transferred to the treasury on success. The name NFT is minted to the registrant.

### Renewal
Any address can renew any name by paying the USDC renewal cost. The expiry is extended by the requested duration. A 90-day grace period follows expiry before the name becomes available for re-registration.

### Resolver (v1 scope)
The v1 Resolver stores EVM address records (`addr`) for each name node. The Resolver is a UUPS proxy — future versions will add text records, contenthash, and multi-coin addresses without redeployment.

### Reverse / Primary Name
Any address can set a primary name via the ReverseRegistrar. The protocol stores the reverse record on-chain. Consumers must forward-confirm the reverse record before trusting it — the `addr` record of the claimed name must resolve back to the queried address.

### NFT Ownership
Names are ERC-721 tokens on the BaseRegistrar contracts. Token ID is `uint256(keccak256(label))`. `tokenURI` returns fully on-chain JSON metadata with an inline SVG image — no external fetch required.

### Subgraph
The `arcnslatest` subgraph indexes registrations, renewals, transfers, address record changes, and reverse record changes. It powers the portfolio view and transaction history in the frontend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ArcNS Protocol                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ArcNSRegistry (non-upgradeable)                               │
│   Central node → (owner, resolver, TTL) map                     │
│         ↑                                                       │
│   ┌─────┴──────────────────────────────────┐                   │
│   │ ArcNSBaseRegistrar (.arc)  ERC-721      │                   │
│   │ ArcNSBaseRegistrar (.circle) ERC-721    │                   │
│   └─────┬──────────────────────────────────┘                   │
│         │                                                       │
│   ┌─────▼──────────────────────────────────┐                   │
│   │ ArcNSController (.arc)   UUPS proxy     │                   │
│   │ ArcNSController (.circle) UUPS proxy    │                   │
│   │ commit/reveal · USDC payment · renew    │                   │
│   └─────┬──────────────────────────────────┘                   │
│         │                                                       │
│   ┌─────▼──────────────────────────────────┐                   │
│   │ ArcNSPriceOracle (non-upgradeable)      │                   │
│   │ USDC pricing by label length            │                   │
│   └────────────────────────────────────────┘                   │
│                                                                 │
│   ┌────────────────────────────────────────┐                   │
│   │ ArcNSResolver  UUPS proxy              │                   │
│   │ addr records (v1) · name records       │                   │
│   └────────────────────────────────────────┘                   │
│                                                                 │
│   ┌────────────────────────────────────────┐                   │
│   │ ArcNSReverseRegistrar (non-upgradeable) │                   │
│   │ addr.reverse → primary name mapping    │                   │
│   └────────────────────────────────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Payment flow:
  User → approve(USDC, controller, amount)
       → controller.commit(hash)
       → [wait 60s]
       → controller.register(...)
       → USDC transferred to treasury
       → ERC-721 minted to registrant
       → Registry node assigned
```

**Contract upgradeability:**
- Registry, BaseRegistrars, PriceOracle, ReverseRegistrar — non-upgradeable (ownership ledger stability)
- Controller, Resolver — UUPS proxies (registration logic and resolver feature set may expand)

---

## Live Deployment

**Network:** Arc Testnet · **Chain ID:** 5042002 · **Deployed:** 2026-04-24

| Contract | Address |
|----------|---------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` |
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` |
| ArcBaseRegistrar (.arc) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` |
| CircleBaseRegistrar (.circle) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` |
| ArcController (.arc proxy) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` |
| CircleController (.circle proxy) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` |
| USDC (Arc Testnet) | `0x3600000000000000000000000000000000000000` |

**Subgraph:** `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`  
**Explorer:** `https://testnet.arcscan.app`  
**Canonical addresses:** `deployments/arc_testnet-v3.json` → `frontend/src/lib/generated-contracts.ts`

---

## Pricing (USDC / year)

| Label length | Annual price |
|-------------|-------------|
| 5+ characters | $2.00 |
| 4 characters | $10.00 |
| 3 characters | $15.00 |
| 2 characters | $25.00 |
| 1 character | $50.00 |

Pricing is computed by the PriceOracle in USDC with 6 decimal places. Duration is pro-rated. A 5% slippage guard is applied at registration time.

---

## Repo Structure

```
arcns/
├── contracts/v3/              ← Active canonical contracts
│   ├── controller/            ArcNSController (UUPS)
│   ├── registrar/             BaseRegistrar, PriceOracle, ReverseRegistrar
│   ├── registry/              ArcNSRegistry
│   └── resolver/              ArcNSResolver (UUPS)
├── scripts/v3/deployV3.js     ← Active deployment script
├── scripts/generate-frontend-config.js  ← Address → TS config generator
├── test/v3/                   ← Active v3 test suite (~180 tests)
├── deployments/
│   └── arc_testnet-v3.json    ← Canonical deployed addresses
├── indexer/                   ← Active subgraph (arcnslatest)
├── frontend/                  ← Next.js 14 frontend
│   └── src/
│       ├── app/               Pages: home, my-domains, resolve
│       ├── components/        UI components
│       ├── hooks/             v3 wagmi hooks
│       └── lib/
│           ├── generated-contracts.ts  ← Address source of truth
│           ├── abis.ts                 ← v3 ABI exports
│           └── contracts.ts            ← Contract descriptors
├── docs/
│   ├── final/                 ← Finalization, audit, demo, gap docs
│   ├── integration/           ← Ecosystem integration packages
│   ├── design/                ← Architecture design docs
│   └── release/               ← Release runbook and checklists
├── .openzeppelin/             ← UUPS proxy upgrade manifest
└── hardhat.config.js
```

Legacy v1/v2 contracts remain in the repo as reference under `contracts/registrar/`, `contracts/registry/`, `contracts/resolver/`. They are not imported by any active file.

---

## Developer Quickstart

### 1. Install

```bash
npm install
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Set: PRIVATE_KEY, TREASURY_ADDRESS
# Optional: SUBGRAPH_URL, RPC_URL overrides
```

Frontend environment:
```bash
# frontend/.env.local
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_project_id>
```

See [Environment Guide](docs/final/ENVIRONMENT_GUIDE.md) for the full variable reference.

### 3. Compile contracts

```bash
npx hardhat compile
```

### 4. Run tests

```bash
# Contract tests
npx hardhat test test/v3/

# Frontend unit tests
cd frontend && npx vitest run
```

### 5. Deploy to Arc Testnet

```bash
node scripts/v3/deployV3.js --network arc_testnet
node scripts/generate-frontend-config.js --network arc_testnet
```

### 6. Run frontend

```bash
cd frontend && npm run dev
# → http://localhost:3000
```

### 7. Build and deploy subgraph

```bash
cd indexer
npm run codegen
npm run build
graph deploy --studio arcnslatest
```

See [Subgraph Guide](docs/final/SUBGRAPH_GUIDE.md) for the full deployment flow.

---

## Documentation

### Finalization & Deployment
| Document | Purpose |
|----------|---------|
| [FINAL_STATUS.md](FINAL_STATUS.md) | Authoritative live status — what works, what is tested, what is not mainnet-ready |
| [DEPLOYED_ADDRESSES.md](docs/final/DEPLOYED_ADDRESSES.md) | All contract addresses, subgraph URL, explorer links |
| [RELEASE_SUMMARY.md](docs/final/RELEASE_SUMMARY.md) | What is live, what is v1-scope-only, what is not yet mainnet-ready |
| [ENVIRONMENT_GUIDE.md](docs/final/ENVIRONMENT_GUIDE.md) | Environment variable reference |
| [SUBGRAPH_GUIDE.md](docs/final/SUBGRAPH_GUIDE.md) | Subgraph build, deploy, and frontend consumption |
| [SMOKE_TEST_RESULTS.md](docs/final/SMOKE_TEST_RESULTS.md) | Live manual test results |

### Audit & Security
| Document | Purpose |
|----------|---------|
| [AUDIT_SCOPE.md](docs/final/AUDIT_SCOPE.md) | In-scope contracts, out-of-scope items, operational dependencies |
| [THREAT_MODEL_SUMMARY.md](docs/final/THREAT_MODEL_SUMMARY.md) | Trust boundaries, invariants, attacker models |
| [UPGRADE_POLICY.md](docs/final/UPGRADE_POLICY.md) | Upgradeable vs non-upgradeable rationale, upgrade process |
| [ROLE_PERMISSION_MATRIX.md](docs/final/ROLE_PERMISSION_MATRIX.md) | Full privilege map, mainnet recommendations |
| [TEST_COVERAGE_SUMMARY.md](docs/final/TEST_COVERAGE_SUMMARY.md) | Coverage by contract and flow, known gaps |
| [MAINNET_GAP_REPORT.md](docs/final/MAINNET_GAP_REPORT.md) | Prioritized gap analysis, go/no-go checklist |

### Demo
| Document | Purpose |
|----------|---------|
| [FOUNDER_DEMO_SCRIPT.md](docs/final/FOUNDER_DEMO_SCRIPT.md) | 9-step live demo flow with talking points |
| [FOUNDER_DEMO_CHECKLIST.md](docs/final/FOUNDER_DEMO_CHECKLIST.md) | Pre-demo setup checklist |
| [FOUNDER_DEMO_FALLBACKS.md](docs/final/FOUNDER_DEMO_FALLBACKS.md) | Recovery guide for live testnet conditions |

### Ecosystem Integration
| Document | Purpose |
|----------|---------|
| [ECOSYSTEM_INTEGRATION_STATUS.md](docs/integration/ECOSYSTEM_INTEGRATION_STATUS.md) | Phase 8 integration readiness summary and next execution order |
| [resolution-adapter-design.md](docs/integration/resolution-adapter-design.md) | Canonical public resolution adapter design |
| [arcscan-integration-package.md](docs/integration/arcscan-integration-package.md) | Implementation-grade ArcScan integration spec |
| [wallet-integration-package.md](docs/integration/wallet-integration-package.md) | Implementation-grade wallet integration spec |
| [dapp-fallback-ux.md](docs/integration/dapp-fallback-ux.md) | In-app fallback UX while native ecosystem support is pending |

---

## Roadmap

**Current milestone: Audit + Hardening + Mainnet Preparation**

1. Engage external security auditor (all 6 v3 contracts)
2. Resolve audit findings
3. Implement upgrade time-lock
4. Transfer admin roles and treasury to multisig
5. Confirm mainnet USDC address
6. Fix 2 failing frontend tests; add reentrancy adversarial tests
7. Deploy subgraph to decentralized hosting
8. Deploy frontend to production domain
9. Provision dedicated RPC
10. Redeploy on mainnet, complete mainnet smoke test matrix

**Parallel track: Ecosystem integration**
- Harden and publicly deploy the resolution adapter API
- Deliver ArcScan integration package to the ArcScan team
- Deliver wallet integration package to wallet vendors
- Publish official MetaMask Snap for ArcNS resolution

Estimated scope: 6–10 weeks depending on audit timeline.

---

## Network Reference

| Field | Value |
|-------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| USDC | `0x3600000000000000000000000000000000000000` |
| Faucet | https://faucet.circle.com |

---

## Contributing / Collaboration

ArcNS is in active pre-mainnet development. If you are an ecosystem partner, grant reviewer, auditor, or integration team:

- **Audit inquiries:** See [AUDIT_SCOPE.md](docs/final/AUDIT_SCOPE.md) for scope and [THREAT_MODEL_SUMMARY.md](docs/final/THREAT_MODEL_SUMMARY.md) for the threat model.
- **Explorer integration:** See [arcscan-integration-package.md](docs/integration/arcscan-integration-package.md).
- **Wallet integration:** See [wallet-integration-package.md](docs/integration/wallet-integration-package.md).
- **Grant / hackathon reviewers:** See [FINAL_STATUS.md](FINAL_STATUS.md) for the authoritative live status and [MAINNET_GAP_REPORT.md](docs/final/MAINNET_GAP_REPORT.md) for the honest gap analysis.

---

## License

MIT
