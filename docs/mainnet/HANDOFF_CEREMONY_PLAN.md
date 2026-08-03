# ArcNS Mainnet Safe / Timelock / Handoff Ceremony Plan (Aşama 5B)

Status: operational planning only. This document describes a future ceremony; it does not execute a handoff or authorize mainnet launch.

## Aşama 7C-2A Timelock prerequisite — pending

- The guarded `scripts/mainnet/deploy-timelock.js` tooling is prepared but not executed.
- Timelock is not deployed; its address remains **TBD**.
- Handoff cannot begin until an approved deploy-grade RPC, funded deployer, explicit operator approval, exact deployment confirmation environment values, and a successful deployment receipt exist.
- A post-deployment `scripts/mainnet/check-timelock-config.js` **PASS** is mandatory before this plan can advance.
- Radar remains read-only testing infrastructure and is not an approved deployment endpoint.
- Mainnet launch remains **NO-GO**; handoff remains pending.

## Executive summary

- This is an operational plan, not an executed handoff.
- Mainnet deployment remains blocked until every required address is finalized, independently reviewed, and recorded, and the ceremony is executed and verified.
- The approved launch model is a 2-of-3 Admin Safe, a 48-hour `TimelockController`, the deployer wallet as the launch treasury recipient, and the Admin Safe as emergency pause authority.
- The deployer EOA is limited to deployment and bootstrap. After handoff it must retain no protocol authority and may remain only the treasury recipient if that remains the final reviewed launch choice.

The consolidated launch inputs and Go/No-Go matrix are tracked in [`MAINNET_LAUNCH_INPUTS.md`](./MAINNET_LAUNCH_INPUTS.md). Safe creation inputs and read-only validation gates are tracked in [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md). Timelock inputs, exact version behavior, and future read-only checks are tracked in [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md); Timelock deployment is the next authority blocker and remains unexecuted.

## Required addresses checklist

`TBD` is a blocker. No unknown address may be inferred from testnet, generated for this plan, or replaced with an unreviewed value.

| Item | Required value | Status | Notes |
|---|---|---|---|
| Deployer EOA | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final verification pending | Deployment/bootstrap only; no protocol authority after handoff. |
| Treasury recipient | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected; final verification pending | Approved launch choice is the deployer wallet; treasury receipt is not protocol authority. |
| Admin Safe address | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | Created; read-only verified | Separate Arc mainnet contract; not equal to the deployer or any owner EOA. |
| Admin Safe owner 1 | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Verified | Exact owner-set read-back matched; may also be the deployer/treasury EOA. |
| Admin Safe owner 2 | `0xB2F6CfD0960A1fCC532DE1BF2Aafcc3077B4c396` | Verified | Exact owner-set read-back matched. |
| Admin Safe owner 3 | `0x1e19c1c829A387c2246567c0df264D81310d7775` | Verified | Exact owner-set read-back matched. |
| Admin Safe threshold | `2-of-3` | Verified | Read-only checker returned `PASS`. |
| TimelockController address | `TBD` | Blocked | Timelock is not deployed. |
| Timelock minDelay | `172800` seconds | Approved | Equivalent to 48 hours; deployed read-back must match. |
| Registry address | `TBD` | Blocked | Unknown until mainnet deployment. |
| `.arc` registrar address | `TBD` | Blocked | Unknown until mainnet deployment. |
| `.circle` registrar address | `TBD` | Blocked | Unknown until mainnet deployment. |
| `.arc` controller address | `TBD` | Blocked | Unknown until mainnet deployment. |
| `.circle` controller address | `TBD` | Blocked | Unknown until mainnet deployment. |
| Resolver address | `TBD` | Blocked | Unknown until mainnet deployment. |
| Reverse registrar address | `TBD` | Blocked | Unknown until mainnet deployment. |
| PriceOracle address | `TBD` | Blocked | Unknown until mainnet deployment. |
| DiscountRegistry address | `TBD` | Blocked | Unknown until mainnet deployment. |

## Timelock deployment parameters

The intended parameters for a separately reviewed future deployment are:

