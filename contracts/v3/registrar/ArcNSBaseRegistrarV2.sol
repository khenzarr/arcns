// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./ArcNSBaseRegistrar.sol";
import "../interfaces/IArcNSBaseRegistrarV2.sol";

/// @title ArcNSBaseRegistrarV2
/// @notice Label-aware ArcNS registrar with accurate Arc Mainnet NFT metadata.
/// @dev The V1 registrar only retained labelhashes, so its on-chain metadata could
///      not reconstruct plaintext names. V2 stores the validated plaintext label at
///      registration time. Optional constructor seeds preserve active registrations
///      during a registrar migration without introducing a permanent migration role.
contract ArcNSBaseRegistrarV2 is ArcNSBaseRegistrar, IArcNSBaseRegistrarV2 {
    error LabelRequired();
    error LabelHashMismatch();
    error InvalidSeedData();

    uint256 public constant override metadataVersion = 2;

    mapping(uint256 => string) private _labels;

    constructor(
        IArcNSRegistry registry_,
        bytes32 baseNode_,
        string memory tld_,
        string[] memory seedLabels,
        address[] memory seedOwners,
        uint256[] memory seedExpiries
    ) ArcNSBaseRegistrar(registry_, baseNode_, tld_) {
        uint256 length = seedLabels.length;
        if (length != seedOwners.length || length != seedExpiries.length) revert InvalidSeedData();

        for (uint256 i; i < length; ++i) {
            string memory label = seedLabels[i];
            address owner_ = seedOwners[i];
            uint256 expiry = seedExpiries[i];
            bool pastGracePeriod = expiry < block.timestamp && block.timestamp - expiry > GRACE_PERIOD;
            if (bytes(label).length == 0 || owner_ == address(0) || pastGracePeriod) {
                revert InvalidSeedData();
            }

            uint256 id = uint256(keccak256(bytes(label)));
            if (_ownerOf(id) != address(0)) revert InvalidSeedData();
            _labels[id] = label;
            nameExpires[id] = expiry;
            _mint(owner_, id);
            emit NameRegistered(id, owner_, expiry);
        }
    }

    /// @dev V1 hash-only entrypoints are intentionally disabled. This prevents a
    ///      stale controller implementation from minting another unnamed token.
    function register(uint256, address, uint256)
        external
        pure
        override(ArcNSBaseRegistrar, IArcNSBaseRegistrar)
        returns (uint256)
    {
        revert LabelRequired();
    }

    function registerWithResolver(uint256, address, uint256, address)
        external
        pure
        override(ArcNSBaseRegistrar, IArcNSBaseRegistrar)
        returns (uint256)
    {
        revert LabelRequired();
    }

    function registerWithLabel(
        uint256 id,
        string calldata label,
        address owner_,
        uint256 duration
    ) external override live onlyController returns (uint256) {
        return _registerLabel(id, label, owner_, duration, address(0), false);
    }

    function registerWithResolverAndLabel(
        uint256 id,
        string calldata label,
        address owner_,
        uint256 duration,
        address resolver_
    ) external override live onlyController returns (uint256) {
        return _registerLabel(id, label, owner_, duration, resolver_, true);
    }

    function labelOf(uint256 id) external view override returns (string memory) {
        return _labels[id];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory label = _labels[tokenId];
        if (bytes(label).length == 0) revert LabelRequired();

        string memory fullName = string(abi.encodePacked(label, ".", tld));
        uint256 expiry = nameExpires[tokenId];
        bool expired = expiry < block.timestamp;
        string memory svgB64 = _base64Encode(bytes(_buildSVG(fullName, expired)));

        string memory json = string(abi.encodePacked(
            '{"name":"', fullName, '",',
            '"description":"ArcNS domain name. Decentralized identity on Arc Mainnet.",',
            '"image":"data:image/svg+xml;base64,', svgB64, '",',
            '"attributes":[',
              '{"trait_type":"TLD","value":".', tld, '"},',
              '{"trait_type":"Expiry","display_type":"date","value":', _uint2str(expiry), '},',
              '{"trait_type":"Status","value":"', expired ? "Expired" : "Active", '"}',
            ']}'
        ));

        return string(abi.encodePacked(
            "data:application/json;base64,",
            _base64Encode(bytes(json))
        ));
    }

    function _registerLabel(
        uint256 id,
        string calldata label,
        address owner_,
        uint256 duration,
        address resolver_,
        bool setResolver
    ) internal returns (uint256 expiry) {
        if (bytes(label).length == 0) revert LabelRequired();
        if (uint256(keccak256(bytes(label))) != id) revert LabelHashMismatch();
        if (!available(id)) revert NameNotAvailable(id);

        expiry = block.timestamp + duration;
        _labels[id] = label;
        nameExpires[id] = expiry;

        if (_ownerOf(id) == address(0)) {
            _mint(owner_, id);
        } else {
            _transfer(_ownerOf(id), owner_, id);
        }

        if (setResolver) {
            registry.setSubnodeRecord(baseNode, bytes32(id), owner_, resolver_, 0);
        } else {
            registry.setSubnodeOwner(baseNode, bytes32(id), owner_);
        }

        emit NameRegistered(id, owner_, expiry);
    }
}
