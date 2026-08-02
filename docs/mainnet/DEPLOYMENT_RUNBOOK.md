# Arc Mainnet Deployment Runbook (Preparation Only)

The finalized launch authority model and unresolved administration blockers are recorded in [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md).

Arc mainnet target: chain ID `5042`, deploy-grade RPC still to be finalized (the previously listed `https://rpc.blockdaemon.mainnet.arc.io` endpoint remains a candidate pending approval), explorer `https://arc-mainnet.cloud.blockscout.com`, native symbol `USDC`, USDC `0x3600000000000000000000000000000000000000`. The confirmed `https://radar-api-rpc.up.railway.app` endpoint is a read-only/testing fallback only and is not deployment-grade RPC.

1. Confirm a separately approved deployer and treasury configuration; never place credentials in source.
2. Run `npx hardhat run scripts/preflight-arc-mainnet.js --network arc_mainnet` and confirm `eth_chainId`, USDC bytecode, `symbol() == USDC`, and `decimals() == 6`.
3. Set `USDC_ADDRESS` explicitly. `scripts/v3/deployV3.js` refuses to deploy MockUSDC on non-local networks.
4. To include early-adopter preparation, set `DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY=true`, `EARLY_ADOPTER_CAMPAIGN_ID`, and `EARLY_ADOPTER_SNAPSHOT_BLOCK`. `EARLY_ADOPTER_MERKLE_ROOT` is optional before finalization; `EARLY_ADOPTER_DISCOUNT_ACTIVE` and `EARLY_ADOPTER_FREEZE_ROOT` default to false. The script deploys exactly one shared registry, authorizes both controller addresses, and calls `setDiscountRegistry` on both controllers.
5. The future `arc_mainnet` deployment path configures its newly deployed oracle with p1..p5 = 100/50/25/15/5 USDC and immediately verifies every read. Independently validate it with `scripts/check-mainnet-prices.js` before launch. This preparation task did not execute that path or call `setPrices` on any network.
6. If no Merkle root is supplied, the deployment flow keeps the campaign inactive and refuses freeze/activation. Before launch, finalize and review the snapshot, set the root, freeze it, and activate the claim window. Contract-level `consume()` enforcement prevents use before freeze even if an admin sets active early.

The Blockscout API endpoint is intentionally configurable and unverified in this phase. No deployment, verification, transaction, signing, or launch action was performed.