# Arc Testnet — 2-of-3 Safe Multisig Deployment Plan

**Date**: 2026-04-29  
**Network**: Arc Testnet (chainId 5042002)  
**Safe version**: GnosisSafe v1.3.0  
**Configuration**: 2-of-3 threshold  

---

## Overview

Arc Testnet is not in the official Safe deployments registry. This plan covers
deploying the full Safe infrastructure from scratch (singleton + proxy factory +
fallback handler) and then deploying a 2-of-3 Safe proxy for ArcNS protocol
governance.

The Safe will receive `ADMIN_ROLE`, `UPGRADER_ROLE`, and `PAUSER_ROLE` on both
`ArcNSController` proxies (`.arc` and `.circle`), replacing the current single-key
deployer as the protocol admin.

---

## Pre-Deployment Checklist

### Environment

- [ ] `.env` has `PRIVATE_KEY` set (deployer key — must hold all roles on both controllers)
- [ ] `.env` has `ARC_RPC_URL` or `ARC_RPC_URL_2` set
- [ ] Deployer has sufficient native token balance for gas (≥ 0.1 ETH equivalent)
- [ ] `deployments/arc_testnet-v3.json` exists and is current

### Owner Addresses

Collect the three Safe owner addresses before running the script.
These should be hardware wallet addresses or separate EOAs — **not** the deployer key.

| Owner | Address | Signer |
|-------|---------|--------|
| Owner 1 | `0x...` | Deployer EOA (or separate key) |
| Owner 2 | `0x...` | Second team member |
| Owner 3 | `0x...` | Third team member / backup |

> **Security note**: Owner 1 can be the deployer address for testnet, but on
> mainnet all three owners should be independent hardware wallets.

### Safe Artifacts

- [ ] Run `node scripts/v3/fetchSafeArtifacts.js` to download Safe v1.3.0 artifacts
- [ ] Verify `scripts/v3/safe-artifacts/GnosisSafe.json` exists and has `bytecode` field
- [ ] Verify `scripts/v3/safe-artifacts/GnosisSafeProxyFactory.json` exists
- [ ] Verify `scripts/v3/safe-artifacts/CompatibilityFallbackHandler.json` exists

---

## Deployment Steps

### Step 1 — Fetch Safe Artifacts

```bash
node scripts/v3/fetchSafeArtifacts.js
```

Expected output:
```
✓ GnosisSafe — saved to scripts/v3/safe-artifacts/GnosisSafe.json
✓ GnosisSafeProxyFactory — saved to ...
✓ CompatibilityFallbackHandler — saved to ...
✅ All Safe artifacts fetched successfully.
```

---

### Step 2 — Deploy Safe (infrastructure + proxy)

Set the three owner addresses and run the deployment:

```bash
SAFE_OWNER_1=0xYOUR_OWNER_1 \
SAFE_OWNER_2=0xYOUR_OWNER_2 \
SAFE_OWNER_3=0xYOUR_OWNER_3 \
SAFE_THRESHOLD=2 \
SAFE_NONCE=0 \
npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
```

This deploys:
1. `GnosisSafe` singleton implementation
2. `GnosisSafeProxyFactory`
3. `CompatibilityFallbackHandler`
4. Safe proxy (2-of-3 configured)

Expected output:
```
╔══════════════════════════════════════════════════════════╗
║   ArcNS — 2-of-3 Safe Multisig Deployment               ║
╚══════════════════════════════════════════════════════════╝
...
✓ GnosisSafe singleton deployed: 0x...
✓ GnosisSafeProxyFactory deployed: 0x...
✓ CompatibilityFallbackHandler deployed: 0x...
✓ createProxyWithNonce — tx: 0x...
✓ Safe proxy deployed: 0x...
✓ All 3 owners confirmed on-chain
✓ Threshold 2-of-3 confirmed
═══════════════════════════════════════════════════════════
✅ Safe Multisig Deployment Complete
═══════════════════════════════════════════════════════════
   Safe address          : 0x...
   Owners                : 0x..., 0x..., 0x...
   Threshold             : 2-of-3
```

