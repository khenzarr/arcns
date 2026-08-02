# ArcNS Mainnet Frontend / Discount Cutover Plan (Aşama 5E)

> **Readiness plan only.** This document describes a future, separately reviewed frontend cutover. It does not change the active frontend network, deploy the frontend, modify Vercel production configuration, or approve launch.

## A. Executive summary

This is a cutover plan, not an executed frontend switch. The production frontend must remain testnet-bound until every contract, infrastructure, indexer, proof-delivery, frontend, and launch-approval gate passes. Frontend mainnet cutover remains a launch blocker.

Mainnet contract addresses, the mainnet subgraph endpoint, proof delivery, and Vercel environment values are `TBD`. The discount UI must remain hidden and inactive until contract deployment and verification, root freeze, proof delivery, indexer readiness, preview validation, and explicit launch approval are complete. Frontend readiness alone must never trigger root lifecycle operations or discount activation.

Proof artifact preparation is tracked separately in [`PROOF_DELIVERY_PLAN.md`](./PROOF_DELIVERY_PLAN.md).

## B. Required frontend inputs

| Input | Required value | Source | Status | Notes |
|---|---|---|---|---|
| Chain ID | `5042` | Approved Arc mainnet network facts | Final | Must be asserted in preview before any mainnet-mode action. |
| Chain name | `TBD` | Approved frontend/network configuration | Blocked | Do not infer final display text from inactive or historical config. |
| Deploy-grade RPC / public read RPC | `TBD` | [`DEPLOY_INFRA_READINESS.md`](./DEPLOY_INFRA_READINESS.md) and approved provider evidence | Blocked | Deploy-grade RPC is not approved; frontend public-read requirements must be finalized separately. |
| Block explorer URL | `TBD` | Approved Blockscout/browser configuration | Blocked | Existing browser candidate is not final frontend cutover approval. |
| USDC address | `0x3600000000000000000000000000000000000000` | Approved Arc mainnet network facts | Final | Symbol `USDC`; decimals `6`. |
| Registry address | `TBD` | Final mainnet deployment record | Blocked | Never copy a testnet address. |
| `.arc` registrar address | `TBD` | Final mainnet deployment record | Blocked | Never copy a testnet address. |
| `.circle` registrar address | `TBD` | Final mainnet deployment record | Blocked | Never copy a testnet address. |
| `.arc` controller address | `TBD` | Final mainnet deployment record | Blocked | Required by registration and renewal flows. |
| `.circle` controller address | `TBD` | Final mainnet deployment record | Blocked | Required by registration and renewal flows. |
| Resolver address | `TBD` | Final mainnet deployment record | Blocked | Required by resolution and optional registration-time records. |
| Reverse registrar address | `TBD` | Final mainnet deployment record | Blocked | Required by primary-name/reverse flows. |
| Price oracle address, if frontend reads it | `TBD` | Final mainnet deployment record and reviewed frontend design | Blocked | Current active quote path calls controller `rentPrice`; retain this row until the final read architecture is reviewed. |
| Discount registry address | `TBD` | Final mainnet deployment record | Blocked | One shared registry must serve both namespaces. |
| Campaign ID | `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1` | Finalized snapshot manifest and [`EARLY_ADOPTER_SNAPSHOT.md`](./EARLY_ADOPTER_SNAPSHOT.md) | Final | Campaign identity is fixed even though eligibility came from the finalized testnet snapshot. |
| Campaign ID bytes32 | `0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3` | Finalized snapshot manifest and independent review | Final | `keccak256` of the campaign string. |
| Merkle root | `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e` | Finalized snapshot manifest | Final data; on-chain lifecycle pending | Must be independently read back after set/freeze operations; this plan performs neither. |
| Proof data source | `TBD` | Reviewed proof-delivery design | Blocked | Finalized artifacts contain 849 eligible wallet proofs, but the production delivery source is unresolved. |
| Proof delivery endpoint or bundled artifact path | `TBD` | Reviewed frontend/proof-delivery change | Blocked | Must have integrity, availability, caching, and safe not-eligible behavior defined. |
| Mainnet subgraph endpoint | `TBD` | Final deployed and synchronized indexer output | Blocked | No mainnet endpoint is deployed or approved. |
| Fallback read-only RPC | `TBD` | Approved frontend infrastructure decision | Blocked | The known Radar endpoint is classified only as a read-only/testing fallback and is not automatically approved for production frontend use. |
| Vercel environment variables | `TBD` | Separately approved preview and production configuration records | Blocked | Names are planned below; no value is changed by this document. |
| Production domain | `TBD` | Approved Vercel/project ownership record | Blocked | Do not infer from repository metadata. |
| Rollback target | `TBD` | Last approved testnet production deployment and configuration record | Blocked | Must be recorded and verified before cutover. |

