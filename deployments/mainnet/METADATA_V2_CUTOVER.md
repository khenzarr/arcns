# ArcNS Mainnet Metadata V2 Cutover

This runbook fixes NFT metadata without changing the registry, resolver, controller proxy, pricing, discount, or reverse-resolution addresses.

## Prepared and verified

- New controller implementation: `0xb343b3fca4e52238b21F8fDb41211a03556DD232`
- Official Explorer status: exact-match source verified
- Approved route: emergency atomic Safe cutover; no Timelock wait
- The Safe receives `UPGRADER_ROLE` only inside the atomic cutover batch and revokes it before the batch completes
- The Timelock keeps its existing `UPGRADER_ROLE`
- Targeted regression suite: 168 passing
- Read-only live snapshot rehearsal: one `.arc` record (`circle.arc`), zero `.circle` records

## Execution order

1. Execute `02-pause-controllers.json` from the ArcNS Mainnet Safe.
2. Run `scripts/mainnet/deploy-metadata-v2-registrars.js` with its explicit confirmation variable. It takes the final post-pause snapshot, deploys and seeds both V2 registrars, hands ownership to the Safe, and creates `03-emergency-atomic-upgrade-and-cutover.json`.
3. Exact-match verify both new registrar contracts on the official Arc Explorer using `deployments/verification/ArcNSBaseRegistrarV2.standard-input.json` and the encoded constructor arguments recorded in `metadata-v2-cutover-prepared.json`.
4. Execute the generated `03-emergency-atomic-upgrade-and-cutover.json` from the Safe. The batch grants temporary Safe upgrade authority, upgrades both controllers, revokes that authority, changes both TLD owners, and changes both controller base pointers atomically.
5. Run `scripts/mainnet/validate-metadata-v2-cutover.js --network arc_mainnet` and require a PASS result.
6. Execute `05-unpause-controllers.json` from the Safe.
7. Perform one low-value registration and confirm the NFT title and description on the official Arc Explorer.
8. Only then update the canonical deployment JSON, frontend-generated addresses, indexers, README, DoraHacks, and other public address lists.

## Abort rules

- Do not use the superseded `01-schedule-controller-upgrade.json` or `03-execute-controller-upgrade.json` files.
- Do not deploy the registrars unless both controllers are paused and no Timelock operation was scheduled.
- Do not execute the emergency atomic cutover before both registrars are exact-match verified.
- Do not execute batch 05 unless the read-only cutover validator passes.
- If any step fails, keep both controllers paused; the existing registry and resolver records remain readable.
