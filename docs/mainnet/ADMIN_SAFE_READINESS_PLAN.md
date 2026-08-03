# ArcNS Mainnet Admin Safe Readiness Plan (Aşama 7B-1)

Status: mainnet Admin Safe created and read-only verified. Timelock, deployment, handoff, and launch approval remain pending; this document does not authorize mainnet launch.

## A. Executive summary

- The mainnet Admin Safe has been created and independently verified through read-only checks; this document records the verified inputs and evidence.
- Safe creation/configuration is complete for this scope, but the complete authority handoff and remaining launch gates are still blockers.
- The approved model is a new Arc mainnet 2-of-3 Safe contract with the three selected owners recorded below.
- The testnet Safe confirms the intended pattern, but `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` is a testnet reference only and must not be reused as a final mainnet value.
- The deployer and launch treasury EOA may be one Safe owner, but it cannot be recorded as the Safe contract address.

## B. Mainnet Safe input table

`TBD` is a launch blocker. No unknown Safe address, creation transaction hash, block, or creation method is inferred or invented by this plan.

| Input | Required value | Status | Notes |
|---|---|---|---|
| Chain | Arc mainnet | Verified by read-only provider | Radar was used only for read-only verification, not as deploy-grade RPC. |
| Chain ID | `5042` | Verified | Read back from the provider used for validation. |
| Safe type | New mainnet 2-of-3 Safe contract | Created; bytecode verified | Separate smart contract on Arc mainnet. |
| Safe threshold | `2` of `3` | Verified | Exact threshold matched the approved configuration. |
| Owner 1 | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Verified | Exact owner-set read-back matched. May also be deployer and launch treasury recipient. |
| Owner 2 | `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396` | Verified | Exact owner-set read-back matched. |
| Owner 3 | `0x1e19c1c829A387c2246567c0df264D81310d7775` | Verified | Exact owner-set read-back matched. |
| Admin Safe address | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | Created; read-only verified | Verified Safe account; distinct from every owner EOA. |
| Deployer / treasury recipient | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final launch verification pending | Treasury receipt is separate from protocol admin authority. |
| Safe creation method | Safe factory/proxy flow | Recorded | Receipt `contractAddress` is `null`, which is acceptable for this flow; the verified Safe account is recorded above. |
| Safe creation transaction hash | `0x32914d51e3372b7380b40b94343909773b9ff40c5879e6a7d124731c4a862de1` | Recorded | Receipt status `1`; `from` is Owner 1; `to` is the Safe proxy factory. |
| Safe creation block | `13589138` | Recorded | Block hash: `0x8a89a16f705a759acb150502d8e918f8893ff3f2128b80bb6ca8ab518322e711`. |
| Safe verification status | PASS — read-only verified | Complete for Safe configuration | Chain ID `5042`, bytecode present, exact owner set, threshold `2`, and Safe/owner separation checks passed. |

## C. Owner model

- Owner 1: `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`
- Owner 2: `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396`
- Owner 3: `0x1e19c1c829A387c2246567c0df264D81310d7775`
- Threshold: `2` of `3`.
- Owner 1 may also be the deployer and launch treasury recipient.
- A 2-of-3 threshold means any two owners must sign a Safe transaction before it can execute.
- Loss of access to one owner key should not block operations because the other two owners can still satisfy the threshold.
- A single owner must not be able to execute protocol admin actions.

Owner addresses and threshold are verified Safe configuration. The read-only checker returned `PASS` with exact owner-set and threshold matching.

Creation receipt details: status `1`; `from` `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`; `to` `0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67`; `contractAddress` `null`; gas used `316131`. `contractAddress` being `null` is acceptable because the Safe was created through the Safe factory/proxy flow.

## D. Safe creation record and future-use boundary

The Safe creation occurred before this documentation task. The historical sequence below is retained as a record of the reviewed process; do not create another Safe while following this document.

1. Open the approved Safe creation interface or reviewed Safe deployment method.
2. Select Arc mainnet and confirm chain ID `5042`.
3. Add exactly the three approved owner addresses recorded in this plan.
4. Set the threshold to `2`.
5. Review that the resulting Safe address is a contract address distinct from every owner EOA.
6. Create the Safe only after explicit operator approval.
7. Record the Safe address, creation transaction hash, and creation block.
8. Run read-only Safe configuration validation.
9. Update the mainnet launch inputs only after every validation passes.

Do not record or expose raw private keys, seed phrases, secret RPC URLs, wallet credentials, or API keys in the execution record.

## E. Mainnet Safe validation checklist

- [x] The Safe address has non-empty bytecode on Arc mainnet.
- [x] `getOwners()` returns exactly the three approved owners.
- [x] `getThreshold()` returns `2`.
- [x] The Safe address is not equal to the deployer or any owner EOA.
- [x] The Safe address is recorded in launch inputs after verification.
- [x] The read-only provider confirms Arc mainnet chain ID `5042`.
- [x] Owner order may differ, but the case-insensitive owner set matches exactly.
- [x] No unknown owner exists.
- [x] The threshold is not `1`.
- [x] The threshold is not `3`.
- [x] The Safe address is not the testnet Safe address.

The read-only helper [`../../scripts/mainnet/check-safe-config.js`](../../scripts/mainnet/check-safe-config.js) covers provider chain ID, bytecode, exact owner set, threshold, and Safe-versus-owner address separation. Its PASS result is necessary but does not replace independent interface, explorer, receipt, and operator review.

## F. Relationship to Timelock

- The mainnet Timelock remains `TBD`; the Admin Safe prerequisite now exists and has passed validation.
- Timelock proposer, canceller, and executor should point to the verified Admin Safe.
- Timelock deployment should occur only after the Safe address is validated.
- The intended Timelock minimum delay is `172800` seconds.
- Upgrade authority should later move to the Timelock according to [`HANDOFF_CEREMONY_PLAN.md`](./HANDOFF_CEREMONY_PLAN.md).

## G. Relationship to deployer / treasury

- Deployer and launch treasury recipient: `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`.
- This address may be one Safe owner.
- The treasury recipient is not protocol admin authority.
- The deployer must not retain protocol admin authority after handoff.
- The Safe contract address must not be this EOA.

## H. Remaining blockers

- [x] Mainnet Safe is created and read-only verified.
- [x] Mainnet Safe address, creation transaction, block, and block hash are recorded.
- [x] Safe configuration is verified; the read-only checker returned `PASS`.
- [ ] Timelock is not deployed.
- [ ] Timelock address is `TBD`.
- [ ] Deploy-grade RPC is unresolved.
- [ ] Blockscout verification is unresolved.
- [ ] Contract deployment is not performed.
- [ ] Handoff is not executed.
- [ ] Final launch review is missing.

The mainnet Admin Safe creation/configuration input is ready for this scope, but ArcNS is not ready to deploy while the remaining blockers above remain open. This is not launch approval.

## I. Non-goals

- This document does not create a Safe.
- This document does not deploy contracts.
- This document does not deploy `TimelockController`.
- This document does not sign or submit transactions.
- This document does not call write functions.
- This document does not transfer ownership or roles.
- This document does not grant or revoke roles.
- This document does not set prices.
- This document does not set or freeze a Merkle root.
- This document does not activate a discount.
- This document does not approve mainnet launch.
- This document does not modify environment files, secrets, credentials, or real deployment artifacts.
