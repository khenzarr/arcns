# ArcNS v3 — Canonical Directory Structure

Legend:
- `[ACTIVE-CANONICAL]` — authoritative source for the v3 rebuild
- `[REFERENCE-ONLY]` — retained for lessons/history, not canonical source
- `[ARCHIVE-LEGACY]` — moved to `_archive/` before rebuild begins
- `[DELETE]` — removed before rebuild begins
- `[GENERATED]` — auto-generated, not hand-edited, gitignored unless noted

---

## Repository Root

```
/
├── contracts/
│   ├── v3/                         [ACTIVE-CANONICAL] — all rebuilt contracts
│   └── (existing v2 files)         [REFERENCE-ONLY]
│
├── frontend/
│   └── src/                        [ACTIVE-CANONICAL] — rebuilt from scratch
│
├── indexer/                        [ACTIVE-CANONICAL] — rebuilt from scratch
│
├── scripts/                        [ACTIVE-CANONICAL] — v3 deploy/upgrade scripts
│
├── deployments/
│   ├── arc_testnet-v3.json         [ACTIVE-CANONICAL] — v3 deployment truth
│   └── arc_testnet-v2.json         [REFERENCE-ONLY] — v2 history, do not overwrite
│
├── docs/
│   ├── design/                     [ACTIVE-CANONICAL] — this spec set
│   └── rebuild/                    [ACTIVE-CANONICAL] — audit + cleanup docs
│
├── .openzeppelin/
│   └── unknown-5042002.json        [REFERENCE-ONLY → ACTIVE-CANONICAL after v3 deploy]
│
├── masterplan.md                   [ACTIVE-CANONICAL]
├── hardhat.config.js               [ACTIVE-CANONICAL]
├── package.json                    [ACTIVE-CANONICAL]
│
├── _archive/                       [ARCHIVE-LEGACY] — v1 superseded files
│
├── abis/                           [DELETE] — stale, replaced by artifacts/
├── arcns/                          [DELETE] — empty package directory
├── src/                            [DELETE] — root-level arc-ns-controller.ts
├── generated/                      [DELETE] — root-level generated subgraph output
├── build/                          [DELETE] — root-level build artifacts
├── schema.graphql                  [DELETE] — root-level duplicate, canonical is indexer/schema.graphql
└── subgraph.yaml                   [DELETE] — root-level duplicate, canonical is indexer/subgraph.yaml
```

---

## contracts/v3/ — Active-Canonical Contract Layout

```
contracts/v3/
├── registry/
│   └── ArcNSRegistry.sol           # Non-upgradeable. Root registry.
│
├── registrar/
│   ├── ArcNSBaseRegistrar.sol      # Non-upgradeable ERC-721. One per TLD.
│   ├── ArcNSPriceOracle.sol        # Non-upgradeable. Owner-controlled setPrices().
│   └── ArcNSReverseRegistrar.sol   # Non-upgradeable. addr.reverse TLD manager.
│
├── controller/
│   └── ArcNSController.sol         # UUPS-upgradeable. One per TLD.
│
├── resolver/
│   └── ArcNSResolver.sol           # UUPS-upgradeable. Shared across TLDs. v1: addr only.
│
├── interfaces/
│   ├── IArcNSRegistry.sol
│   ├── IArcNSBaseRegistrar.sol
│   ├── IArcNSController.sol
│   ├── IArcNSPriceOracle.sol
│   ├── IArcNSResolver.sol
│   └── IArcNSReverseRegistrar.sol
│
└── lib/
    └── ArcNSNormalization.sol      # Canonical name normalization library (Solidity)
```

---

## scripts/ — Active-Canonical Script Layout

```
scripts/
├── deployV3.js                     # Full v3 deployment sequence
├── upgradeV3.js                    # UUPS upgrade script (Controller or Resolver)
├── generate-frontend-config.js     # Reads deployments/arc_testnet-v3.json → writes frontend/src/lib/generated-contracts.ts
├── generate-subgraph-config.js     # Reads deployments/arc_testnet-v3.json → writes indexer/subgraph.yaml addresses
├── verify.js                       # Block explorer verification for all v3 contracts
└── check-storage-layout.js         # OZ upgrades plugin storage layout validation
```

---

## frontend/src/ — Active-Canonical Frontend Layout