## C. Current frontend state

The following findings are based on the current repository inspection; they do not change runtime behavior:

- **Production/testnet binding:** The active frontend is testnet-bound. `frontend/src/lib/generated-contracts.ts` identifies Arc Testnet chain `5042002` and contains testnet addresses; `frontend/src/app/providers.tsx` presents Arc Testnet chain enforcement; `frontend/src/lib/chains.ts` and `frontend/src/lib/publicClient.ts` default to testnet RPCs.
- **Mainnet config:** `frontend/src/lib/chains.ts` contains an inactive Arc mainnet chain definition, but `frontend/src/lib/chainConfig.ts` only supplies the current testnet contract set and `ACTIVE_CHAIN_ID` defaults to `5042002`. There is no final mainnet generated deployment/address file.
- **Contract address wiring:** `frontend/src/lib/contracts.ts` consumes testnet values exported by `frontend/src/lib/generated-contracts.ts`. `scripts/generate-frontend-config.js` currently targets the testnet deployment file. Mainnet addresses are absent and must not be inferred.
- **Registration flow:** `frontend/src/hooks/useRegistration.ts` implements the active commit-reveal flow, including USDC approval and controller `register`; `frontend/src/hooks/useAvailability.ts` reads `available`, `rentPrice`, and expiry-related state directly from contracts.
- **Renewal flow:** `frontend/src/hooks/useRenew.ts` performs direct ownership reads, USDC approval, and controller `renew`; it uses the normal quote and max-cost path.
- **Discount UI/integration:** No active discount UI, `registerWithDiscount` call, proof lookup, or Merkle-proof handling was found under `frontend/src`. Discount UX is therefore absent/inactive rather than launch-ready.
- **Subgraph configuration:** `frontend/src/lib/graphql.ts` reads `NEXT_PUBLIC_SUBGRAPH_URL`, `NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL`, and `NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL`. No final mainnet endpoint exists.
- **Direct reads versus indexed reads:** Availability, quotes, allowance/balance, registration, and renewal rely on direct contract interactions. Portfolio, registration/renewal history, and resolution-oriented reads can use GraphQL, with null/empty failure behavior and RPC fallback in relevant call sites.
- **Wallet/network handling:** `frontend/src/lib/wagmiConfig.ts` configures Wagmi connectors. `frontend/src/app/providers.tsx` shows a wrong-network banner, and registration/renewal hooks reject a wallet chain that differs from `DEPLOYED_CHAIN_ID`. A reviewed mainnet-preview-only switch prompt is not yet implemented.
- **Environment variables:** Current public runtime variables include RPC, subgraph, and WalletConnect settings. The current build does not require final mainnet environment values because testnet defaults/config are present; that is not evidence of mainnet readiness.
- **Vercel configuration:** `frontend/vercel.json` contains framework/build settings only. No production environment values were found there, and this plan does not alter Vercel configuration.

## D. Cutover sequence

This is a dry-run sequence only:

