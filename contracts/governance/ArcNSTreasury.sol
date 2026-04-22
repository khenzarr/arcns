// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title ArcNSTreasury
/// @notice Receives registration fees, controls fund distribution
/// @dev Phase 16: DAO-ready treasury with role-based withdrawal
contract ArcNSTreasury is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE      = keccak256("ADMIN_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");
    bytes32 public constant GOVERNOR_ROLE   = keccak256("GOVERNOR_ROLE");

    IERC20 public usdc;

    // Allocation percentages (basis points, 10000 = 100%)
    uint256 public constant PROTOCOL_BPS  = 7000; // 70% protocol
    uint256 public constant RESERVE_BPS   = 2000; // 20% reserve
    uint256 public constant COMMUNITY_BPS = 1000; // 10% community

    address public protocolWallet;
    address public reserveWallet;
    address public communityWallet;

    uint256 public totalCollected;
    uint256 public totalDistributed;

    event FeesReceived(address indexed from, uint256 amount);
    event FundsDistributed(uint256 protocol, uint256 reserve, uint256 community);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        IERC20  _usdc,
        address _admin,
        address _protocolWallet,
        address _reserveWallet,
        address _communityWallet
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        usdc             = _usdc;
        protocolWallet   = _protocolWallet;
        reserveWallet    = _reserveWallet;
        communityWallet  = _communityWallet;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,      _admin);
        _grantRole(WITHDRAWER_ROLE, _admin);
        _grantRole(UPGRADER_ROLE,   _admin);
        _grantRole(GOVERNOR_ROLE,   _admin);
    }

    /// @notice Distribute accumulated fees according to allocation
    function distribute() external onlyRole(WITHDRAWER_ROLE) whenNotPaused {
        uint256 bal = usdc.balanceOf(address(this));
        require(bal > 0, "Treasury: nothing to distribute");

        uint256 toProtocol  = (bal * PROTOCOL_BPS)  / 10000;
        uint256 toReserve   = (bal * RESERVE_BPS)   / 10000;
        uint256 toCommunity = bal - toProtocol - toReserve;

        usdc.safeTransfer(protocolWallet,  toProtocol);
        usdc.safeTransfer(reserveWallet,   toReserve);
        usdc.safeTransfer(communityWallet, toCommunity);

        totalDistributed += bal;
        emit FundsDistributed(toProtocol, toReserve, toCommunity);
    }

    /// @notice Emergency withdrawal — only GOVERNOR
    function emergencyWithdraw(address to, uint256 amount) external onlyRole(GOVERNOR_ROLE) {
        require(to != address(0), "Treasury: zero address");
        usdc.safeTransfer(to, amount);
        emit EmergencyWithdraw(to, amount);
    }

    function updateWallets(
        address _protocol,
        address _reserve,
        address _community
    ) external onlyRole(GOVERNOR_ROLE) {
        require(_protocol != address(0) && _reserve != address(0) && _community != address(0));
        protocolWallet  = _protocol;
        reserveWallet   = _reserve;
        communityWallet = _community;
    }

    function balance() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    function pause()   external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
