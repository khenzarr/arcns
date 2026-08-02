// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title ArcNSEarlyAdopterDiscountRegistry
/// @notice Shared, wallet-level one-time claim state for all ArcNS v3 controllers.
contract ArcNSEarlyAdopterDiscountRegistry is Ownable {
    error DiscountInactive();
    error RootNotFrozen();
    error EmptyMerkleRoot();
    error InvalidAccount();
    error DiscountAlreadyUsed(address account);
    error UnauthorizedController(address controller);
    error InvalidProof();
    error RootAlreadyFrozen();

    bytes32 public immutable campaignId;
    uint256 public immutable snapshotBlock;
    bytes32 public merkleRoot;
    bool public discountActive;
    bool public rootFrozen;

    mapping(address => bool) public used;
    mapping(address => bool) public authorizedControllers;

    event DiscountRootUpdated(bytes32 indexed oldRoot, bytes32 indexed newRoot);
    event DiscountRootFrozen(bytes32 indexed root);
    event DiscountActiveUpdated(bool active);
    event DiscountControllerAuthorizationUpdated(address indexed controller, bool authorized);
    event DiscountUsed(address indexed account, address indexed controller, bytes32 indexed campaignId);

    constructor(bytes32 campaignId_, uint256 snapshotBlock_, address owner_) Ownable(owner_) {
        if (campaignId_ == bytes32(0)) revert EmptyMerkleRoot();
        if (owner_ == address(0)) revert InvalidAccount();
        campaignId = campaignId_;
        snapshotBlock = snapshotBlock_;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        if (rootFrozen) revert RootAlreadyFrozen();
        bytes32 oldRoot = merkleRoot;
        merkleRoot = newRoot;
        emit DiscountRootUpdated(oldRoot, newRoot);
    }

    function freezeRoot() external onlyOwner {
        if (rootFrozen) revert RootAlreadyFrozen();
        if (merkleRoot == bytes32(0)) revert EmptyMerkleRoot();
        rootFrozen = true;
        emit DiscountRootFrozen(merkleRoot);
    }

    function setDiscountActive(bool active) external onlyOwner {
        discountActive = active;
        emit DiscountActiveUpdated(active);
    }

    function setControllerAuthorization(address controller, bool authorized) external onlyOwner {
        if (controller == address(0)) revert InvalidAccount();
        authorizedControllers[controller] = authorized;
        emit DiscountControllerAuthorizationUpdated(controller, authorized);
    }

    function consume(address account, bytes32[] calldata proof) external {
        if (!authorizedControllers[msg.sender]) revert UnauthorizedController(msg.sender);
        if (!discountActive) revert DiscountInactive();
        if (!rootFrozen) revert RootNotFrozen();
        bytes32 root = merkleRoot;
        if (root == bytes32(0)) revert EmptyMerkleRoot();
        if (account == address(0)) revert InvalidAccount();
        if (used[account]) revert DiscountAlreadyUsed(account);

        bytes32 leaf = keccak256(abi.encode(campaignId, account));
        if (!MerkleProof.verifyCalldata(proof, root, leaf)) revert InvalidProof();

        used[account] = true;
        emit DiscountUsed(account, msg.sender, campaignId);
    }
}