1. Complete mainnet contract deployment.
2. Complete contract verification or explicitly risk-accept the verification blocker through the required review.
3. Complete Safe/Timelock handoff and read-only assertion.
4. Complete mainnet indexer/subgraph deployment and sync.
5. Confirm every final frontend input table value.
6. Prepare frontend mainnet config in a separate reviewed PR.
7. Add final mainnet contract addresses.
8. Add the final mainnet subgraph endpoint.
9. Add proof delivery integration.
10. Keep discount UI inactive by default.
11. Deploy preview only.
12. Run frontend smoke tests on preview.
13. Verify the normal registration quote path.
14. Verify the renewal quote path.
15. Verify the discount eligibility lookup path.
16. Verify the ineligible-wallet path.
17. Verify indexer lag and failure handling.
18. Verify legal, footer, and brand copy remains intact.
19. Enable discount UI only after the root is frozen and the activation ceremony is approved.
20. Promote to production only after final launch approval.

Steps 11 and 20 are future release operations and are not performed by this plan.

## E. Discount UX readiness gates

| Gate | Required evidence | Status | Blocks discount UI? |
|---|---|---|---|
| DiscountRegistry deployed | Verified final address, bytecode/source evidence, and deployment record | `TBD` | Yes |
| Campaign ID matches finalized campaign | Read-only deployed `campaignId` equals the finalized string-derived bytes32 | `TBD` | Yes |
| Merkle root set | Read-only registry root equals the finalized root | `TBD` | Yes |
| Root frozen | Read-only frozen-state assertion and reviewed ceremony evidence | `TBD` | Yes |
| Discount inactive before launch | Read-only inactive-state evidence throughout preview testing | `TBD` | Yes |
| Proof data source finalized | Reviewed source, integrity/versioning policy, owner, and rollback procedure | `TBD` | Yes |
| 849 proof entries available | Deterministic count and proof/root verification against the finalized artifact | Final artifact exists; delivery `TBD` | Yes |
| Eligible wallet proof lookup works | Preview evidence for sampled eligible wallets without exposing sensitive credentials | `TBD` | Yes |
| Ineligible wallet shows safe fallback | Preview evidence showing normal registration remains available and no false eligibility claim appears | `TBD` | Yes |
| Used discount state can be detected or handled | Indexed `DiscountUsed` state or defined direct read, plus deterministic already-used UX | `TBD` | Yes |
| Both `.arc` and `.circle` controllers wired | Read-only controller pointers and registry authorization evidence | `TBD` | Yes |
| One-time discount across both namespaces is understood in UX | Reviewed copy and cross-namespace used-state test | `TBD` | Yes |
| Premium/expired-name premium handling is explained | Quote UI/tests show discount applies only to base and any premium remains full; current lifecycle caveat is documented | `TBD` | Yes |
| Indexer supports discount lifecycle/consumption events or fallback direct reads are defined | Synced query evidence or reviewed read-only fallback specification | `TBD` | Yes |
| Activation has explicit approval | Recorded final launch approval after all prior gates | `TBD` | Yes |

## F. Frontend smoke test checklist

Run only against a separately approved preview after final values are supplied:

- [ ] App loads on preview.
- [ ] Wallet connect works for supported connectors.
- [ ] Wrong-chain state blocks writes and displays safe guidance.
- [ ] Switch-to-Arc-mainnet prompt appears only in mainnet preview mode.
- [ ] Search an available name.
- [ ] Search an unavailable name.
- [ ] Normal registration quote matches direct controller reads.
- [ ] Renewal quote matches direct controller reads.
- [ ] USDC approval requirement and spender are correct.
- [ ] Max cost/slippage is displayed or clearly explained if applicable.
- [ ] Discount-eligible wallet proof lookup succeeds.
- [ ] Discount-ineligible wallet receives a safe fallback to the normal path.
- [ ] Discount-already-used state is handled across `.arc` and `.circle`.
- [ ] Subgraph-unavailable state fails safely and follows the reviewed fallback behavior.
- [ ] Indexer-lag state is detected or communicated within the approved lag policy.
- [ ] Block explorer links use the approved mainnet browser URL and correct transaction/address paths.
- [ ] Legal and footer content remains present.
- [ ] No testnet copy, addresses, chain IDs, RPCs, or subgraph endpoints leak into mainnet mode.
- [ ] No mainnet copy, addresses, chain IDs, RPCs, or subgraph endpoints leak into production testnet mode before cutover.

