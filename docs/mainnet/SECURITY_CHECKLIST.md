# Mainnet Security Checklist

Infrastructure acceptance evidence: [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md).

Indexer/subgraph readiness evidence: [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).

Frontend mainnet/discount cutover readiness evidence: [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

Proof delivery evidence: [`PROOF_DELIVERY_PLAN.md`](./PROOF_DELIVERY_PLAN.md).

- [ ] Confirm every ownership, admin, upgrade, pause, treasury, and deployer-revocation item in [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md).
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
- [ ] Keep discount UI disabled and `registerWithDiscount` unwired until a separate reviewed integration passes every frontend cutover gate.
- [ ] Before presenting a final discount action, confirm approved read paths verify root equality, frozen state, activation state, controller authorization, and already-used state; proof existence alone is insufficient.
- [x] Confirm reusable DiscountRegistry ABI/schema/event-handler coverage exists and passes indexer codegen/build.
- [ ] Replace the dormant DiscountRegistry template with reviewed concrete data-source wiring after the final address and exact start block are available.
- [ ] Deploy, fully sync, and health-check the reviewed mainnet subgraph before frontend cutover.

Deploy-grade RPC selection, Blockscout verification, final DiscountRegistry address/start-block wiring, mainnet indexer/subgraph deployment and sync, active discount integration, and frontend cutover remain unresolved launch blockers. The implemented handler/schema preparation and inactive static proof helper are not evidence of a deployed subgraph, usable discount, or frontend readiness. The production frontend remains testnet-bound. This checklist is not mainnet deployment approval.

No deploy/push/on-chain action was performed in this phase.