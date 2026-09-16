# ArcNS Mainnet Early-Adopter Activation

Safe Transaction Builder files for Admin Safe
`0xFd48189D3Feb99a5cC6fcC6896744DAa73F3BF72` on Arc Mainnet (`5042`).

Finalized snapshot:

- Eligible wallets: `849`
- Merkle root: `0xf18c50fa221162f76d0b88f21aa26e4211c5a77ee72d4dd58240a40406f38d9e`
- DiscountRegistry: `0xEec7ac0d3C3bE402b6F2b492c7479B2897e64BA2`

Execute the files separately and in order:

1. `01-set-root.json`
2. Read back the exact root from the registry.
3. `02-freeze-root.json`
4. Read back `rootFrozen == true` and the unchanged root. Freezing is irreversible.
5. `03-activate.json`
6. Read back `discountActive == true`.

Do not combine the three operations. `REVIEW.json` records the expected Safe,
registry, snapshot metadata, calldata hashes, and file hashes for independent
comparison before signing.
