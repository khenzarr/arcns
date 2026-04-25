# ArcNS — dApp Fallback UX Package

**Phase:** 8E  
**Date:** 2026-04-25  
**Network:** Arc Testnet (Chain ID: 5042002)  
**Audience:** ArcNS frontend product and engineering  
**Status:** Implementation-grade specification

---

## 1. Fallback UX Purpose

### What problem this solves

ArcNS names are fully functional on-chain. The protocol resolves names to addresses, stores primary names, and issues NFTs. But the ecosystem tools that users interact with daily — MetaMask, ArcScan, Rainbow, Trust Wallet — do not yet natively understand `.arc` or `.circle` names.

This creates a gap: a user registers `alice.arc`, but when they open MetaMask to send funds to a friend, they still have to paste a raw hex address. When they look up their address on ArcScan, their name does not appear. The name exists, but it is invisible outside the ArcNS app.

The fallback UX package defines what the ArcNS app itself can do to bridge this gap — making names useful to users today, before native wallet and explorer support exists.

### Why it is needed before native adoption

Native wallet and explorer integration requires third-party engineering teams to implement ArcNS support. That takes time and is outside ArcNS's direct control. The fallback UX is what ArcNS can ship unilaterally, inside its own app, to give users practical value from their names right now.

### What users should and should not expect

**Users should expect:**
- The ArcNS app to resolve any `.arc` or `.circle` name to an address
- The ArcNS app to display verified primary names for addresses
- Clear, honest messaging about what works inside the app vs what requires wallet/explorer support
- Safe, verified resolution — no misleading output

**Users should not expect:**
- MetaMask to accept `.arc` names in the send field (not yet supported)
- ArcScan to show their primary name on their address page (not yet supported)
- Any wallet to display their name in transaction history (not yet supported)

The app must not imply that these capabilities exist when they do not.

---

## 2. In-App Resolution Surfaces

These are the canonical places inside the ArcNS app where resolution data is displayed or used.

### 2.1 Name → address lookup (Resolve page)

**Current state:** The `/resolve` page already exists and resolves a name to its address, expiry, and namehash.

**What it provides:**
- Input: any `.arc` or `.circle` name
- Output: resolved address, expiry date, expiry status badge, namehash, ArcScan NFT link

**What it should add:**
- Explicit "Copy address" button next to the resolved address
- Clear label: "Resolved address (from ArcNS on-chain record)"
- If no address record is set: "No address record — this name exists but has no address configured"
- If name does not exist: "Name not found — not registered or expired"

### 2.2 Address → primary name lookup

**Current state:** The `usePrimaryName` hook already implements three-state primary name resolution: `none`, `verified`, `stale`. The `PrimaryName` component displays the verified name with a `✓` badge and a `⚠` badge for stale.

**What it provides:**
- Reads reverse record from Resolver
- Runs forward-confirmation automatically
- Exposes `status: "none" | "verified" | "stale"`

**What it should add:**
- A standalone "Look up primary name for any address" input on the Resolve page (not just for the connected wallet)
- Clear label: "Primary name (verified)" when `status === "verified"`
- Clear label: "Primary name unverified — name may have been transferred or expired" when `status === "stale"`
- No display at all when `status === "none"`

### 2.3 Portfolio / domain display

**Current state:** The My Domains page shows all names owned by the connected wallet with expiry, status badge, and renewal actions.

**What it should show:**
- For each domain: the resolved address (from `Resolver.addr(node)`) — so the user can see what address their name currently points to
- A "Copy resolved address" button per domain
- A clear indicator if the resolved address differs from the connected wallet address (e.g. the user set a different address as the `addr` record)

### 2.4 Transaction / history display

**Current state:** The ArcNS app does not have a transaction history view that shows counterparty addresses.

**Future recommendation:** If a transaction history view is added, display primary names for counterparty addresses using the same `lookupAddress` + forward-confirmation flow. Never display an unverified name. Show the raw address as the primary label and the verified name as a secondary badge.

### 2.5 Primary name verification display

**Current state:** The `PrimaryName` component already shows `✓` for verified and `⚠` for stale.

