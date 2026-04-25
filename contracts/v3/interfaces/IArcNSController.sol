// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IArcNSPriceOracle.sol";

/// @title IArcNSController
/// @notice Interface for the ArcNS Controller — commit-reveal registration and renewal
interface IArcNSController {
    /// @notice Submits a commitment hash to begin the commit-reveal flow
    /// @param commitment The commitment hash (from makeCommitment)
    function commit(bytes32 commitment) external;

    /// @notice Registers a name after a valid commitment has matured
    /// @param name_ The plaintext label to register
    /// @param owner_ The address that will own the name
    /// @param duration Registration duration in seconds
    /// @param secret The secret used in the commitment
    /// @param resolverAddr The resolver address (address(0) to skip resolver setup)
    /// @param reverseRecord Whether to set a reverse record for owner_
    /// @param maxCost Maximum USDC cost the caller is willing to pay (6 decimals)
    function register(
        string calldata name_,
        address owner_,
        uint256 duration,
        bytes32 secret,
        address resolverAddr,
        bool reverseRecord,
        uint256 maxCost
    ) external;

    /// @notice Renews an existing name
    /// @param name_ The plaintext label to renew
    /// @param duration Additional duration in seconds
    /// @param maxCost Maximum USDC cost the caller is willing to pay (6 decimals)
    function renew(string calldata name_, uint256 duration, uint256 maxCost) external;

    /// @notice Returns the rent price for a name and duration
    /// @param name_ The plaintext label
    /// @param duration Duration in seconds
    /// @return Price struct with base and premium components
    function rentPrice(string memory name_, uint256 duration) external view returns (IArcNSPriceOracle.Price memory);

    /// @notice Returns whether a name is available for registration
    /// @param name_ The plaintext label
    /// @return True if the name is valid and available
    function available(string memory name_) external view returns (bool);

    /// @notice Computes the commitment hash binding to a specific sender
    /// @param name_ The plaintext label
    /// @param owner_ The intended owner
    /// @param duration Registration duration in seconds
    /// @param secret The secret value
    /// @param resolverAddr The resolver address
    /// @param reverseRecord Whether to set a reverse record
    /// @param sender The sender address (pass msg.sender from the frontend)
    /// @return The commitment hash
    function makeCommitment(
        string memory name_,
        address owner_,
        uint256 duration,
        bytes32 secret,
        address resolverAddr,
        bool reverseRecord,
        address sender
    ) external pure returns (bytes32);

    /// @notice Returns the status of a commitment
    /// @param commitment The commitment hash
    /// @return timestamp When the commitment was made (0 if not found)
    /// @return exists Whether the commitment exists
    /// @return matured Whether MIN_COMMITMENT_AGE has passed
    /// @return expired_ Whether MAX_COMMITMENT_AGE has passed
    function getCommitmentStatus(bytes32 commitment) external view returns (
        uint256 timestamp,
        bool exists,
        bool matured,
        bool expired_
    );
}