**Record the Safe address** — it will also be saved to `deployments/arc_testnet-v3.json`.

---

### Step 3 — Verify Safe on ArcScan

Open the Safe address on ArcScan and confirm:
- Contract is deployed (has bytecode)
- `getOwners()` returns the three expected addresses
- `getThreshold()` returns `2`

```
https://testnet.arcscan.app/address/<SAFE_ADDRESS>
```

---

### Step 4 — Test Safe Signing (dry run)

Before granting roles, verify that 2-of-3 signing works. Use the Safe CLI or
a local script to propose and confirm a no-op transaction (e.g., send 0 ETH to
the Safe itself).

**Option A — Safe{Wallet} UI** (if Arc Testnet is added as custom network):
1. Go to https://app.safe.global
2. Add custom network: RPC = `https://arc-testnet.drpc.org`, chainId = `5042002`
3. Import Safe address
4. Create a test transaction

**Option B — CLI signing** (always works):
```bash
# Propose a 0-value transaction to the Safe itself
# Owner 1 signs:
node scripts/v3/safePropose.js --safe <SAFE_ADDRESS> --to <SAFE_ADDRESS> --value 0

# Owner 2 confirms:
node scripts/v3/safeConfirm.js --safe <SAFE_ADDRESS> --txHash <PROPOSED_TX_HASH>

# Execute (after 2 confirmations):
node scripts/v3/safeExecute.js --safe <SAFE_ADDRESS> --txHash <PROPOSED_TX_HASH>
```

> Note: `safePropose.js`, `safeConfirm.js`, `safeExecute.js` are future scripts
> for the full multisig transaction workflow. For now, use Safe{Wallet} UI.

---

### Step 5 — Grant ArcNS Roles to Safe

Once the Safe is verified and signing works:

```bash
SAFE_OWNER_1=0xYOUR_OWNER_1 \
SAFE_OWNER_2=0xYOUR_OWNER_2 \
SAFE_OWNER_3=0xYOUR_OWNER_3 \
MULTISIG_ONLY=0 \
npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
```

This grants the following roles on **both** `arcController` and `circleController`:
- `ADMIN_ROLE` — set treasury, approve resolvers, update reverse registrar
- `UPGRADER_ROLE` — authorize UUPS upgrades
- `PAUSER_ROLE` — pause/unpause registration

Expected output:
```
── Phase 3: ArcNS Role Transfer to Safe ──
✓ arcController.grantRole(ADMIN_ROLE, Safe) — tx: 0x...
✓ circleController.grantRole(ADMIN_ROLE, Safe) — tx: 0x...
✓ arcController.grantRole(UPGRADER_ROLE, Safe) — tx: 0x...
✓ circleController.grantRole(UPGRADER_ROLE, Safe) — tx: 0x...
✓ arcController.grantRole(PAUSER_ROLE, Safe) — tx: 0x...
✓ circleController.grantRole(PAUSER_ROLE, Safe) — tx: 0x...
✓ All roles granted to Safe on both controllers
```

---

### Step 6 — Verify Role Grants

Confirm on-chain that the Safe holds all roles:

```bash
npx hardhat run scripts/v3/validateMigration.js --network arc_testnet
```

Or manually via ArcScan:
- Call `hasRole(ADMIN_ROLE, <SAFE_ADDRESS>)` on both controllers → must return `true`
- Call `hasRole(UPGRADER_ROLE, <SAFE_ADDRESS>)` on both controllers → must return `true`
- Call `hasRole(PAUSER_ROLE, <SAFE_ADDRESS>)` on both controllers → must return `true`

---

### Step 7 — Test a Multisig Admin Transaction

Before revoking deployer roles, test that the Safe can actually execute an admin
transaction. Recommended test: call `pause()` then `unpause()` on `arcController`.

This requires 2-of-3 owners to sign. Use Safe{Wallet} UI or the CLI workflow.

---

### Step 8 — Revoke Deployer Roles (when ready)

⚠️ **This step is irreversible.** Only proceed after Step 7 confirms the Safe works.

