# ArcNS v3 — Threat Model Summary

**Status:** Testnet — no external audit completed  
**Scope:** v3 deployed contracts only

---

## Trust Boundaries

| Boundary | Trust level | Notes |
|----------|-------------|-------|
| Deployer EOA | Fully trusted | Holds all admin roles. Single point of failure on testnet. |
| ArcNSController | Trusted by BaseRegistrar | Added as controller via `addController()`. Can mint/transfer NFTs. |
| ArcNSReverseRegistrar | Trusted by Resolver | Holds CONTROLLER_ROLE. Can write name records for any node. |
| ArcNSResolver | Trusted by Registry | Resolver address is set per-node by the node owner. |
| USDC contract | Trusted as ERC-20 | Protocol depends on USDC not being paused or malicious. |
| Name registrant | Untrusted | Provides name string, owner address, duration, secret. |
| Treasury address | Trusted | Receives all USDC payments. Currently an EOA. |

---

## Protocol Invariants

These must hold at all times:

1. **Ownership integrity:** Only the current owner of a registry node (or an approved operator) can modify it.
2. **Registration exclusivity:** A name cannot be registered while it is active or within the grace period.
3. **Commitment binding:** A commitment hash binds to `(label, owner, duration, secret, resolver, reverseRecord, msg.sender)`. It cannot be replayed by a different sender.
4. **Commitment single-use:** Once a commitment is used in a successful `register()` call, it is permanently invalidated via `usedCommitments`.
5. **Payment integrity:** USDC is transferred to treasury before any state changes. `SafeERC20.safeTransferFrom` reverts on failure.
6. **Slippage protection:** `register()` and `renew()` revert if `cost > maxCost`.
7. **Reentrancy protection:** `register()` and `renew()` use a storage-based reentrancy guard.
8. **Resolver allowlist:** Only admin-approved resolver addresses can be used in `register()`.
9. **Reverse record non-blocking:** Reverse record failure in `register()` is silently swallowed — registration never reverts due to reverse record issues.
10. **Grace period:** Expired names cannot be re-registered until `nameExpires[id] + GRACE_PERIOD < block.timestamp` (90 days).

---

## Attacker Models

### 1. Front-Running Attacker
**Goal:** Steal a registration by observing a pending `register()` tx and submitting their own first.  
**Mitigation:** Commit-reveal scheme. The commitment hash binds to `msg.sender`. A different sender cannot use the same commitment. The attacker would need to submit their own commitment and wait 60 seconds.  
**Residual risk:** An attacker who observes a `commit()` tx can submit their own commitment for the same name. They must wait 60 seconds and race the original committer. This is the standard commit-reveal residual risk.

### 2. Commitment Replay Attacker
**Goal:** Reuse a previously submitted commitment to register a name again.  
**Mitigation:** `usedCommitments` mapping permanently invalidates commitments after use. Commitments also expire after 24 hours.  
**Status:** Addressed in v3 (was C-01 in pre-v3 audit).

### 3. Price Oracle Manipulation
**Goal:** Register a name at a lower price by manipulating the oracle between approve and register.  
**Mitigation:** `maxCost` parameter in `register()` and `renew()`. If the oracle price exceeds `maxCost`, the tx reverts.  
**Status:** Addressed in v3 (was C-03 in pre-v3 audit).

### 4. Resolver Injection Attacker
**Goal:** Pass a malicious resolver address to `register()` to execute arbitrary code during registration.  
**Mitigation:** `approvedResolvers` allowlist. Only admin-approved resolver addresses are accepted. `register()` reverts with `ResolverNotApproved` if the resolver is not in the allowlist.  
**Status:** Addressed in v3 (was C-02 in pre-v3 audit).

### 5. Role Abuse (Admin/Upgrader)
**Goal:** Compromise the deployer EOA to drain treasury, upgrade contracts maliciously, or pause the protocol.  
**Mitigation (testnet):** None beyond EOA key security.  
**Mitigation (mainnet requirement):** Multisig for all privileged roles. See `ROLE_PERMISSION_MATRIX.md`.  
**Residual risk:** On testnet, all roles are held by a single EOA. This is the primary privilege concentration risk.

### 6. Treasury Drain via setTreasury
**Goal:** Change treasury to attacker-controlled address to redirect future payments.  
**Mitigation:** `setTreasury()` requires `ADMIN_ROLE`. Zero-address check prevents accidental burn.  
**Residual risk:** If ADMIN_ROLE is compromised, treasury can be redirected. Does not affect past payments.

### 7. Upgrade Abuse
**Goal:** Deploy a malicious implementation via `upgradeTo()`.  
**Mitigation:** `_authorizeUpgrade()` requires `UPGRADER_ROLE`. UUPS pattern — upgrade is initiated from the proxy, not the implementation.  
**Residual risk:** If UPGRADER_ROLE is compromised, the controller and resolver logic can be replaced. Non-upgradeable contracts (Registry, BaseRegistrar, PriceOracle, ReverseRegistrar) are immune.

### 8. Name Squatting / Expiry Race
**Goal:** Re-register a valuable name immediately after expiry.  
**Mitigation:** 90-day grace period. Premium decay (100 USDC at expiry, decays to 0 over 28 days) disincentivizes immediate re-registration.  
**Residual risk:** After grace period + premium decay, names are available at base price. No additional protection.

### 9. CONTROLLER_ROLE Abuse on Resolver
**Goal:** Use CONTROLLER_ROLE on the resolver to overwrite any node's addr or name record.  
**Mitigation:** CONTROLLER_ROLE is granted only to ArcNSController and ArcNSReverseRegistrar during deployment.  
**Residual risk:** If either controller contract is compromised or upgraded maliciously, resolver records for any node can be overwritten.

---

## Testnet-Specific vs Protocol-Generic Risks

| Risk | Testnet | Mainnet |
|------|---------|---------|
| Single-EOA role concentration | Present — all roles held by deployer | Must be resolved with multisig |
| Treasury is an EOA | Present | Must be a multisig |
| No external audit | Present | Required before mainnet |
| RPC reliability | Arc Testnet has occasional congestion | Dedicated RPC required |
| USDC is testnet USDC | Present | Mainnet USDC address must be confirmed |
| Subgraph centralized | The Graph Studio | Decentralized indexing for mainnet |

---

## Known Non-Issues (By Design)

- `ownerOf()` reverts for expired names — intentional, prevents stale ownership claims
- Reverse record failure is silently swallowed in `register()` — intentional, registration must not fail due to reverse record issues
- `_validName()` only validates ASCII subset — Unicode normalization is handled off-chain by the frontend; on-chain validation is a safety net only
