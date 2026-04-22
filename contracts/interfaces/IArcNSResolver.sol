// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IArcNSResolver
/// @notice Modular resolver interface supporting address, text, contenthash records
interface IArcNSResolver {
    event AddrChanged(bytes32 indexed node, address a);
    event AddressChanged(bytes32 indexed node, uint coinType, bytes newAddress);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);
    event ContenthashChanged(bytes32 indexed node, bytes hash);
    event NameChanged(bytes32 indexed node, string name);

    // EIP-137 addr
    function addr(bytes32 node) external view returns (address payable);

    // EIP-2304 multi-coin addr
    function addr(bytes32 node, uint coinType) external view returns (bytes memory);

    // Text records
    function text(bytes32 node, string calldata key) external view returns (string memory);

    // Content hash
    function contenthash(bytes32 node) external view returns (bytes memory);

    // Reverse name
    function name(bytes32 node) external view returns (string memory);

    // Interface detection
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}