**Canonical display rules:**

| Status | Display | Badge |
|--------|---------|-------|
| `verified` | Show name prominently | `✓ alice.arc` (green) |
| `stale` | Show warning, not the name | `⚠ Primary name stale` (amber) |
| `none` | Show prompt to set one | "No primary name set" |

Never display the name text when status is `stale`. The `⚠` badge should link to the primary name update flow, not display the stale name as if it were valid.

---

## 3. Recipient Helper UX

This defines a future-safe "send to ArcNS name" helper inside the ArcNS app. This is not a full wallet — it is a resolution helper that lets users look up and copy a resolved address before using their wallet.

### 3.1 Input field behavior

The input field accepts either:
- A raw EVM address (`0x...`, 42 chars) — pass through, no resolution needed
- An ArcNS name (`alice.arc`, `bob.circle`) — resolve to address

**Detection logic:**
```
if input starts with "0x" and is 42 chars → treat as address
if input ends with ".arc" or ".circle"    → treat as ArcNS name
otherwise                                 → show format error
```

**Placeholder text:** `Paste address or ArcNS name (e.g. alice.arc)`

### 3.2 Normalize and validate before resolution

Before any resolution attempt:
```
1. Trim whitespace
2. Lowercase
3. Validate label:
   - Not empty
   - No leading/trailing hyphen
   - No double-hyphen at positions 2–3
   - ASCII: only a-z, 0-9, hyphen, underscore
   - Non-ASCII: Unicode letters, digits, emoji allowed
4. Validate TLD: must be "arc" or "circle"
```

Show inline validation errors as the user types. Do not attempt resolution on invalid input.

### 3.3 Resolution flow

```
1. Compute namehash(normalizedName)
2. resolverAddr = Registry.resolver(node)
   → if address(0): show "Name has no resolver set"
3. resolvedAddr = Resolver.addr(node)
   → if address(0): show "Name has no address record"
4. Display resolved address with confirmation prompt
5. Offer "Copy address" button
```

### 3.4 Display resolved address clearly

After successful resolution, show:

```
┌─────────────────────────────────────────────────────┐
│  alice.arc                                          │
│  resolves to                                        │
│  0xabc...def                          [Copy] [↗]   │
│                                                     │
│  ⚠ You are about to use this address in your       │
│  wallet. Verify it is correct before sending.      │
└─────────────────────────────────────────────────────┘
```

The resolved address must be shown in full (not truncated) so the user can verify it. The copy button copies the full address. The `↗` link opens the address on ArcScan.

### 3.5 Block send if unresolved or verification fails

The "Copy address" button must be disabled until resolution succeeds. If resolution fails for any reason, show the appropriate error state (see §5) and do not provide a copyable address.

### 3.6 Wrong network behavior

If the app detects the user's wallet is not on Arc Testnet (Chain ID 5042002):

```
⚠ ArcNS names only work on Arc Testnet.
  Switch your wallet to Arc Testnet to resolve this name.
```

Do not attempt resolution on the wrong network.

### 3.7 Unsupported input

If the input is neither a valid address nor a valid ArcNS name:

```
Unrecognized format. Enter a 0x address or an ArcNS name ending in .arc or .circle.
```

---

## 4. Verification Rules

### 4.1 When to trust forward resolution

Forward resolution (`Resolver.addr(node)`) is always trusted directly. The `addr` record is set by the name owner via an authenticated transaction. No additional verification is needed.

**Rule:** If `Resolver.addr(namehash(name))` returns a non-zero address, that is the canonical resolved address. Display it.

### 4.2 When to verify reverse

Reverse resolution (`Resolver.name(reverseNode)`) must always be forward-confirmed before the result is displayed as a primary name.

**Rule:** Never display a primary name from a reverse record without running:
```
resolvedAddr = Resolver.addr(namehash(primaryName))
if resolvedAddr == address: display name (verified)
else: do not display name (stale)
```

This is already implemented in `usePrimaryName.ts`. All new surfaces that display primary names must use this hook or replicate its logic.

### 4.3 When to show verified primary name vs unverified label