| Parameter / role | Intended value |
|---|---|
| `minDelay` | `172800` seconds (48 hours) |
| Proposers | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) |
| Cancellers | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`) |
| Executors | Admin Safe (`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72`), for launch simplicity |
| Admin constructor argument | Zero address (`0x0000000000000000000000000000000000000000`); prevents an external bootstrap admin and leaves the Timelock self-administered under installed OpenZeppelin v5.6.1. Must be printed and independently reviewed at the future ceremony. |

The Timelock is a smart contract, not a wallet. It has no private key, and nobody signs as the Timelock. The Admin Safe proposes, cancels, and executes eligible operations according to the finalized role setup; the Timelock contract enforces the configured delay and performs an authorized action after that delay.

## Post-deployment handoff sequence

The following is a numbered dry-run plan for a future ceremony. Every address, role identifier, transaction payload, signer expectation, and read-back must be prepared and independently reviewed before execution. None of these actions is performed by this document.

1. Deploy all ArcNS v3 mainnet contracts.
2. Deploy `TimelockController` with a 48-hour (`172800` second) delay and the separately reviewed final role setup.
3. Transfer registry root owner to the Admin Safe.
4. Transfer `.arc` registrar owner to the Admin Safe.
5. Transfer `.circle` registrar owner to the Admin Safe.
6. Grant controller admin roles to the Admin Safe.
7. Grant controller pauser roles to the Admin Safe.
8. Grant controller upgrader roles to the Timelock.
9. Revoke deployer controller admin, pauser, upgrader, and any other privileged roles. The current assertion script also requires `ORACLE_ROLE` to be held by the Admin Safe and revoked from the deployer; include that assignment in the independently reviewed controller-role transaction plan.
10. Grant resolver admin to the Admin Safe.
11. Grant resolver upgrader role to the Timelock.
12. Revoke deployer resolver admin and upgrader roles.
13. Transfer reverse registrar owner to the Admin Safe.
14. Transfer PriceOracle owner to the Admin Safe.
15. Transfer DiscountRegistry owner to the Admin Safe.
16. Authorize only the finalized `.arc` and `.circle` controllers in DiscountRegistry.
17. Set each controller's discount registry address to the finalized shared DiscountRegistry.
18. Set each controller's treasury recipient to the deployer wallet if that remains the final launch choice.
19. Verify that the deployer has no protocol authority after handoff and remains only the treasury recipient if that launch choice is retained.
20. Run the read-only `scripts/mainnet/assert-admin-handoff.js` assertion and require its PASS result.

Before protocol deployment or handoff, a future approved Timelock deployment must be followed by `node scripts/mainnet/check-timelock-config.js` with independently reviewed final inputs. The Timelock address remains `TBD`, so this checker is not currently runnable against mainnet.

Deployment and handoff remain one incomplete launch operation until all required final-state reads and the assertion script pass.

## Read-only assertion script inputs

The following names come directly from `scripts/mainnet/assert-admin-handoff.js`. The deployer and treasury inputs are selected but pending final verification; the verified Safe address is recorded above, while Timelock and deployed-contract values remain `TBD`. Explicit deployed-contract variables take precedence; alternatively, `DEPLOYMENT_ARTIFACT_PATH` may point to a reviewed JSON file whose `contracts` object contains the corresponding camel-case keys. This plan does not create or modify that artifact.

| Variable name | Expected value | Source of value | Known or TBD |
|---|---|---|---|
| `EXPECTED_ADMIN_SAFE_ADDRESS` | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | Independently verified Safe record | Verified |
| `EXPECTED_TIMELOCK_ADDRESS` | Final TimelockController address | Verified Timelock deployment record | `TBD` |
| `EXPECTED_TREASURY_RECIPIENT` | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected launch input; independently verify before use | Selected; final verification pending |
| `EXPECTED_DEPLOYER_ADDRESS` | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Selected deployment operator input; independently verify before use | Selected; final verification pending |
| `DEPLOYMENT_ARTIFACT_PATH` | Optional path to reviewed deployment JSON | Final deployment output; omit when every contract variable below is supplied | `TBD` / optional |
| `DEPLOYED_REGISTRY_ADDRESS` | Registry address | Explicit final deployment record, or artifact key `registry` | `TBD` |
| `DEPLOYED_ARC_REGISTRAR_ADDRESS` | `.arc` registrar address | Explicit final deployment record, or artifact key `arcRegistrar` | `TBD` |
| `DEPLOYED_CIRCLE_REGISTRAR_ADDRESS` | `.circle` registrar address | Explicit final deployment record, or artifact key `circleRegistrar` | `TBD` |
| `DEPLOYED_ARC_CONTROLLER_ADDRESS` | `.arc` controller proxy address | Explicit final deployment record, or artifact key `arcController` | `TBD` |
| `DEPLOYED_CIRCLE_CONTROLLER_ADDRESS` | `.circle` controller proxy address | Explicit final deployment record, or artifact key `circleController` | `TBD` |
| `DEPLOYED_RESOLVER_ADDRESS` | Resolver proxy address | Explicit final deployment record, or artifact key `resolver` | `TBD` |
| `DEPLOYED_REVERSE_REGISTRAR_ADDRESS` | Reverse registrar address | Explicit final deployment record, or artifact key `reverseRegistrar` | `TBD` |
| `DEPLOYED_PRICE_ORACLE_ADDRESS` | PriceOracle address | Explicit final deployment record, or artifact key `priceOracle` | `TBD` |
| `DEPLOYED_DISCOUNT_REGISTRY_ADDRESS` | DiscountRegistry address | Explicit final deployment record, or artifact key `discountRegistry` | `TBD` |

The script also requires the configured Hardhat `arc_mainnet` network to resolve to Arc mainnet chain ID `5042`. It performs provider reads only: bytecode checks, ownership reads, controller/resolver role reads, treasury reads, and deployer-revocation checks. For both controllers it expects the Admin Safe to hold `DEFAULT_ADMIN_ROLE`, `PAUSER_ROLE`, and `ORACLE_ROLE`, the Timelock to hold `UPGRADER_ROLE`, and the deployer to hold none of those roles.

The script's PASS result is necessary but not sufficient. It does **not** inspect Safe owner membership or threshold, Timelock `minDelay` or internal proposer/canceller/executor/admin roles, registrar controller allowlists, DiscountRegistry controller authorization/owner state, controller discount-registry pointers, root state, or discount activation state. Verify those separately through reviewed read-only calls and operational evidence before treating the ceremony as complete.

## Read-only assertion command template

PowerShell placeholder-only template using explicit contract addresses:

```powershell
$env:EXPECTED_ADMIN_SAFE_ADDRESS = "0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72"
$env:EXPECTED_TIMELOCK_ADDRESS = "<TBD_TIMELOCK_ADDRESS>"
$env:EXPECTED_TREASURY_RECIPIENT = "<TBD_TREASURY_ADDRESS>"
$env:EXPECTED_DEPLOYER_ADDRESS = "<TBD_DEPLOYER_ADDRESS>"
$env:DEPLOYED_REGISTRY_ADDRESS = "<TBD_REGISTRY_ADDRESS>"
$env:DEPLOYED_ARC_REGISTRAR_ADDRESS = "<TBD_ARC_REGISTRAR_ADDRESS>"
$env:DEPLOYED_CIRCLE_REGISTRAR_ADDRESS = "<TBD_CIRCLE_REGISTRAR_ADDRESS>"
$env:DEPLOYED_ARC_CONTROLLER_ADDRESS = "<TBD_ARC_CONTROLLER_ADDRESS>"
$env:DEPLOYED_CIRCLE_CONTROLLER_ADDRESS = "<TBD_CIRCLE_CONTROLLER_ADDRESS>"
$env:DEPLOYED_RESOLVER_ADDRESS = "<TBD_RESOLVER_ADDRESS>"
$env:DEPLOYED_REVERSE_REGISTRAR_ADDRESS = "<TBD_REVERSE_REGISTRAR_ADDRESS>"
$env:DEPLOYED_PRICE_ORACLE_ADDRESS = "<TBD_PRICE_ORACLE_ADDRESS>"
$env:DEPLOYED_DISCOUNT_REGISTRY_ADDRESS = "<TBD_DISCOUNT_REGISTRY_ADDRESS>"
npx hardhat run scripts/mainnet/assert-admin-handoff.js --network arc_mainnet
```

Do not run this template with placeholders. Before a future run, replace every placeholder with an independently reviewed value in the operator's transient shell environment; do not add real values to this document.

## Failure handling

- If any assertion fails, stop. Do not proceed to root set, root freeze, or discount activation.
- If the deployer retains any protocol authority, stop and complete the required revocation before continuing.
- If either controller's treasury does not match the finalized treasury recipient, stop and correct it before launch.
- If any Timelock role or expected upgrade-holder check mismatches, stop and correct the role configuration before upgrades are possible. Timelock internal role and delay verification is a separate required read-only check because the current assertion script does not inspect it.
- If the Admin Safe owners and 2-of-3 threshold cannot be operationally verified, stop. Do not deploy or begin the handoff ceremony.
- Run the read-only `scripts/mainnet/check-safe-config.js` against the final Safe and require PASS before recording its address or deploying the Timelock.
- Record the failure and independently review the correction and all resulting final-state reads before rerunning the complete assertion.

## Discount lifecycle dependency

- Root set must happen only after deployment, contract verification, and the initial authority handoff are complete.
- Root freeze must happen only after independent verification of the root and associated snapshot/proofs. A wrong frozen root is irreversible in that registry and requires replacement or migration plus controller reconfiguration.
- Discount activation must happen only after the root is frozen, the handoff assertion passes, the indexer is ready, frontend proof delivery is ready, and explicit launch approval is given.
- Ordinary deployment must not activate the discount. `scripts/v3/deployV3.js` must leave the root unset, unfrozen, and inactive; root set, freeze, and activation remain separate reviewed operations.

## Remaining blockers

- [x] Final Admin Safe address is recorded and read-only verified.
- [x] Selected Safe owners and the 2-of-3 threshold are verified against the mainnet Safe.
- [ ] Selected deployer/treasury address still requires final operational verification.
- [ ] Timelock is not deployed.
- [ ] Timelock address is `TBD`.
- [ ] Contract addresses are `TBD` until deployment.
- [ ] Deploy-grade RPC is unresolved.
- [ ] Blockscout verification is unresolved.
- [ ] Mainnet indexer/subgraph is unresolved.
- [ ] Frontend mainnet/discount cutover is unresolved.
- [ ] Final launch review is still required.

Arc mainnet is not ready to deploy while any blocker remains open. Completing this plan does not resolve the blockers by itself.

## Non-goals and safety boundary

- This document does not deploy contracts.
- This document does not create a Safe.
- This document does not deploy `TimelockController`.
- This document does not submit transactions, call write functions, or sign anything.
- This document does not transfer ownership or roles.
- This document does not grant or revoke roles.
- This document does not set prices.
- This document does not set or freeze a Merkle root.
- This document does not activate the discount.
- This document does not switch the frontend to mainnet.
- This document does not approve mainnet launch.
- This document does not modify environment values, secrets, private keys, wallet credentials, or real deployment artifacts.

## Related documents and tooling

- Authority model: [`ADMIN_OWNERSHIP_PLAN.md`](./ADMIN_OWNERSHIP_PLAN.md)
- Admin Safe readiness: [`ADMIN_SAFE_READINESS_PLAN.md`](./ADMIN_SAFE_READINESS_PLAN.md)
- Timelock readiness: [`TIMELOCK_READINESS_PLAN.md`](./TIMELOCK_READINESS_PLAN.md)
- Deployment preparation: [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md)
- Launch checks: [`SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)
- Focused review: [`FOCUSED_SECURITY_REVIEW.md`](./FOCUSED_SECURITY_REVIEW.md)
- Read-only handoff assertion: [`../../scripts/mainnet/assert-admin-handoff.js`](../../scripts/mainnet/assert-admin-handoff.js)
- Read-only Safe configuration check: [`../../scripts/mainnet/check-safe-config.js`](../../scripts/mainnet/check-safe-config.js)
- Future read-only Timelock configuration check: [`../../scripts/mainnet/check-timelock-config.js`](../../scripts/mainnet/check-timelock-config.js)
