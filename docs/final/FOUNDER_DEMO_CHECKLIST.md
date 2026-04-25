# ArcNS v3 — Founder Demo Checklist

Complete this checklist in order before going live.

---

## 1. Wallet / Network

- [ ] MetaMask (or demo wallet) is installed and unlocked
- [ ] Wallet is connected to **Arc Testnet** (Chain ID: **5042002**)
  - RPC: `https://arc-testnet.drpc.org`
  - Or: `https://rpc.testnet.arc.network`
- [ ] Wallet address is the one you intend to demo with
- [ ] No pending transactions in the wallet (clear nonce issues)

---

## 2. USDC Balance

- [ ] Demo wallet has at least **$20 USDC** on Arc Testnet
  - Get testnet USDC: https://faucet.circle.com
- [ ] USDC balance visible in wallet
- [ ] If registering a short name (1–3 chars), ensure sufficient balance for that tier

---

## 3. RPC / Provider

- [ ] Primary RPC is responsive: `https://arc-testnet.drpc.org`
  - Quick check: open https://arc-testnet.drpc.org in browser — should return a JSON-RPC response
- [ ] Fallback RPC is set in `frontend/.env.local`:
  ```
  NEXT_PUBLIC_RPC_URL_2=https://rpc.testnet.arc.network
  ```
- [ ] (Optional for demo) Private/dedicated RPC set as `NEXT_PUBLIC_RPC_URL` to avoid public congestion

---

## 4. Subgraph Readiness

- [ ] Subgraph is synced and returning data
  - Quick check: open the query URL in a browser or run a test query:
    ```
    https://api.studio.thegraph.com/query/1748590/arcnslatest/v3
    ```
  - POST `{ "query": "{ domains(first: 1) { name } }" }` — should return a domain
- [ ] History tab in My Domains shows at least one pre-registered transaction
- [ ] Portfolio tab shows at least one pre-registered domain

---

## 5. Frontend / Browser

- [ ] Frontend dev server is running: `cd frontend && npm run dev`
  - Or production build is deployed and accessible
- [ ] App loads at http://localhost:3000 (or your deployed URL)
- [ ] No red "wrong network" banner on load (wallet is on Arc Testnet)
- [ ] Browser console has no blocking errors
- [ ] Browser is Chrome or Firefox (best MetaMask compatibility)
- [ ] Browser zoom is at 100% (UI is designed for standard zoom)
- [ ] No browser extensions that block wallet popups

---

## 6. Pre-Registered Demo Name

- [ ] At least one name is already registered to the demo wallet (for portfolio/history demo)
  - Recommended: `arcns.arc` or similar
- [ ] That name appears in the Portfolio tab
- [ ] That name appears in the History tab
- [ ] Primary name is set (or ready to set during demo)

---

## 7. Demo Names Prepared

- [ ] Chosen a name to register live during the demo (e.g., `demo.arc`)
- [ ] Confirmed that name is **available** right now
  - Search it in the app — should show green "Available" badge
- [ ] Have a backup name ready in case the first is taken

---

## 8. Final "Go Live" Check (30 seconds before demo)

- [ ] App is open on the home/search page
- [ ] Wallet is connected and shows correct address
- [ ] No wrong-network banner visible
- [ ] USDC balance confirmed in wallet
- [ ] Subgraph is live (History tab has data)
- [ ] Screen sharing / presentation mode is ready
- [ ] Fallback doc is open in a separate tab: `docs/final/FOUNDER_DEMO_FALLBACKS.md`

---

**You are ready to demo.**
