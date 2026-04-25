// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IArcNSRegistry.sol";

/// @title IArcNSBaseRegistrar
/// @notice Interface for the ArcNS base registrar — implements EIP-721 pattern for domain names
interface IArcNSBaseRegistrar {
    /// @notice Emitted when a controller is added
    event ControllerAdded(address indexed controller);

    /// @notice Emitted when a controller is removed
    event ControllerRemoved(address indexed controller);

    /// @notice Emitted when a name is registered
    event NameRegistered(uint256 indexed id, address indexed owner, uint256 expires);

    /// @notice Emitted when a name is renewed
    event NameRenewed(uint256 indexed id, uint256 expires);

    /// @notice Adds a controller that can register and renew names
    /// @param controller The controller address to add
    function addController(address controller) external;

    /// @notice Removes a controller
    /// @param controller The controller address to remove
    function removeController(address controller) external;

    /// @notice Registers a new name
    /// @param id The token ID (labelhash)
    /// @param owner_ The owner of the new name
    /// @param duration Registration duration in seconds
    /// @return expiry The expiry timestamp
    function register(uint256 id, address owner_, uint256 duration) external returns (uint256);

    /// @notice Registers a new name and sets a resolver atomically
    /// @param id The token ID (labelhash)
    /// @param owner_ The owner of the new name
    /// @param duration Registration duration in seconds
    /// @param resolver_ The resolver address to set
    /// @return expiry The expiry timestamp
    function registerWithResolver(uint256 id, address owner_, uint256 duration, address resolver_) external returns (uint256);

    /// @notice Renews an existing name
    /// @param id The token ID (labelhash)
    /// @param duration Additional duration in seconds
    /// @return expiry The new expiry timestamp
    function renew(uint256 id, uint256 duration) external returns (uint256);

    /// @notice Returns whether a name is available for registration
    /// @param id The token ID (labelhash)
    /// @return True if the name is available
    function available(uint256 id) external view returns (bool);

    /// @notice Returns the expiry timestamp for a token ID
    /// @param id The token ID (labelhash)
    /// @return The expiry timestamp (0 if never registered)
    function nameExpires(uint256 id) external view returns (uint256);

    /// @notice Returns the human-readable TLD string (e.g. "arc")
    /// @return The TLD string
    function tld() external view returns (string memory);

    /// @notice Returns the namehash of the TLD node this registrar owns
    /// @return The base node hash
    function baseNode() external view returns (bytes32);

    /// @notice Allows the NFT owner to reclaim registry ownership of their name
    /// @param id The token ID (labelhash)
    /// @param owner_ The address to set as registry owner
    function reclaim(uint256 id, address owner_) external;
}
