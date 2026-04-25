// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSResolver
/// @notice Interface for the ArcNS Resolver — implements EIP-137 pattern for record resolution
interface IArcNSResolver {
    /// @notice Sets the EVM address record for a node (coin type 60)
    /// @param node The namehash of the node
    /// @param a The EVM address to associate with the node
    function setAddr(bytes32 node, address a) external;

    /// @notice Returns the EVM address record for a node (coin type 60)
    /// @param node The namehash of the node
    /// @return The EVM address associated with the node
    function addr(bytes32 node) external view returns (address payable);

    /// @notice Sets the name record for a node — internal use only via CONTROLLER_ROLE
    /// @dev Not part of the v1 public interface. Used exclusively by ReverseRegistrar.
    /// @param node The namehash of the node
    /// @param name_ The name string to store
    function setName(bytes32 node, string calldata name_) external;

    /// @notice Returns the name record for a node — used for reverse resolution
    /// @param node The namehash of the node
    /// @return The name string associated with the node
    function name(bytes32 node) external view returns (string memory);

    /// @notice Grants or revokes CONTROLLER_ROLE for an address
    /// @param controller The address to grant or revoke
    /// @param trusted Whether to grant (true) or revoke (false)
    function setController(address controller, bool trusted) external;
}
