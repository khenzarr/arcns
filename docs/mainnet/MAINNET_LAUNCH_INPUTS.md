# ArcNS Mainnet Launch Inputs and Go/No-Go Readiness (Aşama 7A)

Status: input register and readiness planning only. This document is not launch approval and does not execute any launch operation.

## Aşama 7C-2A Timelock tooling status

| Input | Required value / status |
|---|---|
| Guarded script | `scripts/mainnet/deploy-timelock.js` — prepared, not executed |
| Timelock address | **TBD — not deployed** |
| Delay | `172800` seconds |
| Proposer / executor / canceller | Admin Safe `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` |
| Deployment RPC | **TBD — deploy-grade endpoint unresolved; Radar is read-only only** |
| Deployer funding | Required and rechecked at ceremony time |
| Operator approval | Required before write mode |
| Exact confirmation | `CONFIRM_MAINNET_TIMELOCK_DEPLOY=I_UNDERSTAND_THIS_DEPLOYS_MAINNET_TIMELOCK` |
| Post-deployment check | `scripts/mainnet/check-timelock-config.js` must report **PASS** |

Mainnet launch remains **NO-GO** and handoff remains pending. No address, transaction, block, or deployment artifact was created by this tooling phase.

## Aşama 7C-2B RPC assessment status

`scripts/mainnet/assess-rpc-deploy-grade.js` provides a signer-free, transaction-free candidate capability assessment using transient `RPC_URL`, `EXPECTED_CHAIN_ID=5042`, `DEPLOYER_ADDRESS`, and `ADMIN_SAFE_ADDRESS`, with optional known receipt and contract inputs. Its output separates a read-only technical verdict from the deploy-grade recommendation. A technical PASS is never automatic deployment approval. Radar assessment evidence still requires explicit risk acceptance or a separately reviewed provider decision, and the Timelock deploy guard remains unchanged. The deploy-grade RPC input remains `TBD`; Timelock and mainnet launch remain **NO-GO**.

## A. Executive summary

- This document is the canonical launch input register and Go/No-Go readiness matrix; it is not a deployment instruction or launch approval.
- Mainnet deployment remains blocked until every required input is finalized, independently verified, recorded, and reviewed.
- Unknown values remain `TBD`. A placeholder is a blocker and must never be inferred from testnet data or repository metadata.
- This document must not contain secrets, private keys, wallet credentials, API keys, tokenized RPC URLs, unmasked provider credentials, or invented contract addresses.
- Known network facts are Arc mainnet chain ID `5042` and USDC `0x3600000000000000000000000000000000000000`, symbol `USDC`, decimals `6`.
- Final pricing is 1/2/3/4/5+ characters at 100/50/25/15/5 USDC per year.
- The finalized early-adopter input is campaign `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1`, campaign bytes32 `0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3`, snapshot block `54933646`, snapshot block hash `0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d`, Merkle root `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`, and 849 eligible wallets. These finalized data inputs are not evidence of any mainnet root operation or activation.
- Timelock readiness and future read-only validation are tracked in [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md). The Timelock is the next authority blocker; it is not deployed, its address remains `TBD`, and mainnet remains **NO-GO**.

## B. Required pre-deployment inputs

`TBD` and any status other than Final/Approved are blocking where the final column says Yes. Provider URLs recorded as evidence must be masked; credentials and query values must never be copied here.

Future deploy-grade RPC access may use `RPC_AUTH_MODE=none|bearer|x-api-key|custom`. Header tokens and custom header values are execution-time secrets only: do not put them in URLs, commit them, log them, paste them into PRs, or write them to artifacts. Authentication support does not change the unresolved/TBD provider approval gate.

