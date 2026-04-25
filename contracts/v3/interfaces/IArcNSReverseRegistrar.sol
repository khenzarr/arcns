// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSReverseRegistrar
/// @notice Interface for the ArcNS Reverse Registrar — manages addr.reverse records
interface IArcNSReverseRegistrar {
    /// @notice Sets the reverse record for an address — called by Controller at registration time
    /// @param addr_ The address to set the reverse record for
    /// @param name_ The full domain name (e.g. "alice.arc")
    function setReverseRecord(address addr_, string calldata name_) external;

    /// @notice Sets the primary name for the caller's address (dashboard-driven flow)
    /// @param name_ The full domain name to set as primary (e.g. "alice.arc")
    /// @return reverseNode The reverse node hash
    function setName(string calldata name_) external returns (bytes32);

    /// @notice Claims the reverse node for an address with a specific resolver
    /// @param addr_ The address to claim for
    /// @param owner_ The owner to assign to the reverse node
    /// @param resolver_ The resolver to assign to the reverse node
    /// @return The reverse node hash
    function claimWithResolver(address addr_, address owner_, address resolver_) external returns (bytes32);

    /// @notice Returns the reverse node hash for an address
    /// @param addr_ The address to compute the reverse node for
    /// @return The reverse node hash
    function node(address addr_) external pure returns (bytes32);
}
