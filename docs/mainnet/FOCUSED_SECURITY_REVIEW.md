# ArcNS Focused Security Review / Mainnet Launch Risk Review

Status: internal focused review completed on branch `security/focused-mainnet-launch-review`.

Current deploy-grade RPC and Blockscout verification readiness is tracked in [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md).

The follow-on mainnet indexer/subgraph readiness plan is tracked in [`INDEXER_SUBGRAPH_PLAN.md`](./INDEXER_SUBGRAPH_PLAN.md).

The follow-on frontend mainnet/discount cutover plan is tracked in [`FRONTEND_CUTOVER_PLAN.md`](./FRONTEND_CUTOVER_PLAN.md).

Proof delivery preparation is tracked in [`PROOF_DELIVERY_PLAN.md`](./PROOF_DELIVERY_PLAN.md).

The consolidated launch inputs and Go/No-Go matrix are tracked in [`MAINNET_LAUNCH_INPUTS.md`](./MAINNET_LAUNCH_INPUTS.md).

Remediation status: FSR-02 and FSR-06 are addressed by the Aşama 5A tooling guards. FSR-01 is partially addressed by a fail-closed read-only handoff assertion. FSR-04 is partially addressed by Aşama 6A reusable DiscountRegistry ABI/schema/mapping coverage; final address/start-block wiring, deployment, sync, and health verification remain launch actions and blockers.

This is an **internal focused review**, **not an external audit**. Mainnet deployment remains blocked until the blockers listed below are resolved and independently rechecked. No deployment, Arc on-chain write, signing, ownership transfer, role change, price update, Merkle-root update, campaign activation, production frontend switch, staging, commit, or push was performed by this review.

## Executive verdict

- Focused security review completed: **YES**
- Mainnet ready to deploy: **NO**
- Safe to commit: **YES, for this review report only, after human review; no commit was created**

The core discount and pricing design is internally coherent: the campaign and snapshot block are immutable; a frozen root cannot be changed; `consume` is restricted to authorized controllers; usage is keyed by wallet in one shared registry; controller discount registration binds the eligible account to `msg.sender`; the claim is atomic with registration; renewals do not consume or apply the discount; and expired-name premium remains payable in full.

Deployment remains blocked by incomplete launch administration and infrastructure. Aşama 5A added fail-closed snapshot pinning and separated discount lifecycle operations; these guards still require independent review before launch.

## Findings summary

| Severity | Count |
| --- | ---: |
| BLOCKER | 5 |
| HIGH | 1 |
| MEDIUM | 1 |
| LOW | 2 |
| PASS | 8 |

## Detailed findings

### FSR-01 — Final Safe/Timelock authority handoff is not executable or verifiable from the canonical deployment flow

- **Severity:** BLOCKER
- **Affected:** `scripts/v3/deployV3.js`, `docs/mainnet/ADMIN_OWNERSHIP_PLAN.md`, `docs/mainnet/DEPLOYMENT_RUNBOOK.md`
- **Description:** The approved model requires a 2-of-3 Admin Safe, a 48-hour Timelock for controller/resolver upgrade authority, Safe-held pause authority, and complete removal of deployer protocol authority. The addresses are still TBD, the Timelock is not deployed, and `deployV3.js` initializes owners/admin roles to the deployer without performing or verifying the final handoff/revocation sequence.
- **Impact:** Running the current deploy script alone would leave the deployer with critical protocol authority and would not produce the approved launch state.
- **Recommended fix:** Finalize and independently verify Safe owners/threshold/address and Timelock configuration; implement a separately reviewed handoff procedure or script with explicit role grants, ownership transfers, deployer revocations/renunciations, and final read-only assertions for every component. Treat deployment and handoff as one incomplete launch operation until all assertions pass.
- **Code change required:** Yes, or a dedicated reviewed handoff/verification script.
- **Docs-only fix sufficient:** No.
- **Blocks Aşama 6:** Yes.

### FSR-02 — Mainnet campaign facts are environment-selected rather than pinned to the reviewed snapshot

