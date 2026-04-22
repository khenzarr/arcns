// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../resolver/ArcNSResolver.sol";

/// @title ArcNSReverseRegistrar
/// @notice Manages the addr.reverse TLD for reverse resolution
/// @dev Mirrors ENS ReverseRegistrar; maps address → name
contract ArcNSReverseRegistrar is Ownable {
    // ─── Constants ────────────────────────────────────────────────────────────

    // namehash("reverse")
    bytes32 public constant REVERSE_NODE =
        0xa097f6721ce401e757d1223a763fef49b8b5f90bb18567ddb86fd205dff71d34;

    // namehash("addr.reverse")
    bytes32 public constant ADDR_REVERSE_NODE =
        0x91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2;

    // ─── State ────────────────────────────────────────────────────────────────

    IArcNSRegistry public immutable registry;
    ArcNSResolver  public           defaultResolver;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ReverseClaimed(address indexed addr, bytes32 indexed node);
    event DefaultResolverChanged(address indexed resolver);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(IArcNSRegistry _registry, ArcNSResolver _defaultResolver) Ownable(msg.sender) {
        registry        = _registry;
        defaultResolver = _defaultResolver;
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /// @notice Claim reverse node for msg.sender
    function claim(address owner_) external returns (bytes32) {
        return _claimWithResolver(msg.sender, owner_, address(defaultResolver));
    }

    /// @notice Claim reverse node with a specific resolver
    function claimWithResolver(address owner_, address resolver_) external returns (bytes32) {
        return _claimWithResolver(msg.sender, owner_, resolver_);
    }

    /// @notice Claim reverse node for a contract (must be called by contract itself or owner)
    function claimForAddr(
        address addr_,
        address owner_,
        address resolver_
    ) external returns (bytes32) {
        require(
            addr_ == msg.sender ||
            _isOwnerOrApproved(addr_, msg.sender),
            "ReverseRegistrar: not authorised"
        );
        return _claimWithResolver(addr_, owner_, resolver_);
    }

    /// @notice Set name for msg.sender's reverse record
    function setName(string calldata name_) external returns (bytes32) {
        bytes32 rnode = _claimWithResolver(msg.sender, msg.sender, address(defaultResolver));
        defaultResolver.setName(rnode, name_);
        return rnode;
    }

    /// @notice Set name for a specific address (must be authorised)
    function setNameForAddr(
        address addr_,
        address owner_,
        address resolver_,
        string calldata name_
    ) external returns (bytes32) {
        require(
            addr_ == msg.sender ||
            _isOwnerOrApproved(addr_, msg.sender),
            "ReverseRegistrar: not authorised"
        );
        bytes32 rnode = _claimWithResolver(addr_, owner_, resolver_);
        ArcNSResolver(resolver_).setName(rnode, name_);
        return rnode;
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    /// @notice Returns the reverse node for an address
    function node(address addr_) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(ADDR_REVERSE_NODE, _sha3HexAddress(addr_)));
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setDefaultResolver(ArcNSResolver _resolver) external onlyOwner {
        defaultResolver = _resolver;
        emit DefaultResolverChanged(address(_resolver));
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _claimWithResolver(
        address addr_,
        address owner_,
        address resolver_
    ) internal returns (bytes32) {
        bytes32 label   = _sha3HexAddress(addr_);
        bytes32 rnode   = keccak256(abi.encodePacked(ADDR_REVERSE_NODE, label));

        address currentOwner = registry.owner(rnode);

        if (resolver_ != address(0) && resolver_ != registry.resolver(rnode)) {
            // Set subnode with resolver
            registry.setSubnodeRecord(ADDR_REVERSE_NODE, label, owner_, resolver_, 0);
        } else if (currentOwner != owner_) {
            registry.setSubnodeOwner(ADDR_REVERSE_NODE, label, owner_);
        }

        emit ReverseClaimed(addr_, rnode);
        return rnode;
    }

    function _sha3HexAddress(address addr_) internal pure returns (bytes32) {
        bytes memory hexAddr = _toHexStringBytes(addr_);
        return keccak256(hexAddr);
    }

    function _toHexStringBytes(address addr_) internal pure returns (bytes memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(addr_);
        bytes memory str = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            str[i * 2]     = alphabet[uint8(data[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(data[i] & 0x0f)];
        }
        return str;
    }

    function _isOwnerOrApproved(address addr_, address caller) internal view returns (bool) {
        // Check if caller is approved operator in registry for addr_'s reverse node
        bytes32 rnode = node(addr_);
        address nodeOwner = registry.owner(rnode);
        return nodeOwner == caller || registry.isApprovedForAll(nodeOwner, caller);
    }
}
