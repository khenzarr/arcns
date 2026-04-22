// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../interfaces/IArcNSRegistry.sol";

/// @title ArcNSRegistry
/// @notice Central registry for Arc Name Service — mirrors ENS Registry (EIP-137)
/// @dev Root node (0x00) is owned by deployer; TLD nodes assigned to registrars
contract ArcNSRegistry is IArcNSRegistry {
    struct Record {
        address owner;
        address resolver;
        uint64  ttl;
    }

    mapping(bytes32 => Record) private _records;
    mapping(address => mapping(address => bool)) private _operators;

    modifier authorised(bytes32 node) {
        address o = _records[node].owner;
        require(o == msg.sender || _operators[o][msg.sender], "ArcNS: not authorised");
        _;
    }

    constructor() {
        // Root node owned by deployer
        _records[0x0].owner = msg.sender;
    }

    // ─── Write ────────────────────────────────────────────────────────────────

    function setRecord(
        bytes32 node,
        address owner_,
        address resolver_,
        uint64  ttl_
    ) external override authorised(node) {
        _setOwner(node, owner_);
        _setResolverAndTTL(node, resolver_, ttl_);
    }

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

    function setSubnodeOwner(
        bytes32 node,
        bytes32 label,
        address owner_
    ) external override authorised(node) returns (bytes32) {
        return _setSubnodeOwner(node, label, owner_);
    }

    function setResolver(bytes32 node, address resolver_) external override authorised(node) {
        emit NewResolver(node, resolver_);
        _records[node].resolver = resolver_;
    }

    function setOwner(bytes32 node, address owner_) external override authorised(node) {
        _setOwner(node, owner_);
    }

    function setTTL(bytes32 node, uint64 ttl_) external override authorised(node) {
        emit NewTTL(node, ttl_);
        _records[node].ttl = ttl_;
    }

    function setApprovalForAll(address operator, bool approved) external override {
        _operators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ─── Read ─────────────────────────────────────────────────────────────────

    function owner(bytes32 node) external view override returns (address) {
        return _records[node].owner;
    }

    function resolver(bytes32 node) external view override returns (address) {
        return _records[node].resolver;
    }

    function ttl(bytes32 node) external view override returns (uint64) {
        return _records[node].ttl;
    }

    function recordExists(bytes32 node) external view override returns (bool) {
        return _records[node].owner != address(0);
    }

    function isApprovedForAll(address owner_, address operator) external view override returns (bool) {
        return _operators[owner_][operator];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _setOwner(bytes32 node, address owner_) internal {
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
