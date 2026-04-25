# ArcNS v3 — Operational Runbook

> Step-by-step procedures for each operational task.
> All commands run from the repo root unless noted otherwise.

---

## RB-1: Deploy v3 Contracts to Arc Testnet

**When:** Fresh deployment or redeployment after contract changes.

```bash
# 1. Confirm .env is populated
cat .env   # verify PRIVATE_KEY, ARC_RPC_URL, USDC_ADDRESS, TREASURY_ADDRESS

# 2. Run deploy
npx hardhat run scripts/v3/deployV3.js --network arc_testnet

# 3. Confirm output file
cat deployments/arc_testnet-v3.json | python -m json.tool

# 4. Verify contracts on ArcScan (repeat for each proxy)
npx hardhat verify --network arc_testnet <ARC_CONTROLLER_ADDRESS>
npx hardhat verify --network arc_testnet <CIRCLE_CONTROLLER_ADDRESS>
npx hardhat verify --network arc_testnet <RESOLVER_ADDRESS>
```

**Expected output:** `deployments/arc_testnet-v3.json` with 13 contract addresses, `version: "v3"`.

**Rollback:** Keep the previous `deployments/arc_testnet-v3.json` as a backup before running.

---

## RB-2: Regenerate Frontend Config

**When:** After any contract deploy or address change.

```bash
node scripts/generate-frontend-config.js --network arc_testnet
```

**Verify:**
```bash
head -30 frontend/src/lib/generated-contracts.ts
```

Confirm `DEPLOYED_VERSION = "v3"` and all addresses match `deployments/arc_testnet-v3.json`.

**Never hand-edit** `generated-contracts.ts` — always regenerate from the deployment JSON.

---

## RB-3: Deploy Subgraph to arcnslatest

**When:** After contract deploy (new addresses) or after schema/mapping changes.

```bash
cd indexer

# 1. Verify addresses in subgraph.yaml match deployments/arc_testnet-v3.json
# All 7 data source addresses must match exactly.

# 2. Generate AssemblyScript types from schema + ABIs
graph codegen

# 3. Build WASM mappings
graph build

# 4. Authenticate with Graph Studio (key is never stored in files)
graph auth --studio <YOUR_DEPLOY_KEY>

# 5. Deploy to arcnslatest
graph deploy arcnslatest
```

**After deploy:**
- Open The Graph Studio dashboard
- Confirm `arcnslatest` is syncing
- Wait for sync to reach the current block before switching the frontend URL

---

## RB-4: Switch Frontend to New Subgraph URL

**When:** After a new subgraph version is deployed and synced.

```bash
# 1. Get the new query URL from The Graph Studio
# Format: https://api.studio.thegraph.com/query/<ID>/arcnslatest/version/latest

# 2. Update frontend/.env.local
# Edit NEXT_PUBLIC_SUBGRAPH_URL to the new URL

# 3. Restart dev server or redeploy
cd frontend && npm run dev   # dev
# OR
cd frontend && npm run build  # production
```

**Verify:** Open the portfolio page — domain names should appear (not token ID hashes).

---

## RB-5: Run Frontend Type Check and Build

**When:** Before any deployment or demo.

```bash
cd frontend

# Type check (no emit)
npx tsc --noEmit

# Production build
npm run build
```

**Expected:** Zero TypeScript errors, build succeeds.

---

## RB-6: Run Branding Scan

**When:** Before any public demo or release.

```bash
cd frontend

# Scan active source files for ENS leakage
grep -rn "\.eth\|\"ENS\|\bENS\b\|on ENS\|Ethereum Name" \
  src/app \
  src/components \
  src/hooks/useRegistration.ts \
  src/hooks/useRenew.ts \
  src/hooks/usePrimaryName.ts \
  src/hooks/useAvailability.ts \
  src/lib/graphql.ts \
  src/lib/normalization.ts \
  src/lib/errors.ts
```

**Expected:** Zero matches. Any match is a blocker.

---

## RB-7: Update startBlock After Redeployment

**When:** Contracts are redeployed at new block numbers.

1. Get the deploy block from ArcScan or the deploy script output
2. Update all `startBlock` values in `indexer/subgraph.yaml` to the new deploy block
3. Re-run RB-3 (subgraph deploy)

**Note:** Setting `startBlock` too early wastes sync time. Setting it after the deploy block misses events. Use the exact deploy block or 1 block before.

---

## RB-8: Verify Contract Wiring Post-Deploy

**When:** After a fresh deploy, before running smoke tests.

```bash
# Check arcController is authorized on arcRegistrar
npx hardhat console --network arc_testnet
# > const reg = await ethers.getContractAt("ArcNSBaseRegistrar", "<ARC_REGISTRAR>")
# > await reg.controllers("<ARC_CONTROLLER>")   // must return true

# Check resolver is approved on arcController
# > const ctrl = await ethers.getContractAt("ArcNSController", "<ARC_CONTROLLER>")
# > await ctrl.approvedResolvers("<RESOLVER>")  // must return true

# Check .arc TLD node owner is arcRegistrar
# > const registry = await ethers.getContractAt("ArcNSRegistry", "<REGISTRY>")
# > await registry.owner(arcNode)               // must return arcRegistrar address
```
