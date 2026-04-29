// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IArcNSBaseRegistrar.sol";
import "../interfaces/IArcNSPriceOracle.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSResolver.sol";
import "../interfaces/IArcNSReverseRegistrar.sol";
import "../interfaces/IArcNSController.sol";

/// @title ArcNSController
/// @notice Orchestrates commit-reveal registration and renewal for ArcNS names
/// @dev UUPS upgradeable proxy. Implements EIP-1822 pattern for upgradeability.
///      Accepts USDC payments, validates commitments, calls BaseRegistrar, sets addr records,
///      and optionally sets reverse records. Uses storage-based reentrancy guard to avoid
///      slot conflicts with OZ's ReentrancyGuard.
///
///      DEPLOYMENT NOTE: After deploying, call base.addController(address(this)) and
///      resolver.setController(address(this), true) to wire up permissions.
contract ArcNSController is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable,
    IArcNSController
{
    using SafeERC20 for IERC20;

    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when a zero address is provided where one is not allowed
    error ZeroAddress();

    /// @notice Thrown when a reentrant call is detected
    error ReentrantCall();

    /// @notice Thrown when a commitment has already been used in a prior registration
    error CommitmentAlreadyUsed();

    /// @notice Thrown when a commitment already exists and has not yet expired
    error CommitmentAlreadyExists();

    /// @notice Thrown when a commitment is not found in the commitments mapping
    error CommitmentNotFound();

    /// @notice Thrown when a commitment has not yet matured (MIN_COMMITMENT_AGE not elapsed)
    error CommitmentTooNew();

    /// @notice Thrown when a commitment has expired (MAX_COMMITMENT_AGE elapsed)
    error CommitmentExpired();

    /// @notice Thrown when the name fails on-chain validation
    error InvalidName();

    /// @notice Thrown when the registration duration is below the minimum
    error DurationTooShort();

    /// @notice Thrown when the resolver address is not in the approved list
    /// @param resolver The unapproved resolver address
    error ResolverNotApproved(address resolver);

    /// @notice Thrown when the computed price exceeds the caller's maxCost
    /// @param price The actual price
    /// @param maxCost The caller's maximum acceptable cost
    error PriceExceedsMaxCost(uint256 price, uint256 maxCost);

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a name is successfully registered
    event NameRegistered(string name, bytes32 indexed label, address indexed owner, uint256 cost, uint256 expires);

    /// @notice Emitted when a name is successfully renewed
    event NameRenewed(string name, bytes32 indexed label, uint256 cost, uint256 expires);

    /// @notice Emitted when a commitment is stored
    event CommitmentMade(bytes32 indexed commitment);

    /// @notice Emitted when the treasury address is updated
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    /// @notice Emitted when a resolver is approved or revoked
    event ResolverApproved(address indexed resolver, bool approved);

    /// @notice Emitted when the price oracle is updated
    event NewPriceOracle(address indexed oracle);

    /// @notice Emitted when the reverseRegistrar address is updated
    event ReverseRegistrarUpdated(address indexed oldReverseRegistrar, address indexed newReverseRegistrar);

    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Admin role — set treasury, approve resolvers, general admin
    bytes32 public constant ADMIN_ROLE    = keccak256("ADMIN_ROLE");

    /// @notice Pauser role — pause and unpause register/renew
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");

    /// @notice Oracle role — update the price oracle reference
    bytes32 public constant ORACLE_ROLE   = keccak256("ORACLE_ROLE");

    /// @notice Upgrader role — authorize UUPS upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice Minimum registration duration (28 days)
    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;

    /// @notice Minimum time a commitment must age before it can be used (60 seconds)
    uint256 public constant MIN_COMMITMENT_AGE = 60;

    /// @notice Maximum time a commitment remains valid (24 hours)
    uint256 public constant MAX_COMMITMENT_AGE = 24 hours;

    // ─── Storage layout (CRITICAL — do not reorder) ───────────────────────────
    //
    // Inherited slots: Initializable, AccessControlUpgradeable, PausableUpgradeable, UUPSUpgradeable
    // Then sequential:
    //
    // Slot N:    _reentrancyStatus          (storage-based reentrancy guard)
    // Slot N+1:  base                       (IArcNSBaseRegistrar address)
    // Slot N+2:  priceOracle                (IArcNSPriceOracle address)
    // Slot N+3:  usdc                       (IERC20 address)
    // Slot N+4:  registry                   (IArcNSRegistry address)
    // Slot N+5:  resolver                   (IArcNSResolver address)
    // Slot N+6:  reverseRegistrar           (IArcNSReverseRegistrar address)
    // Slot N+7:  treasury                   (address)
    // Slot N+8:  commitments                (mapping bytes32 => uint256)
    // Slot N+9:  usedCommitments            (mapping bytes32 => bool)
    // Slot N+10: approvedResolvers          (mapping address => bool)
    // Slots N+11 to N+60: __gap[50]         (reserved for future fields)

    /// @dev Storage-based reentrancy guard status
    uint256 private _reentrancyStatus;

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED     = 2;

    /// @notice The base registrar contract for this TLD
    IArcNSBaseRegistrar    public base;

    /// @notice The price oracle contract
    IArcNSPriceOracle      public priceOracle;

    /// @notice The USDC token contract used for payments
    IERC20                 public usdc;

    /// @notice The ArcNS registry contract
    IArcNSRegistry         public registry;

    /// @notice The resolver contract for setting addr records
    IArcNSResolver         public resolver;

    /// @notice The reverse registrar contract for setting reverse records
    IArcNSReverseRegistrar public reverseRegistrar;

    /// @notice The treasury address that receives USDC payments
    address                public treasury;

    /// @notice Maps commitment hash to the timestamp when it was committed
    mapping(bytes32 => uint256) public commitments;

    /// @notice Tracks permanently invalidated commitments (used in a prior registration)
    mapping(bytes32 => bool)    public usedCommitments;

    /// @notice Admin-controlled allowlist of approved resolver addresses
    mapping(address => bool)    public approvedResolvers;

    /// @dev Reserved storage gap for future fields (50 slots)
    uint256[50] private __gap;

    // ─── Reentrancy guard ─────────────────────────────────────────────────────

    /// @dev Storage-based reentrancy guard. Uses its own slot rather than OZ's
    ///      ReentrancyGuard to avoid slot conflicts in the upgradeable layout.
    modifier nonReentrant() {
        if (_reentrancyStatus == _ENTERED) revert ReentrantCall();
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @dev Prevents direct initialization of the implementation contract
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ──────────────────────────────────────────────────────────

    /// @notice Initializes the controller proxy
    /// @param base_ The base registrar contract
    /// @param priceOracle_ The price oracle contract
    /// @param usdc_ The USDC token contract
    /// @param registry_ The ArcNS registry contract
    /// @param resolver_ The resolver contract
    /// @param reverseRegistrar_ The reverse registrar contract
    /// @param treasury_ The treasury address to receive payments
    /// @param admin_ The address to receive all admin roles
    function initialize(
        IArcNSBaseRegistrar    base_,
        IArcNSPriceOracle      priceOracle_,
        IERC20                 usdc_,
        IArcNSRegistry         registry_,
        IArcNSResolver         resolver_,
        IArcNSReverseRegistrar reverseRegistrar_,
        address                treasury_,
        address                admin_
    ) external initializer {
        if (address(base_)             == address(0)) revert ZeroAddress();
        if (address(priceOracle_)      == address(0)) revert ZeroAddress();
        if (address(usdc_)             == address(0)) revert ZeroAddress();
        if (address(registry_)         == address(0)) revert ZeroAddress();
        if (address(resolver_)         == address(0)) revert ZeroAddress();
        if (address(reverseRegistrar_) == address(0)) revert ZeroAddress();
        if (treasury_                  == address(0)) revert ZeroAddress();
        if (admin_                     == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();

        base            = base_;
        priceOracle     = priceOracle_;
        usdc            = usdc_;
        registry        = registry_;
        resolver        = resolver_;
        reverseRegistrar = reverseRegistrar_;
        treasury        = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE,    admin_);
        _grantRole(PAUSER_ROLE,   admin_);
        _grantRole(ORACLE_ROLE,   admin_);
        _grantRole(UPGRADER_ROLE, admin_);

        _reentrancyStatus = _NOT_ENTERED;
    }

    // ─── Commitment flow ──────────────────────────────────────────────────────

    /// @notice Computes the commitment hash binding to a specific sender
    /// @dev This is the ONLY commitment hash function. The sender parameter prevents front-running.
    ///      Off-chain callers pass msg.sender as sender. On-chain callers pass address(this) or msg.sender.
    /// @param name_ The plaintext label
    /// @param owner_ The intended owner address
    /// @param duration Registration duration in seconds
    /// @param secret The secret value
    /// @param resolverAddr The resolver address
    /// @param reverseRecord Whether to set a reverse record
    /// @param sender The sender address (prevents front-running)
    /// @return The commitment hash
    function makeCommitment(
        string   memory name_,
        address         owner_,
        uint256         duration,
        bytes32         secret,
        address         resolverAddr,
        bool            reverseRecord,
        address         sender
    ) public pure override returns (bytes32) {
        bytes32 label = keccak256(bytes(name_));
        return keccak256(abi.encode(label, owner_, duration, secret, resolverAddr, reverseRecord, sender));
    }

    /// @notice Submits a commitment hash to begin the commit-reveal flow
    /// @dev Reverts if the commitment was already used or already exists within MAX_COMMITMENT_AGE.
    ///      Allows re-committing after MAX_COMMITMENT_AGE has elapsed (old commitment expired).
    /// @param commitment The commitment hash (from makeCommitment)
    function commit(bytes32 commitment) external override whenNotPaused {
        if (usedCommitments[commitment]) revert CommitmentAlreadyUsed();
        if (commitments[commitment] != 0 && block.timestamp <= commitments[commitment] + MAX_COMMITMENT_AGE) {
            revert CommitmentAlreadyExists();
        }
        commitments[commitment] = block.timestamp;
        emit CommitmentMade(commitment);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /// @notice Registers a name after a valid commitment has matured
    /// @dev Validates commitment, name, duration, resolver, and payment before registering.
    ///      Optionally sets addr record and reverse record. Reverse record failure is silently swallowed.
    /// @param name_ The plaintext label to register
    /// @param owner_ The address that will own the name
    /// @param duration Registration duration in seconds
    /// @param secret The secret used in the commitment
    /// @param resolverAddr The resolver address (address(0) to skip resolver setup)
    /// @param reverseRecord Whether to set a reverse record for owner_
    /// @param maxCost Maximum USDC cost the caller is willing to pay (6 decimals)
    function register(
        string   calldata name_,
        address           owner_,
        uint256           duration,
        bytes32           secret,
        address           resolverAddr,
        bool              reverseRecord,
        uint256           maxCost
    ) external override nonReentrant whenNotPaused {
        // 1. Recompute commitment — binds to msg.sender to prevent front-running
        bytes32 commitment = makeCommitment(name_, owner_, duration, secret, resolverAddr, reverseRecord, msg.sender);

        // 2. Validate commitment (marks as used internally)
        _validateCommitment(commitment);

        // 3. Validate name
        if (!_validName(name_)) revert InvalidName();

        // 4. Validate duration
        if (duration < MIN_REGISTRATION_DURATION) revert DurationTooShort();

        // 5. Validate resolver if provided
        if (resolverAddr != address(0)) {
            if (!approvedResolvers[resolverAddr]) revert ResolverNotApproved(resolverAddr);
        }

        // 6. Get price
        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;

        // 7. Check maxCost
        if (cost > maxCost) revert PriceExceedsMaxCost(cost, maxCost);

        // 8. Collect payment — ERC20 reverts naturally on insufficient allowance/balance
        usdc.safeTransferFrom(msg.sender, treasury, cost);

        // 9. Compute label and tokenId
        bytes32 label    = keccak256(bytes(name_));
        uint256 tokenId  = uint256(label);

        // 10. Compute nodehash for this name under the TLD
        bytes32 nodehash = keccak256(abi.encodePacked(base.baseNode(), label));

        // 11. Register with or without resolver
        uint256 expires;
        if (resolverAddr != address(0)) {
            expires = base.registerWithResolver(tokenId, owner_, duration, resolverAddr);
            resolver.setAddr(nodehash, owner_);
        } else {
            expires = base.register(tokenId, owner_, duration);
        }

        // 12. Optionally set reverse record — silently swallow failures so registration never reverts
        //     due to reverse record issues (e.g. missing CONTROLLER_ROLE on resolver)
        if (reverseRecord && resolverAddr != address(0)) {
            try reverseRegistrar.setReverseRecord(owner_, string(abi.encodePacked(name_, ".", base.tld()))) {} catch {}
        }

        emit NameRegistered(name_, label, owner_, cost, expires);
    }

    // ─── Renewal ──────────────────────────────────────────────────────────────

    /// @notice Renews an existing name
    /// @dev No commitment required for renewal. Validates duration, price, and payment.
    /// @param name_ The plaintext label to renew
    /// @param duration Additional duration in seconds
    /// @param maxCost Maximum USDC cost the caller is willing to pay (6 decimals)
    function renew(
        string calldata name_,
        uint256         duration,
        uint256         maxCost
    ) external override nonReentrant whenNotPaused {
        // 1. Validate duration
        if (duration < MIN_REGISTRATION_DURATION) revert DurationTooShort();

        // 2. Get price
        IArcNSPriceOracle.Price memory p = rentPrice(name_, duration);
        uint256 cost = p.base + p.premium;

        // 3. Check maxCost
        if (cost > maxCost) revert PriceExceedsMaxCost(cost, maxCost);

        // 4. Collect payment
        usdc.safeTransferFrom(msg.sender, treasury, cost);

        // 5. Compute label and tokenId
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);

        // 6. Renew via base registrar
        uint256 expires = base.renew(tokenId, duration);

        emit NameRenewed(name_, label, cost, expires);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice Returns the rent price for a name and duration
    /// @param name_ The plaintext label
    /// @param duration Duration in seconds
    /// @return Price struct with base and premium components
    function rentPrice(string memory name_, uint256 duration) public view override returns (IArcNSPriceOracle.Price memory) {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return priceOracle.price(name_, base.nameExpires(tokenId), duration);
    }

    /// @notice Returns whether a name is available for registration
    /// @param name_ The plaintext label
    /// @return True if the name is valid and available on the base registrar
    function available(string memory name_) public view override returns (bool) {
        bytes32 label   = keccak256(bytes(name_));
        uint256 tokenId = uint256(label);
        return _validName(name_) && base.available(tokenId);
    }

    /// @notice Returns the status of a commitment
    /// @param commitment The commitment hash
    /// @return timestamp When the commitment was made (0 if not found)
    /// @return exists Whether the commitment exists
    /// @return matured Whether MIN_COMMITMENT_AGE has passed
    /// @return expired_ Whether MAX_COMMITMENT_AGE has passed
    function getCommitmentStatus(bytes32 commitment) external view override returns (
        uint256 timestamp,
        bool    exists,
        bool    matured,
        bool    expired_
    ) {
        timestamp = commitments[commitment];
        exists    = timestamp != 0;
        matured   = exists && block.timestamp >= timestamp + MIN_COMMITMENT_AGE;
        expired_  = exists && block.timestamp >  timestamp + MAX_COMMITMENT_AGE;
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @notice Updates the price oracle reference
    /// @param oracle_ The new price oracle contract
    function setPriceOracle(IArcNSPriceOracle oracle_) external onlyRole(ORACLE_ROLE) {
        priceOracle = oracle_;
        emit NewPriceOracle(address(oracle_));
    }

    /// @notice Updates the treasury address
    /// @param treasury_ The new treasury address
    function setTreasury(address treasury_) external onlyRole(ADMIN_ROLE) {
        if (treasury_ == address(0)) revert ZeroAddress();
        address old = treasury;
        treasury = treasury_;
        emit TreasuryUpdated(old, treasury_);
    }

    /// @notice Updates the reverseRegistrar address
    /// @dev Writes to the existing reverseRegistrar slot (Slot N+6). No new storage slot is consumed.
    ///      Required for clean migration when ArcNSReverseRegistrar is redeployed (e.g. security fix).
    ///      After calling this on both proxies, all subsequent register(..., reverseRecord=true) calls
    ///      will target the new ReverseRegistrar.
    /// @param newReverseRegistrar The new ArcNSReverseRegistrar contract address
    function setReverseRegistrar(address newReverseRegistrar) external onlyRole(ADMIN_ROLE) {
        if (newReverseRegistrar == address(0)) revert ZeroAddress();
        address old = address(reverseRegistrar);
        reverseRegistrar = IArcNSReverseRegistrar(newReverseRegistrar);
        emit ReverseRegistrarUpdated(old, newReverseRegistrar);
    }

    /// @notice Approves or revokes a resolver address
    /// @param resolverAddr The resolver address to approve or revoke
    /// @param approved Whether to approve (true) or revoke (false)
    function setApprovedResolver(address resolverAddr, bool approved) external onlyRole(ADMIN_ROLE) {
        approvedResolvers[resolverAddr] = approved;
        emit ResolverApproved(resolverAddr, approved);
    }

    /// @notice Pauses register and renew
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpauses register and renew
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    /// @dev Restricts upgrade authorization to UPGRADER_ROLE holders
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Validates a commitment: checks it exists, has matured, has not expired, and marks it used.
    ///      Deletes the commitment from the mapping after marking it used.
    function _validateCommitment(bytes32 commitment) internal {
        if (usedCommitments[commitment])                                          revert CommitmentAlreadyUsed();
        if (commitments[commitment] == 0)                                         revert CommitmentNotFound();
        if (block.timestamp < commitments[commitment] + MIN_COMMITMENT_AGE)       revert CommitmentTooNew();
        if (block.timestamp > commitments[commitment] + MAX_COMMITMENT_AGE)       revert CommitmentExpired();
        usedCommitments[commitment] = true;
        delete commitments[commitment];
    }

    /// @dev Validates a label string for on-chain registration.
    ///
    ///      ArcNS NAMING POLICY — allowed character set (intentional choices):
    ///
    ///      Allowed:
    ///        - Lowercase ASCII letters: a–z  (0x61–0x7A)
    ///        - Decimal digits:          0–9  (0x30–0x39)
    ///        - Hyphen:                  -    (0x2D)
    ///        - Underscore:              _    (0x5F)  ← intentional ArcNS extension
    ///
    ///      Structural rules:
    ///        - Minimum length: 1 byte
    ///        - Cannot start or end with a hyphen
    ///        - Characters at index 2 and 3 (0-indexed) cannot both be hyphen
    ///          (partial IDNA/UTS46 double-hyphen rule — blocks "xn--" ACE prefix
    ///           and similar patterns, but does not block all double-hyphen positions)
    ///
    ///      UNDERSCORE POLICY:
    ///        Underscore is intentionally permitted. This is an ArcNS naming-policy
    ///        choice that diverges from standard DNS and ENS. Rationale:
    ///          - Underscores are common in usernames and handles (e.g. "my_name.arc")
    ///          - ArcNS is not a DNS replacement — DNS compatibility is not a goal
    ///          - Underscore names resolve correctly on-chain via namehash
    ///        Implication: names like "my_name.arc" are valid and registerable.
    ///        Standard DNS resolvers and ENS tooling will not resolve these names,
    ///        but ArcNS-native tooling handles them correctly.
    ///        This policy is documented here and is not a bug.
    ///
    ///      DOUBLE-HYPHEN RULE SCOPE:
    ///        The double-hyphen check only applies at positions 2–3 (0-indexed).
    ///        Names like "a--b.arc" (double-hyphen at positions 1–2) are valid.
    ///        This is a partial IDNA guard, not full IDNA compliance.
    ///        The specific rule enforced is: b[2] == '-' && b[3] == '-' is rejected.
    ///
    ///      Returns bool — does NOT revert internally.
    function _validName(string memory name_) internal pure returns (bool) {
        bytes memory b = bytes(name_);
        if (b.length == 0) return false;
        for (uint256 i = 0; i < b.length; i++) {
            bytes1 c = b[i];
            bool valid = (c >= 0x61 && c <= 0x7A) ||  // a-z
                         (c >= 0x30 && c <= 0x39) ||  // 0-9
                         (c == 0x2D) ||               // hyphen
                         (c == 0x5F);                 // underscore
            if (!valid) return false;
        }
        if (b[0] == 0x2D || b[b.length - 1] == 0x2D) return false;  // leading/trailing hyphen
        if (b.length >= 4 && b[2] == 0x2D && b[3] == 0x2D) return false;  // double-hyphen at pos 2-3
        return true;
    }
}
