// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IArcNSBaseRegistrar.sol";

/// @title IArcNSBaseRegistrarV2
/// @notice Label-aware registrar interface used by the mainnet metadata migration.
interface IArcNSBaseRegistrarV2 is IArcNSBaseRegistrar {
    function metadataVersion() external pure returns (uint256);

    function labelOf(uint256 id) external view returns (string memory);

    function registerWithLabel(
        uint256 id,
        string calldata label,
        address owner_,
        uint256 duration
    ) external returns (uint256);

    function registerWithResolverAndLabel(
        uint256 id,
        string calldata label,
        address owner_,
        uint256 duration,
        address resolver_
    ) external returns (uint256);
}