- **Severity:** BLOCKER
- **Affected:** `scripts/v3/deployV3.js`, `snapshots/arc-testnet-v3-early-adopters/manifest.json`, `docs/mainnet/EARLY_ADOPTER_SNAPSHOT.md`
- **Description:** The write-capable script accepts `EARLY_ADOPTER_CAMPAIGN_ID`, `EARLY_ADOPTER_SNAPSHOT_BLOCK`, and `EARLY_ADOPTER_MERKLE_ROOT` from the environment. It validates shape/nonzero values but does not fail unless they exactly match the reviewed campaign ID, bytes32, block, and root. The campaign ID and snapshot block are constructor immutables; the root becomes irreversible after `freezeRoot()`.
- **Impact:** A typo, stale value, or wrong environment can permanently deploy an incompatible campaign or freeze an incorrect root. A wrong frozen root requires replacement deployment and can invalidate published proofs.
- **Recommended fix:** Make the mainnet path fail closed against a reviewed, version-controlled launch constants file or the finalized manifest; assert campaign text, campaign bytes32, snapshot block, snapshot block hash, Merkle root, proof count, and expected chain/USDC before any write. Split deploy, root-set, freeze, and activation into independently reviewed gates.
- **Code change required:** Yes.
- **Docs-only fix sufficient:** No.
- **Blocks Aşama 6:** Yes.

### FSR-03 — Deploy-grade RPC and explorer verification path remain unresolved

- **Severity:** BLOCKER
- **Affected:** `hardhat.config.js`, `scripts/preflight-arc-mainnet.js`, `docs/mainnet/DEPLOYMENT_RUNBOOK.md`, `docs/mainnet/ADMIN_OWNERSHIP_PLAN.md`
- **Description:** The confirmed Radar endpoint is correctly documented as read-only/testing fallback only. The Blockdaemon endpoint remains only a candidate, and the Blockscout API verification endpoint is not validated.
- **Impact:** Deployment can fail, be broadcast through unsuitable infrastructure, or leave contracts unverifiable at launch.
- **Recommended fix:** Select an approved deploy-grade RPC with redundancy and operational ownership; validate chain ID, latest-block consistency, fee behavior, transaction broadcast support, and provider limits without writing; validate the exact Blockscout verification API workflow before deployment.
- **Code change required:** Possibly configuration/script assertions.
- **Docs-only fix sufficient:** No; infrastructure validation is required.
- **Blocks Aşama 6:** Yes.

### FSR-04 — Mainnet indexer/subgraph deployment remains unresolved

- **Severity:** BLOCKER
- **Affected:** `indexer/subgraph.yaml`, root `subgraph.yaml`, `bens-subgraph/subgraph.yaml`, frontend subgraph configuration, `docs/mainnet/ADMIN_OWNERSHIP_PLAN.md`
- **Description:** Existing concrete data sources/configuration remain testnet-oriented. Aşama 6A added DiscountRegistry ABI, schema entities, typed handlers, and a dormant template, but there is no known version-controlled DiscountRegistry deployment address/start block, finalized mainnet indexing deployment, deployed-address manifest, health/readiness gate, or rollback/fallback plan.
- **Impact:** Names may register on-chain while portfolio, search, resolution, or availability-related indexed views remain stale or unavailable.
- **Recommended fix:** After deployment values exist, add a separately reviewed concrete data source with the final address and exact deployment block, revalidate all schema/event coverage, deploy and sync the mainnet subgraph, and define frontend health/readiness checks before cutover.
- **Code change required:** Yes; reusable event coverage is implemented, while concrete deployment wiring remains `TBD`.
- **Docs-only fix sufficient:** No.
- **Blocks Aşama 6:** Yes.

### FSR-05 — Production frontend mainnet and discount integration are intentionally incomplete

- **Severity:** BLOCKER
- **Affected:** `frontend/src/lib/chains.ts`, `frontend/src/config/runtime.ts`, `frontend/src/config/contracts.ts`, `frontend/src/config/subgraph.ts`, frontend registration flow
- **Description:** Production remains correctly testnet-bound. A mainnet chain definition exists but is not active. There is no frontend discount proof lookup, `registerWithDiscount` integration, finalized mainnet contract-address configuration, or finalized mainnet subgraph configuration.
- **Impact:** Activating the campaign before a reviewed client/proof delivery path exists would prevent eligible users from using it; switching production prematurely could target stale/testnet addresses or data services.
- **Recommended fix:** Keep production on testnet. Prepare a separate reviewed frontend PR only after deployed addresses, verified ABI, published proofs, indexer readiness, RPC, and explorer are final. Keep discount UI hidden until registry root/freeze/activation and proof serving are independently verified.
- **Code change required:** Yes, in a separate cutover PR.
- **Docs-only fix sufficient:** No.
- **Blocks Aşama 6:** Yes for public launch/cutover.

