// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title ArcNSTimelock
 * @notice Minimal wrapper around OZ TimelockController so Hardhat emits a
 *         local artifact that deployTimelock.js can reference by fully-
 *         qualified name.
 *
 * No logic is added. All behaviour comes from TimelockController.
 *
 * Constructor parameters mirror TimelockController v5:
 *   minDelay   — minimum delay in seconds before an operation can execute
 *   proposers  — accounts that can schedule operations
 *   executors  — accounts that can execute operations after the delay
 *   admin      — optional admin; pass address(0) for self-administered
 */
contract ArcNSTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
