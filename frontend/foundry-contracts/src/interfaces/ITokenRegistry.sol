// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ITokenRegistry
 * @notice Interface for TokenRegistry
 */
interface ITokenRegistry {
    function registerToken(
        address proxy,
        address implementation,
        address deployer,
        string memory standard,
        string memory name,
        string memory symbol
    ) external;
    
    function recordUpgrade(
        address proxy,
        address newImplementation,
        string memory reason
    ) external;
}
