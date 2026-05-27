# ArcNS v3 — Release Summary

**Version:** v3  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Initial Deployment:** 2026-04-24  
**Security Migration:** 2026-04-29  
**Production App:** https://arcname.services
**Previous Vercel URL (legacy):** https://arcns-app.vercel.app

---

## What Is Live

### Contracts (Arc Testnet)

All 8 v3 contracts are deployed and operational:

- **ArcNSRegistry** — central ownership ledger (non-upgradeable)
- **ArcBaseRegistrar** — ERC-721 NFT registrar for `.arc` names (non-upgradeable)
- **CircleBaseRegistrar** — ERC-721 NFT registrar for `.circle` names (non-upgradeable)
- **ArcController** — commit-reveal registration and renewal for `.arc` (UUPS proxy)
- **CircleController** — commit-reveal registration and renewal for `.circle` (UUPS proxy)
- **ArcNSResolver** — forward and reverse address records (UUPS proxy)
- **ArcNSReverseRegistrar** — primary name management (non-upgradeable)
- **ArcNSPriceOracle** — USDC-denominated pricing by label length (non-upgradeable)

### Governance

- **Safe Multisig (2-of-3)** — holds all operational privileged roles
- **Timelock (48h delay)** — holds `UPGRADER_ROLE` on all three UUPS proxies
- All deployer EOA privileges revoked

### Frontend

- Production app live at https://arcname.services
- Pages: Home/Search, My Domains (portfolio + history + primary name), Resolve
- Indexed data reads use Goldsky as primary, The Graph Studio as fallback, with RPC fallback preserved
- Public resolution API: `/api/v1/resolve/name/{name}`, `/api/v1/resolve/address/{address}`

> Historical note: earlier release/deployment material referenced `https://arcns-app.vercel.app`. The current official production domain is `https://arcname.services`.

### Indexed Data Layer

- Goldsky primary indexed endpoint: `arcns-product/v0.1.0`
- Goldsky query URL: `https://api.goldsky.com/api/public/project_cmpn4idciwist01th4uejh86p/subgraphs/arcns-product/v0.1.0/gn`
- Legacy The Graph Studio fallback: `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3`
- Indexes: registrations, renewals, transfers, address records, reverse records

---

## What Is v1-Scope Only

These features are intentionally limited in v1 and will expand in future upgrades:

| Feature | v1 Scope | Future |
|---------|----------|--------|
| Resolver records | EVM address (`addr`) only | Text records, contenthash, multi-coin addresses |
| NFT metadata | Labelhash hex in SVG (not plaintext label) | Plaintext label display |
| Grace period events | No `NameExpired` event emitted | Dedicated event in future upgrade |
| Resolve page empty-state | Minor alignment polish deferred | UX polish pass |

---

## What Is Not Yet Mainnet-Ready

| Item | Status |
|------|--------|
| External security audit | Not yet engaged |
| Treasury migration to multisig contract | Deferred |
| Timelock delay increase (72h+) | Deferred to mainnet |
| Mainnet USDC address | Pending mainnet deployment |
| Dedicated RPC / infra hardening | Not yet provisioned |
| Monitoring and incident response | Not yet implemented |
| Ecosystem integrations (ArcScan, wallets) | Integration packages ready; adoption pending |

See [MAINNET_GAP_REPORT.md](MAINNET_GAP_REPORT.md) for the full checklist.

---

## Security Migration Summary (2026-04-29)

The following security fixes were applied after initial deployment:

1. **ArcNSReverseRegistrar redeployed** — `claimWithResolver` authorization fix. New address: `0x352a1917Dd82158eC9bc71A0AC84F1b95Af26304`
2. **ArcNSController upgraded** — `initialize` zero-address validation fix. New impl: `0x0E84B34bAa5E865C2Dc1CDe907D41b86F6031cCB`
3. **`addr.reverse` node transferred** — from old to new ReverseRegistrar
4. **`CONTROLLER_ROLE` on Resolver** — re-granted to new ReverseRegistrar, revoked from old
5. **Both Controller proxies updated** — `setReverseRegistrar` called to point to new address
6. **Multisig deployed** — 2-of-3 Safe; all deployer EOA roles revoked
7. **Timelock deployed** — 48h delay; `UPGRADER_ROLE` migrated from Safe to Timelock on all UUPS proxies

---

## Canonical Address Source

Always use `deployments/arc_testnet-v3.json` and `frontend/src/lib/generated-contracts.ts` as the source of truth for contract addresses. See [DEPLOYED_ADDRESSES.md](DEPLOYED_ADDRESSES.md) for the full address table.
