// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSPriceOracle
/// @notice Returns registration/renewal prices in USDC (6 decimals)
interface IArcNSPriceOracle {
    /// @notice Price breakdown for a registration or renewal
    struct Price {
        uint256 base;    // base price in USDC (6 decimals)
        uint256 premium; // premium for recently expired names (linear decay)
    }

    /// @notice Returns the price for registering or renewing a name
    /// @param name The plaintext label (e.g. "alice")
    /// @param expires Current expiry timestamp (0 if new name, never registered)
    /// @param duration Registration duration in seconds
    /// @return Price struct with base and premium components
    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (Price memory);
}
