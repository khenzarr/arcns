// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Minimal ERC-20 mock for testing — 6 decimals, symbol USDC
/// @dev For test environments only. Not for production use.
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    /// @notice Returns 6 decimals to match real USDC
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mints tokens to any address — for test setup only
    /// @param to The recipient address
    /// @param amount The amount to mint (6 decimals)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
