# ArcNS v3 — Governance and Privilege Model

**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Security migration complete. Timelock live. All deployer EOA privileges revoked.

---

## 1. Overview

ArcNS v3 uses a two-layer governance model:

- **Safe multisig (2-of-3)**: Holds all operational privileged roles. Required for any protocol configuration change, emergency pause, price oracle update, or upgrade initiation.
- **Timelock (48-hour delay)**: Holds `UPGRADER_ROLE` on all three upgradeable contracts. Any upgrade must be scheduled by the Safe, wait 48 hours, then executed by the Safe. No upgrade can bypass this delay.

No deployer EOA holds any privileged role as of the completion of the security migration on 2026-04-29.

---

## 2. Safe Multisig

| Parameter | Value |
|---|---|
| Address | `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Implementation | Gnosis Safe v1.3.0 (EIP-155) |
| Threshold | 2-of-3 |
| Owner 1 | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` |
| Owner 2 | `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396` |
| Owner 3 | `0x1e19c1c829A387c2246567c0df264D81310d7775` |
| Singleton | `0x69f4D1788e39c87893C980c06EdF4b7f686e2938` |
| Proxy Factory | `0xC22834581EbC8527d974F8a1c97E1bEA4EF910BC` |
| Fallback Handler | `0x017062a1dE2FE6b99BE3d9d37841FeD19F573804` |

Any action requiring a privileged role requires 2 of the 3 owners to sign.

---

## 3. Timelock

| Parameter | Value |
|---|---|
| Address | `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` |
| Implementation | OpenZeppelin `TimelockController` v5 |
| Delay | 172800 seconds (48 hours) |
| Proposer | Safe `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Executor | Safe `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Canceller | Safe (implicit — proposers are cancellers in OZ TimelockController v5) |
| Admin | `address(0)` — self-administered from deployment. No external admin key. |

The Timelock holds no custom logic. It is a standard OZ `TimelockController` deployment.

---

## 4. Role Assignments — Current State

### 4.1 ArcNSController (.arc proxy) and ArcNSController (.circle proxy)

Both Controller proxies share the same role structure. The following applies to each independently.

| Role | Holder | Notes |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Safe multisig | Can grant and revoke all other roles |
| `ADMIN_ROLE` | Safe multisig | Set treasury, approve resolvers, call `setReverseRegistrar` |
| `PAUSER_ROLE` | Safe multisig | Pause and unpause `register` and `renew` |
| `ORACLE_ROLE` | Safe multisig | Update the PriceOracle reference |
| `UPGRADER_ROLE` | Timelock | Authorize UUPS upgrades — subject to 48h delay |

No deployer EOA holds any role on either Controller proxy.

### 4.2 ArcNSResolver (proxy)

| Role | Holder | Notes |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Safe multisig | Can grant and revoke all other roles |
| `ADMIN_ROLE` | Safe multisig | Grant and revoke `CONTROLLER_ROLE` |
| `UPGRADER_ROLE` | Timelock | Authorize UUPS upgrades — subject to 48h delay |
| `CONTROLLER_ROLE` | arcController proxy | Set addr records at registration time |
| `CONTROLLER_ROLE` | circleController proxy | Set addr records at registration time |
| `CONTROLLER_ROLE` | ReverseRegistrar | Set name records for reverse resolution |

No deployer EOA holds any role on the Resolver.

### 4.3 ArcNSBaseRegistrar (.arc and .circle)

Both BaseRegistrar contracts use OpenZeppelin `Ownable` (not AccessControl).

| Role | Holder | Notes |
|---|---|---|
| `owner()` | Safe multisig | Add/remove controllers, transfer ownership |
| `controllers` mapping | arcController proxy (for .arc), circleController proxy (for .circle) | Authorized to call `register*` and `renew` |

### 4.4 ArcNSPriceOracle

| Role | Holder | Notes |
|---|---|---|
| `owner()` | Safe multisig | Call `setPrices()` to update pricing tiers |

### 4.5 ArcNSReverseRegistrar

