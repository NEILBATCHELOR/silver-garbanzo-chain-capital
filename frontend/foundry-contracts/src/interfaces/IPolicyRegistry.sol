// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IPolicyRegistry
 * @notice Interface for PolicyRegistry
 */
interface IPolicyRegistry {
    function registerToken(
        address token,
        string memory standard,
        address policyEngine
    ) external;
    
    function registerPolicy(
        address token,
        string memory operationType,
        address policyEngine
    ) external;
}
