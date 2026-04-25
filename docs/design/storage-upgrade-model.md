# ArcNS v3 — Storage & Upgrade Model

---

## Proxy Pattern Decision: UUPS vs Transparent

ArcNS v3 uses **UUPS (EIP-1822)** proxies for all upgradeable contracts (Controller, Resolver).

**Rationale for UUPS over Transparent Proxy**:

| Concern | UUPS | Transparent |
|---------|------|-------------|
| Upgrade authorization | In implementation (`_authorizeUpgrade`) | In proxy admin contract |
| Gas cost (calls) | Lower — no admin check on every call | Higher — proxy checks caller on every call |
| Accidental upgrade | Prevented by `UPGRADER_ROLE` in impl | Prevented by ProxyAdmin ownership |
| Brick risk | Higher — broken impl can lock upgrade | Lower — ProxyAdmin always accessible |
| OpenZeppelin support | `UUPSUpgradeable` (OZ v5) | `TransparentUpgradeableProxy` (OZ v5) |
| Storage layout | Implementation owns all slots | ProxyAdmin owns admin slot |

UUPS is chosen because:
1. It is the OpenZeppelin-recommended pattern for new deployments as of OZ v5.
2. The `UPGRADER_ROLE` in the implementation provides equivalent access control to a ProxyAdmin.
3. Lower per-call gas overhead matters for a high-frequency read contract like the Resolver.
4. The brick risk is mitigated by the multi-sig holding `UPGRADER_ROLE` and the requirement to test
   upgrades on a fork before mainnet execution.

---

## Upgradeable Contracts

### ArcNSController Storage Layout

The Controller uses OpenZeppelin upgradeable base contracts. Slot assignments follow OZ's deterministic
layout. The `__gap` array reserves 50 slots for future fields without colliding with base contract slots.

```
Slot 0:   _initialized / _initializing  (Initializable)
Slot 1:   _roles mapping                (AccessControlUpgradeable)
Slot 2:   _paused                       (PausableUpgradeable)
Slot 3:   _reentrancyStatus             (storage-based reentrancy guard)
Slot 4:   base                          (ArcNSBaseRegistrar address)
Slot 5:   priceOracle                   (IArcNSPriceOracle address)
Slot 6:   usdc                          (IERC20 address)
Slot 7:   registry                      (IArcNSRegistry address)
Slot 8:   resolver                      (ArcNSResolver address)
Slot 9:   reverseRegistrar              (IArcNSReverseRegistrar address)
Slot 10:  treasury                      (address)
Slot 11:  commitments                   (mapping bytes32 => uint256)
Slot 12:  usedCommitments               (mapping bytes32 => bool)
Slot 13:  approvedResolvers             (mapping address => bool)
Slots 14–63: __gap[50]                  (reserved for future fields)
```

**UUPS implementation slot** (ERC-1967): `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
This slot is in the proxy's storage, not the implementation's sequential layout.

**Rules for future upgrades**:
- Never remove or reorder existing storage variables.
- New fields must be appended before `__gap` and the gap size reduced accordingly.
- If a new field requires initialization, use a `reinitializer(N)` function.
- Document every storage change in the upgrade entry in `deployments/arc_testnet-v3.json`.

---

### ArcNSResolver v1 Storage Layout

The Resolver is designed for future expansion. Slots for text, contenthash, multicoin, and name records
are allocated now to prevent collisions when the implementation is upgraded. However, **no public
functions for these record types exist in v1** — the slots are reserved but silent.

```
Slot 0:   _initialized / _initializing  (Initializable)
Slot 1:   _roles mapping                (AccessControlUpgradeable)
Slot 2:   (UUPSUpgradeable — no additional slots)
Slot 3:   registry                      (IArcNSRegistry address)
Slot 4:   _addresses                    (mapping bytes32 => mapping uint256 => bytes)
           — coin type 60 (EVM addr) ACTIVE in v1
           — other coin types: slot allocated, no public functions in v1
Slot 5:   _texts                        (mapping bytes32 => mapping string => string)
           — RESERVED: slot allocated, no public functions in v1
Slot 6:   _contenthashes                (mapping bytes32 => bytes)
           — RESERVED: slot allocated, no public functions in v1
Slot 7:   _names                        (mapping bytes32 => string)
           — INTERNAL ONLY in v1: written by ReverseRegistrar via CONTROLLER_ROLE
           — no public setText/name getter in v1
