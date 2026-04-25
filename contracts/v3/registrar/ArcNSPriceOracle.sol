// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSPriceOracle.sol";

/// @title ArcNSPriceOracle
/// @notice USDC-denominated pricing with linear premium decay for recently expired names
/// @dev Non-upgradeable. Price changes are made via setPrices() by the owner.
///      Implements length-based annual pricing tiers (Unicode codepoint count).
contract ArcNSPriceOracle is Ownable, IArcNSPriceOracle {
    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when duration is zero
    error ZeroDuration();

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when prices are updated
    event PricesUpdated(uint256 p1, uint256 p2, uint256 p3, uint256 p4, uint256 p5);

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice Annual price for 1-character names in USDC (6 decimals) — 50 USDC/year
    uint256 public price1Char = 50_000_000;

    /// @notice Annual price for 2-character names in USDC (6 decimals) — 25 USDC/year
    uint256 public price2Char = 25_000_000;

    /// @notice Annual price for 3-character names in USDC (6 decimals) — 15 USDC/year
    uint256 public price3Char = 15_000_000;

    /// @notice Annual price for 4-character names in USDC (6 decimals) — 10 USDC/year
    uint256 public price4Char = 10_000_000;

    /// @notice Annual price for 5+ character names in USDC (6 decimals) — 2 USDC/year
    uint256 public price5Plus =  2_000_000;

    /// @notice Starting premium at the moment of expiry — 100 USDC
    uint256 public constant PREMIUM_START = 100_000_000;

    /// @notice Duration over which the premium decays linearly to zero — 28 days
    uint256 public constant PREMIUM_DECAY_PERIOD = 28 days;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ─── External ─────────────────────────────────────────────────────────────

    /// @notice Returns the price for registering or renewing a name
    /// @param name The plaintext label (e.g. "alice") — Unicode codepoint count used for tier
    /// @param expires Current expiry timestamp (0 if new name, never registered)
    /// @param duration Registration duration in seconds
    /// @return Price struct with base and premium components
    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (Price memory) {
        if (duration == 0) revert ZeroDuration();

        uint256 len = _strlen(name);
        uint256 annualPrice;

        if      (len == 1) annualPrice = price1Char;
        else if (len == 2) annualPrice = price2Char;
        else if (len == 3) annualPrice = price3Char;
        else if (len == 4) annualPrice = price4Char;
        else               annualPrice = price5Plus;

        uint256 base_ = annualPrice * duration / 365 days;
        uint256 premium_ = _premium(expires);

        return Price({ base: base_, premium: premium_ });
    }

    /// @notice Updates the annual price tiers
    /// @param p1 Annual price for 1-character names (USDC, 6 decimals)
    /// @param p2 Annual price for 2-character names (USDC, 6 decimals)
    /// @param p3 Annual price for 3-character names (USDC, 6 decimals)
    /// @param p4 Annual price for 4-character names (USDC, 6 decimals)
    /// @param p5 Annual price for 5+ character names (USDC, 6 decimals)
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

    // ─── Internal ─────────────────────────────────────────────────────────────

    /// @notice Counts Unicode codepoints in a UTF-8 encoded string
    /// @param s The UTF-8 string to measure
    /// @return len The number of Unicode codepoints
    function _strlen(string memory s) internal pure returns (uint256 len) {
        uint256 i = 0;
        uint256 byteLen = bytes(s).length;
        while (i < byteLen) {
            bytes1 b = bytes(s)[i];
            if      (b < 0x80) i += 1;
            else if (b < 0xE0) i += 2;
            else if (b < 0xF0) i += 3;
            else               i += 4;
            len++;
        }
    }

    /// @notice Computes the premium for a recently expired name
    /// @dev Linear decay: PREMIUM_START at expiry, 0 at expiry + PREMIUM_DECAY_PERIOD
    /// @param expires The expiry timestamp of the name (0 = new name, never registered)
    /// @return The premium amount in USDC (6 decimals)
    function _premium(uint256 expires) internal view returns (uint256) {
        if (expires == 0) return 0;                    // new name — no premium
        if (expires > block.timestamp) return 0;       // not yet expired — no premium

        uint256 elapsed = block.timestamp - expires;
        if (elapsed >= PREMIUM_DECAY_PERIOD) return 0; // fully decayed

        return PREMIUM_START * (PREMIUM_DECAY_PERIOD - elapsed) / PREMIUM_DECAY_PERIOD;
    }
}
