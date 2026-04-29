# ArcNS v3 — Intentional Design Decisions

**Purpose:** This document preempts audit findings that may appear anomalous but reflect deliberate protocol design choices. Each entry explains the behavior, the rationale, and why it is not a defect.

---

## 1. Primary Name and Receiving Address Model

### Behavior

ArcNS maintains two independent ownership surfaces for each registered domain:

1. **NFT ownership** (ERC-721, tracked by `ArcNSBaseRegistrar`): Represents the right to control the domain — transfer, renew, and reclaim registry ownership.
2. **Registry ownership** (tracked by `ArcNSRegistry`): Controls which resolver is used and who can write records for the node.

These two surfaces can diverge. The NFT owner and the registry node owner are not required to be the same address.

Additionally, the resolver stores an **addr record** (the "receiving address") for each name. This is the address that the name resolves to. It is set at registration time by the Controller and can be updated by the node owner or an approved operator.

### Rationale

This three-layer model (NFT owner / registry node owner / addr record) is inherited from the ENS architecture and is intentional. It enables:

- **Delegated resolver management**: An NFT owner can point the registry node to a smart contract (e.g., a multisig or a resolver manager) while retaining NFT ownership in their EOA.
- **Separation of transfer and resolution**: Transferring the NFT does not automatically update the addr record. The new owner must call `reclaim` and then update the addr record if desired.
- **Burn semantics**: An NFT owner can call `reclaim(id, address(0))` to permanently lock the registry node while keeping the NFT.

### Expected Behavior

- `reclaim(id, owner_)` sets the registry node owner to `owner_`, which does not need to match the NFT owner. This is correct by design.
- After an NFT transfer, the addr record continues to point to the previous owner's address until explicitly updated. This is correct by design.
- The `setName` flow (dashboard-driven primary name) operates on the reverse registrar, which is independent of the forward resolution addr record.

---

## 2. `setReverseRecord` — Open Caller Design

### Behavior

`ArcNSReverseRegistrar.setReverseRecord(address addr_, string calldata name_)` has no caller authorization check. Any address can call it for any `addr_`.

### Rationale

This function is designed to be called by the Controller inside a `try/catch` block at registration time. Its purpose is to set an advisory reverse record for the registrant at the moment of registration, as a convenience.

The effect of an unauthorized call is limited: it sets the `name` record in the Resolver for the reverse node of `addr_`. It does not change NFT ownership, registry node ownership, or the addr record. The reverse record is advisory — it is used for display purposes (e.g., showing a human-readable name in a wallet) but does not affect any security-critical protocol state.

The Controller wraps this call in `try/catch` precisely because failure must not block registration. If the call reverts (e.g., due to a missing `CONTROLLER_ROLE` on the Resolver), the registration still succeeds.

### Expected Behavior

- Any address can call `setReverseRecord` for any `addr_`. This is intentional.
- The worst-case effect of an unauthorized call is that the reverse record for `addr_` is set to an arbitrary name string. The legitimate owner of `addr_` can overwrite this at any time by calling `setName` directly.
- This function is not a general-purpose primary name setter. The canonical user-facing flow for setting a primary name is `setName`, which is self-restricted to `msg.sender`.

---

## 3. Registry Zero-Address Owner — Burn Semantics

### Behavior

`ArcNSRegistry._setOwner` does not reject `address(0)` as the new owner. Setting a node's owner to `address(0)` is permitted.

### Rationale

Setting a node's owner to `address(0)` is the canonical "burn" operation. After burning:

- `recordExists(node)` returns `false` (because `owner == address(0)`)
- The `authorised` modifier cannot be satisfied (the zero address cannot be `msg.sender`)
- No further writes to the node are possible
- The node is permanently immutable

This matches ENS mainnet behavior and is intentional. It provides a mechanism for permanently locking a node — for example, to signal that a TLD is frozen or that a name has been permanently retired.

### Expected Behavior

