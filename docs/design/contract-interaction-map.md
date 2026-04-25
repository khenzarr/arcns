# ArcNS v3 — Contract Interaction Map

Detailed sequence diagrams for all primary on-chain flows.

---

## 1. Registration Flow

Full commit-reveal registration with addr set and optional reverse record.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant USDC as USDC ERC-20
    participant Ctrl as ArcNSController
    participant Oracle as ArcNSPriceOracle
    participant Base as ArcNSBaseRegistrar
    participant Reg as ArcNSRegistry
    participant Res as ArcNSResolver
    participant RevReg as ArcNSReverseRegistrar

    Note over User,FE: Step 1 — Normalize & price check
    User->>FE: Enter name + TLD + duration
    FE->>FE: normalization.normalize(name)
    FE->>Ctrl: rentPrice(name, duration)
    Ctrl->>Oracle: price(name, nameExpires[id], duration)
    Oracle-->>Ctrl: Price{base, premium}
    Ctrl-->>FE: Price{base, premium}
    FE-->>User: Display cost (e.g. "2.00 USDC/year")

    Note over User,FE: Step 2 — Availability check
    FE->>Ctrl: available(name)
    Ctrl->>Base: available(tokenId)
    Base-->>Ctrl: true/false
    Ctrl-->>FE: true/false

    Note over User,FE: Step 3 — USDC approval
    User->>FE: Click "Approve USDC"
    FE->>USDC: approve(controller, cost + slippage)
    USDC-->>FE: tx confirmed

    Note over User,FE: Step 4 — Commit
    FE->>FE: secret = randomBytes(32)
    FE->>Ctrl: makeCommitmentWithSender(name, owner, duration, secret, resolver, reverseRecord, sender)
    Ctrl-->>FE: commitment hash
    User->>FE: Click "Commit"
    FE->>Ctrl: commit(commitment)
    Ctrl->>Ctrl: commitments[commitment] = block.timestamp
    Ctrl-->>FE: CommitmentMade event, tx confirmed

    Note over User,FE: Step 5 — Wait ≥ 60 seconds
    loop Poll every 5s
        FE->>Ctrl: getCommitmentStatus(commitment)
        Ctrl-->>FE: {timestamp, exists, matured, expired}
    end

    Note over User,FE: Step 6 — Register
    User->>FE: Click "Register"
    FE->>Ctrl: register(name, owner, duration, secret, resolverAddr, reverseRecord, maxCost)

    Ctrl->>Ctrl: _validateCommitment(commitment)
    Note right of Ctrl: Checks: exists, ≥60s, ≤24h, not used
    Ctrl->>Ctrl: usedCommitments[commitment] = true

    Ctrl->>Ctrl: _validName(name)
    Ctrl->>Ctrl: approvedResolvers[resolverAddr] check

    Ctrl->>Oracle: price(name, nameExpires[id], duration)
    Oracle-->>Ctrl: Price{base, premium}
    Ctrl->>Ctrl: require(cost ≤ maxCost)

    Ctrl->>USDC: safeTransferFrom(user, treasury, cost)
    USDC-->>Ctrl: ok

    Ctrl->>Base: registerWithResolver(tokenId, owner, duration, resolverAddr)
    Base->>Base: nameExpires[tokenId] = block.timestamp + duration
    Base->>Base: _mint(owner, tokenId)
    Base->>Reg: setSubnodeRecord(baseNode, label, owner, resolverAddr, 0)
    Reg-->>Base: ok
    Base-->>Ctrl: expires

    Ctrl->>Res: setAddr(nodehash, owner)
    Note right of Res: CONTROLLER_ROLE allows this
    Res-->>Ctrl: AddrChanged event

    alt reverseRecord == true
        Ctrl->>RevReg: _setReverseRecord(name, resolverAddr, owner)
        RevReg->>Reg: setSubnodeRecord(ADDR_REVERSE_NODE, label, owner, resolverAddr, 0)
        RevReg->>Res: setName(reverseNode, fullName)
        Note right of Ctrl: Wrapped in try/catch — failure does NOT revert registration
    end

    Ctrl-->>FE: NameRegistered event
    FE-->>User: "alice.arc registered!"
```

---

## 2. Renewal Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant USDC as USDC ERC-20
    participant Ctrl as ArcNSController
    participant Oracle as ArcNSPriceOracle
    participant Base as ArcNSBaseRegistrar

    User->>FE: Click "Renew" on alice.arc
    FE->>Ctrl: rentPrice(name, duration)
    Ctrl->>Oracle: price(name, nameExpires[id], duration)
    Oracle-->>Ctrl: Price{base, premium=0}
    Ctrl-->>FE: cost

    FE->>USDC: approve(controller, cost + slippage)
    USDC-->>FE: tx confirmed

    User->>FE: Confirm renewal
    FE->>Ctrl: renew(name, duration, maxCost)

    Ctrl->>Oracle: price(name, nameExpires[id], duration)
    Oracle-->>Ctrl: Price{base, premium}
    Ctrl->>Ctrl: require(cost ≤ maxCost)

    Ctrl->>USDC: safeTransferFrom(user, treasury, cost)
    USDC-->>Ctrl: ok

    Ctrl->>Base: renew(tokenId, duration)
    Note right of Base: nameExpires[id] += duration (extends from current expiry)
    Base-->>Ctrl: new expires

    Ctrl-->>FE: NameRenewed event
    FE-->>User: "Renewed until [date]"
```

