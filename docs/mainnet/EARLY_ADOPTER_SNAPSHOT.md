# Early-Adopter Snapshot

Eligibility is based on one finalized Arc Testnet block (`5042002`): active v3 `.arc` and active v3 `.circle` names only. Legacy/v1/v2 names, expired names, burned/zero-owner names, and documented protocol/admin/internal addresses are excluded. Smart-contract wallets remain eligible unless explicitly excluded. Multiple names produce one wallet entry.

The read-only generator is `scripts/snapshot/generate-arcns-v3-early-adopters.js`. It requires a fixed block number, block hash, timestamp, both registrar addresses, and a deterministic indexer/RPC export. Every included row must expose registrar provenance through `registrar`, `registrarAddress`, `sourceRegistrar`, or `tldRegistrar`, and that address must exactly match the supplied registrar for its TLD. Explicit legacy/v1/v2 source markers are rejected. When an export has no separate version marker, exact registrar matching is the required v3 source proof; rows without enough provenance fail loudly. Zero owners are excluded. The leaf encoding is `keccak256(abi.encode(campaignId, account))`.

## Final Arc Testnet v3 snapshot

- Campaign ID: `ARCNS_TESTNET_V3_EARLY_ADOPTER_2026_V1`
- Campaign ID bytes32 (`keccak256(UTF-8 campaign string)`): `0xae3c7462e46cc76b3e0349e7d211264ada95257da9d9d7a797abed70b7eb83e3`
- Snapshot block: `54933646`
- Block hash: `0x0a450d7fb8055de409084ddb9942f31431aa017a3b3241c4eb8e2e655b8c024d`
- Block timestamp: `1785673991` (`2026-08-02T12:33:11.000Z`)
- Finality: Arc Testnet RPC `finalized` tag
- Active eligible `.arc` names: `1272`
- Active eligible `.circle` names: `576`
- Active eligible names: `1848`
- Unique eligible wallets: `849`
- Excluded protocol/admin/internal names: `26`
- Duplicate wallet reductions: `999`
- Merkle root: `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`
- Leaf encoding: `keccak256(abi.encode(campaignId, account))`
- Generator commit: `c16665bb37ba11870cf1fc7b50f8e6e40fb7dade`
- Generated at: `2026-08-02T13:07:29.868Z`

The fixed-block Goldsky v3 subgraph export (configured start block `38856377`) was pinned to block `54933646`; each exported row was bound to the canonical registrar from `deployments/arc_testnet-v3.json`. Canonical registrar historical calls at the fixed block were sampled through the archive-capable Arc Testnet RPC. The explicit exclusion list is `scripts/snapshot/arc-testnet-v3-exclusions.json`, including the documented administration Safe and its owners. Smart-contract wallets not present in that list remain eligible.

Reproduce with the fixed arguments recorded in `snapshots/arc-testnet-v3-early-adopters/manifest.json`, using `snapshots/arc-testnet-v3-early-adopters/source/block-pinned-subgraph-records.json` as the deterministic input.

Before launch: finalize the block, verify the export against registrar/controller history, review exclusions and counts, independently recompute the root/proofs, record the manifest git commit and timestamp, set the registry root, freeze it, authorize both controllers, then activate the campaign. The same shared registry enforces one claim across `.arc` and `.circle`.