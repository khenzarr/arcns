# ArcNS v3 — Deployed Addresses

**Network:** Arc Testnet  
**Chain ID:** 5042002  
**Deployed:** 2026-04-24T21:58:41Z  
**Deployer:** `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`  
**Source:** `deployments/arc_testnet-v3.json`

---

## Contract Addresses

### Infrastructure

| Contract | Address | Upgradeable |
|----------|---------|-------------|
| USDC (native) | `0x3600000000000000000000000000000000000000` | N/A — protocol-level |
| ArcNSRegistry | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` | No |
| ArcNSPriceOracle | `0xde9b95B560f5e803f5Cc045f27285F0226913548` | No |
| Treasury | `0xbbDF5bC7D63B1b7223556d4899905d56589A682d` | N/A — EOA |

### Registrars (ERC-721)

| Contract | Address | Upgradeable |
|----------|---------|-------------|
| ArcNSBaseRegistrar (.arc) | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` | No |
| ArcNSBaseRegistrar (.circle) | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` | No |
| ArcNSReverseRegistrar | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | No |

### Controllers (UUPS Proxies)

| Contract | Proxy Address | Implementation Address |
|----------|--------------|----------------------|
| ArcNSController (.arc) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` |
| ArcNSController (.circle) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` |

> Both controllers share the same implementation address — they are two proxy instances of the same logic contract.

### Resolver (UUPS Proxy)

| Contract | Proxy Address | Implementation Address |
|----------|--------------|----------------------|
| ArcNSResolver | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | `0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3` |

---

## Canonical Namehashes

| TLD | Namehash |
|-----|---------|
| `.arc` | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| `.circle` | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| `addr.reverse` | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |

---

## Subgraph

| Property | Value |
|----------|-------|
| Slug | `arcnslatest` |
| Query URL | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |
| Start block | `38856377` |
| Network | `arc-testnet` |

---

## UUPS Proxy Manifest

The OpenZeppelin UUPS proxy manifest is committed at:
```
.openzeppelin/unknown-5042002.json
```
This file must be preserved alongside `deployments/arc_testnet-v3.json` for any future upgrade operations.

---

## Explorer Links

| Contract | ArcScan |
|----------|---------|
| ArcNSRegistry | https://testnet.arcscan.app/address/0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A |
| ArcNSController (.arc) | https://testnet.arcscan.app/address/0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46 |
| ArcNSController (.circle) | https://testnet.arcscan.app/address/0x4CB0650847459d9BbDd5823cc6D320C900D883dA |
| ArcNSResolver | https://testnet.arcscan.app/address/0x4c3a2D4245346732CE498937fEAD6343e77Eb097 |
| ArcNSBaseRegistrar (.arc) | https://testnet.arcscan.app/address/0xD600B8D80e921ec48845fC1769c292601e5e90C4 |
| ArcNSBaseRegistrar (.circle) | https://testnet.arcscan.app/address/0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a |

---

## ⚠ Known Inconsistency

The subgraph (`indexer/subgraph.yaml`) uses `ArcNSRegistrarControllerV2.json` as the ABI for indexing controller events. This works because the v3 controller emits the same `NameRegistered` and `NameRenewed` event signatures as v2. However, the ABI file name is misleading. Before mainnet, the subgraph ABI reference should be updated to use the v3 controller ABI directly.
