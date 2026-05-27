# ArcNS — Deployed Contract Addresses

**Canonical source:** `deployments/arc_testnet-v3.json` → `frontend/src/lib/generated-contracts.ts`  
**Network:** Arc Testnet  
**Chain ID:** 5042002  
**Initial Deployment:** 2026-04-24  
**Security Migration:** 2026-04-29  
**Timelock Deployment:** 2026-04-29  

> If any address in this document conflicts with `deployments/arc_testnet-v3.json` or `frontend/src/lib/generated-contracts.ts`, the JSON/TS files are the source of truth.

---

## Network Reference

| Field | Value |
|-------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| RPC | https://rpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| USDC (testnet) | `0x3600000000000000000000000000000000000000` |
| Faucet | https://faucet.circle.com |

---

## Active Production Contracts

### Core Protocol

| Contract | Address | Upgradeability |
|----------|---------|----------------|
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | Non-upgradeable |
| ArcNSResolver (proxy) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | UUPS proxy |
| ArcNSResolver (implementation) | `0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3` | — |
| ArcNSReverseRegistrar | `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` | Non-upgradeable |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` | Non-upgradeable |

### Registrars

| Contract | Address | TLD |
|----------|---------|-----|
| ArcBaseRegistrar | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` | `.arc` |
| CircleBaseRegistrar | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` | `.circle` |

### Controllers

| Contract | Address | Upgradeability |
|----------|---------|----------------|
| ArcController (proxy) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | UUPS proxy |
| ArcController (implementation) | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` | — |
| CircleController (proxy) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | UUPS proxy |
| CircleController (implementation) | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` | — |

> Both Controller proxies share the same implementation contract.

### Governance

| Contract | Address | Notes |
|----------|---------|-------|
| Safe Multisig (2-of-3) | `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` | Holds all operational roles |
| Timelock (48h delay) | `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` | Holds `UPGRADER_ROLE` on all UUPS proxies |
| Treasury (EOA) | `0xbbDF5bC7D63B1b7223556d4899905d56589A682d` | Receives USDC fees. Migration to multisig contract is deferred. |

---

## Indexed Data Layer

| Field | Value |
|-------|-------|
| Primary indexed endpoint | Goldsky `arcns-product/v0.1.0` |
| Primary query URL | `https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn` |
| Fallback indexed endpoint | The Graph Studio `arcnslatest/v3` |
| Fallback query URL | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |
| RPC fallback | `https://rpc.testnet.arc.network` |

---

## Production App

| Field | Value |
|-------|-------|
| URL | https://arcname.services |
| Previous Vercel URL (legacy) | https://arcns-app.vercel.app |
| Hosting | Vercel |
| Status | Live |

---

## Namehash Reference

| Name | Namehash |
|------|----------|
| `.arc` TLD | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| `.circle` TLD | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| `addr.reverse` | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |

---

## Retired Addresses (Historical Reference)

These addresses are no longer active. Do not use them.

| Contract | Address | Reason Retired |
|----------|---------|----------------|
| ArcNSReverseRegistrar (old) | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | Replaced 2026-04-29. `claimWithResolver` authorization fix required redeployment. |
| ArcNSController impl (old) | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` | Replaced 2026-04-29. `initialize` zero-address fix required new implementation. |

---

## ArcScan Links

| Contract | ArcScan |
|----------|---------|
| Registry | https://testnet.arcscan.app/address/0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A |
| Resolver (proxy) | https://testnet.arcscan.app/address/0x4c3a2D4245346732CE498937fEAD6343e77Eb097 |
| ReverseRegistrar | https://testnet.arcscan.app/address/0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304 |
| ArcBaseRegistrar | https://testnet.arcscan.app/address/0xD600B8D80e921ec48845fC1769c292601e5e90C4 |
| CircleBaseRegistrar | https://testnet.arcscan.app/address/0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a |
| ArcController (proxy) | https://testnet.arcscan.app/address/0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46 |
| CircleController (proxy) | https://testnet.arcscan.app/address/0x4CB0650847459d9BbDd5823cc6D320C900D883dA |
| PriceOracle | https://testnet.arcscan.app/address/0xde9b95B560f5e803f5Cc045f27285F0226913548 |
| Safe Multisig | https://testnet.arcscan.app/address/0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3 |
| Timelock | https://testnet.arcscan.app/address/0x0f9d898D74f29c69cAD1a66918b41891E73e08f0 |
