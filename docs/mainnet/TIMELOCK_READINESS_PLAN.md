# ArcNS Mainnet Timelock Readiness Plan (Aşama 7C)

Status: readiness documentation and read-only tooling preparation only. This is not deployment approval.

## Aşama 7C-2A tooling checkpoint (prepared, not executed)

- `scripts/mainnet/deploy-timelock.js` is prepared as a mainnet-only, fail-closed Timelock deployment guard.
- **Timelock remains not deployed.** Its mainnet address remains **TBD**.
- No transaction, signature, role change, ownership change, or deployment artifact was produced in this phase.
- Actual execution requires a separately approved deploy-grade RPC (Radar remains read-only testing infrastructure), a funded deployer, explicit operator approval, all exact script confirmation environment values, and a post-deployment `scripts/mainnet/check-timelock-config.js` **PASS**.
- Mainnet launch remains **NO-GO** and handoff remains pending.

## A. Executive summary

- This is a Timelock readiness plan, not a deployment approval.
- The mainnet Timelock remains not deployed, and its address remains `TBD`.
- Deployment must wait for explicit operator approval and a finalized deploy-grade RPC. Radar is read-only/testing infrastructure only and must not be treated as deploy-grade RPC.
- The verified Admin Safe `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` will be proposer, executor, and canceller.
- ArcNS mainnet launch remains **NO-GO**.

## B. Timelock input table

`TBD` is a blocker. No address, transaction, block, URL, operator input, or artifact is inferred from testnet or invented.

| Input | Required value | Status | Notes |
|---|---|---|---|
| Chain | Arc mainnet | Known | Deployment provider must independently return chain ID `5042`. |
| Chain ID | `5042` | Known | Required checker input. |
| Admin Safe | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | PASS; read-only verified | Exact 2-of-3 configuration is recorded in [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md). |
| Timelock contract type | OpenZeppelin `TimelockController` via `ArcNSTimelock` wrapper | Prepared; deployment pending | The wrapper adds no logic. Installed OpenZeppelin version is `5.6.1`. |
| `minDelay` | `172800` seconds | Approved input; deployed read-back pending | Equivalent to 48 hours. |
| Proposer | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Approved input; deployment pending | Must hold `PROPOSER_ROLE`. |
| Executor | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Approved input; deployment pending | Must hold `EXECUTOR_ROLE`; do not configure an open executor without explicit review. |
| Canceller | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) | Approved input; deployment pending | OpenZeppelin v5 grants `CANCELLER_ROLE` to constructor proposers. |
| Deployer | `TBD` | Blocked | Confirm exact deployment operator and funding during the future ceremony. |
| Deploy-grade RPC | `TBD` | Blocked | Radar must not be promoted from read-only/testing use. |
| Timelock address | `TBD` | Blocked | Record only after deployment and read-only verification. |
| Deployment tx hash | `TBD` | Blocked | Do not infer from any testnet deployment. |
| Deployment block | `TBD` | Blocked | Record from the successful receipt. |
| Deployment block hash | `TBD` | Blocked | Reconcile against the recorded deployment block. |
| Verification URL | `TBD` | Blocked | Record only after successful reviewed verification submission in a later phase. |
| Deployment artifact path | `TBD` | Blocked | No deployment artifact is created or modified in this phase. |
| Read-only verification status | `TBD` | Blocked | Future `check-timelock-config.js` run must return `PASS`. |

## C. Role model

- The Admin Safe remains the operational admin authority.
- The Timelock should hold upgrade authority after the separately reviewed handoff.
- Timelock proposer, executor, and canceller should be the verified Admin Safe.
- The deployer must not retain Timelock admin authority after final setup.
- With the installed OpenZeppelin Contracts `5.6.1`, Timelock administration uses `DEFAULT_ADMIN_ROLE` (`bytes32(0)`), not a `TIMELOCK_ADMIN_ROLE()` getter. The constructor grants this role to the Timelock itself and grants it to an optional non-zero `admin`. The intended final configuration is self-administration without a deployer bypass.
- If the exact deployed OpenZeppelin version or deployment script behavior differs, the Timelock must be self-administered or otherwise configured so no deployer bypass exists. Any deviation requires explicit review before deployment.

