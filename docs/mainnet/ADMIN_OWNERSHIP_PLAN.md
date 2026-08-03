# ArcNS Mainnet Admin and Ownership Plan (Aşama 4B)

Status: finalized administration and ownership plan for launch preparation only. This document records intended mainnet authority boundaries; it does not execute them.

## Executive summary

- ArcNS mainnet will use a new 2-of-3 Admin Safe, following the same structural pattern as the testnet admin Safe. The three owner inputs are selected in [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md), but the final mainnet Safe address and read-only configuration verification remain launch blockers. The testnet Safe address must not be reused.
- The deployer wallet will be the treasury recipient at launch as a deliberate operational simplification.
- A standard 48-hour `TimelockController` is planned to hold controller and resolver upgrade authority. Its minimum delay will be `172800` seconds.
- Emergency pause authority will be held by the Admin Safe.
- The deployer EOA is for deployment and bootstrap only. After handoff, it must not retain admin, ownership, upgrade, root, freeze, activation, pause, oracle, resolver, registrar, registry, or discount-registry authority.

The treasury recipient is not the protocol admin. Receiving protocol revenue does not, by itself, grant authority over contracts or roles.

The selected deployer/treasury EOA may be one Safe owner, but it must not be recorded as the Admin Safe contract address. The Admin Safe must be a separate contract with verified bytecode, owners, and threshold on Arc mainnet.

## Final role ownership table

`TBD` means the final mainnet address must be recorded and independently verified before deployment or handoff. No address is invented by this plan.

