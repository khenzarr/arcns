// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSResolver.sol";

/// @title ArcNSResolverV2
/// @notice UUPS-upgradeable modular resolver with AccessControl
/// @dev Fixes C-07 (roles), adds upgradeability, maintains full ENS resolver parity
contract ArcNSResolverV2 is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IArcNSResolver
{
    bytes32 public constant ADMIN_ROLE      = keccak256("ADMIN_ROLE");
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");
    bytes32 public constant UPGRADER_ROLE   = keccak256("UPGRADER_ROLE");

    IArcNSRegistry public registry;

    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;
    mapping(bytes32 => mapping(string => string))  private _texts;
    mapping(bytes32 => bytes)                      private _contenthashes;
    mapping(bytes32 => string)                     private _names;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier authorised(bytes32 node) {
        require(
            registry.owner(node) == msg.sender ||
            registry.isApprovedForAll(registry.owner(node), msg.sender) ||
            hasRole(CONTROLLER_ROLE, msg.sender),
            "Resolver: not authorised"
        );
        _;
    }

    // ─── Initializer ──────────────────────────────────────────────────────────
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(IArcNSRegistry _registry, address _admin) external initializer {
        __AccessControl_init();
        registry = _registry;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE,    _admin);
        _grantRole(UPGRADER_ROLE, _admin);
    }

    // ─── Address records ──────────────────────────────────────────────────────

    function setAddr(bytes32 node, address a) external authorised(node) {
        _setAddr(node, 60, _addressToBytes(a));
    }

    function setAddr(bytes32 node, uint coinType, bytes memory newAddress) public authorised(node) {
        _setAddr(node, coinType, newAddress);
    }

    function _setAddr(bytes32 node, uint coinType, bytes memory newAddress) internal {
        emit AddressChanged(node, coinType, newAddress);
        if (coinType == 60) emit AddrChanged(node, _bytesToAddress(newAddress));
        _addresses[node][coinType] = newAddress;
    }

    function addr(bytes32 node) external view override returns (address payable) {
        bytes memory a = _addresses[node][60];
        if (a.length == 0) return payable(address(0));
        return payable(_bytesToAddress(a));
    }

    function addr(bytes32 node, uint coinType) external view override returns (bytes memory) {
        return _addresses[node][coinType];
    }

    // ─── Text records ─────────────────────────────────────────────────────────

    function setText(bytes32 node, string calldata key, string calldata value) external authorised(node) {
        _texts[node][key] = value;
        emit TextChanged(node, key, key, value);
    }

    function text(bytes32 node, string calldata key) external view override returns (string memory) {
        return _texts[node][key];
    }

    // ─── Content hash ─────────────────────────────────────────────────────────

    function setContenthash(bytes32 node, bytes calldata hash) external authorised(node) {
        _contenthashes[node] = hash;
        emit ContenthashChanged(node, hash);
    }

    function contenthash(bytes32 node) external view override returns (bytes memory) {
        return _contenthashes[node];
    }

    // ─── Name (reverse) records ───────────────────────────────────────────────

    function setName(bytes32 node, string calldata name_) external authorised(node) {
        _names[node] = name_;
        emit NameChanged(node, name_);
    }

    function name(bytes32 node) external view override returns (string memory) {
        return _names[node];
    }

    function setNameForAddr(
        address addr_,
        address /*owner_*/,
        address /*resolverAddr*/,
        string memory name_
    ) external {
        require(
            msg.sender == addr_ || hasRole(CONTROLLER_ROLE, msg.sender),
            "Resolver: not authorised for addr"
        );
        bytes32 node = _reverseNode(addr_);
        _names[node] = name_;
        emit NameChanged(node, name_);
    }

    // ─── Controller management ────────────────────────────────────────────────

    function setController(address controller, bool trusted) external onlyRole(ADMIN_ROLE) {
        if (trusted) {
            _grantRole(CONTROLLER_ROLE, controller);
        } else {
            _revokeRole(CONTROLLER_ROLE, controller);
        }
    }

    // ─── Interface detection ──────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceID) public view override(AccessControlUpgradeable, IArcNSResolver) returns (bool) {
        return
            interfaceID == 0x3b3b57de ||
            interfaceID == 0xf1cb7e06 ||
            interfaceID == 0x59d1d43c ||
            interfaceID == 0xbc1c58d1 ||
            interfaceID == 0x691f3431 ||
            interfaceID == 0x01ffc9a7 ||
            super.supportsInterface(interfaceID);
    }

    // ─── UUPS ─────────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    function _bytesToAddress(bytes memory b) internal pure returns (address) {
        require(b.length == 20, "Resolver: invalid address length");
        address a;
        assembly { a := mload(add(b, 20)) }
        return a;
    }

    function _reverseNode(address addr_) internal pure returns (bytes32) {
        bytes32 reverseBaseNode = 0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;
        return keccak256(abi.encodePacked(reverseBaseNode, keccak256(abi.encodePacked(_toHexString(addr_)))));
    }

    function _toHexString(address addr_) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(addr_);
        bytes memory str = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2]     = alphabet[uint8(data[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