Slots 8–57: __gap[50]                   (reserved for future record types)
```

**v1 active public interface**: `setAddr(node, address)` and `addr(node)` only.

**v2 expansion plan** (no storage collision):
- `_texts` (slot 5): add `setText` / `text` public functions.
- `_contenthashes` (slot 6): add `setContenthash` / `contenthash` public functions.
- `_addresses` (slot 4): add multicoin setters/getters for coin types other than 60.
- `_names` (slot 7): promote to public `name(node)` getter and `setName` for general use.
- New record types beyond v2 consume slots from `__gap`.

---

## Non-Upgradeable Contracts

| Contract | Upgrade path | Rationale |
|----------|-------------|-----------|
| ArcNSRegistry | None — full migration required | Ownership ledger immutability is a security property |
| ArcNSBaseRegistrar (.arc) | None — new deployment + migration | ERC-721 token contract address must be stable |
| ArcNSBaseRegistrar (.circle) | None — new deployment + migration | Same as above |
| ArcNSPriceOracle | None — `setPrices()` for value changes | Pricing formula is simple; owner can update values |
| ArcNSReverseRegistrar | None — new deployment + migration | Reverse node ownership must be stable |

---

## Upgrade Policy

### Who Can Upgrade

Only addresses holding `UPGRADER_ROLE` on the respective implementation contract may authorize an
upgrade. In production, `UPGRADER_ROLE` is held by the deployer multisig.

```
Controller.UPGRADER_ROLE → deployer multisig
Resolver.UPGRADER_ROLE   → deployer multisig
```

### Upgrade Procedure

1. Deploy new implementation contract to Arc Testnet.
2. Verify implementation on block explorer.
3. Run `scripts/upgrade.js --contract <Controller|Resolver> --impl <newImplAddress>`.
4. Script calls `proxy.upgradeToAndCall(newImpl, initData)`.
5. Script appends upgrade entry to `deployments/arc_testnet-v3.json`.
6. Commit updated `deployments/arc_testnet-v3.json` and `.openzeppelin/unknown-5042002.json`.

### Deployment JSON Upgrade Entry Format

Each upgrade is recorded as an entry in the `upgrades` array of the deployment JSON:

```json
{
  "upgrades": [
    {
      "timestamp": "2026-01-01T00:00:00.000Z",
      "contract": "arcController",
      "proxyAddress": "0x...",
      "oldImpl": "0x...",
      "newImpl": "0x...",
      "description": "ArcNSController v1.1: fix commitment replay edge case in _validateCommitment"
    }
  ]
}
```

### OpenZeppelin Manifest

The `.openzeppelin/unknown-5042002.json` manifest is committed to the repository and versioned
alongside the deployment JSON. It records the proxy-implementation relationship and is required by
the OZ upgrade plugin to validate storage layout compatibility before executing an upgrade.

**It must never be listed in `.gitignore`.**

### Storage Layout Validation

Before any upgrade, run:
```bash
npx hardhat run scripts/check-storage-layout.js --network arc_testnet
```
This uses the OZ upgrades plugin to compare the new implementation's storage layout against the
manifest and fails if any incompatible changes are detected.

---

## Deployment JSON Format (Full Schema)

`deployments/arc_testnet-v3.json`:

```json
{
  "network": "arc_testnet",
  "chainId": 5042002,
  "version": "v3",
  "deployedAt": "<ISO timestamp>",
  "deployer": "<deployer EOA address>",
  "contracts": {
    "usdc":                "0x3600000000000000000000000000000000000000",
    "registry":            "<ArcNSRegistry address>",
    "resolver":            "<ArcNSResolver proxy address>",
    "resolverImpl":        "<ArcNSResolver implementation address>",
    "priceOracle":         "<ArcNSPriceOracle address>",
    "arcRegistrar":        "<ArcNSBaseRegistrar .arc address>",
    "circleRegistrar":     "<ArcNSBaseRegistrar .circle address>",
    "reverseRegistrar":    "<ArcNSReverseRegistrar address>",
    "treasury":            "<treasury address>",
    "arcController":       "<ArcNSController .arc proxy address>",
    "arcControllerImpl":   "<ArcNSController .arc implementation address>",
    "circleController":    "<ArcNSController .circle proxy address>",
    "circleControllerImpl":"<ArcNSController .circle implementation address>"
  },
  "namehashes": {
    "arc":    "0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae",
    "circle": "0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084"
  },
  "upgrades": []
}
```
