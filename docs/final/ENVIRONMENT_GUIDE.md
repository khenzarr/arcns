# ArcNS v3 — Environment Guide

---

## File Split

ArcNS uses two separate environment files with strictly separated concerns.

| File | Purpose | Who reads it |
|------|---------|-------------|
| `.env` (root) | Deploy secrets and script config | Hardhat, deploy scripts, Node.js scripts |
| `frontend/.env.local` | Frontend runtime config | Next.js (build + runtime) |

**Never mix these.** Deploy secrets must never appear in `frontend/.env.local`. Frontend runtime config does not belong in root `.env`.

---

## Root `.env` (Deploy / Scripts)

Copy from `.env.example`:
```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Deployer EOA private key. Used by Hardhat and deploy scripts. |
| `ARC_RPC_URL` | Yes | Primary RPC for deployment. Default: `https://rpc.testnet.arc.network` |
| `ARC_RPC_URL_2` | No | Fallback RPC. Default: `https://arc-testnet.drpc.org` |
| `ARCSCAN_API_KEY` | No | ArcScan block explorer API key for contract verification. |
| `USDC_ADDRESS` | No | Override USDC address. Defaults to `0x3600000000000000000000000000000000000000` if not set. |
| `TREASURY_ADDRESS` | Yes (deploy) | Treasury EOA/multisig address. Receives all registration fees. |

**Must never be committed.** Root `.env` is in `.gitignore`.

---

## Frontend `.env.local`

Located at `frontend/.env.local`. Read exclusively by Next.js.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CHAIN_ID` | Yes | Must be `5042002` for Arc Testnet. |
| `NEXT_PUBLIC_RPC_URL` | Yes | Primary public RPC for frontend reads. |
| `NEXT_PUBLIC_RPC_URL_2` | No | Fallback RPC. |
| `NEXT_PUBLIC_RPC_URL_3` | No | Second fallback RPC. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect project ID from cloud.walletconnect.com. |
| `NEXT_PUBLIC_SUBGRAPH_URL` | Yes | The Graph Studio query URL for `arcnslatest`. |

**Current live values:**
```env
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://arc-testnet.drpc.org
NEXT_PUBLIC_RPC_URL_2=https://rpc.testnet.arc.network
NEXT_PUBLIC_RPC_URL_3=https://rpc.quicknode.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=b6d7afb94938b1fd9d9a72f7364fb905
NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

> `frontend/.env.local` is **not** in `.gitignore` and is committed. This is intentional — it contains no secrets, only public config. The WalletConnect project ID is a public identifier.

---

## Contract Addresses — Do Not Hand-Edit

Contract addresses in the frontend are **not** set via environment variables. They are generated from the deployment JSON:

```
deployments/arc_testnet-v3.json
    ↓
node scripts/generate-frontend-config.js --network arc_testnet
    ↓
frontend/src/lib/generated-contracts.ts
```

`generated-contracts.ts` is committed and is the single source of truth for all addresses in the frontend. Do not manually edit it. Do not add `NEXT_PUBLIC_*_ADDRESS` variables — they are not used.

---

## What Must Be Updated After Redeploy

If contracts are redeployed (e.g., after an upgrade or mainnet deployment):

1. Run `node scripts/generate-frontend-config.js --network arc_testnet`
2. Commit the updated `frontend/src/lib/generated-contracts.ts`
3. Update `NEXT_PUBLIC_SUBGRAPH_URL` in `frontend/.env.local` if the subgraph is redeployed to a new version slug
4. Update `indexer/subgraph.yaml` with new contract addresses and start blocks
5. Redeploy the subgraph: `graph deploy arcnslatest`

---

## What Must Never Be Committed

| File | Reason |
|------|--------|
| `.env` | Contains `PRIVATE_KEY` |
| Any file containing a private key | Obvious |
| `frontend/.next/` | Build output — in `frontend/.gitignore` |
| `node_modules/` | Dependencies — in `.gitignore` |

---

## Founder Demo Override

For a demo with a private/dedicated RPC (to avoid public RPC congestion):

```env
# In frontend/.env.local — replace primary RPC only
NEXT_PUBLIC_RPC_URL=https://your-private-rpc-endpoint
```

Restart the dev server after changing `.env.local`.
