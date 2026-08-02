// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IArcNSEarlyAdopterDiscountRegistry {
    function consume(address account, bytes32[] calldata proof) external;
}