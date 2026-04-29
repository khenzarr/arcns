// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSResolver.sol";
import "../interfaces/IArcNSReverseRegistrar.sol";

/// @title ArcNSReverseRegistrar
/// @notice Manages the addr.reverse TLD — maps addresses to primary names
/// @dev Non-upgradeable. Implements EIP-181 pattern for reverse resolution.
///
///      Two distinct flows:
///      1. Registration-time: setReverseRecord() — called by Controller inside try/catch
///      2. Dashboard-driven:  setName()          — called directly by users
///
///      DEPLOYMENT REQUIREMENT: This contract must be granted CONTROLLER_ROLE on the
///      ArcNSResolver via resolver.setController(address(this), true) after deployment.
///      Without this, setName and setReverseRecord will revert when calling resolver.setName().
contract ArcNSReverseRegistrar is Ownable, IArcNSReverseRegistrar {
    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when the caller is not authorised to claim a reverse node
    error NotAuthorised();

    /// @notice Thrown when a zero address is provided for the registry
    error ZeroRegistry();

    /// @notice Thrown when a zero address is provided for the resolver
    error ZeroResolver();

    // ─── Constants ────────────────────────────────────────────────────────────

    /// @notice namehash("addr.reverse")
    bytes32 public constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The ArcNS registry contract
    IArcNSRegistry public immutable registry;

    /// @notice The default resolver used for reverse records
    IArcNSResolver public defaultResolver;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a reverse record is claimed or updated
    event ReverseClaimed(address indexed addr, bytes32 indexed node);

    /// @notice Emitted when the default resolver is updated
    event DefaultResolverChanged(address indexed resolver);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @notice Deploys the reverse registrar
    /// @param registry_ The ArcNS registry contract
    /// @param defaultResolver_ The default resolver for reverse records
    constructor(IArcNSRegistry registry_, IArcNSResolver defaultResolver_) Ownable(msg.sender) {
        if (address(registry_)        == address(0)) revert ZeroRegistry();
        if (address(defaultResolver_) == address(0)) revert ZeroResolver();
        registry = registry_;
        defaultResolver = defaultResolver_;
    }

    // ─── Flow 1: Registration-time (Controller path) ──────────────────────────

    /// @notice Sets the reverse record for an address — called by Controller at registration time
    /// @dev This function is designed to be called inside a try/catch by the Controller.
    ///      It MUST NOT be called directly by users for primary name management.
    ///      Failure is expected to be silently swallowed by the Controller.
    ///      Any address can call this function; the Controller wraps it in try/catch.
    /// @param addr_ The address to set the reverse record for
    /// @param name_ The full domain name (e.g. "alice.arc")
    function setReverseRecord(address addr_, string calldata name_) external override {
        bytes32 reverseNode = _claimWithResolver(addr_, addr_, address(defaultResolver));
        defaultResolver.setName(reverseNode, name_);
        emit ReverseClaimed(addr_, reverseNode);
    }

    // ─── Flow 2: Dashboard-driven (user path) ─────────────────────────────────

    /// @notice Sets the primary name for the caller's address
    /// @dev This is the canonical dashboard-driven primary name update flow.
    ///      Users call this directly from the My Domains page.
    /// @param name_ The full domain name to set as primary (e.g. "alice.arc")
    /// @return reverseNode The reverse node hash
    function setName(string calldata name_) external override returns (bytes32) {
        bytes32 reverseNode = _claimWithResolver(msg.sender, msg.sender, address(defaultResolver));
        defaultResolver.setName(reverseNode, name_);
        emit ReverseClaimed(msg.sender, reverseNode);
        return reverseNode;
    }

    // ─── Additional functions ─────────────────────────────────────────────────

    /// @notice Claims the reverse node for an address with a specific resolver
    /// @dev Sets the owner and resolver for the reverse node in the registry.
    ///      The caller must be the address itself, or the current owner of the reverse node
    ///      in the registry. This prevents arbitrary third parties from hijacking reverse
    ///      node ownership for addresses they do not control.
    /// @param addr_ The address to claim the reverse node for
    /// @param owner_ The owner to assign to the reverse node
    /// @param resolver_ The resolver to assign to the reverse node
    /// @return The reverse node hash
    function claimWithResolver(
        address addr_,
        address owner_,
        address resolver_
    ) external override returns (bytes32) {
        if (msg.sender != addr_ && msg.sender != registry.owner(node(addr_))) {
            revert NotAuthorised();
        }
        return _claimWithResolver(addr_, owner_, resolver_);
    }

    /// @notice Returns the reverse node hash for an address
    /// @param addr_ The address to compute the reverse node for
    /// @return The reverse node hash
    function node(address addr_) public pure override returns (bytes32) {
        return keccak256(abi.encodePacked(ADDR_REVERSE_NODE, _sha3HexAddress(addr_)));
    }

    /// @notice Updates the default resolver
    /// @dev Only callable by the contract owner
    /// @param resolver_ The new default resolver address
    function setDefaultResolver(IArcNSResolver resolver_) external onlyOwner {
        if (address(resolver_) == address(0)) revert ZeroResolver();
        defaultResolver = resolver_;
        emit DefaultResolverChanged(address(resolver_));
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Claims the reverse node for addr_ with the given owner and resolver.
    ///      Sets the subnode record under ADDR_REVERSE_NODE in the registry.
    function _claimWithResolver(
        address addr_,
        address owner_,
        address resolver_
    ) internal returns (bytes32) {
        bytes32 labelHash = _sha3HexAddress(addr_);
        bytes32 reverseNode = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, labelHash));
        registry.setSubnodeRecord(ADDR_REVERSE_NODE, labelHash, owner_, resolver_, 0);
        return reverseNode;
    }

    /// @dev Returns the keccak256 hash of the lowercase hex string of an address (without 0x prefix)
    function _sha3HexAddress(address addr_) internal pure returns (bytes32) {
        return keccak256(_toHexStringBytes(addr_));
    }

    /// @dev Converts an address to its lowercase hex string bytes (without 0x prefix), 40 chars
    function _toHexStringBytes(address addr_) internal pure returns (bytes memory) {
        bytes memory hexStr = new bytes(40);
        bytes memory alphabet = "0123456789abcdef";
        uint160 value = uint160(addr_);
        for (int256 i = 39; i >= 0; i--) {
            hexStr[uint256(i)] = alphabet[value & 0xf];
            value >>= 4;
        }
        return hexStr;
    }
}
