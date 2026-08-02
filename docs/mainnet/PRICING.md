# ArcNS Mainnet Pricing Preparation

## Standard annual pricing

| Label length | Price (USDC/year) | Raw USDC (6 decimals) |
| --- | ---: | ---: |
| 5+ | 5 | 5,000,000 |
| 4 | 15 | 15,000,000 |
| 3 | 25 | 25,000,000 |
| 2 | 50 | 50,000,000 |
| 1 | 100 | 100,000,000 |

The `ArcNSPriceOracle` is the source of truth. Its `setPrices(p1,p2,p3,p4,p5)` order is 1, 2, 3, 4, 5+ characters. The frontend values are display-only; checkout uses `rentPrice` or `discountRentPrice` from the controller.

Arc Testnet keeps its current 50/25/15/10/2 USDC display and oracle configuration.

## Early-adopter first-year/base pricing

Eligible active v3 `.arc` and `.circle` holders receive one wallet-level claim:

| Label length | First-year/base price |
| --- | ---: |
| 5+ | 2 USDC |
| 4 | 10 USDC |
| 3 | 15 USDC |
| 2 | 25 USDC |
| 1 | 50 USDC |

The oracle contains an expired-name premium component: it starts at 100 USDC after expiry and decays linearly to zero over 28 days. `price()` returns separate base and premium values, and the discount route discounts only the base component while preserving the full premium. ArcNS does not market or expose a separate premium package or product in the UI.

Under the current registrar lifecycle, a successful re-registration cannot practically incur a nonzero premium: a name becomes available only after the 90-day grace period, while the oracle premium reaches zero after 28 days. If that lifecycle changes, premium must remain fully charged and must never be discounted. Renewals always use standard oracle pricing.

For durations up to one year, the early price is prorated with upward rounding. For longer durations, the first 365 days use the early price and the remaining duration uses standard oracle pricing.