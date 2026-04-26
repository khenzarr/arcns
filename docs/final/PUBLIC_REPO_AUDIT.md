# ArcNS — Public Repository Audit

**Date:** 2026-04-26  
**Auditor:** Kiro public surface audit pass  
**Repo:** https://github.com/khenzarr/arcns  
**Status:** AUDIT COMPLETE — awaiting cleanup approval before action

---

## 1. Executive Summary

**Overall status:** CLEAN WITH SMALL FIXES

The repository is safe to keep public in its current form. There are no critical security blockers — no private keys, no access tokens, no credentials are committed. The licensing package is in place. The internal outreach tracking docs were already removed.

There are three findings that warrant cleanup before further public-facing polish:

1. `frontend/.env.local` is committed and tracked by git. It contains no secrets (all values are `NEXT_PUBLIC_*` runtime config), but committing `.env.local` is a bad practice that creates confusion and sets a poor precedent. It should be removed from tracking.

2. `docker-compose.yml` contains a hardcoded local development database password (`let-me-in`). This is a local dev credential, not a production secret, but it is committed and public. It should be noted clearly.

3. Two verification scripts contain the string `"ENS standard"` in console output. This is a minor branding inconsistency — not a security issue, but worth cleaning before public demos or partner handoffs.

No other material issues were found.

---

## 2. Findings by Severity

### Critical
None.

### High
None.

### Medium

| ID | File | Finding |
|----|------|---------|
| M-01 | `frontend/.env.local` | `.env.local` is committed and tracked by git. Contains no secrets but violates `.env.local` gitignore convention and creates confusion. |

### Low

| ID | File | Finding |
|----|------|---------|
| L-01 | `docker-compose.yml` | Hardcoded local dev database password `let-me-in`. Not a production credential, but committed and public. |
| L-02 | `scripts/verifySubgraphAndResolution.js` | Console string `"namehash('arc') matches ENS standard"` — minor branding inconsistency. |
| L-03 | `scripts/verifyResolution.js` | Comment `"Verify the namehash used in the contract matches ENS standard"` — minor branding inconsistency. |

### Informational

| ID | File | Finding |
|----|------|---------|
| I-01 | `scripts/verifySubgraphAndResolution.js` | Hardcoded deployer EOA `0x0b943Fe9f1f8135e0751BA8B43dc0cD688ad209D`. This is a public on-chain address, not a secret. Acceptable. |
| I-02 | `deployments/arc_testnet-v3.json` | Deployer EOA and treasury address are public. Both are on-chain facts. Acceptable. |
| I-03 | `frontend/src/lib/wagmiConfig.ts` | WalletConnect project ID `b6d7afb94938b1fd9d9a72f7364fb905` is hardcoded as a fallback. WalletConnect project IDs are intentionally public (they are domain-restricted, not secret). Acceptable. |
| I-04 | `masterplan.md` | Internal rebuild planning document. Contains v2 reference addresses, branding rules, and phase acceptance criteria. This is operational history, not a security risk. Acceptable to keep public as historical reference. |
| I-05 | `audit/AUDIT_REPORT.md` | Pre-v3 audit findings (all addressed in v3). Superseded by `docs/final/AUDIT_SCOPE.md`. Acceptable to keep as historical reference. |
| I-06 | `frontend/.env.local` WalletConnect ID | The WalletConnect project ID also appears in `frontend/.env.local`. Same assessment as I-03 — intentionally public. |
| I-07 | `abis/`, `src/`, `tests/`, `generated/`, `build/`, `schema.graphql`, `subgraph.yaml`, `arcns/` | Stale archive-legacy artifacts tracked in git. Not a security issue. Noted in `docs/final/repo-canonicalization.md` as deferred cleanup. |

---

## 3. Findings by Classification

### SAFE_PUBLIC

- `README.md` — architecture, pricing, addresses, roadmap
- `LICENSE`, `NOTICE`, `docs/LICENSE-DOCS`, `frontend/LICENSE-FRONTEND` — licensing package
- `contracts/v3/` — all v3 contract source (MIT licensed, on-chain anyway)
- `contracts/` legacy directories — v1/v2 reference contracts
- `test/` — full test suite
- `scripts/` — deployment and verification scripts (use `process.env` for secrets)
- `deployments/arc_testnet-v3.json` — deployed addresses (public on-chain facts)
- `deployments/arc_testnet-v2.json` — v2 reference addresses
- `hardhat.config.js` — uses `process.env.PRIVATE_KEY`, falls back to zero key
- `docs/final/` — audit scope, threat model, gap report, demo scripts, finalization docs
- `docs/integration/` — all 13 public technical integration docs
- `docs/design/` — architecture design documents
- `docs/release/` — release checklists
- `frontend/src/` — frontend source (BSL 1.1 licensed)
- `frontend/vercel.json` — minimal Vercel config, no secrets
- `indexer/` — subgraph source
- `networks.json` — public contract addresses
- `.env.example` — placeholder template only, no real values
- `masterplan.md` — internal rebuild history, no secrets
- `audit/AUDIT_REPORT.md` — pre-v3 findings, all addressed
- `FINAL_STATUS.md` — authoritative live status

