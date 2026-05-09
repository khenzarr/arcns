# ArcNS — Founder Demo Fallbacks

Recovery guide for live testnet conditions during a demo.

---

## Wallet Issues

### MetaMask not connected

**Symptom:** "Connect Wallet" button visible; no address shown in header.  
**Fix:** Click "Connect Wallet" → select MetaMask → approve connection.

### Wrong network

**Symptom:** Red banner at top: "Wrong network. Please switch to Arc Testnet."  
**Fix:** In MetaMask, switch to Arc Testnet (Chain ID: 5042002). If Arc Testnet is not in your network list, add it:
- Network name: Arc Testnet
- RPC URL: https://rpc.testnet.arc.network
- Chain ID: 5042002
- Currency symbol: ETH
- Explorer: https://testnet.arcscan.app

### Insufficient USDC

**Symptom:** USDC approval fails or shows zero balance.  
**Fix:** Get USDC from https://faucet.circle.com. Select Arc Testnet and your wallet address.

---

## Registration Issues

### Registration stuck at "Waiting…"

**Symptom:** Progress bar not filling; stuck at "Waiting for commitment to age."  
**Cause:** The commit-reveal scheme requires 60 seconds between commit and register. This is enforced on-chain.  
**Fix:** Wait 62 seconds. The progress bar will fill and the register button will activate.

### "Commitment not found on-chain"

**Symptom:** Error after waiting.  
**Cause:** Controller address mismatch or RPC connectivity issue.  
**Fix:** Refresh the page and try again. If the issue persists, check that `NEXT_PUBLIC_RPC_URL` is set correctly.

### USDC approval transaction fails

**Symptom:** MetaMask shows an error on the approval transaction.  
**Cause:** Insufficient USDC balance or gas.  
**Fix:** Check USDC balance. Get more from https://faucet.circle.com.

---

## Portfolio Issues

### Portfolio empty (no names shown)

**Symptom:** My Domains shows no names despite having registered names.  
**Cause A:** Subgraph not synced or wrong URL.  
**Fix A:** Wait 30 seconds and refresh. The subgraph typically lags 1–5 blocks.  
**Cause B:** RPC fallback not activating.  
**Fix B:** Check browser console for errors. Verify `NEXT_PUBLIC_RPC_URL` is set.

### Names shown as token ID hashes (not readable names)

**Symptom:** Portfolio shows `0x3f5aa...` instead of `flowpay.arc`.  
**Cause:** Subgraph is unavailable; RPC fallback is active but subgraph data is missing.  
**Fix:** Wait for subgraph to sync. The `RPC` badge will appear when in fallback mode.

---

## Resolve Page Issues

### Resolve returns "No address record" for a name you expect to have one

**Symptom:** Resolve page shows "No address record" for a registered name.  
**Cause:** The name is registered but no forward address record has been set.  
**Note:** This is correct behavior. `thebstoftimes.arc` is intentionally used to demonstrate this case.

### Resolve shows wrong owner

**Symptom:** Owner address shown is a contract address, not a wallet.  
**Cause:** This was a bug in earlier versions. The current version reads from `registrar.ownerOf(tokenId)`, not `registry.owner(node)`.  
**Fix:** Refresh the page. If the issue persists, check that you're on the latest deployed version.

### Resolve page loads but shows no data after clicking Resolve

**Symptom:** Loading state appears but no result shown.  
**Cause:** RPC connectivity issue.  
**Fix:** Check browser console. Verify `NEXT_PUBLIC_RPC_URL` is reachable.

---

## ArcScan Issues

### ArcScan not loading

**Symptom:** https://testnet.arcscan.app shows an error or blank page.  
**Fix:** This is a third-party service. If ArcScan is down, skip the ArcScan verification step in the demo. The contracts are still live and functional.

---

## General Recovery

If something goes wrong during the demo:

1. **Stay calm.** Testnet conditions are variable. This is expected.
2. **Explain what's happening.** "The testnet RPC is occasionally slow — let me refresh."
3. **Use the fallback.** If a live flow fails, switch to explaining the architecture and showing the ArcScan-verified contracts.
4. **Have a backup wallet.** If your primary wallet has issues, switch to a backup wallet with USDC.

---

## Demo Names Reference

| Name | State | Notes |
|------|-------|-------|
| `flowpay.arc` | Registered, has address record | Good for forward resolution demo |
| `thebstoftimes.arc` | Registered, no address record | Good for demonstrating the no-address case |
| `slippage.arc` | Registered | Backup demo name |
| `emperor.arc` | Registered | Backup demo name |