```
frontend/src/
├── app/                            # Next.js 14 App Router
│   ├── layout.tsx                  # Root layout with providers
│   ├── providers.tsx               # wagmi + WalletConnect provider tree
│   ├── page.tsx                    # Home / search page
│   ├── my-domains/
│   │   └── page.tsx                # Portfolio: owned names, renewals, primary name
│   └── resolve/
│       └── page.tsx                # Forward lookup: name → address
│
├── components/                     # Reusable UI components
│   ├── SearchBar.tsx
│   ├── NameCard.tsx
│   ├── RegistrationFlow.tsx        # Step-by-step Approve → Commit → Wait → Register
│   ├── RenewalModal.tsx
│   ├── PrimaryNameSelector.tsx
│   ├── WalletButton.tsx
│   ├── ChainGuard.tsx              # Blocks writes if chainId ≠ 5042002
│   └── ErrorDisplay.tsx
│
├── hooks/                          # wagmi/viem hooks
│   ├── useRegistrationPipeline.ts  # Full commit-reveal state machine
│   ├── useAvailability.ts
│   ├── useRentPrice.ts
│   ├── useMyDomains.ts
│   ├── usePrimaryName.ts
│   ├── useSetPrimaryName.ts
│   ├── useCommitmentStatus.ts
│   └── useChainGuard.ts
│
├── lib/
│   ├── generated-contracts.ts      # [GENERATED] Auto-generated from deployment JSON
│   ├── chains.ts                   # arcTestnet chain definition, RPC URLs
│   ├── namehash.ts                 # namehash(name) implementation
│   ├── normalization.ts            # Normalization_Library — single source of truth
│   ├── wagmiConfig.ts              # wagmi config (WalletConnect + MetaMask)
│   ├── publicClient.ts             # Primary public client + fallback chain
│   ├── runtimeClient.ts            # resolveExecutionContext, bindSenderAuthority
│   └── graphql.ts                  # Subgraph query helpers
│
└── types/
    └── index.ts                    # Shared TypeScript types
```

---

## indexer/ — Active-Canonical Subgraph Layout

```
indexer/
├── schema.graphql                  # Entity definitions (canonical)
├── subgraph.yaml                   # Manifest (generated from deployment JSON)
├── package.json
│
├── abis/                           # Contract ABIs for subgraph codegen
│   ├── ArcNSController.json
│   ├── ArcNSRegistry.json
│   ├── ArcNSResolver.json
│   └── ArcNSReverseRegistrar.json
│
├── src/                            # AssemblyScript event handlers
│   ├── controller.ts               # NameRegistered, NameRenewed
│   ├── registry.ts                 # Transfer, NewResolver
│   ├── resolver.ts                 # AddrChanged (v1 only)
│   ├── reverseRegistrar.ts         # ReverseClaimed
│   └── utils.ts                    # namehash, getOrCreateAccount
│
└── generated/                      # [GENERATED] graph codegen output (gitignored)
```

---

## deployments/ — Deployment Truth

```
deployments/
├── arc_testnet-v3.json             [ACTIVE-CANONICAL] — v3 proxy + impl addresses, upgrade history
└── arc_testnet-v2.json             [REFERENCE-ONLY] — v2 history, do not overwrite
```

---

## docs/ — Documentation Layout

```
docs/
├── design/                         [ACTIVE-CANONICAL] — v3 design phase documents
│   ├── system-architecture.md
│   ├── contract-interaction-map.md
│   ├── storage-upgrade-model.md
│   ├── frontend-runtime-model.md
│   ├── subgraph-design.md
│   └── canonical-directory-structure.md  (this file)
│
└── rebuild/                        [ACTIVE-CANONICAL] — audit + cleanup
    └── current-state-audit.md      # Cleanup map (5-category classification)
```

---

## _archive/ — Legacy Files (committed, not deleted)

```
_archive/
├── contracts/
│   ├── ArcNSRegistrarController.sol    # v1 controller
│   ├── ArcNSPriceOracle.sol            # v1 price oracle
│   └── ArcNSResolver.sol               # v1 resolver
├── scripts/
│   ├── deploy.js                       # v1 deploy script
│   └── (other v1 scripts)
└── test/
    ├── ArcNS.test.js
    └── RentPriceCheck.js
```

---

## Reference-Only Files (not moved, not canonical)

These files remain in their current locations but are NOT the canonical source for the rebuild.
They are retained for reference, address history, and test mining.

```
contracts/proxy/ArcNSRegistrarControllerV2.sol      [REFERENCE-ONLY]
contracts/resolver/ArcNSResolverV2.sol              [REFERENCE-ONLY]
contracts/registrar/ArcNSPriceOracleV2.sol          [REFERENCE-ONLY]
contracts/registrar/ArcNSReverseRegistrar.sol       [REFERENCE-ONLY]
contracts/registrar/ArcNSBaseRegistrar.sol          [REFERENCE-ONLY]
contracts/registry/ArcNSRegistry.sol                [REFERENCE-ONLY]
scripts/deployV2.js                                 [REFERENCE-ONLY]
scripts/upgradeV2.js                                [REFERENCE-ONLY]
deployments/arc_testnet-v2.json                     [REFERENCE-ONLY]
.openzeppelin/unknown-5042002.json                  [REFERENCE-ONLY → promoted after v3 deploy]
```
