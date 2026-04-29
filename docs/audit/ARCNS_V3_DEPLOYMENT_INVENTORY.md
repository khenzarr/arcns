# ArcNS v3 — Deployment Inventory

**Network:** Arc Testnet (Chain ID: 5042002)  
**Deployment Date:** 2026-04-24T21:58:41.381Z  
**Security Migration Date:** 2026-04-29  
**Timelock Deployment Date:** 2026-04-29T20:25:59.780Z  
**Deployer EOA:** `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` (all privileged roles revoked post-migration)

---

## 1. Active Production Contracts

### 1.1 ArcNSRegistry

| Field | Value |
|---|---|
| Address | `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A` |
| Source | `contracts/v3/registry/ArcNSRegistry.sol` |
| Role | Central ownership ledger. Maps namehash → (owner, resolver, TTL). |
| Upgradeability | Non-upgradeable. Standalone contract. |
| Current Owner | Root node (`bytes32(0)`) owned by Safe multisig `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| ArcScan | https://scan.arc.fun/address/0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A |

---

### 1.2 ArcNSBaseRegistrar — `.arc` TLD

| Field | Value |
|---|---|
| Address | `0xD600B8D80e921ec48845fC1769c292601e5e90C4` |
| Source | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` |
| Role | ERC-721 NFT registrar for `.arc` names. Owns the `.arc` TLD node in the Registry. |
| Upgradeability | Non-upgradeable. Standalone contract. |
| TLD Node (namehash) | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| Current Owner | Safe multisig `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| ArcScan | https://scan.arc.fun/address/0xD600B8D80e921ec48845fC1769c292601e5e90C4 |

---

### 1.3 ArcNSBaseRegistrar — `.circle` TLD

| Field | Value |
|---|---|
| Address | `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a` |
| Source | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` |
| Role | ERC-721 NFT registrar for `.circle` names. Owns the `.circle` TLD node in the Registry. |
| Upgradeability | Non-upgradeable. Standalone contract. |
| TLD Node (namehash) | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| Current Owner | Safe multisig `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| ArcScan | https://scan.arc.fun/address/0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a |

---

### 1.4 ArcNSController — `.arc` Proxy

| Field | Value |
|---|---|
| Proxy Address | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` |
| Implementation Address | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` |
| Source | `contracts/v3/controller/ArcNSController.sol` |
| Role | Commit-reveal registration and renewal orchestrator for `.arc` names. Accepts USDC payments. |
| Upgradeability | UUPS proxy (EIP-1822). Upgrade requires Timelock (48h delay) + Safe multisig. |
| ArcScan (proxy) | https://scan.arc.fun/address/0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46 |
| ArcScan (impl) | https://scan.arc.fun/address/0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB |

---

### 1.5 ArcNSController — `.circle` Proxy

| Field | Value |
|---|---|
| Proxy Address | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` |
| Implementation Address | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` |
| Source | `contracts/v3/controller/ArcNSController.sol` |
| Role | Commit-reveal registration and renewal orchestrator for `.circle` names. Accepts USDC payments. |
| Upgradeability | UUPS proxy (EIP-1822). Upgrade requires Timelock (48h delay) + Safe multisig. |
| Note | Both Controller proxies share the same implementation contract. |
| ArcScan (proxy) | https://scan.arc.fun/address/0x4CB0650847459d9BbDd5823cc6D320C900D883dA |
| ArcScan (impl) | https://scan.arc.fun/address/0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB |

---

### 1.6 ArcNSResolver — Proxy

| Field | Value |
|---|---|
| Proxy Address | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` |
| Implementation Address | `0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3` |
| Source | `contracts/v3/resolver/ArcNSResolver.sol` |
| Role | Stores EVM address records (coin type 60) and reverse name records. v1 active interface: `setAddr` / `addr` / `setName` (CONTROLLER_ROLE only) / `name`. |
| Upgradeability | UUPS proxy (EIP-1822). Upgrade requires Timelock (48h delay) + Safe multisig. |
| ArcScan (proxy) | https://scan.arc.fun/address/0x4c3a2D4245346732CE498937fEAD6343e77Eb097 |
| ArcScan (impl) | https://scan.arc.fun/address/0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3 |

---

### 1.7 ArcNSPriceOracle

| Field | Value |
|---|---|
| Address | `0xde9b95B560f5e803f5Cc045f27285F0226913548` |
| Source | `contracts/v3/registrar/ArcNSPriceOracle.sol` |
| Role | USDC-denominated pricing with length-based tiers and linear premium decay for recently expired names. |
| Upgradeability | Non-upgradeable. Price tiers configurable via `setPrices()` by owner. |
| Current Owner | Safe multisig `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| ArcScan | https://scan.arc.fun/address/0xde9b95B560f5e803f5Cc045f27285F0226913548 |

---

### 1.8 ArcNSReverseRegistrar

| Field | Value |
|---|---|
| Address | `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304` |
| Source | `contracts/v3/registrar/ArcNSReverseRegistrar.sol` |
| Role | Manages the `addr.reverse` TLD. Maps addresses to primary names. |
| Upgradeability | Non-upgradeable. Standalone contract. |
| `addr.reverse` Node | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |
| Current Owner | Safe multisig `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| ArcScan | https://scan.arc.fun/address/0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304 |

---

### 1.9 ArcNSTimelock

