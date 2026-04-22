// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockUSDC
/// @notice Test USDC token with 6 decimals — for local/testnet use only
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("USD Coin", "USDC") Ownable(msg.sender) {
        // Mint 1,000,000 USDC to deployer for testing
        _mint(msg.sender, 1_000_000 * 10 ** 6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Faucet — anyone can mint up to 10,000 USDC for testing
    function faucet(address to, uint256 amount) external {
        require(amount <= 10_000 * 10 ** 6, "MockUSDC: max 10,000 USDC per call");
        _mint(to, amount);
    }
}
