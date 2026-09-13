# ArcNS UI cutover checklist (draft, September 13, 2026)

This branch prepares ArcNS branding for Arc mainnet. It does not authorize a launch, change production, deploy contracts, or replace the canonical [launch-input register](./MAINNET_LAUNCH_INPUTS.md). The FlashNames rebrand remains a separate, dormant draft.

## Completed in this branch

- [x] Keep ArcNS and `arcname.services`; add “Built on Arc” beneath the primary wordmark and in the logo asset.
- [x] Derive wallet chain, read clients, block explorer links, API chain identity, and visible network labels from the generated deployment chain, rather than an independent UI flag.
- [x] Remove persistent “Testnet” and “Chain ID 5042002” header/app badges when the generated deployment points to Arc mainnet.
- [x] Preserve testnet UI and 50/25/15/10/2 pricing when the generated deployment remains on testnet.
- [x] Display 100/50/25/15/5 USDC annual standard pricing on mainnet; registration and renewal quotes remain onchain.
- [x] Add eligible-wallet-only first-registration discount choice. It appears only when the local snapshot proof matches and live mainnet reads confirm campaign ID, snapshot block, root, frozen/active state, both controller pointers/authorizations, and unused wallet state. The selectable price is the onchain `discountRentPrice` quote; the wallet submits `registerWithDiscount` with the proof. Failures return to the standard path.
- [x] Update the independence/trademark notice to state ArcNS is not an official Arc/Circle product; retain third-party attribution. The founder reports conditional Arc team approval of the revised website with “Built on Arc” prominently maintained; archive that email and review future changes against its scope.
- [x] Do not show testnet EURC/cirBTC contract addresses on mainnet. Only verified mainnet address configuration may enable those suggested tokens; custom ERC-20 and indexed wallet assets remain available.

## Release-blocking inputs and verification

- [ ] Archive the founder-reported final Arc team approval of the revised ArcNS website, including its “Built on Arc” condition. Preserve that descriptor in the released UI and obtain a final review if the approved presentation changes. A disclaimer alone is not a substitute for the reported approval.
- [ ] Complete qualified external smart-contract audit, remediate findings, and verify deployed source/bytecode.
- [ ] Approve deploy-grade mainnet RPC, operator/deployer funding, Blockscout API/verification workflow, indexer, deployment roles, production owners, monitoring, and tested rollback.
- [ ] Deploy and verify Timelock with the approved 48-hour delay and Safe roles; complete authority handoff and revoke deployer privileges.
- [ ] Deploy all v3 contracts and shared DiscountRegistry using the finalized campaign; verify chain 5042, mainnet USDC, 100/50/25/15/5 oracle reads, pointers, role grants, receipts, and explorer records. Deployment is **not** a single last-minute switch.
- [ ] In separately approved ceremonies, set/freeze the finalized Merkle root and activate the campaign only after the UI, proof delivery, and used-state path have passed preview checks.
- [ ] Deploy and sync the mainnet indexer from verified contract start blocks. Set production `NEXT_PUBLIC_SUBGRAPH_URL` to the verified mainnet endpoint; do not reuse testnet URLs.
- [ ] After deployment, run `node scripts/generate-frontend-config.js --network arc_mainnet`; generation fails without chain 5042 and DiscountRegistry. Do not edit `generated-contracts.ts` manually or copy testnet addresses. Verify the resulting diff.
- [ ] Supply approved mainnet RPC/explorer, WalletConnect, and optional verified EURC/cirBTC addresses in preview/production configuration; review every environment value. Remove or replace stale testnet values.
- [ ] Preview end-to-end on chain 5042: .arc/.circle search, normal quote/registration, eligible and ineligible wallets, claim once across both namespaces, used-state refresh, renewal, resolve, reverse records, Send and wallet asset discovery, API health and integration examples. Verify displayed vs approved and wallet-paid USDC amounts.
- [ ] Confirm production rollback target and explicit launch approval before merging/cutover. Keep the testnet deployment recoverable.

## Current verdict

**NO-GO.** The canonical launch-input register records no mainnet v3 deployment, no deployed Timelock, and no active discount campaign. The UI branch is preparation only; chain writes and production release require separate approval and evidence.