### MUST_REMOVE_OR_REDACT

None. No private keys, access tokens, or credentials were found in tracked files.

### REVIEW_NEEDED

| File | Issue | Recommendation |
|------|-------|---------------|
| `frontend/.env.local` | Committed `.env.local` — no secrets but bad practice | Remove from git tracking (see cleanup plan) |
| `docker-compose.yml` | Hardcoded local dev DB password `let-me-in` | Add comment clarifying this is local-only; or replace with env var reference |
| `scripts/verifySubgraphAndResolution.js` | `"ENS standard"` in console output | Replace with `"EIP-137 namehash"` |
| `scripts/verifyResolution.js` | `"ENS standard"` in comment | Replace with `"EIP-137 namehash"` |

### NON_ISSUES

- All 64-char hex strings in test files — these are namehash constants and protocol constants, not private keys
- WalletConnect project ID in `wagmiConfig.ts` and `frontend/.env.local` — intentionally public, domain-restricted
- Deployer EOA `0x0b943Fe9...` in `scripts/verifySubgraphAndResolution.js` — public on-chain address
- Treasury address in deployment JSONs — public on-chain address
- `ADDR_REVERSE_NODE` constant appearing in multiple files — public protocol constant
- All `artifacts/` JSON files — compiled contract ABIs, intentionally public
- `package-lock.json` transitive dependency entries — not a public branding issue

---

## 4. File-by-File Findings

### `frontend/.env.local`

| Field | Value |
|-------|-------|
| Severity | Medium |
| Classification | REVIEW_NEEDED |
| What was found | `.env.local` is committed and tracked by git. Contains: `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL` (×3), `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`, `NEXT_PUBLIC_SUBGRAPH_URL`. All values are `NEXT_PUBLIC_*` — intentionally browser-visible at runtime. No secrets. |
| Why it matters | `.env.local` is listed in `frontend/.gitignore` but is committed anyway. This creates confusion: contributors may assume `.env.local` is safe to commit with secrets. It also means the file cannot be customized locally without creating a git diff. |
| Recommended action | `git rm --cached frontend/.env.local` to untrack it. Move the values to `frontend/.env.local.example` as a template. Add a note in the README or ENVIRONMENT_GUIDE that contributors should copy the example. |

---

### `docker-compose.yml`

| Field | Value |
|-------|-------|
| Severity | Low |
| Classification | REVIEW_NEEDED |
| What was found | `POSTGRES_PASSWORD: let-me-in` and `postgres_pass: let-me-in` hardcoded in the compose file. |
| Why it matters | This is a local development credential for a local Graph Node instance. It is not a production secret and poses no real security risk. However, it is committed and public, which is a minor hygiene issue. |
| Recommended action | Add a comment: `# Local development only — not a production credential`. Optionally replace with `${GRAPH_POSTGRES_PASSWORD:-let-me-in}` to allow override via env var. |

---

### `scripts/verifySubgraphAndResolution.js`

| Field | Value |
|-------|-------|
| Severity | Low |
| Classification | REVIEW_NEEDED |
| What was found | Line 87: `check("namehash('arc') matches ENS standard", ...)` — "ENS standard" appears in console output. Also: hardcoded deployer EOA `0x0b943Fe9...` (public address, not a secret). |
| Why it matters | "ENS standard" is a minor branding inconsistency per the masterplan branding rules. The deployer EOA is a public on-chain address — no security concern. |
| Recommended action | Replace `"ENS standard"` with `"EIP-137 namehash"` in the check string. |

---

### `scripts/verifyResolution.js`

| Field | Value |
|-------|-------|
| Severity | Low |
| Classification | REVIEW_NEEDED |
| What was found | Line 121: comment `// Verify the namehash used in the contract matches ENS standard` |
| Why it matters | Minor branding inconsistency. |
| Recommended action | Replace comment with `// Verify the namehash used in the contract matches EIP-137` |

---

### `hardhat.config.js`

| Field | Value |
|-------|-------|
| Severity | None |
| Classification | SAFE_PUBLIC |
| What was found | `const PRIVATE_KEY = process.env.PRIVATE_KEY \|\| "0x" + "0".repeat(64)` — falls back to a zero key if env var is not set. |
| Why it matters | Correct pattern. No real key is hardcoded. The zero-key fallback is standard Hardhat practice for CI environments. |
| Recommended action | None. |

