# ArcNS — Environment Variable Reference

This document covers all environment variables used by the ArcNS repo: root `.env` (Hardhat / scripts), and `frontend/.env.local` (Next.js frontend).

---

## Root `.env` (Hardhat / Scripts)

Used by `hardhat.config.js`, deployment scripts, and migration scripts.

Copy from `.env.example`:
```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Deployer wallet private key (hex, no `0x` prefix). Must have Arc Testnet native token for gas. |
| `ARC_RPC_URL` | Yes | Arc Testnet RPC endpoint. Default: `https://rpc.testnet.arc.network` |
| `USDC_ADDRESS` | Yes | USDC contract address on Arc Testnet: `0x3600000000000000000000000000000000000000` |
| `TREASURY_ADDRESS` | Yes | Address that receives USDC registration and renewal fees. |
| `ARCSCAN_API_KEY` | Optional | API key for contract verification on ArcScan. Required for `npx hardhat verify`. |
| `SAFE_OWNER_KEY_1` | Migration only | First Safe owner key. Used only by multisig migration scripts. Never commit. |
| `SAFE_OWNER_KEY_2` | Migration only | Second Safe owner key. Used only by multisig migration scripts. Never commit. |

### Security Notes

- Never commit `.env` to version control. It is in `.gitignore`.
- `PRIVATE_KEY` and `SAFE_OWNER_KEY_*` are high-value secrets. Use a hardware wallet or secrets manager in production.
- The `.env.example` file contains placeholder values only. It is safe to commit.

---

## `frontend/.env.local` (Next.js Frontend)

Used by the Next.js frontend at runtime. All variables must be prefixed with `NEXT_PUBLIC_` to be available in the browser.

Copy from `frontend/.env.local.example` if it exists, or create manually:

```bash
# frontend/.env.local

NEXT_PUBLIC_SUBGRAPH_URL=https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL=
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your_project_id>
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUBGRAPH_URL` | Yes | The Graph Studio query URL for `arcnslatest`. Used for portfolio, history, and reverse resolution. |
| `NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL` | Optional | Goldsky fallback subgraph URL for ArcNS indexed reads on Arc Testnet. Queried only if the primary subgraph endpoint fails or returns unusable data. |
| `NEXT_PUBLIC_RPC_URL` | Yes | Arc Testnet RPC endpoint. Used as fallback when subgraph is unavailable. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect v2 project ID. Get from https://cloud.walletconnect.com |

### Notes

- `frontend/.env.local` is in `.gitignore`. Never commit it.
- Contract addresses are **not** in `.env.local`. They are generated into `frontend/src/lib/generated-contracts.ts` by `scripts/generate-frontend-config.js`. Do not hand-edit `generated-contracts.ts`.
- If the subgraph URL changes (e.g. after a new subgraph version is deployed), update `NEXT_PUBLIC_SUBGRAPH_URL` and restart the dev server or redeploy.
- Keep `NEXT_PUBLIC_SUBGRAPH_URL` as the primary endpoint. `NEXT_PUBLIC_GOLDSKY_SUBGRAPH_URL` is optional fallback only.

---

## Vercel Production Environment

When deploying to Vercel, set the following environment variables in the Vercel project settings (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUBGRAPH_URL` | `https://api.studio.thegraph.com/query/1748590/arcnslatest/v3` |
| `NEXT_PUBLIC_RPC_URL` | `https://rpc.testnet.arc.network` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Your WalletConnect project ID |

These are set as Production environment variables. They are not committed to the repo.

---

## Subgraph URL Format

The Graph Studio query URL format is:

```
https://api.studio.thegraph.com/query/<STUDIO_ID>/arcnslatest/<VERSION>
```

Current production URL:
```
https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
```

After deploying a new subgraph version, update `NEXT_PUBLIC_SUBGRAPH_URL` to the new version URL. See [SUBGRAPH_GUIDE.md](SUBGRAPH_GUIDE.md) for the full subgraph deployment flow.
