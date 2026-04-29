// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IArcNSRegistry.sol";

/// @title ArcNSRegistry
/// @notice Central ownership ledger for Arc Name Service — implements EIP-137 pattern
/// @dev Non-upgradeable. Root node (bytes32(0)) is owned by the deployer at construction.
///      Authorization is node-based: only the current owner of a node (or an approved operator)
///      may write to it.
contract ArcNSRegistry is IArcNSRegistry {
    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when the caller is not authorised to modify a node
    error NotAuthorised();

    /// @notice Thrown when a zero address is provided where one is not allowed
    error ZeroAddress();

    // ─── Storage ──────────────────────────────────────────────────────────────

    struct Record {
        address owner;
        address resolver;
        uint64  ttl;
    }

    /// @dev namehash → Record
    mapping(bytes32 => Record) private _records;

    /// @dev owner → operator → approved
    mapping(address => mapping(address => bool)) private _operators;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier authorised(bytes32 node) {
        address o = _records[node].owner;
        if (o != msg.sender && !_operators[o][msg.sender]) revert NotAuthorised();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        _records[bytes32(0)].owner = msg.sender;
        emit Transfer(bytes32(0), msg.sender);
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    /// @notice Sets the owner, resolver, and TTL for a node atomically
    /// @param node The node to update
    /// @param owner_ The new owner address
    /// @param resolver_ The new resolver address
    /// @param ttl_ The new TTL value
    function setRecord(
        bytes32 node,
        address owner_,
        address resolver_,
        uint64  ttl_
    ) external override authorised(node) {
        _setOwner(node, owner_);
        _setResolverAndTTL(node, resolver_, ttl_);
    }

    /// @notice Creates or updates a subnode, setting owner, resolver, and TTL atomically
    /// @param node The parent node
    /// @param label The label hash of the subnode
    /// @param owner_ The new owner of the subnode
    /// @param resolver_ The resolver for the subnode
    /// @param ttl_ The TTL for the subnode
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner_,
        address resolver_,
        uint64  ttl_
    ) external override authorised(node) {
        bytes32 subnode = _setSubnodeOwner(node, label, owner_);
        _setResolverAndTTL(subnode, resolver_, ttl_);
    }

    /// @notice Creates or updates a subnode, returning the subnode hash
    /// @param node The parent node
    /// @param label The label hash of the subnode
    /// @param owner_ The new owner of the subnode
    /// @return The subnode hash
    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner_
    ) external override authorised(node) returns (bytes32) {
        return _setSubnodeOwner(node, label, owner_);
    }

    /// @notice Sets the resolver for a node
    /// @param node The node to update
    /// @param resolver_ The new resolver address
    function setResolver(bytes32 node, address resolver_) external override authorised(node) {
        _records[node].resolver = resolver_;
        emit NewResolver(node, resolver_);
    }

    /// @notice Transfers ownership of a node
    /// @dev Setting owner_ to address(0) is the canonical "burn" operation — it permanently
    ///      locks the node. After burning: recordExists() returns false, the zero address
    ///      cannot satisfy the authorised() modifier, and no further writes are possible.
    ///      This matches ENS mainnet behavior and is intentional. There is no zero-address
    ///      guard here by design.
    /// @param node The node to transfer
    /// @param owner_ The new owner address (address(0) burns the node permanently)
    function setOwner(bytes32 node, address owner_) external override authorised(node) {
        _setOwner(node, owner_);
    }

    /// @notice Sets the TTL for a node
    /// @param node The node to update
    /// @param ttl_ The new TTL value
    function setTTL(bytes32 node, uint64 ttl_) external override authorised(node) {
        _records[node].ttl = ttl_;
        emit NewTTL(node, ttl_);
    }

    /// @notice Enables or disables approval for an operator to manage all of the caller's nodes
    /// @param operator The operator address
    /// @param approved Whether to approve or revoke
    function setApprovalForAll(address operator, bool approved) external override {
        _operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    /// @notice Returns the owner of a node
    /// @param node The node to query
    /// @return The owner address
    function owner(bytes32 node) external view override returns (address) {
        return _records[node].owner;
    }

    /// @notice Returns the resolver for a node
    /// @param node The node to query
    /// @return The resolver address
    function resolver(bytes32 node) external view override returns (address) {
        return _records[node].resolver;
    }

    /// @notice Returns the TTL for a node
    /// @param node The node to query
    /// @return The TTL value
    function ttl(bytes32 node) external view override returns (uint64) {
        return _records[node].ttl;
    }

    /// @notice Returns whether a record exists for a node
    /// @param node The node to query
    /// @return True if the node has a non-zero owner
    function recordExists(bytes32 node) external view override returns (bool) {
        return _records[node].owner != address(0);
    }

    /// @notice Returns whether an operator is approved for an owner
    /// @param owner_ The owner address
    /// @param operator The operator address
    /// @return True if approved
    function isApprovedForAll(address owner_, address operator) external view override returns (bool) {
        return _operators[owner_][operator];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _setOwner(bytes32 node, address owner_) internal {
        // NOTE: owner_ == address(0) is intentionally allowed — it is the canonical
        // "burn" operation that permanently locks a node. This matches ENS mainnet
        // behavior. recordExists() returns false for burned nodes, and the zero address
        // cannot satisfy the authorised() modifier, making the node permanently immutable.
        _records[node].owner = owner_;
        emit Transfer(node, owner_);
    }

    function _setResolverAndTTL(bytes32 node, address resolver_, uint64 ttl_) internal {
        if (resolver_ != _records[node].resolver) {
            _records[node].resolver = resolver_;
            emit NewResolver(node, resolver_);
        }
        if (ttl_ != _records[node].ttl) {
            _records[node].ttl = ttl_;
            emit NewTTL(node, ttl_);
        }
    }

    function _setSubnodeOwner(bytes32 node, bytes32 label, address owner_) internal returns (bytes32) {
        bytes32 subnode = keccak256(abi.encodePacked(node, label));
        _setOwner(subnode, owner_);
        emit NewOwner(node, label, owner_);
        return subnode;
    }
}
