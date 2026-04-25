# ArcNS v3 — Smoke Test Matrix

> Run before every founder demo and after every deployment.
> All tests require MetaMask connected to Arc Testnet (Chain ID 5042002) with USDC balance.

---

## Prerequisites

- [ ] MetaMask on Arc Testnet (Chain ID 5042002)
- [ ] Wallet has USDC (get from https://faucet.circle.com)
- [ ] Frontend running against live v3 contracts
- [ ] `NEXT_PUBLIC_SUBGRAPH_URL` set to `arcnslatest` query URL

---

## ST-1: .arc Registration

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for a fresh `.arc` name (e.g. `smoketest1.arc`) | Card shows "Available" badge |
| 2 | Price breakdown visible | Base price shown in USDC, no premium |
| 3 | Select 1-year duration | Duration button highlighted |
| 4 | Click Register | MetaMask prompts USDC approval |
| 5 | Approve USDC | Step shows "Approving USDC…" |
| 6 | Confirm commit tx | Step shows "Submitting commitment…" |
| 7 | Wait 62s progress bar | Progress bar fills to 100% |
| 8 | Confirm register tx | Step shows "Registering on-chain…" |
| 9 | Success state | Card shows "✓ Registered!" |
| 10 | Portfolio page | `smoketest1.arc` appears in portfolio |

**Pass criteria:** Registration completes end-to-end. Name appears in portfolio.

---

## ST-2: .circle Registration

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for a fresh `.circle` name (e.g. `smoketest1.circle`) | Card shows "Available" badge |
| 2 | Select `.circle` TLD in search bar | TLD selector switches |
| 3 | Complete registration (same as ST-1 steps 3–9) | Success state |
| 4 | Portfolio page | `smoketest1.circle` appears in portfolio |

**Pass criteria:** `.circle` registration completes. Name appears in portfolio.

---

## ST-3: Renewal

| Step | Action | Expected |
|------|--------|----------|
| 1 | Search for an already-registered name you own | Card shows "Taken" badge |
| 2 | Expiry date visible | Expiry shown correctly |
| 3 | Click Renew | MetaMask prompts USDC approval |
| 4 | Approve + confirm renew tx | Step shows "Renewing…" |
| 5 | Success state | Card shows "✓ Renewed!" |
| 6 | Transaction history | Renewal entry appears with "Renewal" type badge |

**Pass criteria:** Renewal completes. New expiry is 1 year later. History shows renewal.

---

## ST-4: Primary Name (Reverse Resolution)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to My Domains | Primary Name card visible |
| 2 | No primary name set | Shows "No primary name set" |
| 3 | Type `smoketest1.arc` in primary name input | Input accepts value |
| 4 | Click Set | MetaMask prompts setName tx |
| 5 | Confirm tx | Step shows "Setting…" |
| 6 | Success | Primary name card shows `smoketest1.arc` with ✓ verified |
| 7 | Refresh page | Primary name persists (read from chain) |

**Pass criteria:** Primary name set and verified. Persists on refresh.

---

## ST-5: Portfolio View

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to My Domains → Portfolio tab | Loading state briefly |
| 2 | Subgraph available | Domain names shown as `alice.arc` (not token ID hash) |
| 3 | Subgraph unavailable (disable `NEXT_PUBLIC_SUBGRAPH_URL`) | RPC fallback activates, domains still shown (with `RPC` badge) |
| 4 | Expiry badges correct | Active = green, Expiring Soon = amber, Grace = orange, Expired = red |
| 5 | Renew button visible | Appears for expiring-soon and grace-period names |

**Pass criteria:** Portfolio loads from subgraph with real names. RPC fallback works when subgraph is disabled.

---

## ST-6: Transaction History

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to My Domains → History tab | Loading state briefly |
| 2 | Registrations visible | Each row shows domain name, "Registration" badge, cost, date, tx link |
| 3 | Renewals visible | Each row shows domain name, "Renewal" badge, cost, date, tx link |
| 4 | Sorted by date | Most recent first |
| 5 | Tx link works | Opens ArcScan in new tab |

**Pass criteria:** Both registrations and renewals appear. Sorted correctly. Links work.

---

## ST-7: Forward Resolution (Resolve Page)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Go to /resolve | Resolve page loads |
| 2 | Enter `smoketest1.arc` | Input accepts value |
| 3 | Click Resolve | Loading state |
| 4 | Resolved address shown | Wallet address that registered the name |
| 5 | Expiry shown | Correct expiry date with status badge |
| 6 | Namehash shown | 32-byte hex string |
| 7 | View NFT on ArcScan link | Opens ArcScan token page |

**Pass criteria:** Forward resolution returns correct address. All metadata correct.

---

## ST-8: Wrong Network Guard

| Step | Action | Expected |
|------|--------|----------|
| 1 | Switch MetaMask to Ethereum mainnet | Red banner appears at top |
| 2 | Banner text | "Wrong network (Chain ID 1). Please switch your wallet to Arc Testnet (Chain ID 5042002)." |
| 3 | Try to register | Register button disabled / blocked |
| 4 | Switch back to Arc Testnet | Banner disappears |

**Pass criteria:** Wrong-network banner appears and blocks writes. Disappears on correct network.

---

## ST-9: Subgraph Health Check

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open The Graph Studio | `arcnslatest` shows synced status |
| 2 | Query domains for test wallet | Returns registered names with correct expiry |
| 3 | Query registrations for test wallet | Returns registration records with cost |
| 4 | Query renewals for test wallet | Returns renewal records if any |
| 5 | Query reverseRecord for test wallet | Returns primary name if set |

**Pass criteria:** All 5 query types return correct data.

---

## Failure Triage

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "Commitment not found on-chain" | Controller address mismatch | Regenerate `generated-contracts.ts` |
| Registration stuck at "Waiting…" | MIN_COMMITMENT_AGE not elapsed | Wait 62s; check chain time |
| Portfolio empty (subgraph path) | Subgraph not synced or wrong URL | Check `NEXT_PUBLIC_SUBGRAPH_URL`; wait for sync |
| Portfolio empty (RPC path) | Wrong registrar address | Regenerate `generated-contracts.ts` |
| Wrong-network banner stuck | Wagmi chain detection lag | Refresh page |
| USDC approval fails | Insufficient USDC balance | Get USDC from faucet.circle.com |
| Resolve returns zero address | Resolver not set at registration | Re-register with resolver address |
