# FlashNames Mainnet Cutover

Status: draft launch gate. This document accompanies the unmerged FlashNames
mainnet rebrand pull request. It must not be used to change the current public
testnet deployment.

Domain readiness: `flashnames.space` has been acquired by the project. Ownership
is complete; DNS and Vercel attachment remain cutover-day operational steps.

## Scope

The cutover keeps the existing application layout and interaction design while
replacing the former product identity with FlashNames. Arc is used only as the
underlying network descriptor, for example "built on Arc".

This change set includes:

- FlashNames wordmark, emblem, application icon, and social metadata
- public application copy, legal notices, and canonical URLs
- mainnet-focused UI without persistent testnet or chain-ID badges
- FlashNames public resolution API documentation and code samples
- repository/package identity and launch documentation

This change set intentionally does not rename Solidity contracts, interfaces,
ABIs, immutable testnet deployment records, or the finalized early-adopter
campaign identifier. Those technical identifiers are tracked separately from
the public product identity.

## Required sequence

1. Complete security and operational launch gates.
2. Confirm the production USDC address, treasury, RPC, explorer, and indexing endpoints.
3. Deploy and verify the mainnet contract topology.
4. Save the deployment as `deployments/arc_mainnet-v3.json`.
5. Run `node scripts/generate-frontend-config.js --network arc_mainnet`.
6. Confirm `frontend/src/lib/generated-contracts.ts` reports chain ID `5042`
   and contains only the verified mainnet addresses.
7. Verify the deployed PriceOracle returns the approved annual mainnet tiers:
   `100 / 50 / 25 / 15 / 5 USDC` for `1 / 2 / 3 / 4 / 5+` characters.
8. Confirm the onchain quote shown in the search result card exactly matches
   the static mainnet pricing table for every tier and duration.
9. Configure the production and preview environment variables listed below.
10. Run the full contract suite, frontend tests, production build, and mainnet smoke tests.
11. Rename the GitHub repository to `khenzarr/flashnames` and repair canonical links and integrations.
12. Configure DNS for the owned `flashnames.space` domain and attach it to the
    production Vercel project.
13. Merge the cutover pull request only after the deployed addresses have been committed and reviewed.
14. Enable path-preserving redirects from `arcname.services` after the new canonical host is healthy.

Do not merge the UI before the real mainnet deployment addresses are present.
Otherwise the production interface can connect wallets to Arc while targeting
missing or incorrect contracts.

## Environment checklist

Required values must be validated against the final deployment record:

- `NEXT_PUBLIC_CHAIN_ID=5042`
- `NEXT_PUBLIC_RPC_URL`
- `NEXT_PUBLIC_RPC_URL_2`
- `NEXT_PUBLIC_RPC_URL_3`
- `NEXT_PUBLIC_BLOCK_EXPLORER_URL`
- `NEXT_PUBLIC_SUBGRAPH_URL`
- `NEXT_PUBLIC_SUBGRAPH_FALLBACK_URL`
- `NEXT_PUBLIC_EURC_ADDRESS` after Circle publishes and verifies an Arc mainnet address
- `NEXT_PUBLIC_CIRBTC_ADDRESS` after Circle publishes and verifies an Arc mainnet address
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

The canonical website and API origin are `https://flashnames.space` and
`https://flashnames.space/api/v1`.

## Contract branding boundary

The current mainnet rebrand does not rename Solidity source-level classes such
as `ArcNSRegistry` or `ArcNSController`. The Arc team email addressed the public
protocol, product, and repository identity; source-level contract naming remains
an explicit follow-up decision.

Before mainnet deployment, separately review the registrar constructor and
`tokenURI` output. The current implementation contains former-brand collection
names, symbols, descriptions, and SVG text. User-visible onchain metadata must
not be deployed under the former product identity. Updating those strings does
not change the public ABI, but it does change deployment bytecode and therefore
requires a fresh build, verification inventory, and audit review.

The finalized legacy campaign ID
`ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1` must remain unchanged unless the Merkle
snapshot and every proof are deliberately regenerated and revalidated.

## Verification gate

- No public page presents the former product name as the current brand.
- No public page displays persistent testnet, pre-mainnet, or chain-ID badges.
- Header, footer, metadata, WalletConnect, legal pages, and API docs say FlashNames.
- All canonical URLs point to `flashnames.space`.
- API examples resolve through `flashnames.space/api/v1`.
- Wrong-network prompts target the deployed mainnet chain without cluttering normal UI.
- Every remaining former-brand repository match is documented as a contract,
  ABI, testnet deployment, immutable campaign, compatibility key, or historical record.
- Registration, renewal, resolution, reverse resolution, Send, wallet asset discovery,
  and portfolio reads pass against the verified mainnet deployment.

## Trademark notice

FlashNames is an independent naming protocol built on Arc. FlashNames is not
affiliated with, endorsed by, sponsored by, or operated by Circle or the Arc
team unless separately agreed in writing. Arc is a trademark of Circle Internet
Group, Inc. and/or its affiliates. All other trademarks are the property of
their respective owners.