| Condition | Display |
|-----------|---------|
| `status === "verified"` | Show name with `✓` badge |
| `status === "stale"` | Show `⚠` warning only — do not show the name text |
| `status === "none"` | Show "No primary name set" |
| Resolution in progress | Show loading skeleton |
| RPC error | Show nothing — do not show stale cached data as current |

### 4.4 How to handle stale reverse data

A stale reverse record means the name was transferred or expired after the reverse record was set. The correct behavior is:

1. Do not display the stale name as the address's identity.
2. Show a `⚠` indicator that the primary name is stale.
3. If the user owns the address, offer a prompt to update the primary name.
4. Do not show the stale name text anywhere — not even with a disclaimer.

The `PrimaryName` component already implements this correctly. All other surfaces must follow the same pattern.

---

## 5. Failure / Fallback States

### 5.1 Unresolved name

**Condition:** `Resolver.addr(node)` returns `address(0)`.  
**User message:** "No address record — `alice.arc` exists but has no address configured."  
**App behavior:** Show the message. Disable the copy button. Offer a link to the ArcNS app to set an address record.

### 5.2 Malformed name

**Condition:** Input fails normalization (leading hyphen, double-hyphen, invalid characters).  
**User message:** Specific inline validation error (see §3.2).  
**App behavior:** Show inline error as the user types. Do not attempt resolution.

### 5.3 Unsupported TLD

**Condition:** Input ends in `.eth`, `.crypto`, or any TLD other than `.arc` or `.circle`.  
**User message:** "Unsupported name format. ArcNS supports `.arc` and `.circle` names."  
**App behavior:** Show inline error. Do not attempt resolution.

### 5.4 No resolver set

**Condition:** `Registry.resolver(node)` returns `address(0)`.  
**User message:** "Name has no resolver configured. This name cannot be resolved to an address."  
**App behavior:** Show the message. This is a valid on-chain state — not a network error.

### 5.5 No primary name

**Condition:** `Resolver.name(reverseNode)` returns `""`.  
**User message:** "No primary name set for this address."  
**App behavior:** Show the message. Offer a prompt to set one if the user owns the address.

### 5.6 Subgraph lag

**Condition:** Subgraph data is 1–5 blocks behind chain head.  
**User message:** None needed for normal lag. If data is visibly stale (e.g. a just-registered name not appearing), show: "Data may be a few seconds behind. Refresh to update."  
**App behavior:** For resolution operations, fall back to RPC automatically. The `source` field in API responses indicates whether data came from the subgraph or RPC.

### 5.7 RPC failure

**Condition:** All Arc Testnet RPC endpoints are timing out.  
**User message:** "Unable to connect to Arc Testnet. Check your connection and try again."  
**App behavior:** Show the error. Disable resolution. Offer a retry button. Do not show stale cached data as current.

### 5.8 Wrong network

**Condition:** Wallet is connected to a network other than Arc Testnet (Chain ID 5042002).  
**User message:** "ArcNS names are only available on Arc Testnet. Switch your wallet to Arc Testnet."  
**App behavior:** Show the network switch prompt. Disable all resolution and write operations.

### 5.9 Summary table

| Failure | Block resolution? | User message |
|---------|------------------|--------------|
| Unresolved name | Yes | "No address record set" |
| Malformed name | Yes | Specific validation error |
| Unsupported TLD | Yes | "Unsupported name format" |
| No resolver | Yes | "Name has no resolver" |
| No primary name | N/A | "No primary name set" |
| Stale reverse | N/A (display only) | `⚠` warning, no name shown |
| Subgraph lag | No (RPC fallback) | "Data may be a few seconds behind" |
| RPC failure | Yes | "Unable to connect — retry" |
| Wrong network | Yes | "Switch to Arc Testnet" |

---

## 6. Communication / Labeling Rules

The ArcNS app must be honest about what works today and what requires third-party adoption. Misleading users into thinking MetaMask or ArcScan already support ArcNS names natively will create confusion and support burden.

### 6.1 What works inside ArcNS today

The app may state clearly:
- "Resolve any `.arc` or `.circle` name to an address — right here in the ArcNS app."
- "Your primary name is displayed here and verified on-chain."
- "Copy your resolved address to use in any wallet."