| Component / Role | Launch owner/admin | Later owner/admin if different | Reason | Launch blocker? |
| ---------------- | ------------------ | ------------------------------ | ------ | --------------- |
| Registry root owner | Admin Safe (address TBD) | Same | Root ownership is critical protocol authority and must be multisig-controlled. | Yes — Safe address and handoff pending |
| `.arc` registrar owner | Admin Safe (address TBD) | Same | Registrar administration must not remain with the deployer. | Yes — Safe address and handoff pending |
| `.circle` registrar owner | Admin Safe (address TBD) | Same | Registrar administration must not remain with the deployer. | Yes — Safe address and handoff pending |
| `.arc` controller admin | Admin Safe (address TBD) | Same | Operational administration requires multisig approval. | Yes — Safe address and role handoff pending |
| `.circle` controller admin | Admin Safe (address TBD) | Same | Operational administration requires multisig approval. | Yes — Safe address and role handoff pending |
| `.arc` controller upgrader | 48-hour Timelock (address TBD) | Same | Upgrade operations require a visible 48-hour delay. | Yes — Timelock deployment and role handoff pending |
| `.circle` controller upgrader | 48-hour Timelock (address TBD) | Same | Upgrade operations require a visible 48-hour delay. | Yes — Timelock deployment and role handoff pending |
| `.arc` controller pauser | Admin Safe (address TBD) | Same | Emergency response must be prompt but protected by multisig approval. | Yes — Safe address and role handoff pending |
| `.circle` controller pauser | Admin Safe (address TBD) | Same | Emergency response must be prompt but protected by multisig approval. | Yes — Safe address and role handoff pending |
| Resolver admin | Admin Safe (address TBD) | Same | Resolver administration must be multisig-controlled. | Yes — Safe address and role handoff pending |
| Resolver upgrader | 48-hour Timelock (address TBD) | Same | Resolver upgrades require a visible 48-hour delay. | Yes — Timelock deployment and role handoff pending |
| Reverse registrar owner | Admin Safe (address TBD) | Same | Reverse registrar ownership must not remain with the deployer. | Yes — Safe address and handoff pending |
| PriceOracle owner | Admin Safe (address TBD) | 48-hour Timelock recommended after launch stabilization | Safe ownership simplifies launch coordination; later timelock custody reduces rapid-change risk. | Yes — Safe address and handoff pending |
| DiscountRegistry owner | Admin Safe (address TBD) | Timelock migration may be considered only after launch is stable | Launch coordination includes controller authorization, root, freeze, and activation administration. | Yes — Safe address and handoff pending |
| DiscountRegistry authorized `.arc` controller | Final deployed `.arc` controller address (TBD), authorized by DiscountRegistry owner | Same unless a reviewed controller migration occurs | Only the finalized controller may consume `.arc` campaign claims. | Yes — deployed controller address and authorization pending |
| DiscountRegistry authorized `.circle` controller | Final deployed `.circle` controller address (TBD), authorized by DiscountRegistry owner | Same unless a reviewed controller migration occurs | Only the finalized controller may consume `.circle` campaign claims. | Yes — deployed controller address and authorization pending |
| Treasury recipient | Deployer wallet (`0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`) | Treasury Safe recommended in a future reviewed migration | Operational simplicity at launch; this is revenue custody, not protocol administration. | Yes — final operational verification pending |
| Deployer EOA | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`; deployment/bootstrap only and treasury recipient at launch | Treasury recipient only, if retained as the final launch choice | The deployer must have no lasting privileged protocol authority after handoff. | Yes — operational and complete revoke verification pending |
| Timelock proposer | Admin Safe (address TBD) | Same unless the authority model is deliberately revised | The Safe schedules reviewed critical operations. | Yes — Safe and Timelock deployment/configuration pending |
| Timelock canceller | Admin Safe (address TBD) | Same unless the authority model is deliberately revised | The Safe can cancel unsafe or obsolete queued operations. | Yes — Safe and Timelock deployment/configuration pending |
| Timelock executor | Admin Safe (address TBD) | May be changed later through a separately reviewed authority-model decision | A restricted executor is simpler for launch operations. | Yes — Safe and Timelock deployment/configuration pending |

## Treasury risk note

Using the deployer wallet as treasury recipient is acceptable for launch only as a deliberate operational choice. It creates single-EOA custody risk: loss, compromise, or misuse of that key could affect received treasury funds.

Treasury receipt does not grant protocol admin control by itself. All admin, ownership, upgrade, pause, root, freeze, activation, oracle, resolver, registrar, registry, and discount-registry rights must be moved away from the deployer during handoff. The deployer must not retain any such authority merely because it remains the treasury recipient.

A future reviewed migration from the deployer wallet to a dedicated Treasury Safe remains recommended.

## Timelock explanation

The timelock is a smart contract, not a separate wallet. It does not have a private key and nobody signs transactions "as" the timelock. It enforces a delay before assigned critical operations can be executed.

The planned minimum delay is 48 hours: `minDelay = 172800` seconds. The Admin Safe will schedule operations as proposer, cancel operations as canceller, and execute ready operations as executor for launch simplicity. The timelock contract then performs the authorized action after the delay according to its assigned on-chain role.

## Timelock scope

At launch:

- The Timelock controls the upgrader role for the `.arc` controller.
- The Timelock controls the upgrader role for the `.circle` controller.
- The Timelock controls the resolver upgrader role.
- PriceOracle ownership starts at the Admin Safe for launch simplicity. Migration to the Timelock is recommended after launch stabilization and a separate review.
- DiscountRegistry ownership starts at the Admin Safe for coordinated launch administration. Migration to the Timelock may be considered only after launch is stable and through a separately reviewed plan.

Emergency pause remains outside the timelock and is held by the Admin Safe so that a 48-hour delay does not prevent incident response.

## Post-deployment handoff and revoke checklist

These are future launch actions, not actions performed by this documentation phase.

- [ ] Transfer registry root ownership to the Admin Safe.
- [ ] Transfer `.arc` registrar ownership to the Admin Safe.
- [ ] Transfer `.circle` registrar ownership to the Admin Safe.
- [ ] Grant controller admin roles to the Admin Safe.
- [ ] Grant controller pause roles to the Admin Safe.
- [ ] Grant controller upgrade roles to the Timelock.
- [ ] Grant resolver admin to the Admin Safe.
- [ ] Grant resolver upgrade role to the Timelock.
- [ ] Transfer reverse registrar ownership to the Admin Safe.
- [ ] Transfer PriceOracle ownership to the Admin Safe.
- [ ] Transfer DiscountRegistry ownership to the Admin Safe.
- [ ] Authorize only the finalized `.arc` and `.circle` controller addresses in the DiscountRegistry.
- [ ] Set both controllers' discount registry address to the finalized shared DiscountRegistry.
- [ ] Set the treasury recipient to the finalized deployer wallet.
- [ ] Verify the deployer has no admin, owner, pause, upgrade, oracle, resolver, registrar, registry, or discount-registry authority after handoff.
- [ ] Verify the deployer remains only the treasury recipient, if that is the final launch choice.

Every transfer, grant, revoke, authorization, address assignment, and final role read must be independently reviewed against the finalized deployed addresses before mainnet activation.

The strictly read-only `scripts/mainnet/assert-admin-handoff.js` must verify the finalized Safe, Timelock, treasury, deployed addresses, owners, roles, and deployer revocation before public launch. It does not execute the handoff and must not be treated as proof until run against the final deployment with independently reviewed expected values.

## Launch blockers

- [ ] Final mainnet Admin Safe address is not yet recorded.
- [ ] Selected Safe owner addresses and the 2-of-3 threshold are not yet verified against a mainnet Safe.
- [ ] Selected deployer/treasury address requires final operational verification.
- [ ] Timelock is not deployed.
- [ ] Timelock address is not known.
- [ ] Role handoff and deployer revocation are not executed or verified.
- [ ] Blockscout API verification path is unresolved.
- [ ] Mainnet indexer/subgraph plan is unresolved.
- [ ] Focused security review is not completed.
- [ ] Frontend mainnet cutover plan is not prepared.
- [ ] Deploy-grade RPC is not finalized. The previously confirmed `https://radar-api-rpc.up.railway.app` endpoint is a read-only/testing fallback only and must not be treated as deployment-grade infrastructure.

Arc mainnet is not ready to deploy while any launch blocker above remains open.

## Non-goals and safety boundary

- This document does not deploy contracts.
- This document does not create the Safe.
- This document does not deploy the TimelockController.
- This document does not submit transactions or call write functions.
- This document does not sign anything.
- This document does not transfer ownership or roles.
- This document does not grant or revoke roles.
- This document does not set prices, set or freeze a Merkle root, or activate a discount campaign.
- This document does not activate mainnet.
- This document does not switch the frontend to mainnet.
- This document does not modify environment values, secrets, wallet credentials, private keys, or deployment artifacts.
- This document does not cover unrelated private planning materials.

## Related finalized preparation inputs

- Mainnet pricing: [`PRICING.md`](./PRICING.md)
- Admin Safe readiness: [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md)
- Early-adopter snapshot: [`EARLY_ADOPTER_SNAPSHOT.md`](./EARLY_ADOPTER_SNAPSHOT.md)
- Safe / Timelock / handoff ceremony: [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md)
- Deployment preparation runbook: [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md)
- Security checklist: [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)

The confirmed Arc mainnet chain ID is `5042`. The confirmed USDC address is `0x3600000000000000000000000000000000000000`, with symbol `USDC` and 6 decimals. These read-only preflight facts do not remove any launch blocker listed above.