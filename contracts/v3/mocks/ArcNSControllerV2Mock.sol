// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../controller/ArcNSController.sol";

/// @notice Mock v2 controller for upgrade testing only
contract ArcNSControllerV2Mock is ArcNSController {
    /// @notice Returns the version string — used to verify upgrade succeeded
    function version() external pure returns (string memory) {
        return "v2";
    }
}