---

### `frontend/src/lib/wagmiConfig.ts`

| Field | Value |
|-------|-------|
| Severity | None |
| Classification | NON_ISSUE |
| What was found | WalletConnect project ID `b6d7afb94938b1fd9d9a72f7364fb905` hardcoded as fallback. |
| Why it matters | WalletConnect project IDs are intentionally public. They are domain-restricted at the WalletConnect cloud level, not secret. This is the standard pattern for Next.js WalletConnect integration. |
| Recommended action | None. Acceptable as-is. |

---

### `deployments/arc_testnet-v3.json`

| Field | Value |
|-------|-------|
| Severity | None |
| Classification | SAFE_PUBLIC |
| What was found | Deployer EOA `0x0b943Fe9...`, treasury address, all contract addresses. |
| Why it matters | All are public on-chain facts. The deployer EOA is visible in every deployment transaction on the block explorer. |
| Recommended action | None. |

---

### `docker-compose.yml` — `ethereum: "mainnet:http://host.docker.internal:8545"`

| Field | Value |
|-------|-------|
| Severity | None |
| Classification | NON_ISSUE |
| What was found | The compose file references `mainnet` as the network name for the local Graph Node. This is a Graph Node configuration convention — it does not mean the node is connecting to Ethereum mainnet. It is a local development artifact. |
| Recommended action | None. |

---

### `frontend/.env.local` — WalletConnect project ID

| Field | Value |
|-------|-------|
| Severity | None (within the `.env.local` finding) |
| Classification | NON_ISSUE |
| What was found | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=b6d7afb94938b1fd9d9a72f7364fb905` |
| Why it matters | `NEXT_PUBLIC_*` variables are embedded in the browser bundle at build time. This is intentional and expected. |
| Recommended action | None beyond the `.env.local` tracking issue above. |

---

## 5. Recommended Cleanup Plan

All steps are safe and non-destructive. No code logic changes required.

### Step 1 — Untrack `frontend/.env.local` (Medium priority)

```bash
git rm --cached frontend/.env.local
```

Then create `frontend/.env.local.example` as a template with placeholder comments (or rename the existing file). Update `docs/final/ENVIRONMENT_GUIDE.md` to reference the example file. Commit with message: `chore: untrack frontend/.env.local, add example template`.

**Why:** `.env.local` is in `.gitignore` but was committed anyway. Untracking it restores the correct boundary without losing the documented values.

### Step 2 — Add clarifying comment to `docker-compose.yml` (Low priority)

Add a comment above the postgres password lines:
```yaml
# Local development only — not a production credential
```

Optionally parameterize: `${GRAPH_POSTGRES_PASSWORD:-let-me-in}`

Commit with message: `chore: clarify docker-compose local dev credentials`.

### Step 3 — Fix ENS branding in two verification scripts (Low priority)

In `scripts/verifySubgraphAndResolution.js`:
- Line 87: `"namehash('arc') matches ENS standard"` → `"namehash('arc') matches EIP-137"`

In `scripts/verifyResolution.js`:
- Line 121: `// Verify the namehash used in the contract matches ENS standard` → `// Verify the namehash used in the contract matches EIP-137`

Commit with message: `chore: replace ENS branding in verification script comments`.

### Step 4 — Deferred (pre-mainnet, not urgent now)

The following stale archive-legacy items are tracked in git but pose no security or public-facing risk. They should be cleaned before mainnet but are not urgent:

- `abis/ArcNSController.json` — stale v1 ABI
- `src/arc-ns-controller.ts` — root-level subgraph stub
- `tests/` — root-level matchstick tests
- `schema.graphql` — root-level schema stub
- `subgraph.yaml` — root-level manifest stub
- `arcns/` — empty package directory

---

## 6. Final Recommendation

**CLEAN WITH SMALL FIXES**

The repository is safe to keep public. There are no credentials, private keys, or access tokens committed. The licensing package is in place. The internal outreach docs were already removed.

The three cleanup steps above are recommended before the next round of public-facing polish (partner outreach, grant submissions, audit engagement). None of them are blockers for outreach that is already in progress.

Priority order:
1. Step 1 (untrack `frontend/.env.local`) — do this soon; it's a 5-minute fix with meaningful hygiene value
2. Step 3 (ENS branding in scripts) — do before any public demo or partner technical review
3. Step 2 (docker-compose comment) — low urgency, do whenever convenient
4. Step 4 (stale artifacts) — defer to pre-mainnet cleanup

---

*End of ArcNS Public Repository Audit — 2026-04-26*
