# ArcNS v3 — Founder Demo Script

**Audience:** Founders, investors, technical partners  
**Duration:** ~8–12 minutes  
**Network:** Arc Testnet (Chain ID: 5042002)

---

## Opening (1–2 min)

**What ArcNS is:**

> "ArcNS is the naming layer for Arc. It lets anyone register a human-readable name — like `alice.arc` or `studio.circle` — that maps to their wallet address. Instead of copying a 42-character hex address, you just share your name."

**What `.arc` and `.circle` are:**

> "We support two top-level domains. `.arc` is the general-purpose identity name — your on-chain handle. `.circle` is designed for communities, studios, and organizations. Both are ERC-721 NFTs, so they're fully owned, transferable, and composable."

**Why Arc Testnet + USDC:**

> "Arc's native payment token is USDC — not a volatile gas token. That means registration pricing is stable and predictable. A 5-character name costs $2 per year. A 3-character name costs $15. You know exactly what you're paying. We're live on Arc Testnet right now, and this is the same system that will go to mainnet."

---

## Demo Flow

### Step 1 — Open the App

Open the frontend in a browser. The home page shows the search bar and pricing table.

> "This is the ArcNS app. You can see the pricing tiers right here — $2/year for standard names, up to $50/year for single-character names. Everything is paid in USDC."

---

### Step 2 — Connect Wallet

Click **Connect** in the top-right. Select MetaMask (or WalletConnect).

> "We connect with any standard wallet. MetaMask, Rainbow, Trust — anything WalletConnect-compatible."

Confirm the wallet is on **Arc Testnet (Chain ID 5042002)**. If not, the app will show a red banner — switch networks.

---

### Step 3 — Search a Name

Type a name in the search bar. Recommended demo names:

| Name | Why |
|------|-----|
| `arc.arc` | Short, memorable, shows premium pricing |
| `demo.arc` | Clean, available, standard pricing |
| `studio.circle` | Shows `.circle` TLD |
| `founder.arc` | Narrative fit |

> "I'll search for `demo.arc`. You can see the price preview instantly — no RPC call needed for that. Then it checks availability on-chain."

The availability badge updates: **Available** (green) or **Taken** (gray).

---

### Step 4 — Show Pricing and Duration

The domain card shows:
- Base price per year
- Duration selector (1–5 years)
- Total cost in USDC
- Premium badge if applicable

> "I can register for 1 year or up to 5 years. The price scales linearly. I'll go with 1 year for the demo."

---

### Step 5 — Register

Check **"Set as primary name"** if you want to show the reverse record flow in one step.

Click **Register**. Walk through the steps:

1. **Approving USDC** — wallet prompt to approve the controller to spend USDC
2. **Submitting commitment** — anti-frontrun hash submitted on-chain
3. **Waiting** — 62-second maturity window (progress bar visible)
4. **Registering** — final register tx

> "The commit-reveal pattern prevents front-running. We submit a hash first, wait 62 seconds, then reveal. This is the same pattern used by every serious naming protocol."

> "While we wait — this is a good moment to explain that the 62 seconds is a security property, not a UX limitation. It's enforced on-chain."

After success, the modal shows:
- Domain name
- Cost paid
- NFT minted confirmation
- Links to ArcScan

---

### Step 6 — Show Explorer / NFT Proof

Click **View NFT ↗** in the success modal.

> "The domain is an ERC-721 NFT. Here it is on ArcScan — you can see the token ID, the owner address, and the contract. It's a real on-chain asset."

Also click **View Tx ↗** to show the transaction.

---

### Step 7 — Set or Switch Primary Name

Navigate to **My Domains**.

> "My Domains shows everything I own. Here's the primary name section."

If primary name was set at registration: show the verified checkmark.

If not set yet: select the domain from the dropdown and click **Set as Primary**.

> "The primary name maps my wallet address back to this name. So instead of showing `0xabc...`, apps that integrate ArcNS can show `demo.arc`. It's the reverse resolution layer."

---

### Step 8 — Resolve a Name

Navigate to **Resolve**.

Type the registered name (e.g., `demo.arc`) and click **Resolve**.

> "Anyone can look up any ArcNS name. Here's the resolved address, the expiry date, and the namehash. This is the forward resolution — name to address."

---

### Step 9 — Show Portfolio and History

Navigate to **My Domains → History tab**.

> "The history tab shows every registration and renewal, pulled from our subgraph. Timestamp, cost, transaction hash — all indexed and queryable."

Switch to **Portfolio tab**.

> "The portfolio shows all owned names with expiry status. Names expiring soon show a renewal prompt."

---

## Closing (30 sec)

> "That's the full flow — search, register, own as an NFT, set your identity, resolve, manage your portfolio. All on Arc Testnet, all paid in USDC, all live right now. The same contracts go to mainnet."

---

## Suggested Demo Names (Pre-Register Before Demo)

For a smoother demo, pre-register one name before the live session so you can show the portfolio and history without waiting for the 62-second commit window:

| Pre-registered name | Use for |
|--------------------|---------|
| `arcns.arc` | Portfolio / history demo |
| `demo.arc` | Live registration during demo |
