# ArcNS — Founder Demo Script

**App:** https://arcns-app.vercel.app  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Demo names:** `flowpay.arc`, `thebstoftimes.arc`, `slippage.arc`, `emperor.arc`

---

## Pre-Demo Setup

Before starting:

- [ ] MetaMask connected to Arc Testnet (Chain ID 5042002)
- [ ] Wallet has USDC balance (get from https://faucet.circle.com)
- [ ] Browser tab open at https://arcns-app.vercel.app
- [ ] Second browser tab open at https://testnet.arcscan.app
- [ ] Screen share ready

---

## Step 1 — Home Page: The Identity Layer for Arc

**Navigate to:** https://arcns-app.vercel.app

**Say:**
> "This is ArcNS — the naming protocol for Arc. Instead of sharing a 42-character wallet address, you register a human-readable name like `flowpay.arc` or `alice.circle`. The name is yours as an NFT, paid for in USDC, and resolves entirely on-chain."

**Point out:**
- The search bar with `.arc` / `.circle` TLD selector
- The "Arc Testnet" badge in the header — this is testnet, not mainnet
- The clean, minimal UI

---

## Step 2 — Search: Check Availability

**Action:** Type `flowpay.arc` in the search bar and press Enter (or click Search).

**Say:**
> "Let's search for a name. `flowpay.arc` is already registered — you can see the 'Taken' badge, the expiry date, and the current price if you wanted to renew it."

**Then search for a fresh name** (e.g. `demo2026test.arc`):

**Say:**
> "Here's an available name. The price is $2 USDC per year for a 5-character name. Shorter names cost more — 3-character names are $15/year, 1-character names are $50/year. The pricing is enforced on-chain by the PriceOracle contract."

---

## Step 3 — Registration Flow (Commit-Reveal)

**Action:** With an available name selected, walk through the registration steps.

**Say:**
> "Registration uses a commit-reveal scheme to prevent front-running. First you submit a commitment hash — this locks in your intent without revealing the name. Then you wait 60 seconds. Then you complete the registration. USDC is transferred to the protocol treasury on success, and the name NFT is minted to your wallet."

**Walk through:**
1. Click Register
2. MetaMask prompts USDC approval — explain: "First we approve USDC spend"
3. Confirm commit transaction — "Now we submit the commitment"
4. Progress bar fills — "Waiting 60 seconds for the commitment to age"
5. Confirm register transaction — "Now we complete the registration"
6. Success state — "Done. The name is yours."

---

## Step 4 — My Domains: Portfolio and Primary Name

**Navigate to:** My Domains tab

**Say:**
> "My Domains shows your portfolio. Each name shows its expiry status — green for active, amber for expiring soon, orange for grace period. The data comes from our subgraph on The Graph Studio, with a direct RPC fallback if the subgraph is unavailable."

**Point out:**
- Domain names (not token ID hashes) — "The subgraph gives us readable names"
- Expiry badges
- Renew button for expiring names

**Scroll to Primary Name section:**

**Say:**
> "You can set a primary name — this is your on-chain identity. When someone looks up your wallet address, they get back `flowpay.arc`. The protocol enforces forward-confirmation: the name's address record must point back to your wallet, so stale records are detectable."

---

## Step 5 — Resolve Page: Forward Resolution

**Navigate to:** Resolve tab

**Action:** Type `flowpay.arc` and click Resolve.

**Say:**
> "The Resolve page is the Identity Inspector. Enter any `.arc` or `.circle` name and see its on-chain records: the resolved address, the owner, the expiry, the namehash. Everything is read directly from the chain."

**Point out:**
- Resolved Address — the wallet address this name points to
- Owner — the NFT holder (read from `registrar.ownerOf(tokenId)`, not `registry.owner(node)`)
- Expiry and status badge
- ArcScan link

---

## Step 6 — Registered Name with No Address Record

**Action:** Type `thebstoftimes.arc` and click Resolve.

**Say:**
> "Here's an interesting case. `thebstoftimes.arc` is registered — it has an owner and an expiry — but it has no receiving address set. The Resolve page correctly shows 'No address record' rather than treating it as unregistered. If you're the owner, you'll see a prompt to go set your address record in My Domains."

**Why this matters:**
> "This distinction is important. A name can be registered without a forward address record. The owner display is correct because we read from `registrar.ownerOf(tokenId)` — the actual NFT owner — not from `registry.owner(node)`, which would return the registrar contract address."

---

## Step 7 — ArcScan Verification

**Navigate to:** https://testnet.arcscan.app

**Action:** Paste the ArcController address: `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`

**Say:**
> "All contracts are verified on ArcScan. You can inspect the ABI, read contract state, and verify the role assignments. The ArcController is a UUPS proxy — upgrades require a 48-hour timelock and a 2-of-3 multisig. No single key can upgrade the protocol."

---

## Step 8 — Circle Alignment

**Say:**
> "ArcNS is built on Circle's infrastructure. Registration and renewal fees are paid in USDC. The `.circle` TLD is a first-class namespace — `alice.circle` is as valid as `alice.arc`. We're applying to the Circle 2026 Cohort 2 grant to accelerate ecosystem integrations and mainnet preparation."

**Key points:**
- USDC-native from day one
- `.circle` TLD as a dedicated namespace
- Planned: USDC payment flows for dApps using ArcNS names
- Planned: Circle Programmable Wallets integration for seamless onboarding

---

## Step 9 — Status and Roadmap

**Say:**
> "ArcNS is live on Arc Testnet, demo-ready, and pre-mainnet. The protocol is fully functional. The next milestones are: external security audit, treasury hardening, and mainnet deployment. Integration packages for ArcScan and wallet vendors are ready and documented."

**Honest gaps:**
- External audit not yet completed
- Treasury is currently an EOA (migration planned)
- No ecosystem integrations yet (packages ready, adoption pending)
- Not mainnet — no real funds

---

## Fallback Scenarios

| Issue | Recovery |
|-------|----------|
| MetaMask not connected | Click "Connect Wallet" in header |
| Wrong network | Banner appears — click "Switch to Arc Testnet" |
| Registration stuck at "Waiting…" | Wait 62 seconds; the commitment age check is on-chain |
| Portfolio empty | Check `NEXT_PUBLIC_SUBGRAPH_URL` is set; RPC fallback should activate |
| Resolve returns no data | Verify the name is registered; check RPC connectivity |
| USDC approval fails | Check USDC balance; get from https://faucet.circle.com |

See [FOUNDER_DEMO_FALLBACKS.md](FOUNDER_DEMO_FALLBACKS.md) for the full recovery guide.
