// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSRegistry.sol";
import "../interfaces/IArcNSBaseRegistrar.sol";

/// @title ArcNSBaseRegistrar
/// @notice Owns a TLD node in the registry and issues ERC-721 tokens for second-level domains
/// @dev Non-upgradeable. Implements EIP-721 pattern for domain name ownership.
///      Supports multiple TLDs (.arc, .circle). Generates fully on-chain SVG tokenURI.
contract ArcNSBaseRegistrar is ERC721, Ownable, IArcNSBaseRegistrar {
    // ─── Errors ───────────────────────────────────────────────────────────────

    /// @notice Thrown when the caller is not an approved controller
    error NotController();

    /// @notice Thrown when the registrar does not own the base node in the registry
    error NotLive();

    /// @notice Thrown when a name is not available for registration
    error NameNotAvailable(uint256 id);

    /// @notice Thrown when a name has expired past the grace period
    error NameExpired(uint256 id);

    /// @notice Thrown when the caller is not the token owner or approved
    error NotTokenOwner();

    // ─── State ────────────────────────────────────────────────────────────────

    /// @notice The ArcNS registry contract
    IArcNSRegistry public immutable registry;

    /// @notice The namehash of the TLD node this registrar owns (e.g. namehash("arc"))
    bytes32 public immutable baseNode;

    /// @notice The human-readable TLD string (e.g. "arc")
    string public tld;

    /// @notice Grace period after expiry during which the name cannot be re-registered
    uint256 public constant GRACE_PERIOD = 90 days;

    /// @notice Maps token ID (labelhash) to expiry timestamp
    mapping(uint256 => uint256) public nameExpires;

    /// @notice Maps controller address to approval status
    mapping(address => bool) public controllers;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyController() {
        if (!controllers[msg.sender]) revert NotController();
        _;
    }

    modifier live() {
        if (registry.owner(baseNode) != address(this)) revert NotLive();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @notice Deploys the registrar for a specific TLD
    /// @param registry_ The ArcNS registry contract
    /// @param baseNode_ The namehash of the TLD node
    /// @param tld_ The human-readable TLD string (e.g. "arc")
    constructor(
        IArcNSRegistry registry_,
        bytes32 baseNode_,
        string memory tld_
    ) ERC721(
        string(abi.encodePacked("ArcNS ", tld_, " Name")),
        string(abi.encodePacked("ARCNS-", tld_))
    ) Ownable(msg.sender) {
        registry = registry_;
        baseNode = baseNode_;
        tld      = tld_;
    }

    // ─── Controller management ────────────────────────────────────────────────

    /// @notice Adds a controller that can register and renew names
    /// @param controller The controller address to add
    function addController(address controller) external override onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    /// @notice Removes a controller
    /// @param controller The controller address to remove
    function removeController(address controller) external override onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /// @notice Registers a new name
    /// @param id The token ID (labelhash)
    /// @param owner_ The owner of the new name
    /// @param duration Registration duration in seconds
    /// @return expiry The expiry timestamp
    function register(
        uint256 id,
        address owner_,
        uint256 duration
    ) external override live onlyController returns (uint256) {
        if (!available(id)) revert NameNotAvailable(id);

        uint256 expiry = block.timestamp + duration;
        nameExpires[id] = expiry;

        if (_ownerOf(id) == address(0)) {
            _mint(owner_, id);
        } else {
            _transfer(_ownerOf(id), owner_, id);
        }

        registry.setSubnodeOwner(baseNode, bytes32(id), owner_);

        emit NameRegistered(id, owner_, expiry);
        return expiry;
    }

    /// @notice Registers a new name and sets a resolver atomically
    /// @param id The token ID (labelhash)
    /// @param owner_ The owner of the new name
    /// @param duration Registration duration in seconds
    /// @param resolver_ The resolver address to set
    /// @return expiry The expiry timestamp
    function registerWithResolver(
        uint256 id,
        address owner_,
        uint256 duration,
        address resolver_
    ) external override live onlyController returns (uint256) {
        if (!available(id)) revert NameNotAvailable(id);

        uint256 expiry = block.timestamp + duration;
        nameExpires[id] = expiry;

        if (_ownerOf(id) == address(0)) {
            _mint(owner_, id);
        } else {
            _transfer(_ownerOf(id), owner_, id);
        }

        registry.setSubnodeRecord(baseNode, bytes32(id), owner_, resolver_, 0);

        emit NameRegistered(id, owner_, expiry);
        return expiry;
    }

    /// @notice Renews an existing name
    /// @param id The token ID (labelhash)
    /// @param duration Additional duration in seconds
    /// @return expiry The new expiry timestamp
    function renew(uint256 id, uint256 duration) external override live onlyController returns (uint256) {
        if (nameExpires[id] + GRACE_PERIOD < block.timestamp) revert NameExpired(id);

        uint256 expiry = nameExpires[id] + duration;
        nameExpires[id] = expiry;

        emit NameRenewed(id, expiry);
        return expiry;
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    /// @notice Returns whether a name is available for registration
    /// @param id The token ID (labelhash)
    /// @return True if the name is available (never registered or past grace period)
    function available(uint256 id) public view override returns (bool) {
        return nameExpires[id] + GRACE_PERIOD < block.timestamp;
    }

    /// @notice Returns the owner of a token, reverting if the name has expired
    /// @param tokenId The token ID to query
    /// @return The owner address
    function ownerOf(uint256 tokenId) public view override returns (address) {
        if (nameExpires[tokenId] <= block.timestamp) revert NameExpired(tokenId);
        return super.ownerOf(tokenId);
    }

    // ─── Registry reclaim ─────────────────────────────────────────────────────

    /// @notice Allows the NFT owner to reclaim registry ownership of their name
    /// @dev DESIGN NOTE — NFT ownership vs. registry ownership divergence:
    ///
    ///      ArcNS maintains two independent ownership surfaces for each domain:
    ///
    ///      1. NFT ownership (ERC-721): tracked by this contract via `_ownerOf`.
    ///         Represents the right to control the domain — renew, transfer, reclaim.
    ///
    ///      2. Registry ownership (ArcNSRegistry): tracked by the registry contract.
    ///         Controls which resolver is used and who can write records for the node.
    ///
    ///      These two surfaces can diverge. For example:
    ///        - A user transfers the NFT to a new wallet. The registry node still points
    ///          to the old wallet until `reclaim` is called.
    ///        - A user calls `reclaim(id, someContract)` to delegate registry control
    ///          to a smart contract (e.g. a multisig or a resolver manager) while
    ///          retaining NFT ownership in their EOA.
    ///        - A user calls `reclaim(id, address(0))` to burn registry ownership
    ///          (permanently locks the node) while keeping the NFT.
    ///
    ///      This divergence is intentional and matches ENS mainnet behavior. It enables
    ///      advanced use cases like delegated resolver management. Auditors should note
    ///      that `owner_` is not required to equal `_ownerOf(id)` — this is by design.
    ///
    ///      The caller must be the NFT owner or an ERC-721 approved operator for the token.
    ///      The `live` modifier ensures this registrar still owns the TLD base node.
    ///
    /// @param id The token ID (labelhash of the second-level label)
    /// @param owner_ The address to set as registry owner for the domain node.
    ///               Does not need to match the NFT owner — see design note above.
    function reclaim(uint256 id, address owner_) external override live {
        if (!_isAuthorized(_ownerOf(id), msg.sender, id)) revert NotTokenOwner();
        registry.setSubnodeOwner(baseNode, bytes32(id), owner_);
    }

    // ─── Token URI — on-chain JSON + SVG metadata ─────────────────────────────

    /// @notice Returns the token URI with fully on-chain base64-encoded JSON metadata
    /// @param tokenId The token ID to query
    /// @return Base64-encoded data URI containing JSON metadata with inline SVG
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        // In v3 the label is stored as the hex of the labelhash since we only have the hash on-chain
        string memory labelHex = string(abi.encodePacked("0x", _toHex32(bytes32(tokenId))));
        string memory fullName = string(abi.encodePacked(labelHex, ".", tld));
        uint256 expiry = nameExpires[tokenId];
        bool expired = expiry < block.timestamp;

        string memory svg = _buildSVG(fullName, expired);
        string memory svgB64 = _base64Encode(bytes(svg));

        string memory json = string(abi.encodePacked(
            '{"name":"', fullName, '",'
            '"description":"ArcNS domain name. Decentralized identity on Arc Testnet.",'
            '"image":"data:image/svg+xml;base64,', svgB64, '",'
            '"attributes":['
              '{"trait_type":"TLD","value":".', tld, '"},'
              '{"trait_type":"Expiry","display_type":"date","value":', _uint2str(expiry), '},'
              '{"trait_type":"Status","value":"', expired ? "Expired" : "Active", '"}'
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(json))
        ));
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────

    function _buildSVG(string memory fullName, bool expired) internal pure returns (string memory) {
        string memory color = expired ? "#ef4444" : "#2563eb";
        string memory statusText = expired ? "EXPIRED" : "ACTIVE";
        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#0f172a"/><stop offset="100%" style="stop-color:#1e3a5f"/></linearGradient></defs>',
            '<rect width="400" height="400" fill="url(#bg)" rx="20"/>',
            '<circle cx="200" cy="120" r="50" fill="', color, '" opacity="0.15"/>',
            '<text x="200" y="130" font-family="monospace" font-size="32" fill="', color, '" text-anchor="middle" font-weight="bold">ARC</text>',
            '<text x="200" y="220" font-family="monospace" font-size="22" fill="#ffffff" text-anchor="middle" font-weight="bold">', fullName, '</text>',
            '<rect x="140" y="250" width="120" height="28" rx="14" fill="', color, '" opacity="0.2"/>',
            '<text x="200" y="269" font-family="monospace" font-size="12" fill="', color, '" text-anchor="middle">', statusText, '</text>',
            '<text x="200" y="360" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">Arc Name Service</text>',
            '</svg>'
        ));
    }

    function _toHex32(bytes32 b) internal pure returns (string memory) {
        bytes memory hexStr = new bytes(64);
        bytes memory alphabet = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            hexStr[i * 2]     = alphabet[uint8(b[i] >> 4)];
            hexStr[i * 2 + 1] = alphabet[uint8(b[i] & 0x0f)];
        }
        return string(hexStr);
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 len;
        while (tmp != 0) { len++; tmp /= 10; }
        bytes memory buf = new bytes(len);
        while (v != 0) { len--; buf[len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    string internal constant _B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        bytes memory table = bytes(_B64_CHARS);
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 i = 0;
        uint256 j = 0;
        while (i < data.length) {
            uint256 a = i < data.length ? uint8(data[i++]) : 0;
            uint256 b = i < data.length ? uint8(data[i++]) : 0;
            uint256 c = i < data.length ? uint8(data[i++]) : 0;
            uint256 triple = (a << 16) | (b << 8) | c;
            result[j++] = table[(triple >> 18) & 0x3F];
            result[j++] = table[(triple >> 12) & 0x3F];
            result[j++] = table[(triple >>  6) & 0x3F];
            result[j++] = table[ triple        & 0x3F];
        }
        if (data.length % 3 == 1) {
            result[encodedLen - 1] = "=";
            result[encodedLen - 2] = "=";
        } else if (data.length % 3 == 2) {
            result[encodedLen - 1] = "=";
        }
        return string(result);
    }
}
