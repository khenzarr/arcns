# ArcNS Mainnet Day Quickstart

Status: executable preparation. No mainnet write has been performed by this document.

## What is already fixed

- Arc mainnet chain ID: `5042`.
- Arc mainnet USDC: `0x3600000000000000000000000000000000000000` with 6 decimals.
- Standard annual prices: `100 / 50 / 25 / 15 / 5` USDC for `1 / 2 / 3 / 4 / 5+` characters.
- Early-adopter annual prices: `50 / 25 / 15 / 10 / 2` USDC.
- Final snapshot: 849 wallets; root `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`.
- Admin Safe: `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`, verified as 2-of-3.
- Timelock delay: `172800` seconds. The Safe is proposer, executor and canceller; the Timelock is self-administered.

The Timelock delay does **not** impose a 48-hour wait on the initial launch. The deployer bootstraps the fresh contracts, grants upgrade authority to the Timelock, transfers operational authority to the Safe, and removes itself. The delay applies to later Timelock-controlled upgrades.

## Inputs that cannot exist before mainnet is available

Do not begin writes until all of these are known and reviewed:

1. An approved deploy-grade Arc mainnet RPC and a separate read fallback.
2. A funded deployer with a reviewed minimum balance.
3. A working Blockscout API/verification route for chain 5042.
4. An indexer provider that exposes the exact Arc mainnet network slug.
5. The production and rollback operators for the frontend and indexer.
6. A documented security launch decision. The repository contains extensive tests and internal review material, but no completed independent external audit.

## Contract launch sequence

Use transient environment variables or an approved local secret store. Never commit a private key, RPC credential, API key, or populated environment file.

1. Run the RPC assessment, mainnet preflight and Safe checker. Require PASS from all three.
2. Deploy the Timelock with `scripts/mainnet/deploy-timelock.js`; then require PASS from `scripts/mainnet/check-timelock-config.js`.
3. Run the canonical protocol deployment:

   ```text
   npx hardhat run scripts/v3/deployV3.js --network arc_mainnet
   ```

   Required launch inputs include the exact confirmation, `USDC_ADDRESS`, `TREASURY_ADDRESS`, `EXPECTED_DEPLOYER_ADDRESS`, `EXPECTED_ADMIN_SAFE_ADDRESS`, `MIN_DEPLOYER_BALANCE_WEI`, `DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY=true`, the deploy-grade RPC, and the deployer key. The script refuses the wrong chain, wrong USDC, missing Safe bytecode, missing discount registry, insufficient reviewed balance, and an existing mainnet deployment artifact. It records contract receipts, block hashes, bootstrap transactions, and constructor/initializer inputs.

4. Set the approved `ARC_MAINNET_EXPLORER_API_URL` and, if required by the provider, `ARC_MAINNET_EXPLORER_API_KEY`; then run `npx hardhat run scripts/v3/verifyV3.js --network arc_mainnet`. The guarded verifier covers every standalone contract, all three UUPS proxy/implementation linkages, DiscountRegistry and Timelock. Reconcile every address and receipt with `deployments/arc_mainnet-v3.json`.
5. Run `scripts/mainnet/handoff-admin.js`. It is resumable by state: already completed grants, revocations and ownership transfers are skipped; unexpected owners or missing code fail closed.
6. Run the read-only `scripts/mainnet/assert-admin-handoff.js`. This verifies ownership, role separation, deployer removal, treasury, registrar/controller/resolver/reverse wiring, shared DiscountRegistry authorization, unpaused controllers and `100/50/25/15/5` oracle prices.
7. Generate the three Safe files with `scripts/mainnet/generate-safe-discount-batches.js`. Independently compare the destination, calldata and hashes in `REVIEW.json` before each signature.
8. Import and execute `01-set-root.json`; verify with `EXPECTED_DISCOUNT_STAGE=root-set` and `scripts/mainnet/verify-discount-state.js`.
9. Import and execute `02-freeze-root.json`; this is irreversible. Verify with `EXPECTED_DISCOUNT_STAGE=frozen`.

Do not execute `03-activate.json` yet.

## Indexer and frontend cutover

1. Generate `indexer/subgraph.mainnet.yaml` with `scripts/mainnet/generate-mainnet-subgraph.js`. The generator takes all eight addresses and exact start blocks from the reconciled deployment artifact; it refuses missing receipt evidence. `GRAPH_MAINNET_NETWORK` must be supplied by the chosen provider and is never guessed.
2. Build and deploy the indexer, wait until it reaches the current finalized block, then compare registrations, renewals, transfers, resolution and discount events with direct RPC reads.
3. Generate the frontend address file:

   ```text
   node scripts/generate-frontend-config.js --network arc_mainnet
   ```

4. Set the reviewed mainnet subgraph URL in the preview environment, build, deploy preview, and test both TLDs with eligible, ineligible and already-used wallets.
5. Confirm the previous production deployment is still a usable rollback target.
6. Execute `03-activate.json` only after the preceding gates pass, then require `EXPECTED_DISCOUNT_STAGE=active` verification.
7. Promote the already tested preview configuration to production and run the final smoke matrix.

## Final smoke matrix

- Search and price: 1, 2, 3, 4 and 5+ character names on both TLDs.
- Standard registration: approve, commit, maturity wait, register, NFT owner, expiry and resolver.
- Eligible registration: discount selected by default, standard price struck through, correct discounted approval and one-time consumption.
- Ineligible and used wallets: no discount transaction path.
- Renew, set primary, forward resolve, reverse resolve, My Domains, Send and public resolver API.
- Safe ownership/threshold, Timelock roles/delay, deployer authority absence, controllers unpaused.
- Indexer sync/lag, proof delivery, RPC health, explorer links, frontend health and rollback target.

## Honest go/no-go

The contracts can be deployed and handed off on mainnet day without writing new code. A complete public launch is still conditional on runtime facts that cannot be pre-created: deploy-grade RPC approval, funded signer, final addresses/receipts, explorer verification, an Arc-mainnet-capable indexer target and sync, and the explicit security/launch decision.
