# ArcNS Early-Adopter Proof Delivery Plan (Aşama 6B)

> **Proof-data preparation only.** This plan prepares a future frontend proof artifact and validation tooling. It does not activate discount UX, enable discount UI, approve launch, or perform any on-chain operation.

## A. Executive summary

The public proof delivery artifact is prepared for future frontend discount UX. This work does not activate the discount, enable discount UI, or approve mainnet launch. Proof delivery remains blocked until frontend integration, root freeze, contract deployment, indexer readiness, and launch approval are complete.

## B. Artifact details

- **Path:** `frontend/public/discount-proofs/arcns-v3-early-adopter-2026.json`
- **Campaign:** `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1`
- **Campaign bytes32:** `0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3`
- **Snapshot:** block `54933646`, hash `0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d`
- **Merkle root:** `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`
- **Eligible wallets:** `849`
- **Lookup:** `proofs[lowercaseWalletAddress]`; each value is a `bytes32[]`.
- **Normalization:** wallet keys must be valid, lowercase `0x` addresses with no duplicates.
- **Verification:** `keccak256(abi.encode(bytes32 campaignId, address account))`, followed by sorted-pair bytes32 Merkle hashing.

Sources are `snapshots/arc-testnet-v3-early-adopters/manifest.json`, `eligible-addresses.json`, `merkle-proofs.json`, and `scripts/mainnet/final-snapshot.js`. Contract expectations are defined by `ArcNSEarlyAdopterDiscountRegistry.sol`.

## C. Generation and validation

```text
node scripts/mainnet/generate-discount-proof-artifact.js
node scripts/mainnet/validate-discount-proof-artifact.js
```

Both commands are network-free, read-only, and require no signer or RPC.

## D. Frontend integration rules

- A typed helper now exists at `frontend/src/lib/discountProofs.ts`, but it is intentionally inactive and is not imported by any active UI or registration flow.
- The helper only fetches the bundled static artifact, validates its finalized metadata, normalizes an address, and performs a local proof lookup. It does not use RPC or call a contract.
- Look up proofs using the lowercase connected wallet address.
- A missing proof is an ineligible fallback; do not claim eligibility.
- Proof existence alone does not mean the discount is active, usable, or still unclaimed.
- Before presenting any final discount action, a future reviewed integration must fail closed unless root equality, frozen state, activation state, controller authorization, and already-used state have been checked through approved read paths.
- Enforce one-time use across both `.arc` and `.circle` namespaces.
- Do not discount an expired-name premium, if a premium exists.
- Keep discount UI hidden until activation approval.
- Do not assume the root is frozen until read-back confirms it.
- `registerWithDiscount` is not wired in this phase.
- An isolated `EarlyAdopterDiscountCard` UX shell now exists for explicitly reviewed preview use, but it is not mounted by the active app and the feature flag defaults to false. It performs no RPC or contract operation and exposes no claim or registration CTA.
- The shell's proof-found state is informational only: proof existence does not imply claim availability. Production must keep the flag disabled until mainnet deployment, root set and freeze readback, discount activation approval, used-state readback or indexer support, preview smoke tests, and frontend cutover approval are complete.

## E. Readiness gates

- [x] Artifact generated and validated.
- [x] 849 proofs present.
- [x] Root matches finalized root.
- [x] Inactive static proof lookup helper and unit coverage prepared.
- [ ] Active frontend discount integration reviewed and approved.
- [ ] Preview smoke tests passed.
- [ ] DiscountRegistry deployed.
- [ ] Root set and frozen.
- [ ] Discount inactive before launch.
- [ ] Activation approval granted.
- [ ] Indexer or direct-read fallback available for used state.

## F. Remaining blockers

Final mainnet addresses are TBD; the helper and artifact are not wired into active UI; `registerWithDiscount` is not wired; discount UI is not enabled; the root is not set/frozen on mainnet; DiscountRegistry is not deployed on mainnet; frontend cutover is not implemented; the indexer/subgraph is not deployed/synced; and final launch review is required. The helper is preparation only and does not mean the frontend discount UX is ready.

## G. Non-goals

This document does not deploy contracts, set/freeze the root, activate the discount, switch the frontend to mainnet, enable discount UI, or approve mainnet launch.