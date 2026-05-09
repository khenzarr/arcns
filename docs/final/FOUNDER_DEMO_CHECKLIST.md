# ArcNS — Founder Demo Checklist

Run through this checklist before every demo. It takes about 5 minutes.

---

## Wallet and Network

- [ ] MetaMask installed and unlocked
- [ ] MetaMask connected to Arc Testnet (Chain ID: 5042002)
  - Network name: Arc Testnet
  - RPC URL: https://rpc.testnet.arc.network
  - Chain ID: 5042002
  - Currency symbol: ETH
  - Explorer: https://testnet.arcscan.app
- [ ] Wallet has USDC balance (minimum $5 USDC for demo registrations)
  - Get USDC from: https://faucet.circle.com
- [ ] Wallet has Arc Testnet native token for gas

---

## App and Browser

- [ ] Browser tab open at https://arcns-app.vercel.app
- [ ] App loads without errors
- [ ] Header shows "ArcNS" with "Testnet" badge
- [ ] Wallet connects successfully (click "Connect Wallet")
- [ ] No wrong-network banner (you're on Arc Testnet)

---

## Demo Names — Verify These Work

- [ ] Search `flowpay.arc` → shows "Taken" badge with expiry
- [ ] Search `thebstoftimes.arc` → shows "Taken" badge (registered, no address record)
- [ ] Search a fresh name (e.g. `demo2026test.arc`) → shows "Available" badge with price
- [ ] Resolve `flowpay.arc` → shows resolved address, owner, expiry
- [ ] Resolve `thebstoftimes.arc` → shows owner, expiry, "No address record"

---

## My Domains

- [ ] My Domains page loads
- [ ] Portfolio shows registered names (not token ID hashes)
- [ ] Primary name card visible
- [ ] Transaction history shows registrations and renewals

---

## ArcScan

- [ ] https://testnet.arcscan.app loads
- [ ] ArcController address `0xe0A67F2E74Bcb740F0446fF2aCF32081DB877D46` is verified

---

## Screen Share

- [ ] Screen share is working
- [ ] Browser zoom is at 100% (or appropriate for screen size)
- [ ] No sensitive information visible (no private keys, no `.env` files)

---

## Fallback Plan

- [ ] You know the fallback scenarios in [FOUNDER_DEMO_FALLBACKS.md](FOUNDER_DEMO_FALLBACKS.md)
- [ ] You have a backup wallet with USDC if the primary wallet has issues