## D. Future deployment ceremony

This is a dry-run sequence only. Do not deploy from this document.

1. Confirm a clean repository and finalized deployment branch.
2. Confirm deploy-grade RPC.
3. Confirm deployer wallet and funding without recording secrets.
4. Confirm the Admin Safe address and a read-only Safe checker `PASS`.
5. Confirm Timelock constructor arguments, including `172800`, the Admin Safe proposer/executor arrays, and the reviewed admin argument.
6. Run static and syntax checks.
7. Run a dry-run or simulation if an independently reviewed non-broadcast path is available.
8. Deploy Timelock only after explicit operator approval.
9. Record the Timelock address, transaction, block, block hash, constructor arguments, and verification URL.
10. Run the read-only Timelock configuration checker.
11. Only after Timelock verification, proceed to mainnet protocol contract deployment and handoff planning.

The existing `scripts/v3/deployTimelock.js` is testnet-oriented and write-capable. It obtains a signer, deploys a contract, can sign and execute Safe transactions, grants and revokes roles, and writes a deployment artifact. It must not be run on mainnet in this phase and is not approved as a reusable mainnet deployment ceremony without separate review and adaptation.

## E. Future read-only validation checklist

- [ ] Provider chain ID is `5042`.
- [ ] Timelock address has non-empty bytecode.
- [ ] `getMinDelay()` returns `172800`.
- [ ] Admin Safe has `PROPOSER_ROLE`.
- [ ] Admin Safe has `EXECUTOR_ROLE`.
- [ ] Admin Safe has `CANCELLER_ROLE`.
- [ ] Deployer does not retain bypass or admin authority after final setup.
- [ ] Timelock roles align with the exact OpenZeppelin version behavior; for v5.6.1, `DEFAULT_ADMIN_ROLE` is held by the Timelock itself and no external bootstrap admin remains.
- [ ] Timelock address is not equal to the Admin Safe or any owner EOA.
- [ ] Deployment receipt status is `1`.
- [ ] Deployment block and block hash are recorded and reconciled.

[`../../scripts/mainnet/check-timelock-config.js`](../../scripts/mainnet/check-timelock-config.js) is a future read-only checker for chain, bytecode, delay, role constants, Safe role membership, self-administration, address separation, and optional deployer-admin absence. It uses no signer, calls no write method, writes no files, and disables JSON-RPC batching. A PASS is necessary but does not replace receipt, block/hash, constructor-argument, explorer, owner-EOA separation, and operator review.

## F. Relationship to Safe

- The Safe is created and read-only verified with the exact three owners and threshold `2`.
- Timelock deployment depends on the verified Safe address.
- The Safe will schedule, execute, and cancel delayed upgrade operations through the Timelock.
- The Safe will still hold immediate emergency pause and operational roles where intentionally planned.
- Do not change the Safe owner set or threshold in this phase.

## G. Relationship to launch

Timelock deployment alone does not make mainnet ready. Remaining blockers after a future Timelock deployment include protocol contract deployment, role and ownership handoff, deployer revocation, contract verification, indexer deployment and sync, frontend cutover, discount lifecycle operations, monitoring, rollback preparation, and explicit final approval.

The Timelock is the next unresolved authority blocker, but completion of this readiness plan does not resolve that blocker. Mainnet deployment and launch remain **NO-GO**.

## H. Non-goals

- This document does not deploy Timelock.
- This document does not deploy protocol contracts.
- This document does not sign or submit transactions.
- This document does not call write functions.
- This document does not transfer ownership or roles.
- This document does not grant or revoke roles.
- This document does not approve launch.
- This document does not create or modify a Safe, modify environment values or secrets, create deployment artifacts, submit contract verification, deploy a frontend or subgraph, switch production to mainnet, or enable discount UI.