| Input | Required value | Status | Source / owner | Validation method | Blocks deploy? |
|---|---|---|---|---|---|
| Deployer EOA | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final verification pending | Deployment operator / final launch review | Independently verify address, operator control, and deployment-only authority boundary | Yes |
| Deployer funding requirement | `TBD` | Blocked | Deployment operator / infrastructure owner | Reviewed gas estimate, fee buffer, and read-only balance check before ceremony | Yes |
| Treasury recipient | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final verification pending | Approved authority model / final launch review | Confirm exact equality with finalized deployer address and controller treasury read-back after deployment | Yes |
| Admin Safe address | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | PASS; read-only verified | Safe operators / final launch review | Chain ID `5042`, bytecode, exact owners, threshold, and Safe/owner separation verified | Yes — complete handoff remains required |
| Admin Safe owner 1 | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Verified | Safe operators | Exact owner-set read-back matched | Yes — handoff remains required |
| Admin Safe owner 2 | `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396` | Verified | Safe operators | Exact owner-set read-back matched | Yes — handoff remains required |
| Admin Safe owner 3 | `0x1e19c1c829A387c2246567c0df264D81310d7775` | Verified | Safe operators | Exact owner-set read-back matched | Yes — handoff remains required |
| Admin Safe threshold | `2-of-3` | Verified | [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md) | Read-only threshold and exact owner-set verification passed | Yes — handoff remains required |
| Admin Safe creation transaction | `0x32914d51e3372b7380b40b94343909773b9ff40c5879e6a7d124731c4a862de1` | Recorded; receipt status `1` | Safe creation record | Safe factory/proxy creation receipt | No — evidence only |
| Admin Safe creation block | `13589138` | Recorded | Safe creation record | Block hash `0x8a89a16f705a759acb150502d8e918f8893ff3f2128b80bb6ca8ab518322e711` | No — evidence only |
| Timelock minDelay | `172800` seconds (48 hours) | Approved input; deployed read-back pending | [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md) | Read-only `getMinDelay()` against final Timelock | Yes |
| Timelock proposer | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Blocked; Timelock not deployed | Approved authority model / Safe operators | Read-only Timelock role membership check | Yes |
| Timelock canceller | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Blocked; Timelock not deployed | Approved authority model / Safe operators | Read-only Timelock role membership check | Yes |
| Timelock executor | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Blocked; Timelock not deployed | Approved authority model / Safe operators | Read-only Timelock role membership check | Yes |
| Deploy-grade RPC provider | `TBD` | Blocked | Infrastructure owner | Provider authorization plus full acceptance checklist and explicit approval | Yes |
| Deploy-grade RPC masked URL | `TBD` | Blocked | Infrastructure owner / approved secret manager | HTTPS shape check, masked evidence, chain and stability checks; never record token/query value | Yes |
| Read-only fallback RPC | Radar RPC (`https://radar-api-rpc.up.railway.app`) | Read-only/testing fallback confirmed; production use not approved | [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md) | Repeat read-only readiness check; never use for signing or deployment | Yes — primary deploy RPC still required |
| Blockscout browser URL | `https://arc-mainnet.cloud.blockscout.com` | Known browser URL; final launch use review pending | [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md) / infrastructure owner | Browser reachability and correct Arc mainnet address/transaction paths | No by itself |
| Blockscout API URL | `TBD` | Blocked | Explorer / infrastructure owner | Harmless JSON reachability and compatibility classification | Yes |
| Blockscout API-key policy | `TBD` | Blocked | Explorer / infrastructure owner | Confirm required/optional policy and approved secret handling without exposing a key | Yes |
| Verification command/path | `TBD` | Blocked | Deployment and verification operator | Dry-review exact Hardhat/plugin path, compiler settings, args handling, and proxy workflow without submission | Yes |
| Indexer provider/target | `TBD` | Blocked | Indexer owner | Provider capability, historical reads, deployment ownership, health, and rollback review | Yes |
| Frontend preview environment owner | `TBD` | Blocked | Frontend/release owner | Confirm account/project access, preview-only scope, approver, and evidence owner | Yes |
| Frontend production environment owner | `TBD` | Blocked | Frontend/release owner | Confirm production access boundary, approver, and rollback authority | Yes |
| Rollback owner | `TBD` | Blocked | Final launch review | Named operational acceptance and tested rollback procedure | Yes |

## C. Required post-deployment inputs

All values in this section remain `TBD` until produced by a reviewed future deployment or release operation. Testnet values must not be copied into these rows.

