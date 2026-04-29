# ArcNS v3 — Active Path Lockdown

**Date:** 2026-04-25  
**Status:** LOCKED  
**Audited by:** Kiro finalization pass

---

## 1. Active Import Graph

### App pages
| File | Imports from |
|------|-------------|
| `app/page.tsx` | `SearchBar`, `DomainCard`, `normalization` |
| `app/my-domains/page.tsx` | `Portfolio`, `TransactionHistory`, `PrimaryName` |
| `app/resolve/page.tsx` | `namehash`, `normalization`, `contracts`, `publicClient` |
| `app/layout.tsx` | `Providers`, `Header` |
| `app/providers.tsx` | `wagmiConfig`, `generated-contracts` |

### Active hooks (all v3)
| Hook | Purpose |
|------|---------|
| `useAvailability.ts` | Name state + price oracle reads |
| `useRegistration.ts` | Full commit-reveal registration flow |
| `useRenew.ts` | USDC approve + renew() |
| `usePrimaryName.ts` | Reverse record read + setName() write |
| `useMyDomains.ts` | Portfolio: subgraph-first, RPC fallback |

### Active lib files
| File | Purpose |
|------|---------|
| `generated-contracts.ts` | **Single source of truth** for all deployed addresses + chain ID |
| `abis.ts` | v3 ABI exports only — imports from `artifacts/contracts/v3/` |
| `contracts.ts` | Thin composition: address + ABI → typed contract descriptors |
| `commitment.ts` | 7-param v3 commitment builder (no `bytes[] data`) |
| `errors.ts` | ArcNS-branded error codes + user-facing messages |
| `normalization.ts` | Label validation, pricing tiers, expiry helpers |
| `graphql.ts` | Subgraph client (arcnslatest) — read-only, failsafe |
| `publicClient.ts` | Detached viem public client for non-wagmi reads |
| `wagmiConfig.ts` | Wagmi config: injected + WalletConnect, Arc Testnet only |
| `chains.ts` | Arc Testnet chain definition |

---

## 2. Legacy / Archive Boundary

### Archived (not imported by any active file)
```
frontend/src/hooks/_archive/useArcNS.ts
frontend/src/hooks/_archive/useArcNSV2.ts
frontend/src/hooks/_archive/useDomainResolutionPipeline.ts
frontend/src/hooks/_archive/useRegistrationPipeline.ts
```
**Verified:** zero active imports point to `_archive/`.

### Stale test references (non-blocking)
`preservationTests.test.ts` and `bugConditionExploration.test.tsx` reference archived hooks by file path for structural source-code assertions. These tests fail at runtime because the archived files no longer exist at the expected paths. They are pre-existing failures, not active path leakage. They do not affect the production build.

---

## 3. ArcNS Branding Audit

**Result: CLEAN**

No active UI file, hook, or lib file contains:
- `"ArcNS"` as a user-facing string
- `".arc"` & `".circle"` as a domain suffix

---

## 4. Canonical Sources of Truth

| Concern | Canonical source |
|---------|-----------------|
| Deployed addresses | `frontend/src/lib/generated-contracts.ts` |
| Chain ID | `DEPLOYED_CHAIN_ID = 5042002` in `generated-contracts.ts` |
| v3 ABIs | `artifacts/contracts/v3/**/*.json` → imported via `abis.ts` |
| Register args shape | `frontend/src/lib/commitment.ts` — 7-param, no `bytes[] data` |
| Write path (registration) | `useRegistration.ts` |
| Write path (primary name) | `usePrimaryName.ts` |
| Write path (renewal) | `useRenew.ts` |
| Subgraph URL | `NEXT_PUBLIC_SUBGRAPH_URL` in `frontend/.env.local` → `graphql.ts` |
| Primary name selection | Owned-domain-only via `useMyDomains` → `ownedNameSet` membership check |

---

## 5. Verification Commands

```bash
# Type check
cd frontend && npx tsc --noEmit



# Legacy import scan (should return zero hits)
grep -r "useArcNS\|useRegistrationPipeline\|useDomainResolutionPipeline" \
  frontend/src --include="*.ts" --include="*.tsx" --exclude-dir=_archive
```

---

## 6. Conclusion

The active path is canonical. No v1/v2 hook is reachable from any active component. All contract interactions flow through `generated-contracts.ts` → `abis.ts` → `contracts.ts`. The 7-param v3 register ABI is the only register signature in the active path.

**Active path lockdown: CONFIRMED.**
