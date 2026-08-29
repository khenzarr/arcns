# FlashNames legacy identifier allowlist

This cutover removes the former product name from user-facing website, app,
metadata, integration API examples, repository package descriptions, and brand
assets. The following identifiers are intentionally retained until their own
safe migration window.

## Smart-contract and ABI identifiers

- Solidity class names such as `ArcNSRegistry`, `ArcNSController`, and
  `ArcNSResolver` remain unchanged in this UI-focused pull request.
- ABI filenames and generated TypeScript symbols matching those deployed class
  names remain unchanged so integrations do not break.
- Registrar NFT name/symbol/metadata strings must be reviewed in the separate
  pre-mainnet deployment patch described in `FLASHNAMES_MAINNET_CUTOVER.md`.

Renaming Solidity classes changes artifact names but does not preserve a
deployment address. Mainnet addresses do not exist until deployment; this PR
therefore does not make cosmetic contract changes or promise deterministic
address parity.

## Legacy testnet infrastructure

- `deployments/arc_testnet-v3.json` and the generated testnet snapshot remain as
  historical, currently deployed testnet records.
- Existing Graph Studio and Goldsky slugs containing `arcns` remain until new
  FlashNames mainnet indexers are provisioned and verified.
- Testnet chain definitions remain in code for the still-live testnet build,
  but the mainnet UI selects its runtime from generated deployment data.

## Compatibility and immutable records

- `arcname.services` may appear only as a documented legacy redirect or
  compatibility host; it is not the mainnet canonical URL.
- The early-adopter campaign identifier
  `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1` remains immutable to preserve proof
  compatibility.
- Internal CSS custom properties, cache keys, archived test fixtures, and
  historical audit filenames may retain `arcns` where renaming would add risk
  without changing public branding.

Any additional occurrence requires either removal before merge or an explicit
addition to this allowlist with an operational reason.
