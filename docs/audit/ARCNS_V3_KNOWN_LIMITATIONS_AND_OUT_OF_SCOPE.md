# ArcNS v3 — Known Limitations and Out-of-Scope Items

**Purpose:** This document states what is outside the current audit scope, what remains as non-blocking backlog, and what is intentionally deferred. It distinguishes contract security issues from product polish and operational gaps.

---

## 1. Classification

Items in this document fall into one of four categories:

| Category | Meaning |
|---|---|
| **Deferred — Operational** | A known gap in operational security posture. Not a contract code defect. Planned for a future pass. |
| **Deferred — Product** | A user experience or product feature gap. No contract security impact. |
| **Out of Scope** | Explicitly excluded from this audit. Either not a contract, not active in v3, or a separate engagement. |
| **Pre-Mainnet Requirement** | Must be addressed before mainnet deployment. Not a blocker for testnet operation or this audit. |

---

## 2. Deferred — Operational

### 2.1 Treasury Migration

| Field | Detail |
|---|---|
| Description | The treasury address (`0xbbDF5bC7D63B1b7223556d4899905d56589A682d`) is currently an EOA. All USDC registration and renewal fees are sent to this address. |
| Security Impact | A compromised treasury EOA key results in loss of collected fees. It does not affect name ownership, resolution, or any contract state. |
| Contract Impact | None. The treasury address is a parameter in the Controller. It can be updated via `setTreasury` (requires `ADMIN_ROLE`, held by Safe multisig). |
| Status | Deferred by design. Treasury migration to a multisig-controlled contract is planned as a separate pass after the current audit. |
| Blocker? | No. This is a pre-mainnet operational requirement, not a contract security issue and not a blocker for this audit. |

### 2.2 Timelock Delay — Mainnet Increase

| Field | Detail |
|---|---|
| Description | The current Timelock delay is 48 hours (172,800 seconds). For mainnet, a longer delay (72 hours or more) is recommended. |
| Security Impact | A shorter delay reduces the window for the community to detect and react to a malicious upgrade. 48 hours is appropriate for testnet. |
| Contract Impact | None. The delay is a Timelock parameter. Changing it requires a Timelock operation (subject to the current delay). |
| Status | Deferred. Will be addressed before mainnet deployment. |
| Blocker? | No. |

### 2.3 Test Suite Gaps

| Field | Detail |
|---|---|
| Description | Two test categories are not present: (1) reentrancy adversarial tests for the Controller, and (2) automated UUPS storage layout verification in CI. |
| Security Impact | These are testing gaps, not code defects. The reentrancy guard is implemented correctly in the contract. The storage layout is documented and manually verified. |
| Status | Pre-mainnet requirement. Not a blocker for this audit. |
| Blocker? | No. |

---

## 3. Deferred — Product

### 3.1 FlowPay Zero-Address UX Fix

| Field | Detail |
|---|---|
| Description | When a user attempts to pay with an uninitialized or zero-address wallet in the frontend, the error message is not user-friendly. |
| Security Impact | None. This is a frontend display issue. No contract state is affected. |
| Contract Impact | None. |
| Status | Frontend-only fix. Deferred to a UX polish pass. |
| Blocker? | No. |

### 3.2 `tokenURI` Shows Labelhash Hex, Not Plaintext Name

| Field | Detail |
|---|---|
| Description | `ArcNSBaseRegistrar.tokenURI` displays the labelhash as a hex string (e.g., `0x3f5aa...`) rather than the plaintext label (e.g., `alice`). This is because only the labelhash is stored on-chain. |
| Security Impact | None. This is a metadata display limitation. |
| Contract Impact | Storing plaintext labels on-chain would require a storage layout change and a new contract version. |
| Status | Known limitation. Documented in contract NatDoc. Planned for a future upgrade. |
| Blocker? | No. |

### 3.3 No `NameExpired` Event for Grace Period Indexing

| Field | Detail |
|---|---|
| Description | There is no event emitted when a name enters its 90-day grace period. Indexers must infer grace period status from `nameExpires[tokenId]` and the current block timestamp. |
| Security Impact | None. |
| Contract Impact | Adding this event would require a contract upgrade. |
| Status | Known limitation. Planned for a future upgrade. |
| Blocker? | No. |

