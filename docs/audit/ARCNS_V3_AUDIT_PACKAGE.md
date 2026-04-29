# ArcNS v3 — External Audit Preparation Package

**Prepared:** 2026-04-29  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Protocol Version:** v3  
**Status:** Security migration complete. Timelock live. Ready for external audit engagement.

---

## 1. Purpose of This Document

This document is the primary entry point for an external audit firm receiving the ArcNS v3 codebase. It provides orientation, scope definition, and pointers to the supporting documents in this package. It is written for a reader who has no prior knowledge of ArcNS.

---

## 2. What ArcNS Is

ArcNS (Arc Name Service) is a decentralized naming protocol deployed on Arc Testnet. It maps human-readable names ending in `.arc` or `.circle` to EVM addresses. Names are owned as ERC-721 NFTs, paid for in USDC, and subject to annual rent with a 90-day grace period after expiry.

The protocol is modeled on the ENS (Ethereum Name Service) architecture but is an independent implementation. It is not a fork of ENS contracts. It shares the EIP-137 namehash scheme and the EIP-181 reverse resolution pattern, but all contracts are written from scratch.

---

## 3. Audit Scope

### 3.1 In-Scope Contracts

All contracts are located under `contracts/v3/`.

| Contract | Source File | Role |
|---|---|---|
| ArcNSRegistry | `contracts/v3/registry/ArcNSRegistry.sol` | Root ownership ledger |
| ArcNSBaseRegistrar (.arc) | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` | ERC-721 registrar for `.arc` |
| ArcNSBaseRegistrar (.circle) | `contracts/v3/registrar/ArcNSBaseRegistrar.sol` | ERC-721 registrar for `.circle` |
| ArcNSController | `contracts/v3/controller/ArcNSController.sol` | UUPS proxy — registration orchestrator |
| ArcNSResolver | `contracts/v3/resolver/ArcNSResolver.sol` | UUPS proxy — address and name records |
| ArcNSPriceOracle | `contracts/v3/registrar/ArcNSPriceOracle.sol` | USDC-denominated pricing |
| ArcNSReverseRegistrar | `contracts/v3/registrar/ArcNSReverseRegistrar.sol` | Reverse resolution (`addr.reverse`) |
| ArcNSTimelock | OpenZeppelin `TimelockController` v5 | Upgrade governance delay |

The two Controller instances (.arc and .circle) share a single implementation contract. The same applies to the two BaseRegistrar instances. The Resolver has one proxy and one implementation.

### 3.2 Interfaces

All interfaces are in `contracts/v3/interfaces/`. They define the external surface of each contract and are in scope as part of the contract review.

### 3.3 Out-of-Scope Items

The following are explicitly out of scope for this audit:

| Item | Reason |
|---|---|
| `contracts/v3/mocks/` | Test infrastructure only. Not deployed to production. |
| `contracts/governance/ArcNSTreasury.sol` | Legacy v2 artifact. Not active in v3. |
| `contracts/` (non-v3 directory) | Legacy v2 contracts. Not active in v3. |
| `frontend/` | Off-chain application. Not a contract security concern. |
| `indexer/` | Off-chain subgraph. Not a contract security concern. |
| `scripts/` | Deployment and migration scripts. Not in-scope unless a specific script behavior is relevant to a finding. |
| Treasury EOA (`0xbbDF5bC7D63B1b7223556d4899905d56589A682d`) | Currently an EOA. Treasury contract migration is deferred. |
| MockUSDC (`0x3600000000000000000000000000000000000000`) | Testnet stand-in. Not a production contract. |

---

## 4. Supporting Documents in This Package

| Document | Contents |
|---|---|
| `ARCNS_V3_DEPLOYMENT_INVENTORY.md` | Live contract addresses, proxy/implementation relationships, upgrade history, verification status |
| `ARCNS_V3_GOVERNANCE_AND_PRIVILEGE_MODEL.md` | Role assignments, multisig configuration, timelock parameters, upgrade flow |
| `ARCNS_V3_INTENTIONAL_DESIGN_DECISIONS.md` | Documented intentional behaviors that may appear anomalous to a generic scanner |
| `ARCNS_V3_KNOWN_LIMITATIONS_AND_OUT_OF_SCOPE.md` | Non-blocking backlog items, deferred work, and items explicitly outside audit scope |

---

## 5. Protocol State at Audit Handoff

### 5.1 What Has Been Completed

- Full v3 contract suite deployed and operational on Arc Testnet
- Security migration completed:
  - `ArcNSReverseRegistrar` redeployed with `claimWithResolver` authorization fix
  - `ArcNSController` upgraded with `initialize` zero-address validation fix
  - `addr.reverse` registry node transferred to new ReverseRegistrar
  - `CONTROLLER_ROLE` on Resolver re-granted to new ReverseRegistrar, revoked from old
  - Both Controller proxies updated to point to new ReverseRegistrar
- Multisig (2-of-3 Safe) deployed and operational
- All deployer EOA privileged roles revoked or transferred to Safe
- Timelock (OpenZeppelin `TimelockController`, 48-hour delay) deployed
- `UPGRADER_ROLE` on all three upgradeable contracts (arcController, circleController, resolver) migrated from Safe to Timelock
- Primary name and receiving address flow verified end-to-end
- Tier-2 hardening completed (see design decisions document)

### 5.2 What Is Not Yet Done (and Why It Is Not a Blocker)

- Treasury migration to a multisig-controlled contract: deferred by design. The treasury is currently an EOA. This is a known, documented operational gap. It does not affect contract security.
- Mainnet deployment: not yet planned. This audit is for the testnet deployment.
- External audit: this package is the prerequisite for that engagement.

---

## 6. Key Protocol Invariants

The following invariants should hold at all times and are the primary correctness properties for this protocol:

1. **Name ownership integrity**: The ERC-721 NFT owner of a name is the only party who can transfer the NFT or call `reclaim`. Registry ownership of the corresponding node may differ (see design decisions document).

2. **Registration exclusivity**: A name that is not available (not expired past grace period) cannot be registered by any party.

3. **Payment integrity**: Every successful registration and renewal transfers exactly the oracle-quoted price in USDC to the treasury. No registration succeeds without payment.

4. **Commitment binding**: A commitment can only be used once. A commitment binds to the specific `msg.sender` who submitted it, preventing front-running.

5. **Upgrade authorization**: No upgrade to any UUPS proxy can be executed without a 48-hour timelock delay, initiated by the 2-of-3 Safe multisig.

6. **Reverse record ownership**: Only the address itself, or the current registry owner of its reverse node, can call `claimWithResolver` to change the reverse node's owner or resolver.

7. **Role separation**: `UPGRADER_ROLE` is held exclusively by the Timelock. All other operational roles are held by the Safe multisig. No deployer EOA holds any privileged role.

---

## 7. Recommended Audit Focus Areas

In priority order:

1. **UUPS upgrade path**: Verify that `_authorizeUpgrade` is correctly gated and that the Timelock integration provides the intended delay guarantee. Verify storage layout safety across the current implementation.

2. **Registration flow**: Verify the commit-reveal scheme, payment handling, and the interaction between Controller, BaseRegistrar, Resolver, and ReverseRegistrar.

3. **Reverse registration flows**: Two distinct flows exist — registration-time (Controller try/catch) and dashboard-driven (direct user call). Verify both are correctly isolated and that the authorization model is sound.

4. **Role model**: Verify that the current role assignments match the documented governance model and that no unintended privilege escalation paths exist.

5. **Registry node ownership**: Verify that TLD node ownership is correctly assigned and that no path allows unauthorized reassignment of name ownership.

6. **BaseRegistrar reclaim**: Verify the NFT/registry ownership divergence behavior is correctly bounded and cannot be exploited.

7. **PriceOracle**: Verify the premium decay calculation and that the pricing formula cannot be manipulated to produce zero-cost registrations.

---

## 8. Codebase Navigation

```
contracts/v3/
├── registry/
│   └── ArcNSRegistry.sol          — non-upgradeable, start here
├── registrar/
│   ├── ArcNSBaseRegistrar.sol     — non-upgradeable ERC-721
│   ├── ArcNSPriceOracle.sol       — non-upgradeable, Ownable
│   └── ArcNSReverseRegistrar.sol  — non-upgradeable, Ownable
├── controller/
│   └── ArcNSController.sol        — UUPS upgradeable
├── resolver/
│   └── ArcNSResolver.sol          — UUPS upgradeable
├── governance/
│   └── ArcNSTimelock.sol          — OpenZeppelin TimelockController (no custom logic)
└── interfaces/
    ├── IArcNSRegistry.sol
    ├── IArcNSBaseRegistrar.sol
    ├── IArcNSController.sol
    ├── IArcNSResolver.sol
    ├── IArcNSReverseRegistrar.sol
    └── IArcNSPriceOracle.sol
```

The recommended reading order is: Registry → BaseRegistrar → PriceOracle → ReverseRegistrar → Controller → Resolver → Timelock.

---

## 9. Test Suite

Tests are located in `test/` and `tests/`. The test suite covers the primary registration and renewal flows. Known gaps:

- Reentrancy adversarial tests are not present (pre-mainnet item)
- UUPS storage layout verification is not automated in CI (pre-mainnet item)

These gaps are documented and do not affect the correctness of the contracts themselves.

---

## 10. Prior Internal Review

An internal security review was conducted prior to this audit preparation pass. The findings and their dispositions are documented in:

- `docs/final/ARCNS_V3_SOLIDITYSCAN_TRIAGE.md` — full triage of automated scanner findings
- `docs/final/ARCNS_V3_POSTFIX_COMPATIBILITY_AND_SECURITY_CLOSURE.md` — post-fix compatibility verification

Both documents are provided for auditor reference. They are internal working documents, not external audit reports.

---

*End of ArcNS v3 Audit Preparation Package*