```bash
SAFE_OWNER_1=0xYOUR_OWNER_1 \
SAFE_OWNER_2=0xYOUR_OWNER_2 \
SAFE_OWNER_3=0xYOUR_OWNER_3 \
MULTISIG_ONLY=0 \
REVOKE_DEPLOYER=1 \
npx hardhat run scripts/v3/deployMultisig.js --network arc_testnet
```

Expected output:
```
── Phase 3b: Revoke Deployer Roles ──
⚠ WARNING: This is irreversible. Deployer will lose all admin access.
✓ arcController.revokeRole(ADMIN_ROLE, deployer) — tx: 0x...
✓ circleController.revokeRole(ADMIN_ROLE, deployer) — tx: 0x...
...
✓ Deployer roles revoked from both controllers
```

---

## Post-Deployment State

After all steps complete, the ArcNS protocol governance state will be:

| Contract | Role | Holder |
|----------|------|--------|
| arcController | ADMIN_ROLE | Safe (2-of-3) |
| arcController | UPGRADER_ROLE | Safe (2-of-3) |
| arcController | PAUSER_ROLE | Safe (2-of-3) |
| circleController | ADMIN_ROLE | Safe (2-of-3) |
| circleController | UPGRADER_ROLE | Safe (2-of-3) |
| circleController | PAUSER_ROLE | Safe (2-of-3) |
| arcController | ADMIN_ROLE | Deployer EOA | ← revoked in Step 8 |
| arcController | UPGRADER_ROLE | Deployer EOA | ← revoked in Step 8 |
| arcController | PAUSER_ROLE | Deployer EOA | ← revoked in Step 8 |

---

## Deployment Artifacts

After deployment, `deployments/arc_testnet-v3.json` will contain:

```json
{
  "contracts": {
    "safe": "0x...",
    "safeSingleton": "0x...",
    "safeProxyFactory": "0x...",
    "safeFallbackHandler": "0x..."
  },
  "multisig": {
    "safe": "0x...",
    "owners": ["0x...", "0x...", "0x..."],
    "threshold": 2,
    "saltNonce": "0",
    "deployedAt": "2026-...",
    "deployedBy": "0x...",
    "rolesGranted": true,
    "deployerRevoked": true,
    "infrastructure": {
      "singleton": "0x...",
      "proxyFactory": "0x...",
      "fallbackHandler": "0x..."
    }
  }
}
```

---

## Rollback Plan

If something goes wrong before Step 8 (deployer roles not yet revoked):

- The deployer still holds all roles and can take any admin action directly
- The Safe can be abandoned and a new one deployed with a different nonce (`SAFE_NONCE=1`)
- No ArcNS protocol state is affected by the Safe deployment itself

After Step 8 (deployer roles revoked):

- All admin actions require 2-of-3 Safe signatures
- If a Safe owner key is lost, the remaining 2 owners can use `createSwapOwnerTx`
  to replace the lost key (requires 2-of-3 confirmation)
- If 2+ keys are lost simultaneously, the protocol is locked — this is why
  hardware wallets and key backups are critical

---

## Troubleshooting

### "txpool is full"
The script retries automatically up to 3 times with 6–8s delays. If it persists,
wait a few minutes and re-run. The script is idempotent — already-deployed
contracts are detected and skipped.

### "SAFE_OWNER_2 and SAFE_OWNER_3 must be set"
Set the environment variables before running:
```bash
export SAFE_OWNER_2=0x...
export SAFE_OWNER_3=0x...
```

### "ProxyCreation event not found"
The Safe proxy deployment transaction succeeded but the event wasn't found.
Check the transaction on ArcScan and extract the deployed proxy address manually,
then set `contracts.safe` in `deployments/arc_testnet-v3.json` and re-run.

### Safe artifacts missing
Run `node scripts/v3/fetchSafeArtifacts.js` to download them.

### Arc Testnet not supported in Safe{Wallet} UI
Use the "Add custom network" feature in Safe{Wallet} with:
- Network name: Arc Testnet
- RPC URL: `https://arc-testnet.drpc.org`
- Chain ID: `5042002`
- Currency: ARC
- Block explorer: `https://testnet.arcscan.app`
