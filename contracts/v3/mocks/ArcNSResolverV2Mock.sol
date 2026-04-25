// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../resolver/ArcNSResolver.sol";

/// @notice Mock v2 resolver for upgrade testing only
contract ArcNSResolverV2Mock is ArcNSResolver {
    /// @notice Returns the mock version string — used to verify upgrade succeeded
    function version() external pure returns (string memory) {
        return "v2";
    }
}
