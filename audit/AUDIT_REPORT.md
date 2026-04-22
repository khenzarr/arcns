# ArcNS Security Audit Report
**Date:** 2026-04-21  
**Auditor:** Autonomous Protocol Engineering System  
**Scope:** All ArcNS smart contracts  

---

## CRITICAL FINDINGS

### [C-01] Commitment Replay After Expiry
**File:** ArcNSRegistrarController.sol  
**Severity:** HIGH  
**Description:** A commitment that expires (> MAX_COMMITMENT_AGE) can be re-submitted with the same hash. An attacker who observed a commitment can front-run the re-submission window.  
**Fix:** Add a `usedCommitments` mapping to permanently invalidate consumed commitments.

### [C-02] Resolver Arbitrary Call Injection
**File:** ArcNSRegistrarController.sol `_setRecords()`  
**Severity:** HIGH  
**Description:** `_setRecords` splices raw calldata bytes and calls an arbitrary `resolverAddr`. If `resolverAddr` is a malicious contract, it can execute arbitrary code during registration.  
**Fix:** Whitelist resolver addresses OR validate the call target is the protocol resolver.

### [C-03] ERC20 Approval Race Condition
**File:** ArcNSRegistrarController.sol  
**Severity:** MEDIUM  
**Description:** User approves exact amount; if price oracle is updated between approve and register, the tx reverts with confusing error. No slippage protection.  
**Fix:** Add `maxCost` parameter to `register()` and `renew()`.

### [C-04] BaseRegistrar `ownerOf` Reverts on Expired Names
**File:** ArcNSBaseRegistrar.sol  
**Severity:** MEDIUM  
**Description:** `ownerOf()` reverts for expired names instead of returning address(0), breaking ERC-721 compatibility and causing frontend crashes.  
**Fix:** Return address(0) for expired names, add `isExpired()` view.

### [C-05] No Pausability
**File:** All contracts  
**Severity:** MEDIUM  
**Description:** No emergency stop mechanism. A critical bug cannot be mitigated without a full upgrade.  
**Fix:** Add `Pausable` to Controller and BaseRegistrar.

### [C-06] Unchecked Treasury Address
**File:** ArcNSRegistrarController.sol  
**Severity:** LOW  
**Description:** `setTreasury(address(0))` would silently burn all registration fees.  
**Fix:** Add zero-address check.

### [C-07] Missing AccessControl Roles
**File:** All contracts  
**Severity:** MEDIUM  
**Description:** Single-owner pattern is fragile. No separation between admin, pauser, and oracle-updater roles.  
**Fix:** Replace `Ownable` with `AccessControl` using ADMIN_ROLE, PAUSER_ROLE, ORACLE_ROLE.

### [C-08] No UUPS Upgradeability
**File:** All contracts  
**Severity:** MEDIUM  
**Description:** Contracts are not upgradeable. Critical bugs require full redeployment and migration.  
**Fix:** Implement UUPS proxy pattern for Controller, Resolver, and PriceOracle.

---

## INFORMATIONAL

### [I-01] Gas: `_validName` iterates bytes twice
Use a single-pass validation loop.

### [I-02] `_setRecords` data injection is fragile
The 36-byte splice assumption breaks if selector is not 4 bytes + 32-byte node.

### [I-03] No event for treasury change
Add `TreasuryUpdated` event.

---

## FIXES APPLIED

All CRITICAL and MEDIUM findings are fixed in the upgraded contracts below.
