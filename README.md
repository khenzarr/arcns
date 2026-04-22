# ArcNS — Arc Name Service

ENS-parity decentralized naming protocol for **Arc Testnet** (Chain ID: 5042002).

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
│   ├── interfaces/
│   │   ├── IArcNSRegistry.sol       # Registry interface (EIP-137)
│   │   ├── IArcNSResolver.sol       # Resolver interface
│   │   └── IArcNSPriceOracle.sol    # Price oracle interface
│   ├── registry/
│   │   └── ArcNSRegistry.sol        # Central registry
│   ├── registrar/
│   │   ├── ArcNSBaseRegistrar.sol   # ERC-721 TLD registrar
│   │   ├── ArcNSRegistrarController.sol  # Commit/reveal + USDC payment
│   │   ├── ArcNSPriceOracle.sol     # USDC pricing tiers
│   │   └── ArcNSReverseRegistrar.sol # Reverse resolution
│   ├── resolver/
│   │   └── ArcNSResolver.sol        # Modular public resolver
│   └── mocks/
│       └── MockUSDC.sol             # Test USDC token
├── scripts/
│   ├── deploy.js                    # Full deployment pipeline
│   └── verify.js                    # ArcScan verification
├── test/
│   └── ArcNS.test.js               # Comprehensive test suite
├── deployments/                     # Generated after deploy
├── hardhat.config.js
├── package.json
└── frontend/
    ├── src/
    │   ├── app/                     # Next.js App Router
    │   │   ├── page.tsx             # Home / search
    │   │   ├── my-domains/page.tsx  # Domain management
    │   │   ├── resolve/page.tsx     # Name resolution
    │   │   ├── layout.tsx
    │   │   ├── providers.tsx        # wagmi + RainbowKit
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── Header.tsx           # Nav + wallet connect
    │   │   ├── SearchBar.tsx        # Domain search
    │   │   ├── DomainCard.tsx       # Register/renew UI
    │   │   └── MyDomains.tsx        # Domain management
    │   ├── hooks/
    │   │   └── useArcNS.ts          # wagmi hooks for all contract interactions
    │   └── lib/
    │       ├── chains.ts            # Arc Testnet chain definition
    │       ├── contracts.ts         # ABIs + addresses
    │       ├── namehash.ts          # ENS namehash + utilities
    │       └── wagmiConfig.ts       # WalletConnect config
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## Quick Start

### 1. Install dependencies

```bash
# Contracts
cd arcns
npm install

# Frontend
cd frontend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in PRIVATE_KEY, TREASURY_ADDRESS, WALLETCONNECT_PROJECT_ID
```

### 3. Compile contracts

```bash
cd arcns
npm run compile
```

### 4. Run tests

```bash
npm test
```

### 5. Deploy to Arc Testnet

```bash
npm run deploy:arc
```

This outputs `deployments/arc_testnet.json` with all contract addresses.

### 6. Verify on ArcScan

```bash
npm run verify
```

### 7. Update frontend env

Copy addresses from `deployments/arc_testnet.json` into `frontend/.env.local`:

```env
NEXT_PUBLIC_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ARC_REGISTRAR_ADDRESS=0x...
NEXT_PUBLIC_CIRCLE_REGISTRAR_ADDRESS=0x...
NEXT_PUBLIC_ARC_CONTROLLER_ADDRESS=0x...
NEXT_PUBLIC_CIRCLE_CONTROLLER_ADDRESS=0x...
NEXT_PUBLIC_RESOLVER_ADDRESS=0x...
NEXT_PUBLIC_REVERSE_REGISTRAR_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
```

### 8. Run frontend

```bash
cd frontend
npm run dev
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

## Key Differences from ENS

| Feature         | ENS                    | ArcNS                        |
|-----------------|------------------------|------------------------------|
| Payment         | ETH (native)           | USDC (ERC-20, 6 decimals)    |
| TLDs            | .eth                   | .arc, .circle                |
| Network         | Ethereum               | Arc Testnet (5042002)        |
| Gas token       | ETH                    | USDC (native on Arc)         |
| Payment flow    | msg.value              | approve + transferFrom       |

---

## Security

- Commit/reveal scheme prevents front-running
- ReentrancyGuard on all payment functions
- SafeERC20 for USDC transfers
- Access control: only controllers can register/renew
- Only node owners can update resolver records
- Grace period (90 days) before expired names can be re-registered

---

## WalletConnect

ArcNS uses RainbowKit + WalletConnect v2, supporting:
- MetaMask
- Rainbow
- Trust Wallet
- Coinbase Wallet
- WalletConnect-compatible wallets

Get a free WalletConnect Project ID at https://cloud.walletconnect.com

---

## License

MIT
