# ArcNS v3 — Role and Permission Matrix

**Current state:** All roles held by deployer EOA `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`  
**Status:** Testnet — single-EOA concentration is a known pre-mainnet gap

---

## ArcNSController (both .arc and .circle instances)

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke all other roles | Deployer EOA |
| `ADMIN_ROLE` | `setTreasury()`, `setApprovedResolver()` | Deployer EOA |
| `PAUSER_ROLE` | `pause()`, `unpause()` | Deployer EOA |
| `ORACLE_ROLE` | `setPriceOracle()` | Deployer EOA |
| `UPGRADER_ROLE` | `_authorizeUpgrade()` — authorize UUPS upgrades | Deployer EOA |

### Privileged functions

| Function | Required role | Effect |
|----------|--------------|--------|
| `setTreasury(address)` | `ADMIN_ROLE` | Redirects all future USDC payments |
| `setApprovedResolver(address, bool)` | `ADMIN_ROLE` | Adds/removes resolver from allowlist |
| `setPriceOracle(address)` | `ORACLE_ROLE` | Replaces price oracle — affects all future pricing |
| `pause()` | `PAUSER_ROLE` | Blocks all `register()` and `renew()` calls |
| `unpause()` | `PAUSER_ROLE` | Restores `register()` and `renew()` |
| `upgradeTo(address)` | `UPGRADER_ROLE` | Replaces controller logic entirely |

---

## ArcNSResolver

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke all other roles | Deployer EOA |
| `ADMIN_ROLE` | `setController()` — grant/revoke CONTROLLER_ROLE | Deployer EOA |
| `CONTROLLER_ROLE` | `setAddr()`, `setName()` for any node | ArcNSController (.arc), ArcNSController (.circle), ArcNSReverseRegistrar |
| `UPGRADER_ROLE` | `_authorizeUpgrade()` — authorize UUPS upgrades | Deployer EOA |

### Privileged functions

| Function | Required role | Effect |
|----------|--------------|--------|
| `setController(address, bool)` | `ADMIN_ROLE` | Grants/revokes ability to write any node's records |
| `setAddr(bytes32, address)` | `CONTROLLER_ROLE` or node owner | Sets EVM address for any node |
| `setName(bytes32, string)` | `CONTROLLER_ROLE` only | Sets name record for any node (reverse resolution) |
| `upgradeTo(address)` | `UPGRADER_ROLE` | Replaces resolver logic entirely |

---

## ArcNSBaseRegistrar (both .arc and .circle instances)

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| `owner` (Ownable) | `addController()`, `removeController()` | Deployer EOA |
| `controllers` mapping | `register()`, `registerWithResolver()`, `renew()` | ArcNSController (.arc or .circle) |

### Privileged functions

| Function | Required role | Effect |
|----------|--------------|--------|
| `addController(address)` | `owner` | Grants ability to mint/transfer NFTs and set expiry |
| `removeController(address)` | `owner` | Revokes controller access |
| `register(...)` | `controllers` | Mints ERC-721 token, sets expiry, updates registry |
| `registerWithResolver(...)` | `controllers` | Same as register + sets resolver in registry |
| `renew(...)` | `controllers` | Extends expiry |

---

## ArcNSRegistry

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| Root node owner (`bytes32(0)`) | `setSubnodeOwner()` for TLD nodes | Deployer EOA |
| TLD node owner (`.arc`, `.circle`) | `setSubnodeOwner()` for second-level names | ArcNSBaseRegistrar (.arc or .circle) |
| `addr.reverse` node owner | `setSubnodeRecord()` for reverse nodes | ArcNSReverseRegistrar |
| Node owner (per-name) | `setRecord()`, `setResolver()`, `setOwner()`, `setTTL()` | Name registrant |

### Notes
- The registry has no admin role — it is purely node-ownership-based
- The deployer EOA owns the root node and the TLD nodes at deployment time
- TLD node ownership is transferred to the BaseRegistrar during deployment setup
- `addr.reverse` node ownership is transferred to the ReverseRegistrar during deployment setup

---

## ArcNSPriceOracle

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| `owner` (Ownable) | `setPrices()` | Deployer EOA |

### Privileged functions

| Function | Required role | Effect |
|----------|--------------|--------|
| `setPrices(p1, p2, p3, p4, p5)` | `owner` | Updates all five pricing tiers |

---

## ArcNSReverseRegistrar

| Role | Capabilities | Current holder |
|------|-------------|---------------|
| `owner` (Ownable) | `setDefaultResolver()` | Deployer EOA |

### Privileged functions

| Function | Required role | Effect |
|----------|--------------|--------|
| `setDefaultResolver(address)` | `owner` | Changes the resolver used for all new reverse records |

---

## Privilege Concentration Summary

**On testnet, the deployer EOA controls:**
- All four controller roles (DEFAULT_ADMIN, ADMIN, PAUSER, ORACLE, UPGRADER)
- Resolver admin and upgrader
- BaseRegistrar ownership (can add/remove controllers)
- Registry root node (can reassign TLD ownership)
- PriceOracle ownership (can change all prices)
- ReverseRegistrar ownership (can change default resolver)
- Treasury address (receives all USDC)

**This is a single point of failure.** If the deployer EOA is compromised:
- All USDC payments can be redirected
- Both controllers can be paused
- Both controllers and the resolver can be upgraded to malicious implementations
- Pricing can be changed arbitrarily

---

## Recommended Operational Controls (Mainnet)

| Control | Priority |
|---------|----------|
| Replace deployer EOA with multisig for all admin roles | Critical |
| Separate UPGRADER_ROLE to a time-locked multisig | Critical |
| Separate PAUSER_ROLE to an operational multisig (faster response) | High |
| Replace treasury EOA with multisig | Critical |
| Separate ORACLE_ROLE to a dedicated oracle management key | Medium |
| Implement a time-lock on upgrade execution | High |
| Revoke DEFAULT_ADMIN_ROLE from deployer after role distribution | High |
