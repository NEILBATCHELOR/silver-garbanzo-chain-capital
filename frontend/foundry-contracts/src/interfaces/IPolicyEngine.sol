// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPolicyEngine
 * @notice Interface for the on-chain policy enforcement engine
 */
interface IPolicyEngine {
    /**
     * @notice Validate an operation against configured policies
     * @param token Token address
     * @param operator Operator address
     * @param operation Operation type (mint, burn, lock, unlock, block, unblock, transfer)
     * @param amount Operation amount
     * @return valid Whether the operation is valid
     * @return reason Rejection reason if invalid
     */
    function validateOperation(
        address token,
        address operator,
        string memory operation,
        uint256 amount
    ) external returns (bool valid, string memory reason);
    
    /**
     * @notice Validate a transfer operation
     * @param token Token address
     * @param from Sender address
     * @param to Receiver address
     * @param amount Transfer amount
     * @return valid Whether the transfer is valid
     * @return reason Rejection reason if invalid
     */
    function validateTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external returns (bool valid, string memory reason);
    
    /**
     * @notice Register a policy for a token operation
     * @param token Token address
     * @param operation Operation type
     * @param maxAmount Maximum amount per operation
     * @param dailyLimit Daily limit per operator
     * @param monthlyLimit Monthly limit per operator
     * @param cooldownPeriod Cooldown between operations
     */
    function registerTokenPolicy(
        address token,
        string memory operation,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint256 cooldownPeriod
    ) external;
    
    /**
     * @notice Configure approval requirements for a policy
     * @param token Token address
     * @param operation Operation type
     * @param requiresApproval Whether approval is required
     * @param threshold Number of approvals needed
     * @param approvers List of approvers
     */
    function configureApprovals(
        address token,
        string memory operation,
        bool requiresApproval,
        uint256 threshold,
        address[] memory approvers
    ) external;
    
    /**
     * @notice Approve a pending operation
     * @param approvalId Approval request ID
     */
    function approveOperation(bytes32 approvalId) external;
    
    /**
     * @notice Whitelist an address to bypass policies
     * @param addr Address to whitelist
     */
    function whitelistAddress(address addr) external;
    
    /**
     * @notice Blacklist an address to block all operations
     * @param addr Address to blacklist
     */
    function blacklistAddress(address addr) external;
    
    /**
     * @notice Get policy details for a token operation
     */
    function getPolicy(address token, string memory operation) external view returns (
        bool active,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint256 cooldownPeriod,
        bool requiresApproval,
        uint256 approvalThreshold
    );
}
