# ArcNS mainnet source verification

Checked: 2026-09-16. Status: **COMPLETE — 12/12 exact-match on the official Arc explorer**.

Official explorer: <https://explorer.arc.io>

The verification set contains only the deployed ArcNS naming protocol and its
operational Timelock. Experimental DAO governance contracts and an ArcNS ERC-20
token were not deployed and are not included. The external USDC contract is not
an ArcNS verification target.

## Exact-match contracts

| Contract | Address |
|---|---|
| ArcNSRegistry | [`0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb`](https://explorer.arc.io/address/0xcA4d60A6d237EDa59aA1F57EbAe6B3150BcAb8Fb?tab=contract) |
| ArcNSPriceOracle | [`0x61baCC1623Eb5C1Ccd5D46B05CF6EB8Dd8130cc8`](https://explorer.arc.io/address/0x61baCC1623Eb5C1Ccd5D46B05CF6EB8Dd8130cc8?tab=contract) |
| ArcNSBaseRegistrarV2 (.arc) | [`0x1a99540B48A21db03c768760052c3F915F9852aB`](https://explorer.arc.io/address/0x1a99540B48A21db03c768760052c3F915F9852aB?tab=contract) |
| ArcNSBaseRegistrarV2 (.circle) | [`0xC3568DF382599495ed7f10188a417858E00eb720`](https://explorer.arc.io/address/0xC3568DF382599495ed7f10188a417858E00eb720?tab=contract) |
| ArcNSReverseRegistrar | [`0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a`](https://explorer.arc.io/address/0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a?tab=contract) |
| ArcNSEarlyAdopterDiscountRegistry | [`0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2`](https://explorer.arc.io/address/0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2?tab=contract) |
| ArcNSResolver implementation | [`0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05`](https://explorer.arc.io/address/0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05?tab=contract) |
| ArcNSController implementation | [`0xb343b3fca4e52238b21F8fDb41211a03556DD232`](https://explorer.arc.io/address/0xb343b3fca4e52238b21F8fDb41211a03556DD232?tab=contract) |
| ArcNSResolver proxy | [`0x68Bb5D43E8c7394876de2174d1BA320745D47023`](https://explorer.arc.io/address/0x68Bb5D43E8c7394876de2174d1BA320745D47023?tab=contract) |
| ArcNSController (.arc) proxy | [`0xE62De42eAcb270D2f2465c017C30bbf24F3f9350`](https://explorer.arc.io/address/0xE62De42eAcb270D2f2465c017C30bbf24F3f9350?tab=contract) |
| ArcNSController (.circle) proxy | [`0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1`](https://explorer.arc.io/address/0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1?tab=contract) |
| ArcNSTimelock | [`0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c`](https://explorer.arc.io/address/0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c?tab=contract) |

The explorer independently reports exact bytecode matches, compiler settings,
constructor arguments, and EIP-1967 proxy relationships for all entries above.
