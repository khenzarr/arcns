# ArcNS — Deployed Contract Addresses

**Canonical source:** `deployments/arc_mainnet-v3.json` → `frontend/src/lib/generated-contracts.ts`

**Network:** Arc Mainnet

**Chain ID:** 5042

**Initial deployment:** 2026-09-16
**Metadata V2 cutover:** 2026-09-16

> If any address in this document conflicts with `deployments/arc_mainnet-v3.json`, the canonical deployment JSON is the source of truth.

## Network Reference

| Field | Value |
|---|---|
| RPC | `https://rpc.mainnet.arc.io` |
| Explorer | `https://explorer.arc.io` |
| USDC | `0x3600000000000000000000000000000000000000` |

## Active Production Contracts

| Contract | Address | Notes |
|---|---|---|
| ArcNSRegistry | [`0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb`](https://explorer.arc.io/address/0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb?tab=contract) | Non-upgradeable |
| ArcNSResolver proxy | [`0x68Bb5D43E8c7394876de2174d1BA320745D47023`](https://explorer.arc.io/address/0x68Bb5D43E8c7394876de2174d1BA320745D47023?tab=contract) | UUPS proxy |
| ArcNSResolver implementation | [`0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05`](https://explorer.arc.io/address/0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05?tab=contract) | Exact-match verified |
| ArcNSReverseRegistrar | [`0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a`](https://explorer.arc.io/address/0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a?tab=contract) | Non-upgradeable |
| ArcNSPriceOracle | [`0x61baCC1623Eb5C1Ccd5D46B05CF6EB8Dd8130cc8`](https://explorer.arc.io/address/0x61baCC1623Eb5C1Ccd5D46B05CF6EB8Dd8130cc8?tab=contract) | Non-upgradeable |
| ArcBaseRegistrarV2 (.arc) | [`0x1a99540B48A21db03c768760052c3F915F9852aB`](https://explorer.arc.io/address/0x1a99540B48A21db03c768760052c3F915F9852aB?tab=contract) | Label-aware NFT metadata |
| CircleBaseRegistrarV2 (.circle) | [`0xC3568DF382599495ed7f10188a417858E00eb720`](https://explorer.arc.io/address/0xC3568DF382599495ed7f10188a417858E00eb720?tab=contract) | Label-aware NFT metadata |
| ArcController proxy | [`0xE62De42eAcb270D2f2465c017C30bbf24F3f9350`](https://explorer.arc.io/address/0xE62De42eAcb270D2f2465c017C30bbf24F3f9350?tab=contract) | UUPS proxy |
| CircleController proxy | [`0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1`](https://explorer.arc.io/address/0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1?tab=contract) | UUPS proxy |
| Shared Controller implementation | [`0xb343b3fca4e52238b21F8fDb41211a03556DD232`](https://explorer.arc.io/address/0xb343b3fca4e52238b21F8fDb41211a03556DD232?tab=contract) | Metadata V2 compatible |
| EarlyAdopterDiscountRegistry | [`0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2`](https://explorer.arc.io/address/0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2?tab=contract) | Active, frozen snapshot root |

All active contracts above are exact-match source-verified on the official Arc Explorer.

## Administration

| Component | Address | Notes |
|---|---|---|
| Admin Safe (2-of-3) | `0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` | Operational administration |
| ArcNSTimelock | `0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c` | Holds persistent controller upgrade authority |
| Treasury | `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D` | Receives registration fees |

## Indexed Data Layer

| Role | Endpoint |
|---|---|
| Primary | Goldsky `arcns-mainnet` |
| Fallback | The Graph Studio `arc-ns-mainnet` |
| RPC fallback | `https://rpc.mainnet.arc.io` |

The active subgraph manifests are `indexer/subgraph.mainnet.yaml` and `indexer/subgraph.graph-mainnet.yaml`.

## Namehash Reference

| Name | Namehash |
|---|---|
| `.arc` | `0x9a7ad1c5d8b1c60ef156c6723dbf462681d6462768a9e60c53665d7fc1337bae` |
| `.circle` | `0xb3f3947bd9b363b1955fa597e342731ea6bde24d057527feb2cdfdeb807c2084` |
| `addr.reverse` | `0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2` |

## Metadata V2 Migration Evidence

| Step | Transaction |
|---|---|
| Pause controllers | [`0xc43c94fc…34e73e`](https://explorer.arc.io/tx/0xc43c94fcd6622a02353ad9cd5834ca1d2167e37e61e04ed8a38a0929b634e73e) |
| Atomic upgrade and registrar cutover | [`0x82622851…26ad86`](https://explorer.arc.io/tx/0x826228516b3a37ebd69b05c6fabc4699cab982e538ac759ff70f398b1526ad86) |
| Unpause controllers | [`0xf5ae5486…0c2f23`](https://explorer.arc.io/tx/0xf5ae5486f5f8741c629780fc8537451b64dd49f5669ad5f8be2e36e4e0c2f23) |

The migration preserved the existing `circle.arc` owner and expiry while changing its on-chain NFT title to `circle.arc` and its description to Arc Mainnet.
