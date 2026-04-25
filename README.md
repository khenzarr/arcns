# ArcNS — Arc Name Service

Decentralized naming protocol for **Arc Testnet** (Chain ID: 5042002).

Register `.arc` and `.circle` domains. Pay with USDC. Own your on-chain identity.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ArcNS Protocol                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ArcNSRegistry  ←──────────────────────────────────────────┐  │
│   (central node→owner/resolver/ttl map)                     │  │
│         ↑                                                   │  │
│         │ setSubnodeOwner                                   │  │
│   ┌─────┴──────┐          ┌──────────────────┐             │  │
│   │ BaseReg    │          │ BaseReg           │             │  │
│   │ (.arc)     │          │ (.circle)         │             │  │
│   │ ERC-721    │          │ ERC-721           │             │  │
│   └─────┬──────┘          └────────┬─────────┘             │  │
│         │ addController            │ addController          │  │
│   ┌─────▼──────┐          ┌────────▼─────────┐             │  │
│   │ Controller │          │ Controller        │             │  │
│   │ (.arc)     │          │ (.circle)         │             │  │
│   │ commit/    │          │ commit/reveal     │             │  │
│   │ reveal     │          │ USDC payment      │             │  │
│   │ USDC pay   │          └──────────────────┘             │  │
│   └─────┬──────┘                                           │  │
│         │                                                   │  │
│   ┌─────▼──────────────────────────────────────────────┐   │  │
│   │ ArcNSPriceOracle                                   │   │  │
│   │ USDC-denominated pricing (6 decimals)              │   │  │
│   │ Tiers: 1-char=$640/yr ... 5+char=$2/yr             │   │  │
│   └────────────────────────────────────────────────────┘   │  │
│                                                             │  │
│   ┌────────────────────────────────────────────────────┐   │  │
│   │ ArcNSResolver (modular)                            │───┘  │
│   │ addr / text / contenthash / name records           │      │
│   │ Multi-coin (EIP-2304) support                      │      │
│   └────────────────────────────────────────────────────┘      │
│                                                                 │
│   ┌────────────────────────────────────────────────────┐       │
│   │ ArcNSReverseRegistrar                              │       │
│   │ addr.reverse → name mapping                        │       │
│   └────────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Payment Flow:
  User → approve(USDC, controller, amount)
       → controller.register(...)
       → controller pulls USDC via transferFrom
       → USDC sent to treasury
       → NFT minted to user
       → Registry node assigned to user
```

---

## Network

| Field    | Value                              |
|----------|------------------------------------|
| Network  | Arc Testnet                        |
| RPC      | https://rpc.testnet.arc.network    |
| Chain ID | 5042002                            |
| Currency | USDC (native gas token)            |
| Explorer | https://testnet.arcscan.app        |
| Faucet   | https://faucet.circle.com          |

---

## Project Structure

```
arcns/
├── contracts/
│   ├── v3/                          # ← ACTIVE-CANONICAL v3 contracts
│   │   ├── controller/ArcNSController.sol
│   │   ├── registrar/ArcNSBaseRegistrar.sol
│   │   ├── registrar/ArcNSPriceOracle.sol
│   │   ├── registrar/ArcNSReverseRegistrar.sol
│   │   ├── registry/ArcNSRegistry.sol
│   │   ├── resolver/ArcNSResolver.sol
│   │   ├── interfaces/
│   │   └── mocks/
│   ├── registrar/                   # v1/v2 reference — not active
│   ├── registry/                    # v1/v2 reference — not active
│   ├── resolver/                    # v1/v2 reference — not active
│   └── proxy/                       # v2 proxy reference — not active
├── scripts/
│   ├── v3/deployV3.js               # ← ACTIVE v3 deployment script
│   └── generate-frontend-config.js  # ← ACTIVE config generator
├── test/
│   └── v3/                          # ← ACTIVE v3 test suite
├── deployments/
│   ├── arc_testnet-v3.json          # ← ACTIVE deployment truth
│   └── arc_testnet-v2.json          # v2 reference only
├── indexer/                         # ← ACTIVE subgraph (arcnslatest)
├── docs/
│   ├── final/                       # ← ACTIVE finalization docs
│   ├── design/                      # Architecture design docs
│   └── release/                     # Release checklists
├── hardhat.config.js
├── package.json
└── frontend/                        # ← ACTIVE Next.js frontend
    └── src/
        ├── app/                     # Next.js App Router pages
        ├── components/              # UI components
        ├── hooks/                   # v3 wagmi hooks
        │   └── _archive/            # Superseded v1/v2 hooks
        └── lib/
            ├── generated-contracts.ts  # ← ACTIVE address source of truth
            ├── abis.ts                 # ← ACTIVE v3 ABI exports
            └── contracts.ts            # ← ACTIVE contract descriptors
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
cd frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in PRIVATE_KEY, TREASURY_ADDRESS
```

### 3. Compile v3 contracts

```bash
npx hardhat compile
```

### 4. Run v3 tests

```bash
npx hardhat test test/v3/
```

### 5. Deploy to Arc Testnet

```bash
node scripts/v3/deployV3.js --network arc_testnet
```

This writes `deployments/arc_testnet-v3.json` with all contract addresses.

### 6. Generate frontend config

```bash
node scripts/generate-frontend-config.js --network arc_testnet
```

This writes `frontend/src/lib/generated-contracts.ts`.

### 7. Run frontend

```bash
cd frontend && npm run dev
```

Open http://localhost:3000

---

## Registration Flow

1. User searches for `alice.arc`
2. DApp checks availability via `controller.available("alice")`
3. User selects duration (1-5 years)
4. DApp fetches price via `controller.rentPrice("alice", duration)`
5. User approves USDC spend: `usdc.approve(controller, amount)`
6. DApp submits commitment: `controller.commit(hash)`
7. Wait 65 seconds (anti-frontrun protection)
8. DApp calls `controller.register(...)` — USDC transferred, NFT minted
9. User owns `alice.arc` as ERC-721 token

---

## Pricing (USDC/year)

| Length   | Annual Price |
|----------|-------------|
| 5+ chars | $2.00       |
| 4 chars  | $10.00      |
| 3 chars  | $40.00      |
| 2 chars  | $160.00     |
| 1 char   | $640.00     |

---

## Security

- Commit/reveal scheme prevents front-running
- ReentrancyGuard on all payment functions
- SafeERC20 for USDC transfers
- Access control: only controllers can register/renew
- Only node owners can update resolver records
- Grace period (90 days) before expired names can be re-registered

---

## License

MIT
