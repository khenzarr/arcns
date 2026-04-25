# ArcNS v3 — Release Summary

**Network:** Arc Testnet (Chain ID: 5042002)  
**Deployed:** 2026-04-24T21:58:41Z  
**Status:** Live on testnet · Demo-ready · Not yet mainnet-ready

---

## What ArcNS v3 Is

ArcNS (Arc Name Service) is a decentralized naming protocol for Arc Testnet. It lets users register `.arc` and `.circle` domain names, pay with USDC, and own their on-chain identity as ERC-721 NFTs. Names resolve to wallet addresses. A reverse record maps a wallet address back to a primary name.

---

## What Is Live on Arc Testnet

| Component | Status |
|-----------|--------|
| ArcNSRegistry | Deployed, non-upgradeable |
| ArcNSBaseRegistrar (.arc) | Deployed, non-upgradeable, ERC-721 |
| ArcNSBaseRegistrar (.circle) | Deployed, non-upgradeable, ERC-721 |
| ArcNSController (.arc) | Deployed, UUPS proxy |
| ArcNSController (.circle) | Deployed, UUPS proxy |
| ArcNSPriceOracle | Deployed, non-upgradeable |
| ArcNSResolver | Deployed, UUPS proxy |
| ArcNSReverseRegistrar | Deployed, non-upgradeable |
| Frontend (Next.js) | Live, v3-wired |
| Subgraph (arcnslatest) | Published on The Graph Studio |

---

## What Is Confirmed Working

All of the following have been verified in live manual testing on Arc Testnet:

- `.arc` name registration (full commit-reveal flow)
- `.circle` name registration (full commit-reveal flow)
- ERC-721 NFT mint on registration
- Forward resolution (`addr` record)
- Name renewal
- Transaction history view (subgraph-backed)
- Primary name flow (reverse record set via ReverseRegistrar)
- Wrong-network guard (blocks writes when wallet is not on Chain ID 5042002)
- Owned-only primary name selection UX (dropdown sourced from owned domains)
- Branding: no ENS strings in any user-facing surface

---

## What Is Intentionally v1 Scope Only

These are known limitations by design for the v1 release. They are not bugs.

| Feature | Status |
|---------|--------|
| Resolver records | `addr` (EVM address) only. No text, contenthash, multicoin, or CCIP-Read. |
| Subgraph | Registration, renewal, transfer, addr resolution, reverse records. No text/contenthash indexing. |
| Renew-by-portfolio | Portfolio renew redirects to search page (requires label to price). Full renew-by-name is on the search page. |
| Primary name selection | Requires subgraph to be indexed (owned-domain dropdown needs `labelName`). RPC-only fallback shows a message. |
| Name transfer UI | No dedicated transfer UI. Transfer is possible via direct contract interaction. |
| Subdomain support | Not implemented in v1. |

---

## What Is Not Yet Mainnet-Ready

| Gap | Notes |
|-----|-------|
| Security audit | No external audit completed. Pre-v3 internal findings were addressed in v3 design; formal audit required before mainnet. |
| Mainnet USDC address | Testnet uses `0x3600...0000`. Mainnet USDC address must be confirmed and contracts redeployed. |
| Treasury multisig | Treasury is currently an EOA. Mainnet requires a multisig. |
| Admin role separation | ADMIN_ROLE, PAUSER_ROLE, ORACLE_ROLE, UPGRADER_ROLE are currently held by the deployer EOA. Mainnet requires role distribution. |
| RPC reliability | Arc Testnet RPC has occasional txpool saturation. Mainnet requires dedicated/private RPC. |
| Subgraph hosting | Currently on The Graph Studio (centralized). Mainnet should use decentralized indexing. |
| Frontend hosting | Not yet deployed to a production domain. |
| Grace period / premium decay | Implemented in contracts; not yet stress-tested at scale. |

See `docs/final/MAINNET_GAP_REPORT.md` for the full gap analysis.
