# ArcNS v3 — Audit Scope

**Prepared:** 2026-04-29  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Security migration complete. Timelock live. Ready for external audit engagement.

> This document is the audit scope summary. For the full audit preparation package, see `docs/audit/ARCNS_V3_AUDIT_PACKAGE.md`.

---

## In-Scope Contracts

All contracts are located under `contracts/v3/`.

| Contract | Source File | Role | Upgradeability |
|----------|-------------|------|----------------|
| ArcNSRegistry | `contracts/v3/registry/ArcNSRegistry.sol` | Central ownership ledger | Non-upgradeable |
| ArcNSBaseRegistrar (.arc) | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` | ERC-721 registrar for `.arc` | Non-upgradeable |
| ArcNSBaseRegistrar (.circle) | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` | ERC-721 registrar for `.circle` | Non-upgradeable |
| ArcNSController | `contracts/v3/controller/ArcNSController.sol` | Commit-reveal registration and renewal | UUPS proxy |
| ArcNSResolver | `contracts/v3/resolver/ArcNSResolver.sol` | Address and name records | UUPS proxy |
| ArcNSPriceOracle | `contracts/v3/registrar/ArcNSPriceOracle.sol` | USDC-denominated pricing | Non-upgradeable |
| ArcNSReverseRegistrar | `contracts/v3/registrar/ArcNSReverseRegistrar.sol` | Reverse resolution (`addr.reverse`) | Non-upgradeable |
| ArcNSTimelock | OpenZeppelin `TimelockController` v5 | Upgrade governance delay | Non-upgradeable |

All interfaces in `contracts/v3/interfaces/` are in scope as part of the contract review.

The two Controller instances (`.arc` and `.circle`) share a single implementation contract. The same applies to the two BaseRegistrar instances.

---

## Out-of-Scope Items

| Item | Reason |
|------|--------|
| `contracts/v3/mocks/` | Test infrastructure only. Not deployed to production. |
| `contracts/governance/ArcNSTreasury.sol` | Legacy v2 artifact. Not active in v3. |
| `contracts/` (non-v3 directory) | Legacy v2 contracts. Not active in v3. |
| `frontend/` | Off-chain application. Not a contract security concern. |
| `indexer/` | Off-chain subgraph. Not a contract security concern. |
| `scripts/` | Deployment scripts. Not in-scope unless directly relevant to a finding. |
| Treasury EOA (`0xbbDF5bC7D63B1b7223556d4899905d56589A682d`) | Currently an EOA. Treasury contract migration is deferred. |
| MockUSDC (`0x3600000000000000000000000000000000000000`) | Testnet stand-in. Not a production contract. |

---

## UUPS Upgradeable Surfaces

Three contracts are UUPS proxies. Upgrades require a 48-hour Timelock delay initiated by the 2-of-3 Safe multisig.

| Contract | Proxy | Implementation | `UPGRADER_ROLE` Holder |
|----------|-------|----------------|------------------------|
| ArcController | `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` | Timelock `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` |
| CircleController | `0x4CB0650847459d9BbDd5823cc6D320C900D883dA` | `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB` | Timelock `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` |
| ArcNSResolver | `0x4c3a2D4245346732CE498937fEAD6343e77Eb097` | `0x19Df0277A47da2CCa244a3702f3fC2B52F97A4a3` | Timelock `0x0f9d898D74f29c69cAD1a66918b41891E73e08f0` |

No upgrade can bypass the 48-hour delay. No single key can execute an upgrade.

---

## Roles and Privilege Model

### Safe Multisig (2-of-3)

Holds all operational privileged roles:

- `DEFAULT_ADMIN_ROLE`, `ADMIN_ROLE`, `PAUSER_ROLE`, `ORACLE_ROLE` on both Controller proxies
- `DEFAULT_ADMIN_ROLE`, `ADMIN_ROLE` on Resolver
- `owner()` on ArcBaseRegistrar, CircleBaseRegistrar, ReverseRegistrar, PriceOracle
- Root node owner on Registry
- Proposer, executor, canceller on Timelock

