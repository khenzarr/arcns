# ArcNS v3 — Upgrade Policy

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)

---

## Upgradeable vs Non-Upgradeable

### Non-Upgradeable Contracts

These contracts are deployed as standalone contracts with no upgrade mechanism:

| Contract | Rationale |
|----------|-----------|
| ArcNSRegistry | Ownership ledger. Upgradeability would undermine trust in name ownership records. |
| ArcBaseRegistrar | ERC-721 NFT contract. Upgradeability would undermine trust in NFT ownership. |
| CircleBaseRegistrar | Same rationale as ArcBaseRegistrar. |
| ArcNSPriceOracle | Pricing logic. Non-upgradeable for predictability; price tiers are configurable via `setPrices()`. |
| ArcNSReverseRegistrar | Reverse resolution. Non-upgradeable for stability of the `addr.reverse` namespace. |
| ArcNSTimelock | Standard OZ TimelockController. No custom logic; no upgrade needed. |

### UUPS Upgradeable Contracts

These contracts are deployed as UUPS proxies (EIP-1822):

| Contract | Rationale |
|----------|-----------|
| ArcNSController | Registration logic may need to evolve (new payment methods, registration rules, etc.). |
| ArcNSResolver | Resolver feature set will expand (text records, contenthash, multi-coin addresses). |

---

## Upgrade Authorization

All upgrades to UUPS proxies require:

1. **2-of-3 Safe multisig** schedules the upgrade via the Timelock
2. **48-hour delay** enforced by the Timelock
3. **2-of-3 Safe multisig** executes the upgrade after the delay

No single key can execute an upgrade. No upgrade can bypass the 48-hour delay.

### Upgrade Flow

```
Step 1: Safe calls timelock.schedule(
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

Step 3: Safe calls timelock.execute(
            target  = proxy address,
            value   = 0,
            data    = <same calldata as schedule>,
            predecessor = bytes32(0),
            salt    = <same salt>
        )
        Requires 2-of-3 Safe signatures.
```

---

## Storage Layout Safety

UUPS upgrades must preserve the storage layout of the proxy. Adding new storage variables is safe if they are appended after existing variables. Reordering or removing variables is not safe.

The current storage layout for each upgradeable contract is documented in `docs/design/storage-upgrade-model.md`.

Before any upgrade:
1. Review the new implementation's storage layout against the current layout
2. Verify no existing slots are reordered or removed
3. Verify the `_authorizeUpgrade` function is correctly gated

---

## Emergency Pause

The `PAUSER_ROLE` on both Controller proxies allows the Safe to pause `register` and `renew` immediately, without a Timelock delay. This is intentional — emergency response must be faster than the upgrade delay.

Pause does not affect:
- Existing name ownership
- Resolver records
- Reverse records
- Renewals already in progress

Unpause also requires `PAUSER_ROLE` (Safe multisig).

---

## Mainnet Upgrade Policy Additions

Before mainnet, the following upgrade policy items should be addressed:

- Increase Timelock delay to 72h+ (requires a Timelock operation subject to the current 48h delay)
- Establish a public process for announcing scheduled upgrades
- Establish a monitoring process for detecting unauthorized Timelock operations
- Document the storage layout verification process in CI