| Input | Required value | Status | Source / owner | Validation method | Blocks launch? |
|---|---|---|---|---|---|
| Registry address | `TBD` | Blocked | Final deployment record | Address shape, non-empty bytecode, receipt/artifact reconciliation, ownership read | Yes |
| `.arc` registrar address | `TBD` | Blocked | Final deployment record | Address shape, bytecode, receipt/artifact reconciliation, owner/controller reads | Yes |
| `.circle` registrar address | `TBD` | Blocked | Final deployment record | Address shape, bytecode, receipt/artifact reconciliation, owner/controller reads | Yes |
| `.arc` controller address | `TBD` | Blocked | Final deployment record | Proxy/bytecode checks, implementation and role reads, registry/treasury reads | Yes |
| `.circle` controller address | `TBD` | Blocked | Final deployment record | Proxy/bytecode checks, implementation and role reads, registry/treasury reads | Yes |
| Resolver address | `TBD` | Blocked | Final deployment record | Proxy/bytecode checks, implementation and role reads | Yes |
| Reverse registrar address | `TBD` | Blocked | Final deployment record | Address shape, bytecode, receipt/artifact reconciliation, owner read | Yes |
| PriceOracle address | `TBD` | Blocked | Final deployment record | Bytecode/owner reads and independent 100/50/25/15/5 USDC price reads | Yes |
| DiscountRegistry address | `TBD` | Blocked | Final deployment record | Bytecode, owner, campaign, snapshot block, root/frozen/active, and controller authorization reads | Yes |
| TimelockController address | `TBD` | Blocked | Final Timelock deployment record | Bytecode, delay, role membership, and bootstrap-admin final-state reads | Yes |
| Deployment block per contract | `TBD` | Blocked | Transaction receipts / final artifact | Reconcile each receipt, artifact, explorer record, and indexer start block | Yes |
| Deployment block hash per contract | `TBD` | Blocked | Arc mainnet block records | Read block by number and reconcile transaction receipt/hash evidence | Yes |
| Implementation address per proxy, if applicable | `TBD` | Blocked | Upgrade plugin manifest / proxy reads | Read implementation slot/plugin output and reconcile verified implementation | Yes |
| Constructor args | `TBD` | Blocked | Final deployment artifact / operator record | Reproduce encoding and compare with deployed/verification metadata | Yes |
| Initializer args | `TBD` | Blocked | Final deployment artifact / operator record | Reproduce initializer calldata and compare with deployment evidence/state reads | Yes |
| Verification URLs | `TBD` | Blocked | Final Blockscout verification results | Open each URL and confirm source, compiler settings, args, proxy/implementation relationship | Yes |
| Deployment artifact path | `TBD` | Blocked | Deployment operator | Reviewed repository-relative or controlled evidence path; reconcile every address and block | Yes |
| Mainnet subgraph endpoint | `TBD` | Blocked | Indexer deployment output | Query health, chain identity, sync state, smoke queries, and direct-read comparison | Yes |
| Subgraph deployment ID/name | `TBD` | Blocked | Indexer provider / indexer owner | Provider record and manifest/version reconciliation | Yes |
| Subgraph synced block | `TBD` | Blocked | Indexer health evidence | Compare indexed block/hash and approved lag against Arc mainnet latest block | Yes |
| Frontend mainnet preview URL | `TBD` | Blocked | Frontend preview deployment record | Preview smoke checklist with final public configuration and writes controlled | Yes |
| Frontend production rollback target | `TBD` | Blocked | Frontend/release owner | Verify previous approved production deployment/config and exercise reviewed rollback procedure | Yes |

## D. Go/No-Go readiness matrix

`GO` means the named preparation artifact is complete for its stated scope; it does not override a `NO-GO` elsewhere or authorize deployment. Runtime and launch-dependent areas remain `NO-GO` until final evidence exists.

