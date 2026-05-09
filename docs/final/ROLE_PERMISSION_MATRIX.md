# ArcNS v3 — Role and Permission Matrix

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Security migration complete. All deployer EOA privileges revoked.

---

## Summary

| Role Holder | Contracts | Roles Held |
|-------------|-----------|------------|
| Safe Multisig `0x01BaeBec...` | ArcController, CircleController | `DEFAULT_ADMIN_ROLE`, `ADMIN_ROLE`, `PAUSER_ROLE`, `ORACLE_ROLE` |
| Safe Multisig | Resolver | `DEFAULT_ADMIN_ROLE`, `ADMIN_ROLE` |
| Safe Multisig | ArcBaseRegistrar, CircleBaseRegistrar, ReverseRegistrar, PriceOracle | `owner()` |
| Safe Multisig | Registry | Root node owner (`bytes32(0)`) |
| Safe Multisig | Timelock | `PROPOSER_ROLE`, `EXECUTOR_ROLE`, `CANCELLER_ROLE` |
| Timelock `0x0f9d898D...` | ArcController, CircleController, Resolver | `UPGRADER_ROLE` |
| ArcController proxy | Resolver | `CONTROLLER_ROLE` |
| CircleController proxy | Resolver | `CONTROLLER_ROLE` |
| ReverseRegistrar | Resolver | `CONTROLLER_ROLE` |
| Deployer EOA | — | **None** (all revoked) |

---

## Detailed Role Assignments

### ArcNSController (.arc proxy) — `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`

| Role | Holder | Purpose |
|------|--------|---------|
| `DEFAULT_ADMIN_ROLE` | Safe `0x01BaeBec...` | Can grant and revoke all other roles |
| `ADMIN_ROLE` | Safe `0x01BaeBec...` | Set treasury, approve resolvers, call `setReverseRegistrar` |
| `PAUSER_ROLE` | Safe `0x01BaeBec...` | Pause and unpause `register` and `renew` |
| `ORACLE_ROLE` | Safe `0x01BaeBec...` | Update the PriceOracle reference |
| `UPGRADER_ROLE` | Timelock `0x0f9d898D...` | Authorize UUPS upgrades (48h delay required) |

### ArcNSController (.circle proxy) — `0x4CB0650847459d9BbDd5823cc6D320C900D883dA`

Same role structure as ArcController above.

### ArcNSResolver (proxy) — `0x4c3a2D4245346732CE498937fEAD6343e77Eb097`

| Role | Holder | Purpose |
|------|--------|---------|
| `DEFAULT_ADMIN_ROLE` | Safe `0x01BaeBec...` | Can grant and revoke all other roles |
| `ADMIN_ROLE` | Safe `0x01BaeBec...` | Grant and revoke `CONTROLLER_ROLE` |
| `UPGRADER_ROLE` | Timelock `0x0f9d898D...` | Authorize UUPS upgrades (48h delay required) |
| `CONTROLLER_ROLE` | ArcController proxy | Set addr records at registration time |
| `CONTROLLER_ROLE` | CircleController proxy | Set addr records at registration time |
| `CONTROLLER_ROLE` | ReverseRegistrar | Set name records for reverse resolution |

### ArcNSBaseRegistrar (.arc) — `0xD600B8D80e921ec48845fC1769c292601e5e90C4`

| Role | Holder | Purpose |
|------|--------|---------|
| `owner()` | Safe `0x01BaeBec...` | Add/remove controllers, transfer ownership |
| `controllers` mapping | ArcController proxy | Authorized to call `register*` and `renew` |

### ArcNSBaseRegistrar (.circle) — `0xE1fdE46df4bAC6F433C52a337F4818822735Bf8a`

| Role | Holder | Purpose |
|------|--------|---------|
| `owner()` | Safe `0x01BaeBec...` | Add/remove controllers, transfer ownership |
| `controllers` mapping | CircleController proxy | Authorized to call `register*` and `renew` |

### ArcNSPriceOracle — `0xde9b95B560f5e803f5Cc045f27285F0226913548`

| Role | Holder | Purpose |
|------|--------|---------|
| `owner()` | Safe `0x01BaeBec...` | Call `setPrices()` to update pricing tiers |

### ArcNSReverseRegistrar — `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304`

| Role | Holder | Purpose |
|------|--------|---------|
| `owner()` | Safe `0x01BaeBec...` | Call `setDefaultResolver()` |

### ArcNSRegistry — `0xc20B3F8C7A7B4FcbFfe35c6C63331a1D9D12fD1A`

The Registry has no role-based access control. Authorization is node-based.

| Surface | Holder | Purpose |
|---------|--------|---------|
| Root node (`bytes32(0)`) owner | Safe `0x01BaeBec...` | Can assign TLD nodes |
| `.arc` TLD node owner | ArcBaseRegistrar | Can assign second-level `.arc` nodes |
| `.circle` TLD node owner | CircleBaseRegistrar | Can assign second-level `.circle` nodes |
| `addr.reverse` node owner | ReverseRegistrar | Can assign reverse subnodes |

### ArcNSTimelock — `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0`

| Role | Holder | Purpose |
|------|--------|---------|
| `PROPOSER_ROLE` | Safe `0x01BaeBec...` | Can schedule operations |
| `EXECUTOR_ROLE` | Safe `0x01BaeBec...` | Can execute operations after delay |
| `CANCELLER_ROLE` | Safe `0x01BaeBec...` | Can cancel pending operations |
| `TIMELOCK_ADMIN_ROLE` | `address(0)` | Self-administered. No external admin. |

---

## Permissionless Operations

The following operations require no privileged role:

- Registering a name (any address, subject to payment and commitment)
- Renewing a name (any address, subject to payment)
- Setting a reverse record via `setName` (any address, for their own address)
- Setting an addr record via `setAddr` (node owner or approved operator)
- Transferring an NFT (ERC-721 standard transfer)
- Calling `reclaim` (NFT owner or approved operator)

---

## Mainnet Recommendations

| Item | Recommendation |
|------|----------------|
| Treasury | Migrate to a multisig-controlled contract |
| Timelock delay | Increase to 72h+ |
| Safe threshold | Consider increasing to 3-of-5 for mainnet |
| Key management | Hardware wallets for all Safe owners |
| Monitoring | Public monitoring of Timelock operations |
