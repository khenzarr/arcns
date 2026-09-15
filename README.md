# ArcNS — Arc Name Service

**Independent decentralized naming protocol · Built on Arc.**

ArcNS maps human-readable names ending in `.arc` and `.circle` to on-chain addresses, issues names as ERC-721 NFTs for selected registration periods, and lets any address set a verified primary name.

ArcNS is an independent naming protocol built on Arc. It is not operated by, affiliated with, sponsored by, or endorsed by Circle or the Arc team. Arc is a trademark of Circle Internet Group, Inc. and/or its affiliates.

> Neither the ArcNS name nor the `.arc` or `.circle` namespaces imply official Arc or Circle ownership, affiliation, sponsorship, or endorsement.

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
| Indexed data layer | Goldsky primary (Arc Testnet), The Graph Studio fallback, RPC fallback preserved |
| Frontend (Next.js) | Live at [arcname.services](https://arcname.services), launch-ready UI on testnet runtime |
| Contract test suite | ~180 passing tests, zero failures |
| Live smoke tests | 10 flows verified on-chain |

The application currently runs against Arc Testnet contracts. Mainnet network references and deployment addresses will be published after the mainnet deployment is verified; testnet addresses must not be used as mainnet addresses.

**Website and app:** [arcname.services](https://arcname.services)

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

### Indexed Data Layer
The live testnet frontend uses Goldsky as the primary indexed data source on Arc Testnet. The legacy The Graph Studio endpoint is retained as a fallback, and direct RPC fallback is preserved for resilience.

The indexed data layer powers registrations/renewals history, transfers, resolver record changes, reverse record changes, and portfolio views in the frontend.

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
| ArcNSReverseRegistrar | `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` |
| ArcBaseRegistrar (.arc) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` |
| CircleBaseRegistrar (.circle) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` |
| ArcController (.arc proxy) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` |
| CircleController (.circle proxy) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` |
| USDC (Arc Testnet) | `0x3600000000000000000000000000000000000000` |

**Primary indexed endpoint (Goldsky):** `https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`
**Fallback indexed endpoint (The Graph Studio):** `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`
**RPC fallback:** `https://rpc.testnet.arc.network`
**Explorer:** `https://testnet.arcscan.app`  
**Canonical addresses:** `deployments/arc_testnet-v3.json` → `frontend/src/lib/generated-contracts.ts`

---

## Pricing (USDC / year)

| Label length | Annual price |
|-------------|-------------|
| 5+ characters | $5.00 |
| 4 characters | $15.00 |
| 3 characters | $25.00 |
| 2 characters | $50.00 |
| 1 character | $100.00 |

Pricing is computed by the PriceOracle in USDC with 6 decimal places. Duration is pro-rated. A 5% slippage guard is applied at registration time.

Verified snapshot-eligible wallets may use their one-time first-registration benefit at the former testnet annual rates: $2 / $10 / $15 / $25 / $50 for 5+ / 4 / 3 / 2 / 1 characters respectively. The benefit applies to one registration across `.arc` and `.circle`; multi-year registrations discount only the first year, and renewals use standard pricing. Eligibility and claim availability are checked in the app; the final on-chain quote determines the amount payable.

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
NEXT_PUBLIC_SUBGRAPH_URL=https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn
NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
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

A focused entry point for developers and operators:

| Guide | Purpose |
|-------|---------|
| [Integration guide](https://arcname.services/developers/integrate) | Practical ArcNS integration examples |
| [Public resolver API](docs/integration/public-adapter-api.md) | Forward and verified reverse resolution |
| [Wallet integration](docs/integration/wallet-integration-package.md) | Wallet integration specification |
| [Deployed addresses](docs/final/DEPLOYED_ADDRESSES.md) | Contract references and explorer links |
| [Environment guide](docs/final/ENVIRONMENT_GUIDE.md) | Environment variable reference |
| [Subgraph guide](docs/final/SUBGRAPH_GUIDE.md) | Indexer build and deployment |
| [Mainnet deployment runbook](docs/mainnet/DEPLOYMENT_RUNBOOK.md) | Mainnet deployment workflow |

Historical reports and internal preparation documents remain in `docs/`; they are not launch-status claims.

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

For bugs, feature proposals, or integration questions, open an [issue](https://github.com/khenzarr/arcns/issues). Include the affected network, reproduction steps, and relevant public transaction hashes. Never include private keys or credentials.

For wallet and application integrations, start with the [integration guide](https://arcname.services/developers/integrate) and [public resolver API](docs/integration/public-adapter-api.md).

---

## License

| Directory | License |
|-----------|---------|
| `contracts/v3/` | [MIT](LICENSE) |
| `frontend/` | [Business Source License 1.1](frontend/LICENSE-FRONTEND) — converts to MIT on 2030-04-26 |
| `docs/` | [Creative Commons Attribution 4.0](docs/LICENSE-DOCS) |
| All other files | [MIT](LICENSE) |

See [NOTICE](NOTICE) for licences, branding, and reserved-name terms.
The ArcNS name and branding are reserved identifiers of the ArcNS project.
Use in forks, derivative deployments, or confusingly similar products requires separate permission.
