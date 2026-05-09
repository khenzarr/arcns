# ArcNS v3 — Mainnet Gap Report

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Pre-mainnet. Testnet deployment is live and demo-ready.

This document is an honest, prioritized analysis of what must be completed before a responsible mainnet deployment. It is not a blocker for testnet operation, grant review, or demo.

---

## Go / No-Go Checklist

| Item | Status | Priority |
|------|--------|----------|
| External security audit | ❌ Not started | **P0 — Blocker** |
| Audit findings resolved | ❌ Pending audit | **P0 — Blocker** |
| Mainnet USDC address confirmed | ❌ Pending | **P0 — Blocker** |
| Treasury migration to multisig contract | ❌ Not done | **P1 — Required** |
| Timelock delay increase (72h+) | ❌ Not done | **P1 — Required** |
| Dedicated RPC / infra hardening | ❌ Not done | **P1 — Required** |
| Monitoring and incident response | ❌ Not done | **P1 — Required** |
| Reentrancy adversarial tests | ❌ Not done | **P2 — Recommended** |
| UUPS storage layout verification in CI | ❌ Not done | **P2 — Recommended** |
| Ecosystem integrations (ArcScan, wallets) | ❌ Not started | **P3 — Nice to have** |
| Reserved names policy | ❌ Not defined | **P3 — Nice to have** |
| Legal / branding review | ❌ Not done | **P3 — Nice to have** |

---

## P0 — Blockers (Must Complete Before Mainnet)

### External Security Audit

**What:** Engage an external security audit firm to review all 8 v3 contracts.  
**Why:** No responsible mainnet deployment without external audit. Internal review and security hardening have been completed, but external audit is required.  
**Scope:** See [AUDIT_SCOPE.md](AUDIT_SCOPE.md) for the full scope definition.  
**Status:** Not yet engaged. Audit preparation package is ready at `docs/audit/`.

### Mainnet USDC Address

**What:** Confirm the mainnet USDC contract address on Arc Mainnet (when available).  
**Why:** The current deployment uses MockUSDC (`0x3600000000000000000000000000000000000000`), a testnet stand-in. Mainnet requires the real USDC contract.  
**Action:** Update `USDC_ADDRESS` in `.env` and redeploy or upgrade the Controller to point to the real USDC address.

---

## P1 — Required (Must Complete Before Mainnet)

### Treasury Migration

**What:** Migrate the treasury from an EOA (`0xbbDF5bC7D63B1b7223556d4899905d56589A682d`) to a multisig-controlled contract.  
**Why:** A compromised treasury EOA key results in loss of all collected fees. An EOA treasury is not acceptable for mainnet.  
**Action:** Deploy a treasury contract (e.g. a Safe or a dedicated treasury contract). Update the treasury address on both Controllers via `setTreasury` (requires Safe multisig).

### Timelock Delay Increase

**What:** Increase the Timelock delay from 48 hours to 72 hours or more.  
**Why:** 48 hours is appropriate for testnet. Mainnet should provide a longer window for the community to detect and react to malicious upgrades.  
**Action:** Schedule a Timelock operation to update the delay. This operation is itself subject to the current 48-hour delay.

### Dedicated RPC / Infra Hardening

**What:** Provision a dedicated Arc Testnet (and eventually mainnet) RPC endpoint.  
**Why:** The current deployment uses the public Arc Testnet RPC (`https://rpc.testnet.arc.network`). For production, a dedicated RPC with rate limiting and monitoring is required.  
**Action:** Provision a dedicated RPC via a node provider or self-hosted node.

### Monitoring and Incident Response

**What:** Implement on-chain monitoring for critical events (registrations, upgrades, pauses, role changes) and define an incident response process.  
**Why:** Without monitoring, a security incident may go undetected. Without an incident response process, response time is unpredictable.  
**Action:** Set up event monitoring (e.g. OpenZeppelin Defender, custom scripts). Define escalation path and on-call process.

---

## P2 — Recommended (Should Complete Before Mainnet)

### Reentrancy Adversarial Tests

**What:** Add adversarial reentrancy tests for the Controller's `register` and `renew` functions.  
**Why:** The reentrancy guard is implemented correctly, but adversarial tests provide additional confidence.  
**Note:** This is a testing gap, not a code defect.

### UUPS Storage Layout Verification in CI

**What:** Add automated storage layout verification to CI to prevent accidental storage collisions in future upgrades.  
**Why:** Manual verification is error-prone. Automated CI checks catch issues before deployment.  
**Note:** This is a CI gap, not a code defect.

---

## P3 — Nice to Have (Recommended for Mainnet)

### Ecosystem Integrations

**What:** ArcScan integration, wallet integrations (MetaMask, Rainbow, Trust Wallet), third-party dApp integrations.  
**Why:** Native ecosystem support makes ArcNS names useful in practice.  
**Status:** Integration packages are ready (`docs/integration/`). Adoption requires third-party engineering work.

### Reserved Names Policy

**What:** Define a policy for reserved names (e.g. brand names, protocol names, offensive names).  
**Why:** Without a policy, anyone can register `circle.arc` or `arc.arc` or offensive names.  
**Action:** Define the policy. Implement a reserved names list in the Controller or as a separate contract.

### Legal / Branding Review

**What:** Legal review of the ArcNS name and branding. Review of terms of service and privacy policy.  
**Why:** Required for a production product.

---

## What Is Already Done

| Item | Status |
|------|--------|
| All 8 v3 contracts deployed | ✅ Done |
| Security migration (ReverseRegistrar fix, Controller fix) | ✅ Done |
| Multisig (2-of-3 Safe) | ✅ Done |
| Timelock (48h delay) | ✅ Done |
| All deployer EOA privileges revoked | ✅ Done |
| Internal security review | ✅ Done |
| Audit preparation package | ✅ Done |
| Production frontend deployed | ✅ Done |
| Subgraph published | ✅ Done |
| Integration packages ready | ✅ Done |

---

## Honest Summary

ArcNS is live on Arc Testnet, demo-ready, and technically sound for testnet use. The protocol has been hardened with a multisig, timelock, and security migration. The audit preparation package is complete.

**Mainnet is not yet ready.** The primary blocker is an external security audit. Secondary blockers are treasury migration, timelock delay increase, and infra hardening. These are operational gaps, not contract code defects.

No real funds are at risk on testnet. This is a pre-mainnet protocol.
