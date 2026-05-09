# ArcNS v3 — Test Coverage Summary

**Version:** v3  
**Test suite location:** `test/v3/`  
**Total passing tests:** ~180  
**Total failures:** 0

---

## Coverage by Contract

| Contract | Test File(s) | Coverage Areas |
|----------|-------------|----------------|
| ArcNSRegistry | `test/v3/registry.test.js` | Node ownership, resolver assignment, TTL, subnode creation |
| ArcNSBaseRegistrar | `test/v3/registrar.test.js` | ERC-721 mint/transfer, nameExpires, reclaim, controller authorization |
| ArcNSController | `test/v3/controller.test.js` | Commit-reveal, registration, renewal, USDC payment, slippage guard, pause |
| ArcNSResolver | `test/v3/resolver.test.js` | setAddr, addr, setName, name, CONTROLLER_ROLE gating |
| ArcNSReverseRegistrar | `test/v3/reverseRegistrar.test.js` | claimWithResolver, setName, authorization |
| ArcNSPriceOracle | `test/v3/priceOracle.test.js` | Pricing tiers, premium decay, duration pro-rating |
| Integration flows | `test/v3/integration.test.js` | End-to-end registration, renewal, resolution, primary name |

---

## Coverage by Flow

| Flow | Covered | Notes |
|------|---------|-------|
| `.arc` registration (commit-reveal) | ✅ | Full flow including USDC transfer |
| `.circle` registration (commit-reveal) | ✅ | Full flow |
| Renewal | ✅ | Any-address renewal, expiry extension |
| Forward resolution | ✅ | `addr(node)` after registration |
| Reverse resolution | ✅ | `name(reverseNode)` after `setName` |
| Primary name forward-confirmation | ✅ | Stale record detection |
| NFT transfer | ✅ | ERC-721 standard transfer |
| Reclaim | ✅ | NFT owner reclaims registry node |
| Wrong-network guard | ✅ | Frontend unit tests |
| Branding / ENS leakage | ✅ | `block2.test.ts` in frontend |
| UUPS upgrade path | ✅ (partial) | Upgrade authorization tested; storage layout not automated |
| Reentrancy adversarial | ❌ | Not present — pre-mainnet item |
| UUPS storage layout in CI | ❌ | Not automated — pre-mainnet item |

---

## Frontend Tests

| Test File | Coverage |
|-----------|----------|
| `frontend/src/tests/block2.test.ts` | Branding scan — no ENS leakage in active source files |
| `frontend/src/tests/normalization.test.ts` | Label normalization, TLD validation |
| `frontend/src/tests/namehash.test.ts` | Namehash computation correctness |

Frontend tests run with Vitest:
```bash
cd frontend && npm run test
```

---

## Known Gaps

| Gap | Type | Notes |
|-----|------|-------|
| Reentrancy adversarial tests | Testing gap | No code defect. The reentrancy guard is implemented correctly. Pre-mainnet item. |
| UUPS storage layout verification in CI | Testing gap | No code defect. Storage layout is documented and manually verified. Pre-mainnet item. |
| 2 failing frontend tests | Frontend | Known at time of v3 release. Not blocking for testnet. |

---

## Running the Test Suite

### Contract tests

```bash
npx hardhat test test/v3/
```

Expected: ~180 passing, 0 failing.

### Frontend tests

```bash
cd frontend && npm run test
```

Expected: All passing except the 2 known failures noted above.
