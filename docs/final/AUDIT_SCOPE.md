# ArcNS v3 — Audit Scope

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Deployment date:** 2026-04-24  
**Status:** Testnet only — no external audit completed

---

## In-Scope Contracts

All contracts under `contracts/v3/`. These are the only deployed contracts in the v3 system.

| Contract | Path | Upgradeable | Lines |
|----------|------|-------------|-------|
| ArcNSRegistry | `contracts/v3/registry/ArcNSRegistry.sol` | No | ~180 |
| ArcNSBaseRegistrar | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` | No | ~280 |
| ArcNSPriceOracle | `contracts/v3/registrar/ArcNSPriceOracle.sol` | No | ~120 |
| ArcNSReverseRegistrar | `contracts/v3/registrar/ArcNSReverseRegistrar.sol` | No | ~150 |
| ArcNSController | `contracts/v3/controller/ArcNSController.sol` | Yes (UUPS) | ~320 |
| ArcNSResolver | `contracts/v3/resolver/ArcNSResolver.sol` | Yes (UUPS) | ~200 |

### Interfaces (informational, not separately auditable)
```
contracts/v3/interfaces/
├── IArcNSBaseRegistrar.sol
├── IArcNSController.sol
├── IArcNSPriceOracle.sol
├── IArcNSRegistry.sol
├── IArcNSResolver.sol
└── IArcNSReverseRegistrar.sol
```

### Mocks (test-only, not in scope)
```
contracts/v3/mocks/
├── ArcNSControllerV2Mock.sol
├── ArcNSResolverV2Mock.sol
└── MockUSDC.sol
```

---

## Explicitly Out of Scope for v1

| Item | Reason |
|------|--------|
| `contracts/registrar/`, `contracts/registry/`, `contracts/resolver/`, `contracts/proxy/` | v1/v2 contracts — not deployed in v3 |
| `contracts/governance/ArcNSTreasury.sol` | Treasury is currently an EOA; governance contract not active |
| Text records, contenthash, multicoin resolution | Storage slots reserved but no public functions in v1 |
| Subdomain registration | Not implemented in v1 |
| CCIP-Read / wildcard resolution | Not implemented in v1 |
| Name transfer UI | No dedicated transfer flow in v1 |
| Frontend code | Not a contract audit target |
| Subgraph indexer | Not a contract audit target |

---

## Operational Dependencies (Not Contract Audit Targets)

These are live dependencies that affect system behavior but are not in scope for a contract audit:

| Dependency | Role | Risk if unavailable |
|------------|------|-------------------|
| Arc Testnet RPC | Transaction submission and reads | Frontend degraded; no contract risk |
| USDC contract (`0x3600...0000`) | Payment token | Registration/renewal blocked if USDC is paused |
| The Graph Studio (arcnslatest) | Portfolio and history indexing | Frontend falls back to RPC; no contract risk |
| WalletConnect | Wallet connectivity | Frontend only; no contract risk |
| ArcScan block explorer | Transaction verification | UX only; no contract risk |

---

## Key Deployment Facts for Auditors

- Both controllers share the same implementation address (`0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6`)
- The resolver proxy address (`0x4c3a2D4245346732CE498937fEAD6343e77Eb097`) is what the registry points to
- The OZ UUPS proxy manifest is at `.openzeppelin/unknown-5042002.json`
- All roles are currently held by the deployer EOA (`0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`)
- No upgrades have been performed since initial deployment (`"upgrades": []` in deployment JSON)