---

## 4. Out of Scope

### 4.1 Legacy v2 Contracts

| Field | Detail |
|---|---|
| Contracts | All files under `contracts/` (non-v3 directory): `ArcNSRegistry.sol`, `ArcNSBaseRegistrar.sol`, `ArcNSRegistrarController.sol`, `ArcNSReverseRegistrar.sol`, `ArcNSResolver.sol`, `ArcNSResolverV2.sol`, `ArcNSPriceOracle.sol`, `ArcNSPriceOracleV2.sol`, `ArcNSRegistrarControllerV2.sol` |
| Reason | These are v2 contracts. They are not active in the v3 deployment. They are retained in the repository for historical reference only. |

### 4.2 Mock Contracts

| Field | Detail |
|---|---|
| Contracts | `contracts/v3/mocks/ArcNSControllerV2Mock.sol`, `contracts/v3/mocks/ArcNSResolverV2Mock.sol`, `contracts/v3/mocks/MockUSDC.sol` |
| Reason | Test infrastructure only. Not deployed to production. |

### 4.3 ArcNSTreasury.sol (Legacy)

| Field | Detail |
|---|---|
| Contract | `contracts/governance/ArcNSTreasury.sol` |
| Reason | Legacy v2 governance artifact. Not active in v3. The v3 treasury is currently an EOA. |

### 4.4 Frontend Application

| Field | Detail |
|---|---|
| Scope | `frontend/` directory |
| Reason | Off-chain application. Not a contract security concern. Frontend security is a separate engagement. |

### 4.5 Subgraph / Indexer

| Field | Detail |
|---|---|
| Scope | `indexer/` directory, `subgraph.yaml`, `schema.graphql` |
| Reason | Off-chain data indexing. Not a contract security concern. |

### 4.6 Deployment and Migration Scripts

| Field | Detail |
|---|---|
| Scope | `scripts/` directory |
| Reason | Deployment scripts are not in-scope unless a specific script behavior is directly relevant to a contract finding. The scripts have already been executed; the resulting on-chain state is what matters. |

### 4.7 MockUSDC

| Field | Detail |
|---|---|
| Address | `0x3600000000000000000000000000000000000000` |
| Reason | Testnet stand-in for USDC. Not a production contract. On mainnet, a real USDC contract will be used. |

---

## 5. Pre-Mainnet Requirements (Not Audit Blockers)

The following items must be addressed before a responsible mainnet deployment. They are not blockers for this testnet audit.

| Item | Type | Notes |
|---|---|---|
| Treasury migration to multisig-controlled contract | Operational | Planned for a dedicated pass |
| Timelock delay increase (72h+ for mainnet) | Operational | Requires Timelock operation |
| Reentrancy adversarial test suite | Testing | No code defect; testing gap only |
| UUPS storage layout verification in CI | Testing | No code defect; CI gap only |
| External security audit completion | Process | This engagement |
| Mainnet USDC address configuration | Operational | Replace MockUSDC with real USDC |

---

## 6. Items That Are Fixed and Should Not Appear as Open

The following items were identified in prior internal review and have been resolved. They should not be listed as open findings.

| Item | Resolution |
|---|---|
| `claimWithResolver` — no caller authorization check | Fixed in current deployment. Authorization guard added: `msg.sender == addr_` or `msg.sender == registry.owner(node(addr_))`. |
| `ArcNSController.initialize` — missing zero-address checks | Fixed in current deployment. All 8 address parameters are now validated. |
| Single deployer EOA holds all privileged roles | Resolved. All roles transferred to Safe multisig or Timelock. Deployer EOA holds no privileged roles. |
| No upgrade timelock | Resolved. Timelock deployed and `UPGRADER_ROLE` migrated to Timelock on all three upgradeable contracts. |
| `addr.reverse` node owned by old ReverseRegistrar | Resolved. Node transferred to new ReverseRegistrar during security migration. |
| `CONTROLLER_ROLE` on Resolver held by old ReverseRegistrar | Resolved. Role revoked from old, granted to new ReverseRegistrar. |

---

*End of ArcNS v3 Known Limitations and Out-of-Scope Items*
