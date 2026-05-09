# ArcNS v3 — Smoke Test Results

**Date:** 2026-04-29  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Tester:** Deployer EOA `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`  
**Frontend:** https://arcns-app.vercel.app  
**Subgraph:** `arcnslatest` on The Graph Studio

---

## Summary

10 smoke test flows verified on-chain. All core flows pass.

| Test | Result |
|------|--------|
| ST-1: `.arc` registration | ✅ Pass |
| ST-2: `.circle` registration | ✅ Pass |
| ST-3: Renewal | ✅ Pass |
| ST-4: Primary name (reverse resolution) | ✅ Pass |
| ST-5: Portfolio view | ✅ Pass |
| ST-6: Transaction history | ✅ Pass |
| ST-7: Forward resolution (Resolve page) | ✅ Pass |
| ST-8: Wrong-network guard | ✅ Pass |
| ST-9: Subgraph health | ✅ Pass |
| ST-10: Registered name with no address record | ✅ Pass |

---

## ST-1: `.arc` Registration

**Test name:** `flowpay.arc`  
**Result:** ✅ Pass  
**Notes:** Commit-reveal completed. USDC transferred to treasury. NFT minted. Registry node assigned. Name appeared in portfolio.

---

## ST-2: `.circle` Registration

**Test name:** `flowpay.circle`  
**Result:** ✅ Pass  
**Notes:** Same flow as `.arc`. CircleController and CircleRegistrar confirmed working.

---

## ST-3: Renewal

**Test name:** `flowpay.arc`  
**Result:** ✅ Pass  
**Notes:** Renewal completed. Expiry extended by 1 year. Renewal entry appeared in transaction history.

---

## ST-4: Primary Name (Reverse Resolution)

**Test address:** Deployer EOA  
**Test name:** `flowpay.arc`  
**Result:** ✅ Pass  
**Notes:** `setName` called via ReverseRegistrar. Primary name card showed `flowpay.arc` with ✓ verified. Forward-confirmation passed (resolver addr record matched queried address). Persisted on page refresh.

---

## ST-5: Portfolio View

**Result:** ✅ Pass  
**Notes:** Portfolio loaded from subgraph with real domain names (not token ID hashes). RPC fallback tested by disabling `NEXT_PUBLIC_SUBGRAPH_URL` — domains still appeared with `RPC` badge. Expiry badges correct.

---

## ST-6: Transaction History

**Result:** ✅ Pass  
**Notes:** Registration and renewal entries appeared. Sorted by date (most recent first). ArcScan links opened correctly.

---

## ST-7: Forward Resolution (Resolve Page)

**Test name:** `flowpay.arc`  
**Result:** ✅ Pass  
**Notes:** Resolved address shown correctly. Owner read from `registrar.ownerOf(tokenId)` (not `registry.owner(node)`). Expiry and namehash displayed correctly. ArcScan link worked.

---

## ST-8: Wrong-Network Guard

**Result:** ✅ Pass  
**Notes:** Switched MetaMask to Ethereum mainnet. Red banner appeared immediately. Register button disabled. Switched back to Arc Testnet — banner disappeared.

---

## ST-9: Subgraph Health

**Result:** ✅ Pass  
**Notes:** `arcnslatest` confirmed synced in The Graph Studio. All 5 query types (domains, registrations, renewals, reverseRecord, resolverRecord) returned correct data.

---

## ST-10: Registered Name with No Address Record

**Test name:** `thebstoftimes.arc`  
**Result:** ✅ Pass  
**Notes:** Name is registered (has owner and expiry) but has no forward address record set. Resolve page correctly showed:
- Owner: correct wallet address (from `registrar.ownerOf(tokenId)`)
- Expiry: correct date
- Resolved Address: "No address record"
- "You own this name, but it has no receiving address set" notice shown to the owner

This test validates the correctness of the owner-display fix: `registrar.ownerOf(tokenId)` is used instead of `registry.owner(node)`, which would have returned the registrar contract address.

---

## Known Issues at Time of Testing

None blocking. The following are deferred:

- Resolve page empty-state visual polish (search bar and Identity Inspector card alignment) — deferred, not a blocker.

---

## Test Names Available for Demo

The following names are registered on Arc Testnet and available for demo use:

| Name | Notes |
|------|-------|
| `flowpay.arc` | Registered, has address record, has primary name set |
| `thebstoftimes.arc` | Registered, **no address record** — good for demonstrating the no-address case |
| `slippage.arc` | Registered |
| `emperor.arc` | Registered |

> These names are on Arc Testnet. They have no real-world value.
