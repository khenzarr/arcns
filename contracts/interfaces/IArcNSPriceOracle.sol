// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSPriceOracle
/// @notice Returns registration/renewal prices in USDC (6 decimals)
interface IArcNSPriceOracle {
    struct Price {
        uint256 base;    // base price in USDC (6 decimals)
        uint256 premium; // premium price (e.g. for short names)
    }

    /// @notice Returns price for registering/renewing a name
    /// @param name The plaintext label (e.g. "alice")
    /// @param expires Current expiry timestamp (0 if new)
    /// @param duration Registration duration in seconds
    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (Price memory);
}
