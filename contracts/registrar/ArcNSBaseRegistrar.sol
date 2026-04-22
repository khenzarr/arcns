// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IArcNSRegistry.sol";

/// @title ArcNSBaseRegistrar
/// @notice Owns a TLD node in the registry and issues ERC-721 tokens for second-level domains
/// @dev Mirrors ENS BaseRegistrarImplementation; supports multiple TLDs (.arc, .circle)
contract ArcNSBaseRegistrar is ERC721, Ownable {
    // ─── State ────────────────────────────────────────────────────────────────

    IArcNSRegistry public immutable registry;
    bytes32        public immutable baseNode;   // namehash of TLD (e.g. namehash("arc"))
    string         public tld;                  // human-readable TLD string

    uint256 public constant GRACE_PERIOD = 90 days;

    mapping(uint256 => uint256) public nameExpires; // tokenId (labelHash) → expiry timestamp
    mapping(address => bool)    public controllers;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ControllerAdded(address indexed controller);
    event ControllerRemoved(address indexed controller);
    event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires);
    event NameRenewed(uint256 indexed id, uint256 expires);
    event NameTransferred(uint256 indexed id, address indexed newOwner);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyController() {
        require(controllers[msg.sender], "BaseRegistrar: caller is not a controller");
        _;
    }

    modifier live() {
        require(registry.owner(baseNode) == address(this), "BaseRegistrar: not live");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        IArcNSRegistry _registry,
        bytes32 _baseNode,
        string memory _tld
    ) ERC721(
        string(abi.encodePacked("ArcNS ", _tld, " Name")),
        string(abi.encodePacked("ARCNS-", _tld))
    ) Ownable(msg.sender) {
        registry = _registry;
        baseNode = _baseNode;
        tld      = _tld;
    }

    // ─── Controller management ────────────────────────────────────────────────

    function addController(address controller) external onlyOwner {
        controllers[controller] = true;
        emit ControllerAdded(controller);
    }

    function removeController(address controller) external onlyOwner {
        controllers[controller] = false;
        emit ControllerRemoved(controller);
    }

    // ─── Registration ─────────────────────────────────────────────────────────

    /// @notice Register a new name. Called by controller after payment.
    function register(
        uint256 id,
        address owner_,
        uint256 duration
    ) external live onlyController returns (uint256) {
        require(available(id), "BaseRegistrar: name not available");

        uint256 expiry = block.timestamp + duration;
        nameExpires[id] = expiry;

        if (_ownerOf(id) == address(0)) {
            _mint(owner_, id);
        } else {
            // Re-registration after expiry+grace
            _transfer(_ownerOf(id), owner_, id);
        }

        // Set subnode owner in registry to the new owner
        registry.setSubnodeOwner(baseNode, bytes32(id), owner_);

        emit NameRegistered(id, owner_, expiry);
        return expiry;
    }

    /// @notice Register and set resolver atomically. Called by controller.
    function registerWithResolver(
        uint256 id,
        address owner_,
        uint256 duration,
        address resolver_
    ) external live onlyController returns (uint256) {
        require(available(id), "BaseRegistrar: name not available");

        uint256 expiry = block.timestamp + duration;
        nameExpires[id] = expiry;

        if (_ownerOf(id) == address(0)) {
            _mint(owner_, id);
        } else {
            _transfer(_ownerOf(id), owner_, id);
        }

        // Set subnode record (owner + resolver) atomically — registrar owns baseNode
        registry.setSubnodeRecord(baseNode, bytes32(id), owner_, resolver_, 0);

        emit NameRegistered(id, owner_, expiry);
        return expiry;
    }

    /// @notice Renew an existing name. Called by controller after payment.
    function renew(uint256 id, uint256 duration) external live onlyController returns (uint256) {
        require(nameExpires[id] + GRACE_PERIOD >= block.timestamp, "BaseRegistrar: name expired");

        uint256 expiry = nameExpires[id] + duration;
        nameExpires[id] = expiry;

        emit NameRenewed(id, expiry);
        return expiry;
    }

    // ─── Queries ──────────────────────────────────────────────────────────────

    function available(uint256 id) public view returns (bool) {
        return nameExpires[id] + GRACE_PERIOD < block.timestamp;
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        require(nameExpires[tokenId] > block.timestamp, "BaseRegistrar: name expired");
        return super.ownerOf(tokenId);
    }

    // ─── Registry reclaim ─────────────────────────────────────────────────────

    /// @notice Allows NFT owner to reclaim registry ownership of their name
    function reclaim(uint256 id, address owner_) external live {
        require(_isAuthorized(_ownerOf(id), msg.sender, id), "BaseRegistrar: not token owner");
        registry.setSubnodeOwner(baseNode, bytes32(id), owner_);
    }

    // ─── Token URI — Phase 21: on-chain JSON + SVG metadata ──────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory label = _labelForToken(tokenId);
        string memory fullName = string(abi.encodePacked(label, ".", tld));
        uint256 expiry = nameExpires[tokenId];
        string memory expiryStr = _uint2str(expiry);
        bool expired = expiry < block.timestamp;

        string memory svg = _buildSVG(fullName, expired);
        string memory svgB64 = _base64Encode(bytes(svg));

        string memory json = string(abi.encodePacked(
            '{"name":"', fullName, '",'
            '"description":"ArcNS domain name. Decentralized identity on Arc Testnet.",'
            '"image":"data:image/svg+xml;base64,', svgB64, '",'
            '"attributes":['
              '{"trait_type":"Domain","value":"', fullName, '"},'
              '{"trait_type":"TLD","value":".', tld, '"},'
              '{"trait_type":"Expiry","display_type":"date","value":', expiryStr, '},'
              '{"trait_type":"Status","value":"', expired ? "Expired" : "Active", '"}'
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(json))
        ));
    }

    function _labelForToken(uint256 tokenId) internal pure returns (string memory) {
        // tokenId is keccak256(label) — we store the hex representation
        return string(abi.encodePacked("0x", _toHex32(bytes32(tokenId))));
    }

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
        bytes memory hex_ = new bytes(64);
        bytes memory alphabet = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            hex_[i * 2]     = alphabet[uint8(b[i] >> 4)];
            hex_[i * 2 + 1] = alphabet[uint8(b[i] & 0x0f)];
        }
        return string(hex_);
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v; uint256 len;
        while (tmp != 0) { len++; tmp /= 10; }
        bytes memory buf = new bytes(len);
        while (v != 0) { len--; buf[len] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(buf);
    }

    // ─── Base64 encoder ───────────────────────────────────────────────────────

    string internal constant _B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        bytes memory table = bytes(_B64_CHARS);
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        bytes memory result = new bytes(encodedLen);
        uint256 i = 0; uint256 j = 0;
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
        // Padding
        if (data.length % 3 == 1) { result[encodedLen - 1] = "="; result[encodedLen - 2] = "="; }
        else if (data.length % 3 == 2) { result[encodedLen - 1] = "="; }
        return string(result);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        return _uint2str(value);
    }
}