### 6.2 What requires wallet-native support

The app must not imply that wallets already support ArcNS names. Correct framing:

**Do not say:** "Send to `alice.arc` directly from MetaMask."  
**Do say:** "Wallet support for `.arc` names is coming. For now, resolve the name here and copy the address into your wallet."

**Do not say:** "Your ArcNS name appears in MetaMask."  
**Do say:** "Your primary name is verified on-chain. Wallet apps will display it once they add ArcNS support."

### 6.3 What requires explorer-native support

**Do not say:** "Search for `alice.arc` on ArcScan."  
**Do say:** "ArcScan integration is in progress. For now, use the Resolve page to look up any name."

### 6.4 Tooltip / helper text patterns

Where the app surfaces resolution results, use consistent helper text:

| Surface | Helper text |
|---------|-------------|
| Resolved address on Resolve page | "Resolved from ArcNS on-chain record" |
| Primary name badge (verified) | "Verified primary name — forward-confirmed on-chain" |
| Primary name badge (stale) | "Primary name stale — name may have been transferred or expired" |
| Copy address CTA | "Copy this address to use in your wallet" |
| No address record | "This name exists but has no address configured" |
| Wallet send helper | "Wallet apps don't yet support ArcNS names natively. Copy this address to send." |

### 6.5 Avoid these patterns

- Do not show a primary name without a `✓` or `⚠` indicator — users need to know whether it is verified.
- Do not truncate the resolved address in the copy flow — show it in full so users can verify it.
- Do not show a loading spinner indefinitely — set a timeout and show an error state.
- Do not silently fall back to a cached result when RPC fails — show the error.

---

## 7. Optional Implementation Recommendations

These are small, targeted enhancements to the existing frontend that would materially improve the fallback UX. None require a broad refactor.

### 7.1 "Paste address or ArcNS name" field

Add a unified input to the Resolve page that accepts either a raw address or an ArcNS name:

```
[Paste address or ArcNS name (e.g. alice.arc)]  [Resolve]
```

- If input is `0x...` (42 chars): look up primary name for that address (reverse + forward-confirm)
- If input ends in `.arc` or `.circle`: resolve name to address (forward)
- Show both results in a single card

This makes the Resolve page a general-purpose ArcNS lookup tool, not just a name-to-address resolver.

### 7.2 Verified-name badge rules

Standardize the badge component across all surfaces:

```
✓ alice.arc    ← green, status="verified"
⚠ Stale        ← amber, status="stale", no name text
— Not set      ← gray, status="none"
```

The badge must never show the name text when status is `stale`. The `⚠` icon alone is sufficient — clicking it should explain what stale means.

### 7.3 Copy resolved address CTA

On every surface that shows a resolved address, add a copy button:

```
0xabc...def  [Copy]  [View on ArcScan ↗]
```

The copy button copies the full checksummed address. After copying, show a brief "Copied!" confirmation. This is the primary mechanism by which users bridge from ArcNS to their wallet — make it prominent.

### 7.4 Fallback tooltips

Add tooltips to resolution result fields to explain what they mean:

| Field | Tooltip |
|-------|---------|
| Resolved address | "The EVM address this name currently points to, as set by the name owner." |
| Primary name (verified) | "This address has set this name as its primary identity. Verified on-chain." |
| Primary name (stale) | "This address previously set a primary name, but the name no longer resolves back to this address." |
| Namehash | "The EIP-137 recursive hash of this name, used as the on-chain identifier." |

### 7.5 "Use in wallet" helper

After resolving a name, show a helper message:

```
┌──────────────────────────────────────────────────────────┐
│  alice.arc → 0xabc...def                    [Copy] [↗]  │
│                                                          │
│  Wallet apps don't yet support ArcNS names natively.    │
│  Copy this address to send from MetaMask or any wallet. │
└──────────────────────────────────────────────────────────┘
```

This sets correct expectations without being dismissive. It acknowledges the limitation and gives the user a clear path forward.

---

*End of ArcNS dApp Fallback UX Package — Phase 8E*
