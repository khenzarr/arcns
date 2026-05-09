# ArcNS v3 — Threat Model Summary

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Status:** Security migration complete. Timelock live.

---

## Trust Boundaries

### What ArcNS Controls

- Contract logic and upgrade authorization (via Safe + Timelock)
- Pricing tiers (via Safe)
- Treasury address (via Safe)
- Resolver approval list (via Safe)
- Emergency pause (via Safe)

### What ArcNS Does Not Control

- The Arc Testnet blockchain itself
- The USDC token contract (testnet MockUSDC; mainnet: Circle's USDC)
- The Safe multisig infrastructure (Gnosis Safe v1.3.0)
- The Graph Studio subgraph hosting
- Vercel frontend hosting
- User wallets and private keys

---

## Attacker Models

### Attacker 1: External Attacker (No Privileged Access)

**Goal:** Steal names, steal USDC, register names for free, or corrupt resolution records.

**Available surfaces:**
- Public `register`, `renew`, `commit` functions on Controllers
- Public `setAddr`, `setName` functions on Resolver
- Public `claimWithResolver`, `setName` on ReverseRegistrar
- ERC-721 transfer functions on BaseRegistrars

**Mitigations:**
- Commit-reveal prevents front-running of registrations
- `register` requires a valid commitment from `msg.sender` — cannot steal another user's commitment
- `setAddr` on Resolver requires node ownership or approval — cannot set records for names you don't own
- `claimWithResolver` requires `msg.sender == addr_` or `msg.sender == registry.owner(reverseNode)` — cannot claim another address's reverse record
- USDC payment is required for all registrations and renewals — no free registrations
- NFT transfer requires ERC-721 approval — standard ERC-721 security model

**Residual risk:** Low. All public entry points are gated by ownership or payment.

---

### Attacker 2: Compromised Treasury EOA

**Goal:** Steal collected USDC fees.

**Impact:** Loss of collected registration and renewal fees. No impact on name ownership, resolution, or contract state.

**Mitigation:** Treasury address is a parameter updatable by the Safe. If the treasury EOA is compromised, the Safe can update the treasury address to a new address. Fees already sent to the compromised address are lost.

**Residual risk:** Medium (operational). Treasury migration to a multisig-controlled contract is planned.

---

### Attacker 3: Compromised Safe Owner Key (1-of-3)

**Goal:** Execute privileged operations unilaterally.

**Impact:** None. The Safe requires 2-of-3 signatures. A single compromised key cannot execute any Safe transaction.

**Mitigation:** 2-of-3 threshold. No single key can act alone.

**Residual risk:** Low. Requires compromise of 2 of 3 keys simultaneously.

---

### Attacker 4: Compromised Safe (2-of-3 Keys)

**Goal:** Execute a malicious upgrade or drain treasury.

**Impact:**
- Upgrades: blocked by 48-hour Timelock. A malicious upgrade can be detected and cancelled during the delay window.
- Treasury: the Safe can update the treasury address immediately (no timelock on operational config). If 2-of-3 keys are compromised, treasury funds are at risk.
- Emergency pause: the Safe can pause registrations immediately.

**Mitigation:** Timelock provides a 48-hour window to detect and cancel malicious upgrades. Treasury migration to a multisig contract with its own timelock is planned.

**Residual risk:** Medium. A 2-of-3 compromise is a high-bar attack but would allow treasury manipulation and eventual upgrade execution.

---

### Attacker 5: Malicious Upgrade (via Timelock)

**Goal:** Deploy a malicious contract implementation via the upgrade path.

**Impact:** If a malicious upgrade is scheduled and not cancelled within 48 hours, it executes.

**Mitigation:** 48-hour Timelock delay. The Safe (and any observer) has 48 hours to detect and cancel the operation. The Safe holds `CANCELLER_ROLE` on the Timelock.

**Residual risk:** Low on testnet. For mainnet, a longer delay (72h+) and a public monitoring process are recommended.

---

## Key Invariants

1. **Name ownership integrity** — NFT owner is the only party who can transfer or reclaim a name.
2. **Registration exclusivity** — An active name cannot be re-registered.
3. **Payment integrity** — No registration or renewal succeeds without USDC payment.
4. **Commitment binding** — Commitments are single-use and bound to `msg.sender`.
5. **Upgrade authorization** — No upgrade executes without 48-hour Timelock delay + 2-of-3 Safe.
6. **Reverse record ownership** — Only the address itself can claim its own reverse record.
7. **Role separation** — `UPGRADER_ROLE` is held exclusively by the Timelock. No deployer EOA holds any role.

---

## Forward-Confirmation Requirement

Reverse resolution (address → primary name) requires forward-confirmation:

1. Read `Resolver.name(reverseNode)` → primary name string
2. Compute `namehash(primaryName)` → forward node
3. Read `Resolver.addr(forwardNode)` → resolved address
4. **Primary name is valid only if resolved address == queried address**

Without forward-confirmation, a stale reverse record (from a transferred or expired name) could mislead consumers. The protocol provides all data needed for correct verification. The ArcNS frontend enforces forward-confirmation in all primary name displays.

---

## What Is Not a Threat Model Concern

- **Subgraph data accuracy** — The subgraph is a display layer. It is not used for security-sensitive operations. All critical reads go directly to the chain.
- **Frontend availability** — The frontend is off-chain. Its unavailability does not affect name ownership or resolution. Names can be resolved directly via RPC.
- **Testnet USDC** — MockUSDC has no real-world value. There are no real funds at risk on testnet.

---

## Mainnet Threat Model Additions

Before mainnet, the following threat model items should be addressed:

- Treasury migration to a multisig-controlled contract (eliminates treasury EOA risk)
- Timelock delay increase to 72h+ (increases detection window for malicious upgrades)
- Public monitoring of Timelock operations (community can detect and react to scheduled upgrades)
- Incident response process (defined escalation path for security events)
