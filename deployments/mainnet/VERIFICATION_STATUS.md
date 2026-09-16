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
| ArcNSBaseRegistrar (.arc) | [`0x6C6C0d5B38B3a69F53301CEe0ba360E02d53933d`](https://explorer.arc.io/address/0x6C6C0d5B38B3a69F53301CEe0ba360E02d53933d?tab=contract) |
| ArcNSBaseRegistrar (.circle) | [`0x1c23D75E0c7a3B9E9eD4CcEea0e97CDCFB0E9A9C`](https://explorer.arc.io/address/0x1c23D75E0c7a3B9E9eD4CcEea0e97CDCFB0E9A9C?tab=contract) |
| ArcNSReverseRegistrar | [`0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a`](https://explorer.arc.io/address/0x3731b7c9F1830aD2880020DfcB0A4714E7fc252a?tab=contract) |
| ArcNSEarlyAdopterDiscountRegistry | [`0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2`](https://explorer.arc.io/address/0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2?tab=contract) |
| ArcNSResolver implementation | [`0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05`](https://explorer.arc.io/address/0xcd42969750b2C69E60aB0afEE9B53a7f118CbB05?tab=contract) |
| ArcNSController implementation | [`0xA637a1574dC4CF9da40D3B36B21eBaB301e64bC3`](https://explorer.arc.io/address/0xA637a1574dC4CF9da40D3B36B21eBaB301e64bC3?tab=contract) |
| ArcNSResolver proxy | [`0x68Bb5D43E8c7394876de2174d1BA320745D47023`](https://explorer.arc.io/address/0x68Bb5D43E8c7394876de2174d1BA320745D47023?tab=contract) |
| ArcNSController (.arc) proxy | [`0xE62De42eAcb270D2f2465c017C30bbf24F3f9350`](https://explorer.arc.io/address/0xE62De42eAcb270D2f2465c017C30bbf24F3f9350?tab=contract) |
| ArcNSController (.circle) proxy | [`0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1`](https://explorer.arc.io/address/0x5A1275Ed5638C9aD5005d6087c696BFb3848e9E1?tab=contract) |
| ArcNSTimelock | [`0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c`](https://explorer.arc.io/address/0x609B9dAb0AC21c0863A5297f86BDd4C500647e3c?tab=contract) |

The explorer independently reports exact bytecode matches, compiler settings,
constructor arguments, and EIP-1967 proxy relationships for all entries above.