### FSR-06 — Root freeze and campaign activation are coupled too closely in the deployment script

- **Severity:** HIGH
- **Affected:** `scripts/v3/deployV3.js`, `docs/mainnet/DEPLOYMENT_RUNBOOK.md`
- **Description:** When a root is supplied, the script sets it, freezes it, and activates the campaign in the same automated run. The contract safely rejects consumption before freeze, but the script leaves little operational review time between an irreversible freeze and public activation.
- **Impact:** A validly formatted but operationally wrong root can become active immediately, increasing recovery and communication risk.
- **Recommended fix:** Separate deployment, controller authorization/root setting, freeze, and activation into distinct reviewed steps. Require independent root/proof recomputation and read-back before freeze, then require frontend/proof/indexer readiness before activation.
- **Code change required:** Recommended.
- **Docs-only fix sufficient:** No for a fail-closed launch path.
- **Blocks Aşama 6:** Yes until the sequence is made operationally safe.

### FSR-07 — Mainnet chain defaults still expose an unapproved candidate RPC

- **Severity:** MEDIUM
- **Affected:** `hardhat.config.js`, `frontend/src/lib/chains.ts`
- **Description:** Both Hardhat and the inactive frontend mainnet chain definition default to the candidate Blockdaemon URL even though deploy-grade approval is unresolved.
- **Impact:** A future operator or cutover PR may accidentally treat a placeholder/candidate as finalized infrastructure.
- **Recommended fix:** Require explicit mainnet RPC configuration for write-capable tooling and label or remove inactive frontend defaults until the reviewed cutover.
- **Code change required:** Recommended.
- **Docs-only fix sufficient:** No for write tooling; possibly for inactive UI only.
- **Blocks Aşama 6:** Not independently, but must be resolved with FSR-03.

### FSR-08 — Irreversible wrong-root recovery should be stated more explicitly

- **Severity:** LOW
- **Affected:** `docs/mainnet/EARLY_ADOPTER_SNAPSHOT.md`, `docs/mainnet/DEPLOYMENT_RUNBOOK.md`
- **Description:** The documents require review before freeze, but should explicitly state that a wrong frozen root cannot be corrected in that registry and requires redeployment/migration plus controller reconfiguration.
- **Impact:** Operators may underestimate the freeze ceremony and recovery cost.
- **Recommended fix:** Add an explicit irreversible-freeze warning and a recovery/run-abort procedure.
- **Code change required:** No.
- **Docs-only fix sufficient:** Yes.
- **Blocks Aşama 6:** No by itself.

### FSR-09 — Frontend build contains existing hook warnings

- **Severity:** LOW
- **Affected:** `frontend/src/components/DomainCard.tsx`, `frontend/src/hooks/_archive/useArcNS.ts`
- **Description:** The production build succeeds but reports `react-hooks/exhaustive-deps` warnings. One warning is in archived code.
- **Impact:** Low launch risk; stale closures/refetch behavior should be reviewed before frontend cutover.
- **Recommended fix:** Correct dependencies or document intentional stability; remove archived code from lint scope if appropriate.
- **Code change required:** Recommended.
- **Docs-only fix sufficient:** No.
- **Blocks Aşama 6:** No.

## Passed review areas

### PASS-01 — DiscountRegistry immutable campaign identity

`campaignId` and `snapshotBlock` are immutable constructor values. Zero campaign, zero snapshot block, and zero owner are rejected.

### PASS-02 — Merkle root and activation enforcement

The root cannot be changed after freeze. Activation before freeze is administratively possible, but `consume()` still reverts with `RootNotFrozen`, so no claim can be consumed early. Root, freeze, activation, controller authorization, and usage events are present.

### PASS-03 — One wallet, one claim across namespaces

Usage is `mapping(address => bool)` in one shared registry. Both `.arc` and `.circle` controllers are intended to share it, and integration tests confirm the second namespace claim reverts.

### PASS-04 — Authorized, atomic controller consumption

