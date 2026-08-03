# Arc Mainnet Deployment Runbook (Preparation Only)

> Tooling guard update: `snapshots/arc-testnet-v3-early-adopters/manifest.json` is the canonical campaign source. Mainnet tooling fails closed on missing, malformed, or contradictory facts. `deployV3.js` may deploy and wire the registry but never sets the root, freezes it, or activates the campaign. Those are three separate reviewed operations, and activation is blocked until verification, read-only authority handoff assertion, indexer readiness, proof delivery, and frontend cutover readiness are complete.

The finalized launch authority model and unresolved administration blockers are recorded in [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md).

The future Safe / Timelock / deployer-revocation ceremony and its read-only verification inputs are documented in [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md).

The Timelock input register, OpenZeppelin version behavior, future dry-run ceremony, and read-only checker are documented in [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md). Timelock deployment is the next authority blocker; it has not occurred, its address remains `TBD`, and mainnet remains **NO-GO**.

## Timelock-only ceremony gate (prepared, not executed)

`scripts/mainnet/deploy-timelock.js` is prepared but has **not** been executed. It deploys only `ArcNSTimelock`; it does not migrate protocol ownership or roles or perform follow-on configuration. The Timelock address remains **TBD**.

Write mode is forbidden until a deploy-grade Arc mainnet RPC is explicitly selected and approved, the intended deployer is funded, an operator explicitly approves the ceremony, and every required exact confirmation environment value is supplied. Radar remains rejected by the deployment guard; any future proposal to use it requires separately recorded explicit risk acceptance and a reviewed guard change. This includes `CONFIRM_MAINNET_TIMELOCK_DEPLOY=I_UNDERSTAND_THIS_DEPLOYS_MAINNET_TIMELOCK`. Independently review the printed chain ID, deployer, balance, Admin Safe, delay, role recipients, masked RPC, and exact constructor arguments before execution. After a successful future deployment, `scripts/mainnet/check-timelock-config.js` must report **PASS** before any handoff activity.

`TIMELOCK_DEPLOY_DRY_RUN=1` is preflight-only and must not deploy or write an artifact. Mainnet launch remains **NO-GO** and handoff remains pending.

Deploy-grade RPC acceptance and Blockscout verification blockers are tracked in [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md).

Before considering any RPC for a future ceremony, run the read-only `node scripts/mainnet/assess-rpc-deploy-grade.js` procedure documented there. Supply only transient non-secret assessment inputs; optional known receipt and contract addresses improve evidence. A `PASS_READ_ONLY_ASSESSMENT` is not deployment approval. Provider provenance, operational ownership, limits, support/SLA, redundancy, and explicit human approval remain separate gates. Until those gates are recorded, deploy-grade RPC is unresolved, Timelock deployment is **NO-GO**, and mainnet launch is **NO-GO**.

Mainnet indexer/subgraph inputs, event coverage, and frontend readiness gates are tracked in [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).

The separate frontend mainnet/discount cutover gates and rollback plan are tracked in [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

The consolidated launch inputs and Go/No-Go matrix are tracked in [`MAINNET_LAUNCH_INPUTS.md`](./MAINNET_LAUNCH_INPUTS.md).

The mainnet Admin Safe `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` has non-empty bytecode and a read-only verified exact 2-of-3 owner configuration. `node scripts/mainnet/check-safe-config.js` returned `PASS` using Radar solely as a read-only RPC. This resolves only Safe creation/configuration; Timelock deployment, contract deployment, handoff, deployer revocation, and final launch review remain pending.

Arc mainnet target: chain ID `5042`, deploy-grade RPC still to be finalized (the previously listed `https://rpc.blockdaemon.mainnet.arc.io` endpoint remains a candidate pending approval), explorer `https://arc-mainnet.cloud.blockscout.com`, native symbol `USDC`, USDC `0x3600000000000000000000000000000000000000`. The confirmed `https://radar-api-rpc.up.railway.app` endpoint is a read-only/testing fallback only and is not deployment-grade RPC.

1. Confirm a separately approved deployer and treasury configuration; never place credentials in source.
2. Run `npx hardhat run scripts/preflight-arc-mainnet.js --network arc_mainnet` and confirm `eth_chainId`, USDC bytecode, `symbol() == USDC`, and `decimals() == 6`.
   After a separately approved future Timelock deployment, run `node scripts/mainnet/check-timelock-config.js` with the final reviewed inputs and require its read-only PASS before any protocol deployment or handoff. It is not currently runnable because the Timelock address is `TBD`.
3. Set `USDC_ADDRESS` explicitly. `scripts/v3/deployV3.js` refuses to deploy MockUSDC on non-local networks.
4. To include early-adopter preparation, set only `DEPLOY_EARLY_ADOPTER_DISCOUNT_REGISTRY=true`. The script validates the version-controlled finalized manifest before any write, deploys exactly one shared registry from its campaign ID and snapshot block, authorizes both controllers, and leaves the root unset, unfrozen, and inactive. Any supplied campaign fact must exactly match the manifest.
5. The future `arc_mainnet` deployment path configures its newly deployed oracle with p1..p5 = 100/50/25/15/5 USDC and immediately verifies every read. Independently validate it with `scripts/check-mainnet-prices.js` before launch. This preparation task did not execute that path or call `setPrices` on any network.
6. After deployment and independent verification, use the single-purpose guarded set-root and freeze-root operations in separate reviews. Run the read-only authority assertion after handoff. Activation is a later separate operation and remains forbidden until verification, handoff, indexer, proof-delivery, and frontend readiness gates pass. A wrong frozen root is irreversible in that registry and requires replacement/migration plus controller reconfiguration.

The Blockscout API endpoint is intentionally configurable and unverified in this phase. No deployment, verification, transaction, signing, or launch action was performed.