# ArcNS v3 — Upgrade Policy

---

## Upgradeable Contracts

| Contract | Pattern | Proxy address | Implementation address |
|----------|---------|--------------|----------------------|
| ArcNSController (.arc) | UUPS (EIP-1822) | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` |
| ArcNSController (.circle) | UUPS (EIP-1822) | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | `0x64b7494A0f1E9000ee1F2c28183dB314c9b7eeA6` |
| ArcNSResolver | UUPS (EIP-1822) | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | `0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3` |

**Rationale for upgradeability:**
- **Controller:** Registration logic may need post-audit fixes (pricing logic, commitment parameters, resolver allowlist management). The proxy address is what BaseRegistrar authorizes as a controller — upgrading the implementation does not require re-authorizing.
- **Resolver:** The v1 resolver exposes only `addr` and `name` (internal). Future versions will add text records, contenthash, and multicoin support. The proxy address is what the registry points to per-node — upgrading the implementation does not require re-pointing all nodes.

---

## Non-Upgradeable Contracts

| Contract | Rationale |
|----------|-----------|
| ArcNSRegistry | Ownership ledger immutability is a security property. The registry is the root of trust. Upgrading it would require migrating all node ownership records. |
| ArcNSBaseRegistrar (.arc, .circle) | ERC-721 token contract address must be stable. NFT ownership is tied to the contract address. Upgrading would break all existing token holders. |
| ArcNSPriceOracle | Price changes are made via `setPrices()` by the owner — no upgrade needed for pricing updates. |
| ArcNSReverseRegistrar | Reverse node ownership must be stable. The `addr.reverse` TLD node is owned by this contract in the registry. |

---

## Upgrade Authority

Upgrades are authorized by `UPGRADER_ROLE` on each upgradeable contract.

```
_authorizeUpgrade(address newImpl) internal override onlyRole(UPGRADER_ROLE)
```

**Current state (testnet):** `UPGRADER_ROLE` is held by the deployer EOA (`0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`).

**Mainnet requirement:** `UPGRADER_ROLE` must be held by a multisig with a time-lock. No upgrade should be executable by a single key.

---

## Upgrade Process

1. **Write and test the new implementation** — must not reorder or remove existing storage slots
2. **Verify storage layout compatibility** — use `@openzeppelin/upgrades-core` storage layout check
3. **Deploy the new implementation** (not the proxy)
4. **Call `upgradeToAndCall(newImpl, data)` on the proxy** — requires `UPGRADER_ROLE`
5. **Record the upgrade** in `deployments/arc_testnet-v3.json` under the `upgrades` array:
   ```json
   {
     "timestamp": "<ISO timestamp>",
     "contract": "arcController",
     "proxyAddress": "<proxy>",
     "oldImpl": "<old impl>",
     "newImpl": "<new impl>",
     "description": "Human-readable description"
   }
   ```
6. **Update `.openzeppelin/unknown-5042002.json`** — the OZ manifest is updated automatically by the upgrade script
7. **Commit both files** to the repository

---

## Storage Layout Rules

These rules are enforced by convention and must be verified before any upgrade:

1. **Never remove a storage variable** from an upgradeable contract
2. **Never reorder storage variables** — new variables must be appended after existing ones
3. **Use the `__gap` array** to reserve slots for future fields (both Controller and Resolver have `uint256[50] private __gap`)
4. **Inherited contract storage** must not change — do not change the inheritance order or add new inherited contracts that introduce storage

Violation of these rules will corrupt the proxy's storage and is not recoverable without a full migration.

---

## Current Upgrade History

```json
"upgrades": []
```

No upgrades have been performed since initial deployment on 2026-04-24.

---

## Testnet vs Mainnet Policy

| Aspect | Testnet (current) | Mainnet (required) |
|--------|------------------|-------------------|
| UPGRADER_ROLE holder | Deployer EOA | Multisig with time-lock |
| Upgrade approval | Single key | Multi-party approval |
| Time-lock | None | Minimum 48-hour delay recommended |
| Upgrade announcement | None required | Public announcement + audit of new impl |
| Storage layout check | Manual | Automated in CI |