| Area | Current status | Required evidence | Go/No-Go | Notes |
|---|---|---|---|---|
| Brand/legal | Remediation completed | Reviewed public brand/legal documents and final launch recheck | GO | Completed preparation; recheck during final review |
| Pricing | Final schedule prepared | Canonical 100/50/25/15/5 USDC schedule and independent deployed oracle reads | GO | Input is final; deployed oracle evidence remains part of contract launch gates |
| Snapshot root | Final snapshot data prepared | Campaign, bytes32, block/hash, root, count, and independent artifact validation | GO | Does not mean root is set on mainnet |
| Proof artifact | Generated and validated with 849 entries | Validator PASS against finalized snapshot/root | GO | Delivery integration and used-state checks remain incomplete |
| DiscountRegistry contract logic | Focused logic review and tests completed | Reviewed contract behavior and final launch re-review | GO | Deployment and runtime configuration remain separate gates |
| Launch tooling guards | Fail-closed guards and separated lifecycle scripts prepared | Code review and syntax/tests already recorded; final operator review | GO | Write-capable scripts have not been run here |
| Admin Safe | Created; exact 2-of-3 configuration read-only verified | Complete Safe address, owners, threshold, chain, bytecode, and address-separation evidence; complete handoff still required | NO-GO | Safe creation/configuration is resolved; Timelock and authority handoff remain open |
| Timelock | Not deployed; address and final bootstrap setup `TBD` | Final deployment plus 172800-second delay and complete role/admin reads | NO-GO | Timelock is not deployed by this phase |
| Deployer revocation | Not executed or verified | Complete handoff evidence and read-only assertion PASS, plus checks outside script coverage | NO-GO | Deployer must retain no protocol authority |
| Deploy-grade RPC | Not approved | Provider ownership, masked endpoint, repeated readiness evidence, preflight PASS, explicit approval | NO-GO | Radar remains read-only/testing fallback only |
| Blockscout verification | API and workflow unresolved | Validated API/key policy, plugin/proxy path, and reviewed command | NO-GO | Browser URL alone is insufficient |
| Contract deployment | No mainnet contracts deployed | Final receipts, addresses, bytecode, blocks/hashes, args, artifacts, and reviews | NO-GO | No deployment occurs in Aşama 7A |
| Root set | Not performed | Finalized root read-back from deployed DiscountRegistry after approved operation | NO-GO | Guarded write operation is forbidden in this task |
| Root freeze | Not performed | Frozen-state/root read-back and irreversible-operation review evidence | NO-GO | Guarded irreversible write is forbidden in this task |
| Discount activation | Not performed | All activation prerequisites, explicit approval, and active-state read-back | NO-GO | Activation is forbidden in this task |
| Indexer/subgraph | Not deployed or synced | Final manifest, addresses/start blocks, deployment, sync, queries, comparisons, health evidence | NO-GO | No endpoint exists |
| DiscountRegistry indexing | Reusable ABI/schema/handlers prepared; concrete source absent | Final address/start block wiring, deployed/synced lifecycle and `DiscountUsed` evidence | NO-GO | Dormant template indexes nothing |
| Frontend proof helper | Inactive local helper and tests prepared | Final preview evidence combined with approved lifecycle/used-state reads | GO | Helper alone does not establish claim availability |
| Discount UX shell | Unmounted and disabled by default | Reviewed preview integration after every discount gate passes | GO | GO only for safe disabled shell preparation; UI remains disabled |
| Frontend mainnet cutover | Not implemented | Final addresses/endpoints/config, preview deployment, smoke tests, approval, rollback evidence | NO-GO | Production remains testnet-bound |
| Used-state handling | Not implemented in active UX | Indexed `DiscountUsed` or approved direct read and cross-namespace already-used tests | NO-GO | Proof existence is insufficient |
| Monitoring/rollback | Owners, targets, and evidence are `TBD` | Named owners, thresholds, alerts, fallback behavior, tested rollback target/procedure | NO-GO | Must cover indexer, proof delivery, RPC, and frontend |
| Final launch approval | Not complete | Consolidated evidence review with every blocker closed and explicit approval | NO-GO | This document is not approval |

## E. Command checklist

Commands are recorded for future reviewed use. Environment values must be supplied transiently or through an approved secret manager and must not be committed. No write-capable command listed below was run during this task.