| Field | Value |
|---|---|
| Address | `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` |
| Source | OpenZeppelin `TimelockController` v5 (`@openzeppelin/contracts ^5.6.1`) |
| Role | Enforces a 48-hour delay on all upgrade operations. Proposer, executor, and canceller are all the Safe multisig. Admin is `address(0)` (self-administered). |
| Upgradeability | Non-upgradeable. Standard OZ deployment. No custom logic. |
| Delay | 172800 seconds (48 hours) |
| ArcScan | https://scan.arc.fun/address/0x0f9d898D74f29c69cAD1a66918b41891E73e08f0 |

---

### 1.10 Safe Multisig

| Field | Value |
|---|---|
| Address | `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Type | Gnosis Safe (Safe Global v1.3.0, EIP-155) |
| Threshold | 2-of-3 |
| Owners | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`, `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396`, `0x1e19c1c829A387c2246567c0df264D81310d7775` |
| Role | Holds all operational privileged roles. Sole proposer/executor/canceller on the Timelock. |
| ArcScan | https://scan.arc.fun/address/0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3 |

---

### 1.11 Treasury

| Field | Value |
|---|---|
| Address | `0xbbDF5bC7D63B1b7223556d4899905d56589A682d` |
| Type | EOA |
| Role | Receives all USDC registration and renewal fees. |
| Note | Treasury migration to a multisig-controlled contract is deferred. This is a known, documented operational gap. It does not affect contract security. |

---

### 1.12 USDC (Testnet)

| Field | Value |
|---|---|
| Address | `0x3600000000000000000000000000000000000000` |
| Type | MockUSDC (testnet stand-in) |
| Role | Payment token for all registrations and renewals. |
| Note | Out of scope for audit. Testnet stand-in only. |

---

## 2. Retired Contracts (Historical Reference)

These contracts are no longer active but are referenced in the migration history.

| Contract | Address | Reason Retired |
|---|---|---|
| ArcNSReverseRegistrar (old) | `0x961FC222eDDb9ab83f78a255EbB1DB1255F3DF57` | Replaced by security migration (2026-04-29). `claimWithResolver` authorization fix required redeployment. |
| ArcNSController impl (old) | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` | Replaced by security migration (2026-04-29). `initialize` zero-address fix required new implementation. |

---

## 3. Upgrade History

### Security Migration v1 — 2026-04-29

| Step | Action | Transaction Hash |
|---|---|---|
| ReverseRegistrar redeployed | New contract at `0x352a1917...` with `claimWithResolver` auth fix | — |
| `addr.reverse` node transferred | Registry node transferred from old to new ReverseRegistrar | `0xa37f33cc...` |
| CONTROLLER_ROLE granted | Resolver granted CONTROLLER_ROLE to new ReverseRegistrar | `0xf2ea80c6...` |
| CONTROLLER_ROLE revoked | Resolver revoked CONTROLLER_ROLE from old ReverseRegistrar | `0x60f63dd9...` |
| arcController updated | `setReverseRegistrar` called to point to new ReverseRegistrar | `0xb9f01ac1...` |
| circleController updated | `setReverseRegistrar` called to point to new ReverseRegistrar | `0x2dff4d27...` |
| Controller proxies upgraded | Both proxies upgraded to new impl with `initialize` zero-address fix | — |

### Timelock Migration — 2026-04-29T20:26:13.865Z

| Step | Action | Transaction Hash |
|---|---|---|
| UPGRADER_ROLE granted to Timelock | arcController | `0xeef03c3f...` |
| UPGRADER_ROLE granted to Timelock | circleController | `0x09514d39...` |
| UPGRADER_ROLE granted to Timelock | resolver | `0x588c0901...` |
| UPGRADER_ROLE revoked from Safe | arcController | `0x4fc3ca17...` |
| UPGRADER_ROLE revoked from Safe | circleController | `0x5dc8b70c...` |
| UPGRADER_ROLE revoked from Safe | resolver | `0x58a9d05b...` |

---

## 4. Namehash Reference

| Name | Namehash |
|---|---|
| `.arc` TLD | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| `.circle` TLD | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| `addr.reverse` | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |

---

## 5. Contract Dependency Map

```
Safe Multisig (2-of-3)
  └── Timelock (48h delay)
        └── UPGRADER_ROLE on: arcController, circleController, resolver

Safe Multisig (direct)
  ├── DEFAULT_ADMIN_ROLE + ADMIN_ROLE + PAUSER_ROLE + ORACLE_ROLE on: arcController, circleController
  ├── DEFAULT_ADMIN_ROLE + ADMIN_ROLE on: resolver
  ├── owner() on: arcRegistrar, circleRegistrar, reverseRegistrar, priceOracle
  └── root node owner on: registry

arcController (proxy)
  ├── calls: arcRegistrar.registerWithResolver / register / renew
  ├── calls: resolver.setAddr
  ├── calls: reverseRegistrar.setReverseRecord (try/catch)
  └── calls: priceOracle.price

circleController (proxy)
  ├── calls: circleRegistrar.registerWithResolver / register / renew
  ├── calls: resolver.setAddr
  ├── calls: reverseRegistrar.setReverseRecord (try/catch)
  └── calls: priceOracle.price

arcRegistrar / circleRegistrar
  └── calls: registry.setSubnodeRecord / setSubnodeOwner

reverseRegistrar
  ├── calls: registry.setSubnodeRecord
  └── calls: resolver.setName (via CONTROLLER_ROLE)
```

---

*End of ArcNS v3 Deployment Inventory*
