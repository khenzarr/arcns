# ArcNS v3 — Smoke Test Results

**Network:** Arc Testnet (Chain ID: 5042002)  
**Test type:** Live manual testing  
**Date:** 2026-04-25  
**Status:** All core flows PASSED

---

## Test Results

### 1. `.arc` Registration

| Step | Result |
|------|--------|
| Search for available `.arc` name | ✅ PASS |
| Price displayed correctly (USDC) | ✅ PASS |
| USDC approval prompt | ✅ PASS |
| Commitment submitted on-chain | ✅ PASS |
| 62-second maturity wait with progress bar | ✅ PASS |
| Register tx submitted and confirmed | ✅ PASS |
| NFT minted to registrant wallet | ✅ PASS |
| Success modal with ArcScan links | ✅ PASS |

### 2. `.circle` Registration

| Step | Result |
|------|--------|
| Full commit-reveal flow | ✅ PASS |
| NFT minted to registrant wallet | ✅ PASS |
| Separate controller address used correctly | ✅ PASS |

### 3. NFT Mint Verification

| Step | Result |
|------|--------|
| ERC-721 token visible on ArcScan | ✅ PASS |
| Token ID matches `keccak256(label)` | ✅ PASS |
| Owner address correct | ✅ PASS |

### 4. Forward Resolution

| Step | Result |
|------|--------|
| Resolve page: enter `name.arc` | ✅ PASS |
| Resolved address returned correctly | ✅ PASS |
| Namehash displayed | ✅ PASS |
| ArcScan NFT link functional | ✅ PASS |

### 5. Renewal

| Step | Result |
|------|--------|
| Search for owned/expiring name | ✅ PASS |
| Renew button shown for expiring names | ✅ PASS |
| USDC approval + renew tx | ✅ PASS |
| Expiry date updated after renewal | ✅ PASS |

### 6. Transaction History

| Step | Result |
|------|--------|
| History tab shows registrations | ✅ PASS |
| History tab shows renewals | ✅ PASS |
| Sorted by timestamp (newest first) | ✅ PASS |
| ArcScan tx links functional | ✅ PASS |
| Subgraph-backed (not RPC) | ✅ PASS |

### 7. Primary Name Flow

| Step | Result |
|------|--------|
| Set primary name at registration time (reverseRecord=true) | ✅ PASS |
| Primary name displayed in My Domains | ✅ PASS |
| Dashboard-driven primary name update via ReverseRegistrar.setName() | ✅ PASS |
| Three-state display: none / verified / stale | ✅ PASS |

### 8. Wrong-Network Guard

| Step | Result |
|------|--------|
| Connect wallet on wrong network | ✅ PASS |
| Red banner shown at top of page | ✅ PASS |
| Register/renew buttons blocked | ✅ PASS |
| Banner disappears after switching to Arc Testnet | ✅ PASS |

### 9. Owned-Only Primary Name Selection UX

| Step | Result |
|------|--------|
| Primary name selector shows only owned non-expired domains | ✅ PASS |
| Free-form text input not present | ✅ PASS |
| Button disabled when no selection | ✅ PASS |
| Button disabled when selected domain is already primary | ✅ PASS |
| Button enabled only for valid owned selection different from current primary | ✅ PASS |
| Arbitrary strings cannot be submitted | ✅ PASS |

### 10. Branding

| Check | Result |
|-------|--------|
| All copy uses "ArcNS", ".arc", ".circle", "Arc Testnet" | ✅ PASS |

---

## Known Caveats (Non-Blocking)

| Caveat | Impact | Mitigation |
|--------|--------|-----------|
| Arc Testnet RPC txpool saturation | Occasional tx submission delays or "replacement fee too low" errors | Retry after 30–60 seconds; use private RPC for demo |
| Subgraph indexing lag | Portfolio and history may be 5–30 seconds behind after a tx | Refresh after 30 seconds |
| Primary name selector requires subgraph | If subgraph returns empty, selector shows a message instead of domain list | RPC fallback message is shown; user can retry after subgraph syncs |
| Stale test files | `preservationTests.test.ts` and `bugConditionExploration.test.tsx` reference archived hooks and fail at runtime | Pre-existing; no production impact; deferred cleanup |
| Subgraph ABI reference | `indexer/subgraph.yaml` uses `ArcNSRegistrarControllerV2.json` for controller events | Functionally correct (same event signatures); misleading name only |

---

## Not Tested (Out of Scope for v1 Smoke Test)

- Text record resolution
- Contenthash resolution
- Multicoin address resolution
- Subdomain registration
- Name transfer via UI
- UUPS upgrade flow
- Pause/unpause flow
- Grace period re-registration
- Premium decay pricing (28-day window)