- Calling `setOwner(node, address(0))` permanently locks the node. This is a deliberate, irreversible action by the authorized node owner.
- There is no zero-address guard in `_setOwner` by design. The caller is always the authorized node owner (enforced by the `authorised` modifier), so this is a self-inflicted, intentional action.
- The `setResolver` function does accept `address(0)` as a valid resolver (clearing the resolver). This is also intentional — clearing a resolver is a valid operation.

---

## 4. BaseRegistrar `reclaim` — NFT Ownership vs. Registry Ownership Divergence

### Behavior

`ArcNSBaseRegistrar.reclaim(uint256 id, address owner_)` allows the NFT owner to set the registry node owner to any address, including one that differs from the NFT owner.

### Rationale

This divergence is intentional and matches ENS mainnet behavior. It enables:

- **Delegated resolver management**: The NFT owner can delegate registry control to a smart contract while retaining the NFT.
- **Multisig registry control**: An individual can hold the NFT in a personal wallet while pointing the registry node to a team multisig for record management.
- **Burn**: The NFT owner can call `reclaim(id, address(0))` to permanently lock the registry node.

The `reclaim` function requires the caller to be the NFT owner or an ERC-721 approved operator. It does not require `owner_` to equal the NFT owner.

### Expected Behavior

- After `reclaim(id, someContract)`, the registry node owner is `someContract`, but the NFT is still held by the original owner.
- The NFT owner can call `reclaim` again at any time to reassign registry ownership.
- This is not a privilege escalation — the NFT owner is always in control of the registry node via `reclaim`.

---

## 5. Underscore Allowance in Name Validation

### Behavior

`ArcNSController._validName` permits underscore (`_`, `0x5F`) as a valid character in name labels. Names like `my_name.arc` are valid and registerable.

### Rationale

ArcNS is not a DNS replacement. DNS compatibility is not a design goal. Underscores are common in usernames and handles, and permitting them improves usability for the target audience.

The specific character set permitted is: lowercase ASCII letters (`a–z`), decimal digits (`0–9`), hyphen (`-`), and underscore (`_`).

### Expected Behavior

- Names containing underscores resolve correctly on-chain via the standard namehash scheme.
- Standard DNS resolvers and ENS tooling will not resolve underscore names, because DNS does not permit underscores in hostnames. This is a known and accepted limitation.
- ArcNS-native tooling (frontend, subgraph, adapter) handles underscore names correctly.
- This is a naming policy choice, not a bug.

---

## 6. Double-Hyphen Rule — Partial IDNA Guard

### Behavior

`ArcNSController._validName` rejects names where positions 2 and 3 (0-indexed) are both hyphens (e.g., `xn--foo.arc`). It does not reject all double-hyphen patterns — for example, `a--b.arc` is valid.

### Rationale

The specific rule enforced is a partial IDNA/UTS46 guard targeting the ACE prefix (`xn--`) used for internationalized domain names. The intent is to block names that could be confused with IDNA-encoded names, not to enforce full IDNA compliance.

Full IDNA compliance is not a goal for ArcNS v1. The partial guard is sufficient to prevent the most common confusion vector.

### Expected Behavior

- Names with `--` at positions 2–3 (e.g., `xn--foo`, `ab--cd`) are rejected.
- Names with `--` at other positions (e.g., `a--b`, `foo--bar`) are valid.
- This is a documented, intentional partial guard.

---

## 7. Resolver ERC-165 — Selective Interface Advertisement

### Behavior

`ArcNSResolver.supportsInterface` returns `true` for exactly three interface IDs:
- `0x01ffc9a7` — `IERC165`
- `0x3b3b57de` — `IAddrResolver` (`addr(bytes32)`)
- `0x691f3431` — `INameResolver` (`name(bytes32)`)

All other ENS resolver interface IDs (text, contenthash, multicoin) return `false`.

### Rationale

The v1 Resolver implements only `addr` (coin type 60) and `name` (reverse resolution). Text records, contenthash, and multicoin addresses are reserved for future upgrades. Advertising interfaces that are not implemented would cause integrators to call functions that do not exist, resulting in confusing failures.