### Timelock

- `UPGRADER_ROLE` on ArcController, CircleController, Resolver

### Controller Proxies

- `CONTROLLER_ROLE` on Resolver (for setting addr records at registration time)

### ReverseRegistrar

- `CONTROLLER_ROLE` on Resolver (for setting name records for reverse resolution)

### Deployer EOA

- **No privileged roles.** All roles revoked or transferred as of 2026-04-29.

---

## Treasury

| Field | Value |
|-------|-------|
| Address | `0xbbDF5bC7D63B1b7223556d4899905d56589A682d` |
| Type | EOA |
| Role | Receives all USDC registration and renewal fees |
| Security note | A compromised treasury key results in loss of collected fees only. It does not affect name ownership, resolution, or any contract state. Treasury address is a parameter updatable by the Safe via `setTreasury`. |

---

## PriceOracle

| Field | Value |
|-------|-------|
| Address | `0xde9b95B560f5e803f5Cc045f27285F0226913548` |
| Owner | Safe multisig |
| Pricing | USDC-denominated, length-based tiers, linear premium decay for recently expired names |
| Update | `setPrices()` callable by owner (Safe multisig) only |

---

## Key Protocol Invariants

1. **Name ownership integrity** — The ERC-721 NFT owner is the only party who can transfer the NFT or call `reclaim`.
2. **Registration exclusivity** — A name that is not available cannot be registered by any party.
3. **Payment integrity** — Every successful registration and renewal transfers exactly the oracle-quoted price in USDC to the treasury.
4. **Commitment binding** — A commitment can only be used once and binds to the specific `msg.sender`.
5. **Upgrade authorization** — No upgrade to any UUPS proxy can execute without a 48-hour Timelock delay initiated by the 2-of-3 Safe.
6. **Reverse record ownership** — Only the address itself, or the current registry owner of its reverse node, can call `claimWithResolver`.
7. **Role separation** — `UPGRADER_ROLE` is held exclusively by the Timelock. All other operational roles are held by the Safe. No deployer EOA holds any privileged role.

---

## Known Assumptions and Non-Goals

- **MockUSDC** is a testnet stand-in. On mainnet, a real USDC contract will be used. The protocol assumes the payment token is a standard ERC-20.
- **Treasury is an EOA** on testnet. This is a known operational gap, not a contract security issue.
- **No reentrancy adversarial tests** are present. The reentrancy guard is implemented correctly in the contract. This is a testing gap, not a code defect.
- **No automated UUPS storage layout verification in CI.** The storage layout is documented and manually verified. This is a CI gap, not a code defect.
- **`tokenURI` shows labelhash hex**, not plaintext label. This is a known metadata limitation, not a security issue.

---

## Supporting Documents

| Document | Location |
|----------|----------|
| Full audit preparation package | `docs/audit/ARCNS_V3_AUDIT_PACKAGE.md` |
| Deployment inventory | `docs/audit/ARCNS_V3_DEPLOYMENT_INVENTORY.md` |
| Governance and privilege model | `docs/audit/ARCNS_V3_GOVERNANCE_AND_PRIVILEGE_MODEL.md` |
| Intentional design decisions | `docs/audit/ARCNS_V3_INTENTIONAL_DESIGN_DECISIONS.md` |
| Known limitations and out-of-scope | `docs/audit/ARCNS_V3_KNOWN_LIMITATIONS_AND_OUT_OF_SCOPE.md` |
| Threat model summary | [THREAT_MODEL_SUMMARY.md](THREAT_MODEL_SUMMARY.md) |
| Upgrade policy | [UPGRADE_POLICY.md](UPGRADE_POLICY.md) |
| Role permission matrix | [ROLE_PERMISSION_MATRIX.md](ROLE_PERMISSION_MATRIX.md) |
