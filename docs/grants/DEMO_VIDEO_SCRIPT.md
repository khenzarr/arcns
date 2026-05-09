# ArcNS — Demo Video Script

**Target length:** 3–5 minutes  
**App:** https://arcns-app.vercel.app  
**Network:** Arc Testnet

---

## [0:00–0:20] Intro

**On screen:** ArcNS home page at https://arcns-app.vercel.app

**Script:**
> "This is ArcNS — the identity layer for Arc. Instead of sharing a 42-character wallet address, you register a human-readable name like `flowpay.arc` or `alice.circle`. The name is yours as an NFT, paid for in USDC, and resolves entirely on-chain. Let me show you how it works."

---

## [0:20–0:50] Home Page — Search

**On screen:** Home page search bar

**Action:** Type `flowpay.arc` in the search bar and press Enter.

**Script:**
> "Let's start with the search bar. I'll search for `flowpay.arc`. This name is already registered — you can see the 'Taken' badge and the expiry date."

**Action:** Clear and type `demo2026test.arc`.

**Script:**
> "Now let's search for an available name. `demo2026test.arc` is available. The price is $2 USDC per year for a 5-character name. Shorter names cost more — this is enforced on-chain by the PriceOracle contract."

---

## [0:50–1:50] Registration Flow

**On screen:** Registration card for an available name

**Script:**
> "Registration uses a commit-reveal scheme to prevent front-running. Here's how it works."

**Walk through the steps:**

1. **Click Register**
   > "First, I click Register."

2. **MetaMask prompts USDC approval**
   > "MetaMask asks me to approve USDC spend. This is the payment — $2 USDC for one year."

3. **Confirm commit transaction**
   > "Now I submit a commitment hash. This locks in my intent without revealing the name on-chain — it prevents someone from seeing my transaction and front-running it."

4. **Progress bar fills (60 seconds)**
   > "I wait 60 seconds for the commitment to age. This is enforced by the smart contract."

5. **Confirm register transaction**
   > "Now I complete the registration. USDC is transferred to the protocol treasury, and the name NFT is minted to my wallet."

6. **Success state**
   > "Done. `demo2026test.arc` is mine. It's an ERC-721 NFT with on-chain SVG metadata."

---

## [1:50–2:20] My Domains — Portfolio and Primary Name

**Navigate to:** My Domains tab

**Script:**
> "My Domains shows my portfolio. Each name shows its expiry status — green for active, amber for expiring soon. The data comes from our subgraph on The Graph Studio."

**Scroll to Primary Name section:**

**Script:**
> "I can set a primary name — this is my on-chain identity. When someone looks up my wallet address, they get back `flowpay.arc`. The protocol enforces forward-confirmation: the name's address record must point back to my wallet, so stale records are always detectable."

---

## [2:20–3:00] Resolve Page — Identity Inspector

**Navigate to:** Resolve tab

**Action:** Type `flowpay.arc` and click Resolve.

**Script:**
> "The Resolve page is the Identity Inspector. I can look up any `.arc` or `.circle` name and see its on-chain records: the resolved address, the owner, the expiry, the namehash. Everything is read directly from the chain."

**Action:** Clear and type `thebstoftimes.arc`, click Resolve.

**Script:**
> "Here's an interesting case. `thebstoftimes.arc` is registered — it has an owner and an expiry — but it has no receiving address set. The page correctly shows 'No address record' rather than treating it as unregistered. This distinction matters: a name can be owned without having a forward address record."

---

## [3:00–3:30] USDC Registration and ArcScan Verification

**Navigate to:** https://testnet.arcscan.app, paste ArcController address `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46`

**Script:**
> "All contracts are verified on ArcScan. The ArcController is a UUPS proxy — upgrades require a 48-hour timelock and a 2-of-3 multisig. No single key can upgrade the protocol."

**Back to app:**

**Script:**
> "Registration fees are paid in USDC. The `.circle` TLD is a dedicated namespace for Circle-aligned identities. ArcNS is USDC-native from day one — not a retrofit."

---

## [3:30–4:00] Circle Alignment and Next Milestones

**Script:**
> "ArcNS is applying to the Circle 2026 Cohort 2 grant. Here's why Circle is the right partner:"

- "USDC is the payment token for the entire ArcNS economy"
- "The `.circle` TLD is a first-class namespace"
- "Planned: Circle Programmable Wallets integration for seamless onboarding"
- "Planned: USDC payment routing — dApps can use ArcNS names as USDC payment identifiers"

**Script:**
> "The next milestones are: external security audit, treasury hardening, and mainnet deployment. Integration packages for ArcScan and wallet vendors are ready and documented."

---

## [4:00–4:15] Closing

**On screen:** Home page

**Script:**
> "ArcNS is live on Arc Testnet at arcns-app.vercel.app. The contracts are deployed, the subgraph is live, and the protocol is demo-ready. We're pre-mainnet — the primary blocker is an external security audit. Thank you."

---

## Recording Notes

- Record at 1080p or higher
- Use a clean browser profile with no extensions visible
- Ensure MetaMask is connected to Arc Testnet before recording
- Have USDC balance ready for the registration demo
- If the registration flow takes too long for the video, cut after the commit step and resume at the success state
- Add captions for accessibility