Only authorized controllers can call `consume`. `registerWithDiscount` requires `owner == msg.sender`, calls the registry inside a `nonReentrant` registration transaction, and a later revert rolls back consumption atomically.

### PASS-05 — Discount economics

The discount applies to base registration price only. Premium is added in full. Normal registration remains full-price, renewal has no discount path, and tests confirm renewal does not consume eligibility.

### PASS-06 — Payment and pause controls

Payment uses `SafeERC20.safeTransferFrom`, `maxCost` protection is present, mainnet scripts verify USDC address/symbol/6 decimals, and both registration paths are pause-protected and non-reentrant.

### PASS-07 — Pricing consistency

The reviewed contract/script/docs/tests use 1/2/3/4/5+ annual values of 100/50/25/15/5 USDC with 6-decimal raw units. Bucket logic is UTF-8-character aware and renewal reads the same oracle. `scripts/check-mainnet-prices.js` performs read calls only.

### PASS-08 — Snapshot/proof consistency

The reviewed manifest, proof output, generator, tests, and docs use campaign `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1`, bytes32 `0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3`, block `54933646`, block hash `0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d`, root `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`, and 849 eligible wallets. Leaves use `keccak256(abi.encode(bytes32 campaignId, address account))`; addresses and Merkle pairs are deterministically normalized/sorted. Proof data contains public addresses/proofs and no secrets.

## Validation results

- `git diff --check`: passed.
- `npx hardhat compile`: passed; nothing to compile.
- `npx hardhat test test/v3/SnapshotGenerator.test.js`: **7 passing**.
- `npx hardhat test test/v3/DiscountRegistry.test.js`: **2 passing**.
- `npx hardhat test test/v3/Controller.test.js test/v3/Integration.test.js`: **141 passing**.
- Broader `npx hardhat test test/v3`: not run because the selected integration suite already exercised the main controller/discount path and also revealed that its smoke test invokes the deployment script locally; repeating all suites was unnecessary for this focused review.
- Root `npm run lint`: not available in the root package scripts.
- `npm --prefix frontend run build`: passed, with the two hook-warning locations recorded in FSR-09.

Validation caveat: `test/v3/Integration.test.js` contains a smoke test that invoked `scripts/v3/deployV3.js --network hardhat` on an ephemeral local Hardhat network. This did **not** contact Arc mainnet/testnet, submit an Arc transaction, use an external wallet, or create a production deployment artifact. It was not invoked directly by the reviewer and will not be repeated in this phase.

## Required next actions

1. Resolve FSR-01 and implement/read-review the complete Safe/Timelock handoff and deployer-revocation verification.
2. Resolve FSR-02 and FSR-06 by pinning reviewed snapshot facts and splitting irreversible root freeze/activation into gated steps.
3. Finalize deploy-grade RPC and Blockscout verification workflow.
4. Prepare and review the mainnet indexer/subgraph deployment plan.
5. Prepare a separate frontend mainnet/discount cutover PR only after contracts, proofs, indexer, and infrastructure are ready.
6. Re-run this focused review against the final launch scripts/configuration before any mainnet deployment.

## Safety record

- Mainnet deployment: not executed.
- Arc on-chain write: not executed.
- External signing: not executed.
- Prices/root/activation/ownership/roles: not changed.
- Safe/Timelock: not created or deployed.
- Environment/secrets/private keys/wallet credentials: not modified.
- Deployment artifacts: not intentionally modified or created for Arc networks.
- Production frontend: not switched.
- Git staging/commit/push: not performed.
- Unrelated private planning materials: not accessed, modified, or included.

## Aşama 6A indexer coverage update

DiscountRegistry code-preparation coverage now includes all actual lifecycle events—`DiscountRootUpdated`, `DiscountRootFrozen`, `DiscountActiveUpdated`, `DiscountControllerAuthorizationUpdated`, and `DiscountUsed`—plus inherited `OwnershipTransferred`. Historical event entities use deterministic transaction-hash/log-index IDs, while current registry, owner, and controller authorization state are maintained separately. `snapshotBlock` is obtained from the immutable contract getter because it is not emitted by these events.

No concrete DiscountRegistry address or start block was available in version-controlled deployment artifacts. The manifest therefore contains only a dormant template, not an active data source, and no value was invented. This update does not deploy or sync a subgraph, does not establish a mainnet endpoint, does not make the frontend ready, and does not close FSR-04.
