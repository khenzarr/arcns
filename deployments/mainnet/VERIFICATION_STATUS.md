# ArcNS mainnet source verification

Checked: 2026-09-16. Status: **PARTIAL — explorer verification service unstable**.

The verification plan covers only the deployed ArcNS naming protocol and its
operational Timelock. Experimental DAO governance contracts and an ArcNS ERC-20
token are neither deployed nor included. The external USDC contract is also not
an ArcNS verification target.

## Publicly confirmed

- ArcNSPriceOracle: `0x61baCC1623Eb5C1Ccd5D46B05CF6EB8Dd8130cc8`

## Pending reliable public confirmation

- Registry, both base registrars, reverse registrar and discount registry.
- Resolver and controller implementations.
- Resolver and both controller proxies.
- ArcNSTimelock.

Hardhat reported a successful Registry verification once, but a subsequent
public `getsourcecode` read returned no source. It is therefore intentionally
not counted as verified. Subsequent registrar submissions received HTML or
`Service Unavailable` responses instead of the explorer's JSON API contract.

Production mainnet cutover remains pending until every target has a stable,
independent public source readback.