The selective advertisement is accurate and intentional. It correctly describes the v1 capability surface.

### Expected Behavior

- Integrators querying `supportsInterface(0x59d1d43c)` (ITextResolver) will receive `false`. This is correct — text records are not implemented in v1.
- The storage slots for text, contenthash, and multicoin records are allocated in the contract to ensure storage layout safety for future upgrades, but no public functions expose them in v1.

---

## 8. `ownerOf` Reverts on Expired Tokens

### Behavior

`ArcNSBaseRegistrar.ownerOf(uint256 tokenId)` reverts with `NameExpired` if the name has expired (i.e., `nameExpires[tokenId] <= block.timestamp`).

### Rationale

This is intentional. An expired name has no valid owner for the purposes of protocol operations. Returning the last registered owner for an expired name would create a false impression of active ownership and could mislead integrators into treating expired names as valid.

The revert behavior signals clearly that the name is not in an active state. Integrators must check `nameExpires[tokenId]` or `available(tokenId)` before calling `ownerOf`.

### Expected Behavior

- `ownerOf` reverts for expired names. This is correct by design.
- `_ownerOf` (internal, inherited from OZ ERC-721) does not revert and returns the last registered owner. This is used internally by `reclaim` and transfer functions.
- The 90-day grace period means a name is not immediately available for re-registration after expiry. During the grace period, `ownerOf` reverts but `available` returns `false`.

---

## 9. Commit-Reveal — Sender Binding

### Behavior

The commitment hash in `ArcNSController.makeCommitment` includes `sender` as a parameter. The `register` function recomputes the commitment using `msg.sender` as the sender, binding the commitment to the specific caller.

### Rationale

Without sender binding, a front-runner observing a pending `register` transaction could submit the same commitment and register the name before the legitimate user. Binding the commitment to `msg.sender` prevents this: a front-runner cannot use a commitment they did not create.

### Expected Behavior

- A commitment created by address A cannot be used by address B to register a name.
- The `makeCommitment` function is `public pure` so it can be called off-chain by the frontend to compute the commitment hash before submitting the `commit` transaction.
- This is a standard commit-reveal front-run protection pattern.

---

## 10. Storage-Based Reentrancy Guard

### Behavior

`ArcNSController` uses a custom storage-based reentrancy guard (`_reentrancyStatus`) rather than OpenZeppelin's `ReentrancyGuard`.

### Rationale

OpenZeppelin's `ReentrancyGuard` uses a specific storage slot. In a UUPS upgradeable contract with inherited storage from multiple OpenZeppelin upgradeable base contracts, using OZ's `ReentrancyGuard` directly risks storage slot collisions with the inherited layout. The custom storage-based guard uses a slot within the Controller's own declared storage layout, which is explicitly documented and controlled.

### Expected Behavior

- The guard is initialized to `_NOT_ENTERED` (value `1`) in `initialize`.
- It is set to `_ENTERED` (value `2`) at the start of `register` and `renew`, and reset to `_NOT_ENTERED` at the end.
- Reentrant calls revert with `ReentrantCall()`.

---

## 11. Reverse Record Failure Swallowing

### Behavior

In `ArcNSController.register`, the call to `reverseRegistrar.setReverseRecord` is wrapped in a `try/catch` block. If the reverse record call fails for any reason, the failure is silently swallowed and the registration proceeds.

### Rationale

The reverse record is advisory. Its absence does not affect name ownership, resolution, or any security-critical protocol state. If the reverse record call were to revert the entire registration, a misconfiguration in the ReverseRegistrar (e.g., a missing `CONTROLLER_ROLE` on the Resolver) would block all registrations — an unacceptable failure mode.

The `try/catch` ensures that registration is always the primary operation and reverse record setting is a best-effort convenience.

### Expected Behavior

- If `setReverseRecord` reverts, the registration still succeeds. The user's name is registered and payment is collected.
- The user can set their reverse record manually via `setName` on the ReverseRegistrar at any time.
- This behavior is documented in the contract NatDoc.

---

*End of ArcNS v3 Intentional Design Decisions*
