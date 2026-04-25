# ArcNS v3 — Release Checklist

> Founder-demo / Arc Testnet readiness checklist.
> Work through each section in order. Check off items as you go.

---

## 1. Deploy Prerequisites

- [ ] `.env` is populated with real values (not placeholders)
  - `PRIVATE_KEY` — deployer wallet with sufficient USDC for gas
  - `ARC_RPC_URL` — reachable Arc Testnet RPC
  - `USDC_ADDRESS=0x3600000000000000000000000000000000000000`
  - `TREASURY_ADDRESS` — treasury EOA
  - `ARCSCAN_API_KEY` — for contract verification
- [ ] Deployer wallet has Arc Testnet native token for gas
- [ ] Deployer wallet has USDC for any test registrations
- [ ] Node.js ≥ 18 installed
- [ ] `npm install` run at repo root
- [ ] `npm install` run inside `frontend/`
- [ ] `npm install` run inside `indexer/`
- [ ] Graph CLI authenticated: `graph auth --studio <DEPLOY_KEY>` (key never committed)

---

## 2. Contract Deploy (v3)

Run only if redeploying. Current v3 addresses are live in `deployments/arc_testnet-v3.json`.

- [ ] Verify `.env` values are correct
- [ ] Run deploy:
  ```
  npx hardhat run scripts/v3/deployV3.js --network arc_testnet
  ```
- [ ] Confirm `deployments/arc_testnet-v3.json` is written with all 13 contract addresses
- [ ] Confirm `version` field is `"v3"` (not `"v3-dev"`)
- [ ] Verify contracts on ArcScan:
  ```
  npx hardhat verify --network arc_testnet <CONTROLLER_ADDRESS>
  ```

---

## 3. Frontend Config Regeneration

Run after every contract deploy (or when addresses change).

- [ ] Run:
  ```
  node scripts/generate-frontend-config.js --network arc_testnet
  ```
- [ ] Confirm `frontend/src/lib/generated-contracts.ts` is updated
- [ ] Confirm `DEPLOYED_VERSION` is `"v3"` (not `"v3-dev"`)
- [ ] Confirm all 13 addresses match `deployments/arc_testnet-v3.json`
- [ ] Confirm `NAMEHASH_ARC`, `NAMEHASH_CIRCLE`, `NAMEHASH_ADDR_REVERSE` are correct

---

## 4. Subgraph Deploy (arcnslatest)

- [ ] Confirm `indexer/subgraph.yaml` addresses match `deployments/arc_testnet-v3.json`
- [ ] Confirm `startBlock` values are at or before the actual deploy block
- [ ] Run codegen:
  ```
  cd indexer
  graph codegen
  ```
- [ ] Run build:
  ```
  graph build
  ```
- [ ] Authenticate (key never stored in files):
  ```
  graph auth --studio <DEPLOY_KEY>
  ```
- [ ] Deploy:
  ```
  graph deploy arcnslatest
  ```
- [ ] Confirm subgraph is syncing in The Graph Studio dashboard
- [ ] Wait for sync to reach current block before switching frontend

---

## 5. Frontend Subgraph URL Switch

- [ ] Get the new query URL from The Graph Studio for `arcnslatest`
- [ ] Update `frontend/.env.local`:
  ```
  NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/<ID>/arcnslatest/version/latest
  ```
- [ ] Restart the frontend dev server or redeploy

---

## 6. Frontend Build & Deploy

- [ ] Run type check:
  ```
  cd frontend && npx tsc --noEmit
  ```
- [ ] Run build:
  ```
  cd frontend && npm run build
  ```
- [ ] Confirm build succeeds with zero errors
- [ ] Deploy to hosting (Vercel / static host)
- [ ] Set environment variables on hosting platform (all `NEXT_PUBLIC_*` from `frontend/.env.local`)

---

## 7. Branding / ENS Leakage Check

Run before any public demo.

- [ ] No `.eth` in any active frontend file
- [ ] No `ENS` in any user-facing string or component
- [ ] No `on ENS` in any copy
- [ ] No ETH-based naming language in UI copy
- [ ] `layout.tsx` title: `ArcNS — Arc Name Service`
- [ ] `layout.tsx` description: references `.arc` and `.circle` only
- [ ] Footer: `ArcNS — Arc Name Service on Arc Testnet`
- [ ] Header logo: `ArcNS` with `Testnet` badge
- [ ] Search placeholder: `alice.arc` (not `alice.eth`)
- [ ] Error messages: no ENS wording (verified by `block2.test.ts`)
- [ ] Run branding scan:
  ```
  cd frontend && grep -r "\.eth\|ENS\|on ENS" src/app src/components src/hooks/useRegistration.ts src/hooks/useRenew.ts src/hooks/usePrimaryName.ts src/hooks/useAvailability.ts src/lib/graphql.ts
  ```
  Expected: zero matches in active files.

---

## 8. Final Pre-Demo Checks

- [ ] MetaMask connected to Arc Testnet (Chain ID 5042002)
- [ ] Wallet has USDC balance (get from https://faucet.circle.com)
- [ ] Wrong-network banner appears when on wrong chain
- [ ] Search returns availability for a fresh `.arc` name
- [ ] Search returns availability for a fresh `.circle` name
- [ ] Registration flow completes end-to-end (see smoke test matrix)
- [ ] Portfolio shows registered names (subgraph or RPC fallback)
- [ ] Resolve page resolves a known registered name