| Role | Holder | Notes |
|---|---|---|
| `owner()` | Safe multisig | Call `setDefaultResolver()` |

### 4.6 ArcNSRegistry

The Registry has no role-based access control. Authorization is purely node-based.

| Surface | Holder | Notes |
|---|---|---|
| Root node (`bytes32(0)`) owner | Safe multisig | Can assign TLD nodes |
| `.arc` TLD node owner | arcRegistrar contract | Can assign second-level `.arc` nodes |
| `.circle` TLD node owner | circleRegistrar contract | Can assign second-level `.circle` nodes |
| `addr.reverse` node owner | ReverseRegistrar contract | Can assign reverse subnodes |

### 4.7 ArcNSTimelock

| Role | Holder | Notes |
|---|---|---|
| `PROPOSER_ROLE` | Safe multisig | Can schedule operations |
| `EXECUTOR_ROLE` | Safe multisig | Can execute operations after delay |
| `CANCELLER_ROLE` | Safe multisig | Can cancel pending operations |
| `TIMELOCK_ADMIN_ROLE` | `address(0)` | No external admin. Self-administered. |

---

## 5. Upgrade Flow

Any upgrade to a UUPS proxy (arcController, circleController, resolver) follows this sequence:

```
Step 1: Safe multisig calls timelock.schedule(
            target  = proxy address,
            value   = 0,
            data    = abi.encodeCall(UUPSUpgradeable.upgradeToAndCall, (newImpl, "")),
            predecessor = bytes32(0),
            salt    = <chosen salt>,
            delay   = 172800  // 48 hours
        )
        Requires 2-of-3 Safe signatures.

Step 2: Wait 48 hours.
        During this window, the Safe can cancel the operation if needed.

Step 3: Safe multisig calls timelock.execute(
            target  = proxy address,
            value   = 0,
            data    = <same calldata as schedule>,
            predecessor = bytes32(0),
            salt    = <same salt>
        )
        Requires 2-of-3 Safe signatures.
        The proxy's _authorizeUpgrade check passes because msg.sender == timelock,
        and timelock holds UPGRADER_ROLE.
```

No single key can execute an upgrade. No upgrade can bypass the 48-hour delay.

---

## 6. Emergency Pause

The `PAUSER_ROLE` on both Controller proxies allows the Safe to pause `register` and `renew` immediately, without a timelock delay. This is intentional — emergency response must be faster than the upgrade delay.

Pause does not affect:
- Existing name ownership
- Resolver records
- Reverse records
- Renewals already in progress

Unpause also requires `PAUSER_ROLE` (Safe multisig).

---

## 7. What Is and Is Not Governance-Controlled

### Governance-controlled (requires Safe multisig)

- Upgrading any UUPS proxy (additionally requires Timelock 48h delay)
- Pausing or unpausing registration
- Updating the price oracle reference
- Updating pricing tiers
- Updating the treasury address
- Approving or revoking resolver addresses
- Updating the ReverseRegistrar reference on Controllers
- Updating the default resolver on ReverseRegistrar
- Adding or removing controllers on BaseRegistrars
- Granting or revoking `CONTROLLER_ROLE` on the Resolver
- Transferring ownership of any Ownable contract

### Not governance-controlled (permissionless)

- Registering a name (any address, subject to payment and commitment)
- Renewing a name (any address, subject to payment)
- Setting a reverse record via `setName` (any address, for their own address)
- Setting an addr record via `setAddr` (node owner or approved operator)
- Transferring an NFT (ERC-721 standard transfer)
- Calling `reclaim` (NFT owner or approved operator)
- Calling `setApprovalForAll` on the Registry (any address, for their own nodes)

---

## 8. Deferred Governance Items

| Item | Status | Reason |
|---|---|---|
| Treasury migration to multisig-controlled contract | Deferred | Out of scope for this pass. Treasury is currently an EOA. No contract security impact. |
| Timelock delay increase for mainnet | Deferred | 48h is appropriate for testnet. Mainnet should use 72h or longer. |

---

*End of ArcNS v3 Governance and Privilege Model*
