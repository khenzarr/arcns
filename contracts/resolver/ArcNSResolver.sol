// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSResolver.sol";

/// @title ArcNSResolver
/// @notice Modular public resolver — stores addr, text, contenthash, name records
/// @dev Mirrors ENS PublicResolver; supports multi-coin (EIP-2304) and reverse records
contract ArcNSResolver is IArcNSResolver, Ownable {
    // ─── State ────────────────────────────────────────────────────────────────

    IArcNSRegistry public immutable registry;

    // node → coinType → address bytes
    mapping(bytes32 => mapping(uint256 => bytes)) private _addresses;
    // node → key → value
    mapping(bytes32 => mapping(string => string))  private _texts;
    // node → contenthash
    mapping(bytes32 => bytes)                      private _contenthashes;
    // node → name (for reverse records)
    mapping(bytes32 => string)                     private _names;

    // Trusted controllers that can set records on behalf of users
    mapping(address => bool) public trustedControllers;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier authorised(bytes32 node) {
        require(
            registry.owner(node) == msg.sender ||
            registry.isApprovedForAll(registry.owner(node), msg.sender) ||
            trustedControllers[msg.sender],
            "Resolver: not authorised"
        );
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(IArcNSRegistry _registry) Ownable(msg.sender) {
        registry = _registry;
    }

    // ─── Address records ──────────────────────────────────────────────────────

    /// @notice Set EVM address (coin type 60)
    function setAddr(bytes32 node, address a) external authorised(node) {
        setAddr(node, 60, _addressToBytes(a));
    }

    /// @notice Set multi-coin address
    function setAddr(bytes32 node, uint coinType, bytes memory newAddress) public authorised(node) {
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

    /// @notice Called by controller to set reverse record in one tx
    function setNameForAddr(
        address addr_,
        address /*owner_*/,
        address /*resolverAddr*/,
        string memory name_
    ) external {
        require(
            msg.sender == addr_ ||
            trustedControllers[msg.sender],
            "Resolver: not authorised for addr"
        );
        bytes32 node = _reverseNode(addr_);
        _names[node] = name_;
        emit NameChanged(node, name_);
    }

    // ─── Trusted controllers ──────────────────────────────────────────────────

    function setTrustedController(address controller, bool trusted) external onlyOwner {
        trustedControllers[controller] = trusted;
    }

    // ─── Interface detection ──────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        return
            interfaceID == 0x3b3b57de || // addr(bytes32)
            interfaceID == 0xf1cb7e06 || // addr(bytes32,uint)
            interfaceID == 0x59d1d43c || // text
            interfaceID == 0xbc1c58d1 || // contenthash
            interfaceID == 0x691f3431 || // name
            interfaceID == 0x01ffc9a7;   // ERC-165
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _addressToBytes(address a) internal pure returns (bytes memory) {
        return abi.encodePacked(a);
    }

    function _bytesToAddress(bytes memory b) internal pure returns (address) {
        require(b.length == 20, "Resolver: invalid address length");
        address addr_;
        assembly { addr_ := mload(add(b, 20)) }
        return addr_;
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