| Command | Purpose | Required env/input | Capability | Allowed to run | Currently runnable? |
|---|---|---|---|---|---|
| `node scripts/mainnet/check-rpc-readiness.js` | Repeated chain, latest-block, USDC, gas, and fee-data readiness checks | `ARC_MAINNET_RPC_URL` as a real HTTPS endpoint; output masks tokenized paths/query values | Read-only network calls | During provider evaluation or pre-deployment recheck; never as automatic provider approval | Conditional only; no deploy-grade RPC is finalized |
| `node scripts/mainnet/assess-rpc-deploy-grade.js` | Assess chain/block freshness, account reads, fee/estimate capability, Safe calls/code, optional receipt/log/code support, and repeated block stability; print a separate verdict and recommendation | Transient `RPC_URL`, `EXPECTED_CHAIN_ID=5042`, deployer and Admin Safe addresses; optional reference receipt/contract addresses | Read-only network calls, no signer, no artifact write, batching disabled | Candidate assessment only; never as automatic deployment approval | Yes for assessment; deploy-grade RPC remains unresolved |
| `node scripts/mainnet/check-blockscout-readiness.js` | Harmless JSON reachability and API compatibility classification | `ARC_MAINNET_EXPLORER_API_URL` as a real HTTPS candidate; no API key required by the checker | Read-only HTTP GET | When the explorer owner supplies a reviewed API candidate; no verification submission | No; final API candidate is `TBD` |
| `npx hardhat run scripts/preflight-arc-mainnet.js --network arc_mainnet` | Assert chain `5042`, latest block, and known USDC bytecode/symbol/decimals | Configured `arc_mainnet` read provider, normally via transient `ARC_MAINNET_RPC_URL` | Read-only network calls | Provider evaluation and final pre-deployment preflight only | Conditional for read-only fallback; not evidence of deploy-grade approval |
| `node scripts/mainnet/validate-discount-proof-artifact.js` | Validate finalized artifact metadata, count, and every Merkle proof | Version-controlled finalized snapshot and bundled proof artifact; no env, signer, or RPC | Read-only, local and network-free | Any review/CI context | Yes |
| `node scripts/mainnet/check-safe-config.js` | Validate Safe chain, bytecode, exact owner set, threshold, and separation from owner EOAs | `SAFE_RPC_URL`, `EXPECTED_CHAIN_ID=5042`, verified Safe address, approved owners, and threshold `2`; Radar is read-only/testing only | Read-only network calls; no signer | Passed against the verified mainnet Safe | PASS; deploy-grade RPC remains TBD |
| `node scripts/mainnet/check-timelock-config.js` | Validate Timelock chain, bytecode, delay, role constants, Safe roles, self-administration, and optional deployer-admin absence | Future deploy-grade/read provider, `EXPECTED_CHAIN_ID=5042`, final Timelock address, `EXPECTED_MIN_DELAY=172800`, verified Admin Safe, and optional deployer | Read-only network calls; no signer | Only after a future approved Timelock deployment | No; Timelock address is `TBD` |
| `npx hardhat run scripts/mainnet/assert-admin-handoff.js --network arc_mainnet` | Assert configured owners, roles, treasury, bytecode, and deployer revocation | Final expected Safe, Timelock, treasury, deployer, and all contract addresses, or reviewed artifact path; read provider | Read-only network calls | Only after final deployment and handoff, before public launch | No; final addresses/deployment/handoff are missing |
| `npx hardhat run scripts/mainnet/discount-set-root.js --network arc_mainnet` | Set only the finalized DiscountRegistry Merkle root after state/owner guards | `CONFIRM_MAINNET_WRITE=YES`, final registry and expected owner, Arc mainnet provider and signer; canonical snapshot | **Write-capable; signs and submits a transaction** | Only in a separately approved post-deployment ceremony after verification and handoff prerequisites | No; forbidden in this task and prerequisites are incomplete |
| `npx hardhat run scripts/mainnet/discount-freeze-root.js --network arc_mainnet` | Irreversibly freeze the finalized root after exact read-back guards | `CONFIRM_MAINNET_WRITE=YES`, final registry and expected owner, Arc mainnet provider and signer; exact root already set | **Write-capable and irreversible; signs and submits a transaction** | Only in a separate independently reviewed freeze ceremony | No; forbidden in this task and root is not set |
| `npx hardhat run scripts/mainnet/discount-activate.js --network arc_mainnet` | Activate the finalized campaign after root and readiness guards | Set-root inputs plus all five `CONFIRM_*_READY=YES` flags and explicit approval | **Write-capable; signs and submits a transaction** | Only after contracts, verification, handoff, indexer, proof delivery, frontend, root freeze, and final approval | No; forbidden in this task and readiness gates are incomplete |

