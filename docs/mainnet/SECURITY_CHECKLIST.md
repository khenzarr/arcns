# Mainnet Security Checklist

## Timelock ceremony preparation gate

- [x] Guarded mainnet-only `scripts/mainnet/deploy-timelock.js` prepared.
- [x] Script scope limited to Timelock deployment; no protocol ownership/role migration or follow-on configuration.
- [x] Dry-run mode designed to perform preflight only and write no artifact.
- [x] Read-only deploy-grade candidate assessment procedure prepared; a technical PASS is evidence only and cannot authorize deployment.
- [ ] Deploy-grade RPC selected and explicitly approved. Radar may be assessed, but use for deployment requires separately recorded risk acceptance or a reviewed provider decision; the deployment guard remains unchanged.
- [ ] Deployer funding rechecked immediately before an approved ceremony.
- [ ] Explicit operator approval and exact confirmation environment values supplied.
- [ ] Timelock deployed and address recorded (currently **TBD / not deployed**).
- [ ] Post-deployment `scripts/mainnet/check-timelock-config.js` returns **PASS**.
- [ ] Handoff completed.

Until every unchecked item is satisfied, mainnet launch remains **NO-GO** and handoff remains pending.

Infrastructure acceptance evidence: [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md).

- [ ] If the future deploy-grade RPC requires authentication, use only transient `RPC_AUTH_MODE=none|bearer|x-api-key|custom` environment inputs; never place tokens in URLs, commits, logs, PRs, or artifacts.

Run `node scripts/mainnet/assess-rpc-deploy-grade.js` only with transient assessment inputs and no signer. Review both its read-only verdict and separate deploy-grade recommendation. Do not treat Radar or any other endpoint as approved solely because read checks pass. Until provider provenance, ownership, limits, support/SLA, redundancy, and explicit human approval are recorded, Timelock deployment and mainnet launch remain **NO-GO**.

Indexer/subgraph readiness evidence: [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).

Frontend mainnet/discount cutover readiness evidence: [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

Proof delivery evidence: [`PROOF_DELIVERY_PLAN.md`](./PROOF_DELIVERY_PLAN.md).

Consolidated launch inputs and Go/No-Go readiness: [`MAINNET_LAUNCH_INPUTS.md`](./MAINNET_LAUNCH_INPUTS.md).

Admin Safe creation and read-only validation readiness: [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md).

Timelock readiness and future read-only configuration validation: [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md).

- [ ] Confirm every ownership, admin, upgrade, pause, treasury, and deployer-revocation item in [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md).
- [x] Confirm the Admin Safe `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` is a separate Arc mainnet contract, not the deployer or an owner EOA; the read-only `scripts/mainnet/check-safe-config.js` returned `PASS` for the exact owner set and threshold `2`.
- [ ] After a future approved Timelock deployment, run read-only `scripts/mainnet/check-timelock-config.js` and require PASS for chain `5042`, bytecode, `172800` delay, Safe proposer/executor/canceller roles, self-administration, and deployer-admin absence. The Timelock address remains `TBD`.
- [ ] Execute and verify the separately reviewed future ceremony in [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md) before launch.
- [ ] Confirm standard oracle reads are 100/50/25/15/5 USDC in p1..p5 order.
- [ ] Confirm normal `register()` and `renew()` remain the standard paths.
- [ ] Confirm discount route requires `owner == msg.sender`, a matured sender-bound commitment, and a valid proof.
- [ ] Confirm both controllers point to one shared registry, both are authorized, and `consume()` rejects claims until the root is frozen.
- [ ] Confirm registry consumption and registration are atomic and failed registrations restore `used` state.
- [ ] Confirm the oracle's expired-name premium is never discounted and renewals never consume a claim.
- [ ] Confirm the current 90-day availability grace makes the 28-day nonzero premium unreachable for successful re-registration; if lifecycle timing changes, preserve full premium charging.
- [ ] Confirm pause, resolver allowlist, maxCost, duration, availability, and name validation behavior.
- [ ] Confirm finalized snapshot block/hash, exclusions, counts, root, and proofs through independent review.
- [ ] Confirm deployment loaded the canonical finalized manifest and failed closed on every contradictory campaign value.
- [ ] Confirm deployment left the discount root unset, unfrozen, and inactive; set, freeze, and activation are separate reviewed operations.
- [ ] Run the read-only `scripts/mainnet/assert-admin-handoff.js` and require its PASS result before public launch.
- [ ] Confirm no production frontend switch occurs before deployed addresses and proofs are available.
- [x] Confirm the inactive frontend helper performs only bundled static proof lookup, validates finalized metadata, and has no RPC, contract, or active UI integration.
- [x] Confirm the isolated early-adopter UX shell is unmounted from the active app, disabled by default, informational only, and exposes no claim CTA.
- [ ] Keep discount UI disabled and `registerWithDiscount` unwired until a separate reviewed integration passes every frontend cutover gate.
- [ ] Before presenting a final discount action, confirm approved read paths verify root equality, frozen state, activation state, controller authorization, and already-used state; proof existence alone is insufficient.
- [x] Confirm reusable DiscountRegistry ABI/schema/event-handler coverage exists and passes indexer codegen/build.
- [ ] Replace the dormant DiscountRegistry template with reviewed concrete data-source wiring after the final address and exact start block are available.
- [ ] Deploy, fully sync, and health-check the reviewed mainnet subgraph before frontend cutover.

Safe creation/configuration verification is complete. Timelock deployment is the next authority blocker; its address remains `TBD`. Authority handoff, deployer revocation, deploy-grade RPC selection, Blockscout verification, contract deployment, final DiscountRegistry address/start-block wiring, mainnet indexer/subgraph deployment and sync, root/freeze/activation, final review, active discount integration, and frontend cutover remain unresolved launch blockers. The implemented handler/schema preparation and inactive static proof helper are not evidence of a deployed subgraph, usable discount, or frontend readiness. The production frontend remains testnet-bound, and mainnet remains **NO-GO**. This checklist is not mainnet deployment approval.

No deploy/push/on-chain action was performed in this phase.