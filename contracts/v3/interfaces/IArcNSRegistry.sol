// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSRegistry
/// @notice Core registry interface — implements EIP-137 pattern
interface IArcNSRegistry {
    /// @notice Emitted when a node's owner changes via setSubnodeOwner or setSubnodeRecord
    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);

    /// @notice Emitted when a node's owner changes via setOwner or setRecord
    event Transfer(bytes32 indexed node, address owner);

    /// @notice Emitted when a node's resolver changes
    event NewResolver(bytes32 indexed node, address resolver);

    /// @notice Emitted when a node's TTL changes
    event NewTTL(bytes32 indexed node, uint64 ttl);

    /// @notice Emitted when an operator approval changes
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /// @notice Sets the owner, resolver, and TTL for a node atomically
    /// @param node The node to update
    /// @param owner_ The new owner address
    /// @param resolver_ The new resolver address
    /// @param ttl_ The new TTL value
    function setRecord(bytes32 node, address owner_, address resolver_, uint64 ttl_) external;

    /// @notice Creates or updates a subnode, setting owner, resolver, and TTL atomically
    /// @param node The parent node
    /// @param label The label hash of the subnode
    /// @param owner_ The new owner of the subnode
    /// @param resolver_ The resolver for the subnode
    /// @param ttl_ The TTL for the subnode
    function setSubnodeRecord(bytes32 node, bytes32 label, address owner_, address resolver_, uint64 ttl_) external;

    /// @notice Creates or updates a subnode, returning the subnode hash
    /// @param node The parent node
    /// @param label The label hash of the subnode
    /// @param owner_ The new owner of the subnode
    /// @return The subnode hash
    function setSubnodeOwner(bytes32 node, bytes32 label, address owner_) external returns (bytes32);

    /// @notice Sets the resolver for a node
    /// @param node The node to update
    /// @param resolver_ The new resolver address
    function setResolver(bytes32 node, address resolver_) external;

    /// @notice Transfers ownership of a node
    /// @param node The node to transfer
    /// @param owner_ The new owner address
    function setOwner(bytes32 node, address owner_) external;

    /// @notice Sets the TTL for a node
    /// @param node The node to update
    /// @param ttl_ The new TTL value
    function setTTL(bytes32 node, uint64 ttl_) external;

    /// @notice Enables or disables approval for an operator to manage all of the caller's nodes
    /// @param operator The operator address
    /// @param approved Whether to approve or revoke
    function setApprovalForAll(address operator, bool approved) external;

    /// @notice Returns the owner of a node
    /// @param node The node to query
    /// @return The owner address
    function owner(bytes32 node) external view returns (address);

    /// @notice Returns the resolver for a node
    /// @param node The node to query
    /// @return The resolver address
    function resolver(bytes32 node) external view returns (address);

    /// @notice Returns the TTL for a node
    /// @param node The node to query
    /// @return The TTL value
    function ttl(bytes32 node) external view returns (uint64);

    /// @notice Returns whether a record exists for a node
    /// @param node The node to query
    /// @return True if the node has a non-zero owner
    function recordExists(bytes32 node) external view returns (bool);

    /// @notice Returns whether an operator is approved for an owner
    /// @param owner_ The owner address
    /// @param operator The operator address
    /// @return True if approved
    function isApprovedForAll(address owner_, address operator) external view returns (bool);
}