The read-only handoff assertion has documented coverage limits: Safe owners/threshold, Timelock delay/internal roles, registrar allowlists, DiscountRegistry controller authorization, controller registry pointers, and root lifecycle state require additional reviewed read-only checks.

## F. Remaining launch blockers

### Inputs missing

- Deployer funding requirement and final deployer/treasury operational verification.
- Complete authority handoff and deployer-revocation evidence for the verified Admin Safe.
- Final deploy-grade RPC provider/masked endpoint and approved Blockscout API/key/verification path.
- Final indexer target and frontend preview, production, and rollback owners.

### Infrastructure missing

- Deploy-grade RPC is not approved; only a read-only/testing fallback is confirmed.
- Blockscout API compatibility, API-key policy, proxy workflow, and verification command are unresolved.
- Monitoring, alerting, incident ownership, and rollback evidence are incomplete.

### Contracts not deployed

- ArcNS mainnet contracts and TimelockController are not deployed.
- All final addresses, blocks/hashes, implementation addresses, args, verification URLs, and deployment artifact path are `TBD`.

### Handoff not executed

- Ownership and roles have not been transferred to the intended Safe/Timelock configuration.
- Deployer protocol authority has not been revoked or asserted absent.
- Safe configuration reads passed; Timelock and post-handoff final-state reads are incomplete.

### Indexer not ready

- Provider/target, final data-source addresses, start blocks, and mainnet endpoint are `TBD`.
- The subgraph is not deployed, synced, smoke-tested, compared with direct reads, or monitored.
- DiscountRegistry reusable coverage exists, but concrete wiring and runtime evidence do not.

### Frontend not ready

- Mainnet address/config and subgraph endpoint integration are not implemented.
- No approved mainnet preview exists; preview smoke tests and rollback evidence are missing.
- Production remains testnet-bound, discount UI remains disabled, and `registerWithDiscount` remains unwired.

### Discount lifecycle not ready

- The DiscountRegistry is not deployed on mainnet.
- The finalized root is not set or frozen on mainnet.
- Discount is not activated; controller authorization and used-state handling lack final runtime evidence.

### Final review missing

- The focused review must be rerun against final launch scripts, infrastructure, addresses, artifacts, handoff state, indexer, and frontend evidence.
- Explicit final launch approval has not been given.

## G. Non-goals

- This document does not deploy contracts.
- This document does not create a Safe.
- This document does not deploy `TimelockController`.
- This document does not verify contracts.
- This document does not deploy a subgraph.
- This document does not switch the frontend to mainnet.
- This document does not set or freeze a Merkle root.
- This document does not activate the discount.
- This document does not approve mainnet launch.
- This document does not submit transactions, sign anything, call write functions, set prices, transfer ownership, or grant/revoke roles.
- This document does not modify environment values, secrets, private keys, wallet credentials, API keys, deployment artifacts, production frontend configuration, or subgraph configuration.

## Related plans

- Deployment runbook: [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md)
- Admin Safe readiness: [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md)
- Timelock readiness: [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md)
- Authority model: [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md)
- Handoff ceremony: [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md)
- Infrastructure readiness: [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md)
- Indexer/subgraph readiness: [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md)
- Frontend cutover: [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md)
- Proof delivery: [`PROOF_DELIVERY_PLAN.md`](./PROOF_DELIVERY_PLAN.md)
- Focused review: [`FOCUSED_SECURITY_REVIEW.md`](./FOCUSED_SECURITY_REVIEW.md)
- Security checklist: [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)