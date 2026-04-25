// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSResolver.sol";

/// @title ArcNSResolver
/// @notice Stores and returns EVM address records for namehashes — implements EIP-137 pattern
/// @dev UUPS upgradeable proxy. v1 active interface: setAddr / addr only.
///      setName exists for ReverseRegistrar use via CONTROLLER_ROLE but is not a general v1 feature.
///      Storage slots for text, contenthash, and multicoin records are reserved for future upgrades.
///
///      DEPLOYMENT NOTE: After deploying ReverseRegistrar, grant it CONTROLLER_ROLE via setController().
contract ArcNSResolver is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IArcNSResolver
{
    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when the caller is not authorised to modify a node record
    error NotAuthorised();

    /// @notice Thrown when a zero address is provided for the registry
    error ZeroRegistry();

    // ─── Roles ────────────────────────────────────────────────────────────────

    /// @notice Admin role — can grant/revoke CONTROLLER_ROLE and manage the contract
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice Controller role — allows setting records without being the node owner
    /// @dev Granted to ArcNSController and ArcNSReverseRegistrar during deployment
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    /// @notice Upgrader role — authorizes UUPS upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ─── Storage layout (CRITICAL — do not reorder) ───────────────────────────
    //
    // Inherited slots: Initializable, AccessControlUpgradeable, UUPSUpgradeable
    // Then sequential:
    //
    // Slot A:   registry                (IArcNSRegistry address)
    // Slot A+1: _addresses              (mapping bytes32 => mapping uint256 => bytes)
    //           — coin type 60 (EVM addr) ACTIVE in v1
    //           — other coin types: slot allocated, no public functions in v1
    // Slot A+2: _texts                  (mapping bytes32 => mapping string => string)
    //           — RESERVED: slot allocated, no public functions in v1
    // Slot A+3: _contenthashes          (mapping bytes32 => bytes)
    //           — RESERVED: slot allocated, no public functions in v1
    // Slot A+4: _names                  (mapping bytes32 => string)
    //           — INTERNAL ONLY in v1: written by ReverseRegistrar via CONTROLLER_ROLE
    // Slots A+5 to A+54: __gap[50]      (reserved for future record types)

    /// @notice The ArcNS registry contract
    IArcNSRegistry public registry;

    /// @dev Coin-type-keyed address records. Coin type 60 = EVM address (active in v1).
    ///      Other coin types are reserved — no public functions in v1.
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;

    /// @dev Text records — RESERVED. Slot allocated for storage layout safety. No public functions in v1.
    mapping(bytes32 => mapping(string => string)) private _texts;

    /// @dev Contenthash records — RESERVED. Slot allocated for storage layout safety. No public functions in v1.
    mapping(bytes32 => bytes) private _contenthashes;

    /// @dev Name records — INTERNAL ONLY in v1. Written exclusively by ReverseRegistrar via CONTROLLER_ROLE.
    ///      Not exposed as a general v1 feature.
    mapping(bytes32 => string) private _names;

    /// @dev Reserved storage gap for future record types (50 slots)
    uint256[50] private __gap;

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when an EVM address record is updated
    event AddrChanged(bytes32 indexed node, address addr);

    /// @notice Emitted when a name record is updated (internal path via ReverseRegistrar)
    event NameChanged(bytes32 indexed node, string name);

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @dev Prevents direct initialization of the implementation contract
    constructor() {
        _disableInitializers();
    }

    // ─── Initializer ──────────────────────────────────────────────────────────

    /// @notice Initializes the resolver proxy
    /// @param registry_ The ArcNS registry contract address
    /// @param admin_ The address to receive DEFAULT_ADMIN_ROLE, ADMIN_ROLE, and UPGRADER_ROLE
    function initialize(IArcNSRegistry registry_, address admin_) external initializer {
        if (address(registry_) == address(0)) revert ZeroRegistry();
        __AccessControl_init();
        registry = registry_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    /// @dev Authorises the caller to modify records for a node.
    ///      Caller must be the node owner, an approved operator, or hold CONTROLLER_ROLE.
    modifier authorised(bytes32 node) {
        if (
            registry.owner(node) != msg.sender &&
            !registry.isApprovedForAll(registry.owner(node), msg.sender) &&
            !hasRole(CONTROLLER_ROLE, msg.sender)
        ) revert NotAuthorised();
        _;
    }

    // ─── v1 Active Public Interface ───────────────────────────────────────────

    /// @notice Sets the EVM address record for a node (coin type 60)
    /// @dev Caller must be node owner, approved operator, or hold CONTROLLER_ROLE
    /// @param node The namehash of the node
    /// @param a The EVM address to associate with the node
    function setAddr(bytes32 node, address a) external override authorised(node) {
        _addresses[node][60] = _addressToBytes(a);
        emit AddrChanged(node, a);
    }

    /// @notice Returns the EVM address record for a node (coin type 60)
    /// @param node The namehash of the node
    /// @return The EVM address associated with the node, or address(0) if not set
    function addr(bytes32 node) external view override returns (address payable) {
        bytes memory b = _addresses[node][60];
        if (b.length == 0) return payable(address(0));
        return payable(_bytesToAddress(b));
    }

    // ─── Internal-only name record (ReverseRegistrar path) ───────────────────

    /// @notice Sets the name record for a node — internal use only via CONTROLLER_ROLE
    /// @dev Not part of the v1 public interface. Used exclusively by ReverseRegistrar
    ///      to store reverse name records. Callers must hold CONTROLLER_ROLE.
    ///      This function is NOT advertised as a general v1 feature.
    /// @param node The namehash of the node
    /// @param name_ The name string to store
    function setName(bytes32 node, string calldata name_) external override onlyRole(CONTROLLER_ROLE) {
        _names[node] = name_;
        emit NameChanged(node, name_);
    }

    /// @notice Returns the name record for a node — used for reverse resolution
    /// @dev Read-only. The name record is written only by ReverseRegistrar via CONTROLLER_ROLE.
    /// @param node The namehash of the node
    /// @return The name string associated with the node
    function name(bytes32 node) external view override returns (string memory) {
        return _names[node];
    }

    // ─── Admin functions ──────────────────────────────────────────────────────

    /// @notice Grants or revokes CONTROLLER_ROLE for an address
    /// @dev Only callable by ADMIN_ROLE holders
    /// @param controller The address to grant or revoke
    /// @param trusted Whether to grant (true) or revoke (false) CONTROLLER_ROLE
    function setController(address controller, bool trusted) external override onlyRole(ADMIN_ROLE) {
        if (trusted) {
            _grantRole(CONTROLLER_ROLE, controller);
        } else {
            _revokeRole(CONTROLLER_ROLE, controller);
        }
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    /// @dev Restricts upgrade authorization to UPGRADER_ROLE holders
    function _authorizeUpgrade(address newImpl) internal override onlyRole(UPGRADER_ROLE) {}

    // ─── Internal helpers ─────────────────────────────────────────────────────

    /// @dev Encodes an address as a 20-byte array
    function _addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    /// @dev Decodes a 20-byte array into an address
    function _bytesToAddress(bytes memory b) internal pure returns (address) {
        require(b.length == 20, "ArcNSResolver: invalid address length");
        address addr_;
        assembly {
            addr_ := mload(add(b, 20))
        }
        return addr_;
    }
}
