# ArcNS v3 — Founder Demo Fallbacks

Practical recovery guide for live testnet conditions.

---

## 1. Txpool Is Busy / Transaction Stuck

**Symptoms:** Wallet shows "pending" for more than 60 seconds. No confirmation. "Replacement fee too low" error.

**What to do:**
1. Wait 30–60 seconds. Arc Testnet txpool clears quickly in most cases.
2. If still stuck: in MetaMask, go to Settings → Advanced → Reset Account (clears local nonce state without affecting on-chain state).
3. Retry the transaction.

**What to say:**
> "Arc Testnet has occasional network congestion — this is expected on a public testnet. The mainnet deployment will use a dedicated RPC. Let me retry."

**Prevention:** Use a private/dedicated RPC endpoint as `NEXT_PUBLIC_RPC_URL` before the demo. This bypasses public mempool congestion.

---

## 2. Subgraph Is Lagging

**Symptoms:** History tab is empty or missing recent transactions. Portfolio shows no domains despite a successful registration.

**What to do:**
1. Wait 30 seconds and refresh the page.
2. If still empty: switch to the **Portfolio tab** — it has an RPC fallback that doesn't depend on the subgraph.
3. Show the ArcScan transaction link from the success modal as proof of the on-chain event.

**What to say:**
> "The subgraph indexes on-chain events — it's usually within a few seconds, but occasionally lags. The transaction is confirmed on-chain — here's the ArcScan link. The history will appear shortly."

**Alternate flow:** Skip the History tab entirely. Show the portfolio (RPC-backed) and the ArcScan NFT link instead.

---

## 3. Wallet Is on the Wrong Network

**Symptoms:** Red banner at the top of the page: "Wrong network. Please switch to Arc Testnet."

**What to do:**
1. In MetaMask: click the network selector → switch to Arc Testnet (Chain ID 5042002).
2. If Arc Testnet is not in the wallet: add it manually:
   - Network name: Arc Testnet
   - RPC URL: `https://arc-testnet.drpc.org`
   - Chain ID: `5042002`
   - Currency: USDC
   - Explorer: `https://testnet.arcscan.app`
3. The red banner disappears automatically once the wallet switches.

**What to say:**
> "The app enforces the correct network — it won't let you submit transactions on the wrong chain. Let me switch to Arc Testnet."

---

## 4. Registration Flow Is Slow

**Symptoms:** The 62-second commit wait feels long during a live demo.

**What to do:**
1. Use the wait time productively — explain the commit-reveal mechanism:
   > "This 62-second window is the anti-frontrun protection. We submit a hash of the registration first, wait for it to be included on-chain, then reveal. This prevents bots from seeing your transaction and jumping ahead of you. It's enforced at the contract level."
2. Show the progress bar — it's visible and counts up.
3. While waiting, navigate to the Resolve page and show a pre-registered name resolving.

**Alternate flow if you need to skip the wait entirely:**
- Pre-register a name before the demo.
- During the demo, show the pre-registered name in Portfolio and History.
- Only initiate a live registration if time permits.

---

## 5. Registration Fails After Commitment

**Symptoms:** Commitment submitted successfully, wait completed, but the register transaction fails or reverts.

**Common causes:**
- Commitment expired (> 24 hours since commit — unlikely in a demo)
- USDC allowance was reset between approve and register
- RPC returned stale state

**What to do:**
1. Click "Register another" to reset the flow.
2. Start a fresh registration — the commitment is cheap (just gas).
3. If USDC approval is the issue: the approve step will re-run automatically.

**What to say:**
> "The registration uses a two-step commit-reveal. Let me restart — the first step is just a hash commitment, it's quick."

---

## 6. App Won't Load / Frontend Error

**Symptoms:** Blank page, build error, or JavaScript error in console.

**What to do:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac).
2. If running dev server: check the terminal for errors. Restart with `npm run dev`.
3. If a production build: check the deployment URL.

**Alternate:** Open the Resolve page directly (`/resolve`) — it's the simplest page and loads independently.

---

## 7. No USDC Balance

**Symptoms:** "Insufficient USDC balance" warning on the domain card.

**What to do:**
1. Get testnet USDC from the Circle faucet: https://faucet.circle.com
2. Connect the demo wallet, request USDC, wait for the transaction.
3. Refresh the app.

**Prevention:** Always check USDC balance in the pre-demo checklist. Have at least $20 USDC ready.

---

## 8. Explaining Testnet Constraints Without Undermining Confidence

If anything goes wrong during the demo, use this framing:

> "We're running on a public testnet — Arc Testnet is a shared environment with real network conditions. The contracts, the frontend, and the subgraph are all production-grade. What you're seeing is exactly what mainnet will look like, minus the occasional testnet hiccup."

Key points to reinforce:
- The contracts are deployed and immutable on-chain
- Every registration is a real on-chain transaction with a real NFT
- The 62-second wait is a security property, not a bug
- Testnet RPC congestion is a testnet infrastructure issue, not a protocol issue

---

## Quick Reference

| Problem | First action | Fallback |
|---------|-------------|---------|
| Tx stuck | Wait 30s, retry | Reset MetaMask nonce |
| Subgraph empty | Wait 30s, refresh | Show ArcScan link + Portfolio (RPC) |
| Wrong network | Switch wallet to Chain ID 5042002 | Add Arc Testnet manually |
| Registration slow | Explain commit-reveal during wait | Show pre-registered name |
| Registration fails | Reset flow, retry | Show pre-registered name |
| No USDC | Circle faucet | Skip live registration, show pre-registered |
| App won't load | Hard refresh | Open `/resolve` directly |
