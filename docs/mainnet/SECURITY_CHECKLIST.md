# Mainnet Security Checklist

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

Deploy-grade RPC selection, Blockscout verification, mainnet indexer/subgraph deployment, and frontend cutover remain unresolved launch blockers. This checklist is not mainnet deployment approval.

No deploy/push/on-chain action was performed in this phase.