---

## 3. Forward Resolution Flow

```mermaid
sequenceDiagram
    actor Caller
    participant FE as Frontend / dApp
    participant Reg as ArcNSRegistry
    participant Res as ArcNSResolver

    Caller->>FE: Resolve "alice.arc"
    FE->>FE: node = namehash("alice.arc")
    FE->>Reg: resolver(node)
    Reg-->>FE: resolverAddress
    FE->>Res: addr(node)
    Res-->>FE: 0xAliceAddress
    FE-->>Caller: 0xAliceAddress
```

---

## 4a. Reverse Resolution — Registration-Time (reverseRecord = true)

```mermaid
sequenceDiagram
    participant Ctrl as ArcNSController
    participant Reg as ArcNSRegistry
    participant Res as ArcNSResolver

    Note over Ctrl: Inside register(), after NFT mint and addr set
    Ctrl->>Ctrl: _setReverseRecord(name, resolverAddr, owner)
    Note right of Ctrl: Wrapped in try/catch

    Ctrl->>Reg: setSubnodeRecord(ADDR_REVERSE_NODE, sha3hex(owner), owner, resolverAddr, 0)
    Reg-->>Ctrl: ReverseClaimed (via ReverseRegistrar)

    Ctrl->>Res: setName(reverseNode, "alice.arc")
    Res-->>Ctrl: NameChanged event

    Note over Ctrl: If any step above throws, it is silently swallowed
    Note over Ctrl: Registration succeeds regardless
```

---

## 4b. Reverse Resolution — Dashboard-Driven (setName)

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant RevReg as ArcNSReverseRegistrar
    participant Reg as ArcNSRegistry
    participant Res as ArcNSResolver

    User->>FE: Select "alice.arc" as primary name (My Domains page)
    FE->>FE: Verify user owns alice.arc and it is not expired
    User->>FE: Confirm

    FE->>RevReg: setName("alice.arc")

    RevReg->>RevReg: label = sha3HexAddress(msg.sender)
    RevReg->>RevReg: reverseNode = keccak256(ADDR_REVERSE_NODE, label)

    RevReg->>Reg: setSubnodeRecord(ADDR_REVERSE_NODE, label, msg.sender, defaultResolver, 0)
    Reg-->>RevReg: ok

    RevReg->>Res: setName(reverseNode, "alice.arc")
    Res-->>RevReg: NameChanged event

    RevReg-->>FE: ReverseClaimed event, reverseNode
    FE-->>User: Primary name updated to "alice.arc"
```

---

## 4c. Reverse Lookup — Reading Primary Name

```mermaid
sequenceDiagram
    actor Caller
    participant FE as Frontend
    participant RevReg as ArcNSReverseRegistrar
    participant Reg as ArcNSRegistry
    participant Res as ArcNSResolver
    participant Base as ArcNSBaseRegistrar

    Caller->>FE: Look up primary name for 0xAlice
    FE->>RevReg: node(0xAlice)
    RevReg-->>FE: reverseNode

    FE->>Reg: resolver(reverseNode)
    Reg-->>FE: resolverAddress

    FE->>Res: name(reverseNode)
    Res-->>FE: "alice.arc"

    Note over FE: Three-state check
    FE->>FE: node = namehash("alice.arc")
    FE->>Res: addr(node)
    Res-->>FE: resolvedAddr

    alt resolvedAddr == 0xAlice
        FE-->>Caller: Primary name: "alice.arc" (verified)
    else resolvedAddr != 0xAlice
        FE-->>Caller: Primary name: "alice.arc" (STALE — name no longer points to this address)
    end
```

---

## 5. UUPS Upgrade Flow (Controller or Resolver)

```mermaid
sequenceDiagram
    actor Admin
    participant Script as Deploy Script
    participant Proxy as UUPS Proxy
    participant OldImpl as Old Implementation
    participant NewImpl as New Implementation
    participant DeployJSON as deployments/arc_testnet-v3.json

    Admin->>Script: Run upgrade script
    Script->>NewImpl: Deploy new implementation contract
    NewImpl-->>Script: newImplAddress

    Script->>Proxy: upgradeToAndCall(newImplAddress, initData)
    Note right of Proxy: Calls _authorizeUpgrade on current impl
    Proxy->>OldImpl: _authorizeUpgrade(newImplAddress)
    Note right of OldImpl: Reverts if caller lacks UPGRADER_ROLE
    OldImpl-->>Proxy: ok

    Proxy->>Proxy: ERC1967 implementation slot updated
    Proxy-->>Script: Upgraded event

    Script->>DeployJSON: Append upgrade entry {timestamp, oldImpl, newImpl, description}
    Script-->>Admin: Upgrade complete
```
