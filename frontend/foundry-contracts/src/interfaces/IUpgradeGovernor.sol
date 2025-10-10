// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IUpgradeGovernor
 * @notice Interface for UpgradeGovernor
 */
interface IUpgradeGovernor {
    function canExecuteUpgrade(
        address executor,
        string memory tokenStandard,
        address newImplementation
    ) external view returns (bool);
    
    function proposeUpgrade(
        address target,
        address newImplementation,
        bytes memory data,
        string memory description
    ) external returns (uint256 proposalId);
}
