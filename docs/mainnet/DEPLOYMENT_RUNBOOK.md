# Arc Mainnet Deployment Runbook (Preparation Only)

> Tooling guard update: `snapshots/arc-testnet-v3-early-adopters/manifest.json` is the canonical campaign source. Mainnet tooling fails closed on missing, malformed, or contradictory facts. `deployV3.js` may deploy and wire the registry but never sets the root, freezes it, or activates the campaign. Those are three separate reviewed operations, and activation is blocked until verification, read-only authority handoff assertion, indexer readiness, proof delivery, and frontend cutover readiness are complete.

The finalized launch authority model and unresolved administration blockers are recorded in [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md).

The future Safe / Timelock / deployer-revocation ceremony and its read-only verification inputs are documented in [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md).

Deploy-grade RPC acceptance and Blockscout verification blockers are tracked in [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md).

Mainnet indexer/subgraph inputs, event coverage, and frontend readiness gates are tracked in [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).

The separate frontend mainnet/discount cutover gates and rollback plan are tracked in [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

Arc mainnet target: chain ID `5042`, deploy-grade RPC still to be finalized (the previously listed `https://rpc.blockdaemon.mainnet.arc.io` endpoint remains a candidate pending approval), explorer `https://arc-mainnet.cloud.blockscout.com`, native symbol `USDC`, USDC `0x3600000000000000000000000000000000000000`. The confirmed `https://radar-api-rpc.up.railway.app` endpoint is a read-only/testing fallback only and is not deployment-grade RPC.

1. Confirm a separately approved deployer and treasury configuration; never place credentials in source.
2. Run `npx hardhat run scripts/preflight-arc-mainnet.js --network arc_mainnet` and confirm `eth_chainId`, USDC bytecode, `symbol() == USDC`, and `decimals() == 6`.
3. Set `USDC_ADDRESS` explicitly. `scripts/v3/deployV3.js` refuses to deploy MockUSDC on non-local networks.
4. To include early-adopter preparation, set only `DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY=true`. The script validates the version-controlled finalized manifest before any write, deploys exactly one shared registry from its campaign ID and snapshot block, authorizes both controllers, and leaves the root unset, unfrozen, and inactive. Any supplied campaign fact must exactly match the manifest.
5. The future `arc_mainnet` deployment path configures its newly deployed oracle with p1..p5 = 100/50/25/15/5 USDC and immediately verifies every read. Independently validate it with `scripts/check-mainnet-prices.js` before launch. This preparation task did not execute that path or call `setPrices` on any network.
6. After deployment and independent verification, use the single-purpose guarded set-root and freeze-root operations in separate reviews. Run the read-only authority assertion after handoff. Activation is a later separate operation and remains forbidden until verification, handoff, indexer, proof-delivery, and frontend readiness gates pass. A wrong frozen root is irreversible in that registry and requires replacement/migration plus controller reconfiguration.

The Blockscout API endpoint is intentionally configurable and unverified in this phase. No deployment, verification, transaction, signing, or launch action was performed.