// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IArcNSPriceOracle.sol";

/// @title ArcNSPriceOracleV2
/// @notice USDC-denominated pricing with premium decay for recently expired names
/// @dev Phase 14: length-based tiers + exponential premium decay over 28 days
contract ArcNSPriceOracleV2 is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IArcNSPriceOracle
{
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Annual base prices in USDC (6 decimals) — Phase 20 pricing model
    uint256 public price1Char;  // $49.99/yr
    uint256 public price2Char;  // $24.99/yr
    uint256 public price3Char;  // $14.99/yr
    uint256 public price4Char;  //  $9.99/yr
    uint256 public price5Plus;  //  $1.99/yr

    // Premium decay: starts at PREMIUM_START_PRICE, decays to 0 over PREMIUM_DECAY_PERIOD
    uint256 public constant PREMIUM_START_PRICE  = 100_000_000; // $100 USDC
    uint256 public constant PREMIUM_DECAY_PERIOD = 28 days;

    event PricesUpdated(uint256 p1, uint256 p2, uint256 p3, uint256 p4, uint256 p5);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address _admin) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,    _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Phase 20: deterministic pricing model (USDC, 6 decimals)
        price1Char = 49_990_000;  // $49.99/yr
        price2Char = 24_990_000;  // $24.99/yr
        price3Char = 14_990_000;  // $14.99/yr
        price4Char =  9_990_000;  //  $9.99/yr
        price5Plus =  1_990_000;  //  $1.99/yr
    }

    function setPrices(
        uint256 p1, uint256 p2, uint256 p3, uint256 p4, uint256 p5
    ) external onlyRole(ADMIN_ROLE) {
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
        uint256 expires,
        uint256 duration
    ) external view override returns (Price memory) {
        uint256 len = _strlen(name_);
        uint256 annualPrice;

        if      (len == 1) annualPrice = price1Char;
        else if (len == 2) annualPrice = price2Char;
        else if (len == 3) annualPrice = price3Char;
        else if (len == 4) annualPrice = price4Char;
        else               annualPrice = price5Plus;

        uint256 base_ = (annualPrice * duration) / 365 days;
        uint256 premium_ = _premium(expires);

        return Price({ base: base_, premium: premium_ });
    }

    /// @notice Returns the current premium for a name that recently expired
    /// @dev Linear decay from PREMIUM_START_PRICE to 0 over PREMIUM_DECAY_PERIOD
    function _premium(uint256 expires) internal view returns (uint256) {
        if (expires == 0) return 0; // new name, no premium
        if (expires > block.timestamp) return 0; // not expired yet

        uint256 elapsed = block.timestamp - expires;
        if (elapsed >= PREMIUM_DECAY_PERIOD) return 0;

        // Linear decay: premium = START * (1 - elapsed/PERIOD)
        return PREMIUM_START_PRICE * (PREMIUM_DECAY_PERIOD - elapsed) / PREMIUM_DECAY_PERIOD;
    }

    function _strlen(string memory s) internal pure returns (uint256) {
        uint256 len;
        uint256 i = 0;
        uint256 bytelength = bytes(s).length;
        for (len = 0; i < bytelength; len++) {
            bytes1 b = bytes(s)[i];
            if      (b < 0x80) i += 1;
            else if (b < 0xE0) i += 2;
            else if (b < 0xF0) i += 3;
            else               i += 4;
        }
        return len;
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(bytes4 interfaceID) public view override returns (bool) {
        return super.supportsInterface(interfaceID);
    }
}
