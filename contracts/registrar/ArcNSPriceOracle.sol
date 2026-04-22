// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSPriceOracle.sol";

/// @title ArcNSPriceOracle
/// @notice USDC-denominated pricing for ArcNS registrations (6 decimal places)
/// @dev Pricing tiers based on name length; owner can update prices
contract ArcNSPriceOracle is IArcNSPriceOracle, Ownable {
    // Annual prices in USDC (6 decimals)
    // e.g. 5_000_000 = $5.00 USDC per year
    uint256 public price1Char  = 640_000_000; // $640/yr  — 1 char
    uint256 public price2Char  = 160_000_000; // $160/yr  — 2 chars
    uint256 public price3Char  =  40_000_000; // $40/yr   — 3 chars
    uint256 public price4Char  =  10_000_000; // $10/yr   — 4 chars
    uint256 public price5Plus  =   2_000_000; // $2/yr    — 5+ chars

    event PricesUpdated(
        uint256 p1, uint256 p2, uint256 p3, uint256 p4, uint256 p5
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Update pricing tiers (owner only)
    function setPrices(
        uint256 p1,
        uint256 p2,
        uint256 p3,
        uint256 p4,
        uint256 p5
    ) external onlyOwner {
        price1Char = p1;
        price2Char = p2;
        price3Char = p3;
        price4Char = p4;
        price5Plus = p5;
        emit PricesUpdated(p1, p2, p3, p4, p5);
    }

    /// @inheritdoc IArcNSPriceOracle
    function price(
        string calldata name_,
        uint256 /*expires*/,
        uint256 duration
    ) external view override returns (Price memory) {
        uint256 len = _strlen(name_);
        uint256 annualPrice;

        if      (len == 1) annualPrice = price1Char;
        else if (len == 2) annualPrice = price2Char;
        else if (len == 3) annualPrice = price3Char;
        else if (len == 4) annualPrice = price4Char;
        else               annualPrice = price5Plus;

        // Pro-rate: price * duration / 365 days
        uint256 base = (annualPrice * duration) / 365 days;

        return Price({ base: base, premium: 0 });
    }

    /// @dev Count UTF-8 characters (simplified: counts bytes for ASCII names)
    function _strlen(string memory s) internal pure returns (uint256) {
        uint256 len;
        uint256 i = 0;
        uint256 bytelength = bytes(s).length;
        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if      (b < 0x80)                 i += 1;
            else if (b < 0xE0)                 i += 2;
            else if (b < 0xF0)                 i += 3;
            else                               i += 4;
        }
        return len;
    }
}