## G. Environment variable plan

### Mainnet preview

The separate frontend PR must map final configuration to the repository's reviewed runtime model. Expected public variable names include, where retained by that implementation:

- `NEXT_PUBLIC_CHAIN_ID` = `5042` in mainnet preview mode;
- `NEXT_PUBLIC_RPC_URL` = `TBD`;
- `NEXT_PUBLIC_RPC_URL_2` = `TBD`;
- `NEXT_PUBLIC_RPC_URL_3` = `TBD`;
- `NEXT_PUBLIC_SUBGRAPH_URL` = `TBD`;
- `NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL` = `TBD`;
- `NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL` = `TBD` or omitted if not part of the final design;
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` = `TBD` under the approved project configuration;
- mainnet contract-address source/config = `TBD` (prefer a reviewed generated public config rather than individually invented variables);
- proof delivery endpoint or bundled artifact selector = `TBD`;
- discount UI feature flag, default off = `TBD`;
- mainnet registration enable/maintenance flag, fail closed = `TBD`.

### Production cutover

Production must use the same reviewed names and exact approved values that passed preview, with environment scoping explicitly verified. Values must not be committed when secret. Public values may be documented by variable name, but all unknown values remain `TBD`. A production environment change requires separate approval and must not be bundled into this readiness document.

Before cutover, record and test the rollback environment values for the previous production deployment, including chain selection, RPCs, subgraph endpoints, contract config, proof-delivery config, discount flag, and registration/maintenance flag. The exact Vercel project, production domain, variable values, approver, and rollback target remain `TBD`.

## H. Rollback plan

1. Roll back to the previous approved production deployment.
2. Revert mainnet environment variables to the recorded prior production values through a separately approved production configuration change.
3. Hide the discount UI through the reviewed fail-closed flag.
4. Disable frontend mainnet registration or present a maintenance state if the indexer or proof-delivery service fails and the approved fallback cannot preserve safe behavior.
5. Communicate a maintenance state when user-visible reads or registration safety cannot be guaranteed.
6. Preserve read-only incident evidence and identify the failed dependency before another preview/promotion attempt.

Never activate the discount solely because the frontend appears ready. Frontend rollback does not reverse on-chain state, and frontend readiness does not authorize any root, freeze, activation, ownership, role, or deployment operation.

## I. Remaining blockers

- Final mainnet contract addresses are `TBD`.
- Final mainnet subgraph endpoint is `TBD`.
- Proof delivery is unresolved.
- Deploy-grade RPC is unresolved.
- Blockscout verification is unresolved.
- Mainnet indexer/subgraph is not deployed or synchronized.
- The frontend mainnet PR has not been created.
- Preview smoke tests have not been run.
- Final Vercel preview/production values, production domain, and rollback target are `TBD`.
- Discount lifecycle read-back evidence and explicit activation approval are incomplete.
- Final launch review is not complete.

## J. Non-goals

- This document does not switch the frontend to mainnet.
- This document does not deploy the frontend.
- This document does not deploy contracts.
- This document does not activate the discount.
- This document does not create proof delivery.
- This document does not approve mainnet launch.
- This document does not modify Vercel production configuration or production environment variables.
- This document does not submit transactions, sign anything, call write functions, set prices, set or freeze a Merkle root, create launch administration infrastructure, or change ownership or roles.
