# ArcNS Timelock Design

## Status: PREPARED — not yet executed

## Overview

The timelock adds a mandatory delay between when an upgrade is scheduled and when it can be executed. This gives the community and stakeholders time to review and react to proposed changes before they take effect.

## Implementation

- **Contract**: OpenZeppelin `TimelockController` (v5, from `@openzeppelin/contracts ^5.6.1`)
- **No custom contract required** — OZ TimelockController is used directly
- **Deployment script**: `scripts/v3/deployTimelock.js`

## Governance Model

| Parameter | Value |
|---|---|
| Delay | 48 hours (172800 seconds) |
| Proposer | Safe `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Executor | Safe `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` |
| Canceller | Safe (implicit — proposers are cancellers in OZ v5) |
| Admin | `address(0)` — self-administered from deployment |

### Why these parameters

- **48h delay**: Meaningful protection against malicious upgrades. Short enough to not block legitimate operations on testnet. Should be increased to 72h+ on mainnet.
- **Proposer = Safe**: Only the 2-of-3 multisig can schedule operations. No single key can queue an upgrade.
- **Executor = Safe**: Only the 2-of-3 multisig can execute after the delay. Prevents a third party from executing a queued operation.
- **Admin = address(0)**: The timelock is self-administered from deployment. No external admin key can bypass the delay.
- **No separate guardian**: Safe already acts as canceller. A separate guardian role is not needed at this stage.

## Target Inventory

### Roles that move to timelock

| Contract | Role | Current Holder | New Holder |
|---|---|---|---|
| arcController | UPGRADER_ROLE | Safe | Timelock |
| circleController | UPGRADER_ROLE | Safe | Timelock |
| resolver | UPGRADER_ROLE | Safe | Timelock |

### Roles that stay on Safe

| Contract | Role | Reason |
|---|---|---|
| arcController | DEFAULT_ADMIN_ROLE | Admin authority for role management |
| arcController | ADMIN_ROLE | Operational config (fees, settings) |
| arcController | ORACLE_ROLE | Price oracle updates must be fast |
| arcController | PAUSER_ROLE | Emergency pause must be immediate |
| circleController | DEFAULT_ADMIN_ROLE | Same |
| circleController | ADMIN_ROLE | Same |
| circleController | ORACLE_ROLE | Same |
| circleController | PAUSER_ROLE | Same |
| resolver | DEFAULT_ADMIN_ROLE | Same |
| resolver | ADMIN_ROLE | Same |
| arcRegistrar | owner() | Registrar ownership |
| circleRegistrar | owner() | Registrar ownership |
| reverseRegistrar | owner() | Registrar ownership |
| priceOracle | owner() | Oracle config |
| registry | root node owner | TLD creation authority |

### Deferred

| Contract | Reason |
|---|---|
| treasury | Out of scope — no timelock deployed yet. Migrate in a dedicated pass after timelock is live. |

## Execution Plan

### Pre-checks (before running deployTimelock.js)

- [ ] `arcController.ORACLE_ROLE` revoke from deployer is confirmed (via `revokeOracleRoleViaSafe.js`)
- [ ] Safe is operational (threshold 2-of-3 confirmed)
- [ ] All 3 Safe owners have keys available for signing
- [ ] Deployer EOA has gas on Arc Testnet

### Step 1 — Deploy timelock (no role migration)

```powershell
npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet
```

Verify on ArcScan:
- Timelock address is in deployment file
- Safe is proposer, executor, canceller
- No external admin

### Step 2 — Migrate UPGRADER_ROLE (separate deliberate step)

```powershell
$env:SAFE_OWNER_KEY_1="0xKEY1"
$env:SAFE_OWNER_KEY_2="0xKEY2"
$env:MIGRATE_UPGRADER_ROLE="1"
npx hardhat run scripts/v3/deployTimelock.js --network arc_testnet
```

This executes 6 Safe multisig transactions:
1. arcController.grantRole(UPGRADER_ROLE, timelock)
2. circleController.grantRole(UPGRADER_ROLE, timelock)
3. resolver.grantRole(UPGRADER_ROLE, timelock)
4. arcController.revokeRole(UPGRADER_ROLE, Safe)
5. circleController.revokeRole(UPGRADER_ROLE, Safe)
6. resolver.revokeRole(UPGRADER_ROLE, Safe)

### Post-checks

- [ ] timelock holds UPGRADER_ROLE on arcController
- [ ] timelock holds UPGRADER_ROLE on circleController
- [ ] timelock holds UPGRADER_ROLE on resolver
- [ ] Safe does NOT hold UPGRADER_ROLE on any of the above
- [ ] Safe still holds DEFAULT_ADMIN_ROLE, ADMIN_ROLE, ORACLE_ROLE, PAUSER_ROLE on controllers
- [ ] Deployment file updated with timelock migration record

### Rollback / failure notes

- If a grant succeeds but the corresponding revoke fails: Safe still holds UPGRADER_ROLE alongside timelock. This is safe — no upgrade authority is lost. Re-run with MIGRATE_UPGRADER_ROLE=1 to retry the revoke.
- If a grant fails: No change to UPGRADER_ROLE holders. Re-run to retry.
- The script is idempotent — it skips already-completed steps.

## How to execute an upgrade after timelock is live

```
1. Safe calls: timelock.schedule(proxy, 0, upgradeCalldata, predecessor, salt, delay)
2. Wait 48 hours
3. Safe calls: timelock.execute(proxy, 0, upgradeCalldata, predecessor, salt)
```

The upgrade calldata is the ABI-encoded call to `upgradeTo(newImpl)` or `upgradeToAndCall(newImpl, data)` on the proxy.

## Separation of concerns

| Phase | Status |
|---|---|
| Multisig migration (Safe deployment + role migration) | COMPLETE (pending ORACLE_ROLE residual revoke) |
| Timelock design | LOCKED (this document) |
| Timelock deployment | PREPARED — not yet executed |
| UPGRADER_ROLE migration to timelock | PREPARED — not yet executed |
| Treasury migration | DEFERRED — separate pass after timelock is live |
