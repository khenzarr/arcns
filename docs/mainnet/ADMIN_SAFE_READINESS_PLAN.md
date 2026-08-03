# ArcNS Mainnet Admin Safe Readiness Plan (Aşama 7B-1)

Status: readiness planning and read-only tooling preparation only. This document does not create a Safe or authorize mainnet launch.

## A. Executive summary

- This is a mainnet Admin Safe readiness plan, not a Safe creation execution.
- The mainnet Admin Safe remains a launch blocker until it is created with explicit operator approval and then independently verified through read-only checks.
- The approved model is a new Arc mainnet 2-of-3 Safe contract with the three selected owners recorded below.
- The testnet Safe confirms the intended pattern, but `0x01BaeBec34dd426E98cA7e550Eb652235Ea7e4f3` is a testnet reference only and must not be reused as a final mainnet value.
- The deployer and launch treasury EOA may be one Safe owner, but it cannot be recorded as the Safe contract address.

## B. Mainnet Safe input table

`TBD` is a launch blocker. No unknown Safe address, creation transaction hash, block, or creation method is inferred or invented by this plan.

| Input | Required value | Status | Notes |
|---|---|---|---|
| Chain | Arc mainnet | Selected; verification pending | Safe UI, provider, and explorer evidence must identify Arc mainnet. |
| Chain ID | `5042` | Confirmed network input; Safe verification pending | Read back from the provider used for validation. |
| Safe type | New mainnet 2-of-3 Safe contract | Approved model; creation pending | Must be a separate smart contract on Arc mainnet. |
| Safe threshold | `2` of `3` | Selected; verification pending | Must be read back from the created Safe. |
| Owner 1 | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; verification pending | May also be deployer and launch treasury recipient. |
| Owner 2 | `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396` | Selected; verification pending | Must be present in the exact verified owner set. |
| Owner 3 | `0x1e19c1c829A387c2246567c0df264D81310d7775` | Selected; verification pending | Must be present in the exact verified owner set. |
| Admin Safe address | `TBD` | Blocked | Record only after creation and read-only validation; must not equal an owner EOA or the testnet Safe. |
| Deployer / treasury recipient | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final launch verification pending | Treasury receipt is separate from protocol admin authority. |
| Safe creation method | `TBD` | Blocked | Approved interface or reviewed deployment method must be selected before execution. |
| Safe creation transaction hash | `TBD` | Blocked | Produced only by a future explicitly approved Safe creation. |
| Safe creation block | `TBD` | Blocked | Reconcile against the future creation receipt and Arc mainnet block. |
| Safe verification status | Not verified | Blocked | Requires bytecode, chain, exact owner-set, threshold, and address-separation checks. |

## C. Owner model

- Owner 1: `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`
- Owner 2: `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396`
- Owner 3: `0x1e19c1c829A387c2246567c0df264D81310d7775`
- Threshold: `2` of `3`.
- Owner 1 may also be the deployer and launch treasury recipient.
- A 2-of-3 threshold means any two owners must sign a Safe transaction before it can execute.
- Loss of access to one owner key should not block operations because the other two owners can still satisfy the threshold.
- A single owner must not be able to execute protocol admin actions.

Owner addresses are selected inputs, not verified Safe configuration, until the created mainnet Safe returns the exact owner set and threshold through read-only calls.

## D. Safe creation plan

This is a dry-run plan for a future separately approved operation. Do not create a Safe while following this readiness document.

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

- [ ] The Safe address has non-empty bytecode on Arc mainnet.
- [ ] `getOwners()` returns exactly the three approved owners.
- [ ] `getThreshold()` returns `2`.
- [ ] The Safe address is not equal to the deployer or any owner EOA.
- [ ] The Safe address is recorded in launch inputs only after verification.
- [ ] The Safe interface or explorer confirms Arc mainnet chain ID `5042`.
- [ ] Owner order may differ, but the case-insensitive owner set matches exactly.
- [ ] No unknown owner exists.
- [ ] The threshold is not `1`.
- [ ] The threshold is not `3` unless the owner model is explicitly re-approved.
- [ ] The Safe address is not the testnet Safe address.

The read-only helper [`../../scripts/mainnet/check-safe-config.js`](../../scripts/mainnet/check-safe-config.js) covers provider chain ID, bytecode, exact owner set, threshold, and Safe-versus-owner address separation. Its PASS result is necessary but does not replace independent interface, explorer, receipt, and operator review.

## F. Relationship to Timelock

- The mainnet Timelock remains `TBD` until the Admin Safe exists and passes validation.
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

- [ ] Mainnet Safe is not created.
- [ ] Mainnet Safe address is `TBD`.
- [ ] Safe creation transaction hash and block are `TBD`.
- [ ] Safe configuration is not verified.
- [ ] Timelock is not deployed.
- [ ] Timelock address is `TBD`.
- [ ] Deploy-grade RPC is unresolved.
- [ ] Blockscout verification is unresolved.
- [ ] Contract deployment is not performed.
- [ ] Handoff is not executed.
- [ ] Final launch review is missing.

The mainnet Admin Safe is not ready, and ArcNS is not ready to deploy, while these blockers remain open.

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
