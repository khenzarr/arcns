// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IArcNSPriceOracle.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../registrar/ArcNSBaseRegistrar.sol";
import "../resolver/ArcNSResolverV2.sol";

/// @title ArcNSRegistrarControllerV2
/// @notice UUPS-upgradeable controller with security hardening
/// @dev Fixes: C-01 replay, C-02 resolver injection, C-03 slippage, C-05 pausable, C-06 treasury, C-07 roles
contract ArcNSRegistrarControllerV2 is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ─── Reentrancy guard (storage-based, proxy-safe) ─────────────────────────
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "Controller: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ─── Roles ────────────────────────────────────────────────────────────────
    bytes32 public constant ADMIN_ROLE   = keccak256("ADMIN_ROLE");
    bytes32 public constant PAUSER_ROLE  = keccak256("PAUSER_ROLE");
    bytes32 public constant ORACLE_ROLE  = keccak256("ORACLE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────────
    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;
    uint256 public constant MIN_COMMITMENT_AGE        = 60;
    uint256 public constant MAX_COMMITMENT_AGE        = 24 hours;
    uint256 public constant MIN_NAME_LENGTH           = 1;

    // ─── State ────────────────────────────────────────────────────────────────
    ArcNSBaseRegistrar  public base;
    IArcNSPriceOracle   public priceOracle;
    IERC20              public usdc;
    IArcNSRegistry      public registry;
    ArcNSResolverV2     public resolver;
    address             public treasury;

    // FIX C-01: permanent commitment invalidation
    mapping(bytes32 => uint256) public commitments;
    mapping(bytes32 => bool)    public usedCommitments;

    // FIX C-02: whitelisted resolver addresses
    mapping(address => bool) public approvedResolvers;

    // ─── Events ───────────────────────────────────────────────────────────────
    event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires);
    event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires);
    event NewPriceOracle(address indexed oracle);
    event CommitmentMade(bytes32 indexed commitment);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ResolverApproved(address indexed resolver, bool approved);

    // ─── Initializer ──────────────────────────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        ArcNSBaseRegistrar  _base,
        IArcNSPriceOracle   _priceOracle,
        IERC20              _usdc,
        IArcNSRegistry      _registry,
        ArcNSResolverV2     _resolver,
        address             _treasury,
        address             _admin
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        require(_treasury != address(0), "Controller: zero treasury");

        base        = _base;
        priceOracle = _priceOracle;
        usdc        = _usdc;
        registry    = _registry;
        resolver    = _resolver;
        treasury    = _treasury;

        _reentrancyStatus = _NOT_ENTERED;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,   _admin);
        _grantRole(PAUSER_ROLE,  _admin);
        _grantRole(ORACLE_ROLE,  _admin);
        _grantRole(UPGRADER_ROLE, _admin);

        // Approve the default resolver
        approvedResolvers[address(_resolver)] = true;
    }

    // ─── Commit / Reveal ──────────────────────────────────────────────────────

    function commit(bytes32 commitment) external whenNotPaused {
        // FIX C-01: reject permanently used commitments
        require(!usedCommitments[commitment], "Controller: commitment already used");
        require(
            commitments[commitment] == 0 ||
            commitments[commitment] + MAX_COMMITMENT_AGE < block.timestamp,
            "Controller: commitment exists"
        );
        commitments[commitment] = block.timestamp;
        emit CommitmentMade(commitment);
    }

    function makeCommitment(
        string   memory name_,
        address         owner_,
        uint256         duration,
        bytes32         secret,
        address         resolverAddr,
        bytes[] memory  data,
        bool            reverseRecord
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name_));
        return keccak256(abi.encode(label, owner_, duration, secret, resolverAddr, data, reverseRecord));
    }

    /// @notice Compute commitment that binds to msg.sender (front-run protection)
    /// @dev Use this on-chain; makeCommitment is for off-chain preview only
    function makeCommitmentWithSender(
        string   memory name_,
        address         owner_,
        uint256         duration,
        bytes32         secret,
        address         resolverAddr,
        bytes[] memory  data,
        bool            reverseRecord,
        address         sender
    ) public pure returns (bytes32) {
        bytes32 label = keccak256(bytes(name_));
        return keccak256(abi.encode(label, owner_, duration, secret, resolverAddr, data, reverseRecord, sender));
    }

    /// @notice Register a name
    /// @param maxCost FIX C-03: slippage protection — revert if price exceeds this
    function register(
        string   calldata name_,
        address           owner_,
        uint256           duration,
        bytes32           secret,
        address           resolverAddr,
        bytes[] calldata  data,
        bool              reverseRecord,
        uint256           maxCost
    ) external nonReentrant whenNotPaused {
        // Commitment binds to msg.sender — prevents front-running
        bytes32 commitment = makeCommitmentWithSender(name_, owner_, duration, secret, resolverAddr, data, reverseRecord, msg.sender);
        _validateCommitment(commitment);

        require(_validName(name_), "Controller: invalid name");
        require(duration >= MIN_REGISTRATION_DURATION, "Controller: duration too short");

        // FIX C-02: only approved resolvers
        if (resolverAddr != address(0)) {
            require(approvedResolvers[resolverAddr], "Controller: resolver not approved");
        }

        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;

        // FIX C-03: slippage guard
        require(cost <= maxCost, "Controller: price exceeds maxCost");

        usdc.safeTransferFrom(msg.sender, treasury, cost);

        bytes32 label    = keccak256(bytes(name_));
        uint256 tokenId  = uint256(label);
        bytes32 nodehash = keccak256(abi.encodePacked(base.baseNode(), label));
        uint256 expires;

        if (resolverAddr != address(0)) {
            expires = base.registerWithResolver(tokenId, owner_, duration, resolverAddr);
            // Set addr record so resolver.addr(node) returns the owner immediately
            ArcNSResolverV2(resolverAddr).setAddr(nodehash, owner_);
            if (data.length > 0) {
                _setRecords(resolverAddr, nodehash, data);
            }
        } else {
            expires = base.register(tokenId, owner_, duration);
        }

        if (reverseRecord && resolverAddr != address(0)) {
            _setReverseRecord(name_, resolverAddr, owner_);
        }

        emit NameRegistered(name_, label, owner_, cost, expires);
    }

    /// @notice Renew a name
    /// @param maxCost slippage protection
    function renew(string calldata name_, uint256 duration, uint256 maxCost) external nonReentrant whenNotPaused {
        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;
        require(cost <= maxCost, "Controller: price exceeds maxCost");

        usdc.safeTransferFrom(msg.sender, treasury, cost);

        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        uint256 expires = base.renew(tokenId, duration);

        emit NameRenewed(name_, label, cost, expires);
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function rentPrice(string memory name_, uint256 duration)
        public view returns (IArcNSPriceOracle.Price memory)
    {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return priceOracle.price(name_, base.nameExpires(tokenId), duration);
    }

    function available(string memory name_) public view returns (bool) {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return _validName(name_) && base.available(tokenId);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setPriceOracle(IArcNSPriceOracle _oracle) external onlyRole(ORACLE_ROLE) {
        priceOracle = _oracle;
        emit NewPriceOracle(address(_oracle));
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Controller: zero treasury"); // FIX C-06
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }

    function setApprovedResolver(address resolverAddr, bool approved) external onlyRole(ADMIN_ROLE) {
        approvedResolvers[resolverAddr] = approved;
        emit ResolverApproved(resolverAddr, approved);
    }

    function pause() external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address newImpl) internal override onlyRole(UPGRADER_ROLE) {}

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _validateCommitment(bytes32 commitment) internal {
        require(!usedCommitments[commitment], "Controller: commitment already used");
        require(commitments[commitment] + MIN_COMMITMENT_AGE <= block.timestamp, "Controller: commitment too new");
        require(commitments[commitment] + MAX_COMMITMENT_AGE > block.timestamp,  "Controller: commitment expired");
        // FIX C-01: permanently mark as used
        usedCommitments[commitment] = true;
        delete commitments[commitment];
    }

    function _validName(string memory name_) internal pure returns (bool) {
        bytes memory b = bytes(name_);
        if (b.length < MIN_NAME_LENGTH) return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7A) ||
                         (c >= 0x30 && c <= 0x39) ||
                         (c == 0x2D);
            if (!valid) return false;
            // No leading/trailing hyphen (only relevant for multi-char names)
            if (c == 0x2D && (i == 0 || i == b.length - 1)) return false;
        }
        return true;
    }

    function _setRecords(address resolverAddr, bytes32 node, bytes[] calldata data) internal {
        for (uint256 i = 0; i < data.length; i++) {
            require(data[i].length >= 36, "Controller: invalid record data");
            bytes memory call_ = abi.encodePacked(data[i][:4], node, data[i][36:]);
            (bool success,) = resolverAddr.call(call_);
            require(success, "Controller: resolver call failed");
        }
    }

    function _setReverseRecord(string memory name_, address resolverAddr, address owner_) internal {
        // Phase 22: safe reverse auto-set — never reverts the registration
        try ArcNSResolverV2(resolverAddr).setNameForAddr(
            owner_,
            owner_,
            resolverAddr,
            string(abi.encodePacked(name_, ".", base.tld()))
        ) {} catch {} // silently skip if reverse set fails
    }
}
