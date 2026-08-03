# Arc Mainnet Deploy Infrastructure Readiness (Aşama 5C)

Status: read-only infrastructure preparation. This document records acceptance criteria and current evidence; it does not approve or execute deployment.

## Executive summary

- An explicitly approved deploy-grade RPC is a launch blocker.
- `https://radar-api-rpc.up.railway.app` remains a read-only/testing fallback only.
- The Blockscout verification path must be validated before deployment.
- Mainnet indexer/subgraph readiness is tracked in [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).
- Frontend mainnet/discount cutover readiness is tracked in [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).
- This document does not approve mainnet deployment.

The consolidated launch inputs and Go/No-Go matrix are tracked in [`MAINNET_LAUNCH_INPUTS.md`](./MAINNET_LAUNCH_INPUTS.md).

## RPC endpoint classification

| Endpoint | Classification | Evidence | Allowed use | Launch blocker? |
|---|---|---|---|---|
| Blockdaemon authorized RPC | Candidate / `TBD` | Public request returned `401`; an authorized endpoint has not passed the complete checklist | None until authorization, testing, and explicit approval | Yes |
| Radar RPC | Read-only/testing fallback only | Extended three-attempt read check and Hardhat preflight passed on 2026-08-03: chain `5042`, latest block data, USDC code/metadata, gas price, fee history, and provider fee data; not approved for signing or deployment | Read-only diagnostics and fallback reads | Yes — a primary is still required |
| Thirdweb public endpoint | Not deploy-grade | Returned chain ID but failed deeper reads | None for signing/deployment | Yes |
| Infura / Alchemy project endpoint | Candidate only | Prior demo/project paths were not deploy-ready; Arc access and complete checks remain unproven | None until project-specific approval and checks pass | Yes |

No secret or tokenized URL is recorded here. Deployment evidence must mask credentials and query strings.

## Deploy-grade RPC acceptance criteria

An endpoint is not approved merely because a readiness script passes. Approval requires all of the following:

- [ ] Provider is authorized or the endpoint is explicitly approved.
- [ ] Endpoint uses HTTPS only.
- [ ] Endpoint is not backed by a public, demo, or shared key.
- [ ] No community endpoint is used for signing or deployment.
- [ ] `eth_chainId` returns `5042`.
- [ ] Latest block number can be fetched.
- [ ] `eth_getBlockByNumber` for latest returns valid block data.
- [ ] `eth_getCode` returns non-empty bytecode for Arc USDC `0x3600000000000000000000000000000000000000`.
- [ ] `eth_call` returns `USDC` for `symbol()` and `6` for `decimals()`.
- [ ] `eth_gasPrice` works.
- [ ] `eth_feeHistory` works when supported; lack of support is recorded rather than misreported.
- [ ] ethers/Hardhat provider fee data works when available.
- [ ] Key reads are stable across at least three attempts.
- [ ] `npx hardhat run scripts/preflight-arc-mainnet.js --network arc_mainnet` passes.
- [ ] No secret must be committed to the repository.
- [ ] The RPC is supplied only through a temporary shell environment or approved secret manager during deployment.
- [ ] At least one primary deploy RPC and one read-only fallback are available before deployment.
- [ ] The deployment ceremony stops if the primary fails or returns inconsistent chain data.

Read-only extended check: `node scripts/mainnet/check-rpc-readiness.js`. A `readiness-passed` result is evidence only and is not automatic deploy-RPC approval.

## Blockscout verification readiness

- **Browser URL:** `https://arc-mainnet.cloud.blockscout.com`
- **Candidate API URL:** `https://arc-mainnet.cloud.blockscout.com/api` was tested as a legacy candidate and returned HTML/`404`, not JSON. It is not a validated Hardhat verification API. A separate final candidate must be supplied through `ARC_MAINNET_EXPLORER_API_URL`. No secret URL belongs in source or documentation.
- **Hardhat config:** `hardhat.config.js` has `etherscan.customChains` for `arc_mainnet`, chain ID `5042`, the browser URL above, and an environment-driven API URL. Mainnet does not currently have an explicit `etherscan.apiKey` entry.
- **API key:** unresolved. Blockscout deployments may permit a placeholder/no key or may require a provider-issued key; confirm against the final API. Never store it in source.
- **API reachability:** browser-host candidates `/api` and `/api/v2/stats` both failed harmless JSON reachability checks with HTML/`404`. No Etherscan/Hardhat-compatible endpoint was established. Use `node scripts/mainnet/check-blockscout-readiness.js` for harmless JSON reachability/classification checks when the explorer operator supplies a candidate.
- **Hardhat preparation:** compiler `0.8.26`, optimizer enabled with 200 runs, `viaIR: true`, and `evmVersion: cancun` are configured, so verification commands can be prepared without deploying or submitting a verification request.
- **Proxy verification:** proxy addresses may require a separate Blockscout proxy-association or proxy-verification process after implementation source verification. Confirm the final explorer workflow before deployment.
- **Known uncertainties:** exact API URL/version, API-key policy, Hardhat plugin compatibility, proxy-association workflow, and response behavior remain unresolved. HTML returned from a candidate API is not valid API evidence.

Preserve constructor arguments for directly deployed contracts. For proxies, preserve proxy type, proxy address, implementation address, initializer calldata/arguments, implementation constructor arguments where applicable, and every upgrade plugin manifest/artifact needed to reproduce the relationship. Preserve linked-library addresses if any.

## Required deployment-time evidence

- Exact RPC provider used, with URL credentials and query strings masked
- Chain ID observed
- Latest block immediately before deployment
- Deployer address
- All deployed addresses
- Implementation addresses for proxies
- Constructor arguments
- Initializer arguments and calldata
- Library addresses, if any
- Compiler version
- Optimizer and EVM settings
- Commit hash
- Deployment artifact path
- Exact verification command used
- Verification result URLs

## Remaining blockers

- [ ] Deploy-grade RPC approval
- [ ] Blockscout API validation
- [ ] Final Safe and Timelock addresses
- [ ] Actual authority handoff execution and read-only confirmation
- [ ] Mainnet indexer/subgraph
- [ ] Frontend cutover
- [ ] Final launch review

## Non-goals and safety boundary

- This document does not deploy contracts.
- This document does not verify contracts.
- This document does not approve mainnet launch.
- This document does not modify frontend production config.
- This phase does not sign, submit transactions, call write functions, create a Safe, deploy a Timelock, transfer ownership, change roles, change prices, change a Merkle root, or activate a discount.