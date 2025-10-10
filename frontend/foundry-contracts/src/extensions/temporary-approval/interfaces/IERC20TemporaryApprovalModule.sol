// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20TemporaryApprovalModule
 * @notice Interface for ERC-7674 temporary approval extension
 * @dev Uses EIP-1153 transient storage for gas-efficient, auto-expiring approvals
 * 
 * Key Features:
 * - 99.5% gas reduction: ~100 gas vs ~20,000 gas (TSTORE vs SSTORE)
 * - Auto-expiry: Approvals cleared at transaction end
 * - Perfect for: DEX swaps, batch operations, flash loans
 * - Backwards compatible: Works alongside standard approvals
 * 
 * Post-Cancun Upgrade (EIP-1153):
 * - TSTORE: Store value in transient storage (~100 gas)
 * - TLOAD: Load value from transient storage (~100 gas)
 * - Auto-cleared after transaction (no SSTORE needed)
 */
interface IERC20TemporaryApprovalModule {
    // ============ Events ============
    
    /**
     * @notice Emitted when temporary approval is granted
     * @param owner Token owner granting approval
     * @param spender Address allowed to spend
     * @param value Amount approved
     */
    event TemporaryApproval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    
    /**
     * @notice Emitted when temporary approval is used
     * @param owner Token owner
     * @param spender Address spending tokens
     * @param value Amount spent
     * @param remaining Remaining temporary allowance
     */
    event TemporaryApprovalUsed(
        address indexed owner,
        address indexed spender,
        uint256 value,
        uint256 remaining
    );
    
    // ============ Errors ============
    
    /**
     * @notice Thrown when temporary allowance is insufficient
     * @param owner Token owner
     * @param spender Address attempting to spend
     * @param requested Amount requested
     * @param available Amount available
     */
    error InsufficientTemporaryAllowance(
        address owner,
        address spender,
        uint256 requested,
        uint256 available
    );
    
    /**
     * @notice Thrown when trying to set approval for zero address
     */
    error InvalidSpender();
    
    /**
     * @notice Thrown when transient storage is not supported
     */
    error TransientStorageNotSupported();
    
    // ============ Core Functions ============
    
    /**
     * @notice Grant temporary approval that expires after transaction
     * @dev Uses EIP-1153 transient storage (TSTORE)
     * @param spender Address allowed to spend tokens
     * @param value Amount to approve
     * @return bool True if approval successful
     * 
     * Gas Cost: ~100 gas (vs ~20,000 for standard approve)
     * 
     * Requirements:
     * - spender cannot be zero address
     * - Must be called on chain with EIP-1153 support (post-Cancun)
     * 
     * Example Usage:
     * ```
     * // User wants to swap tokens on DEX
     * token.temporaryApprove(dexRouter, 1000e18);
     * dexRouter.swap(token, 1000e18);
     * // Approval auto-expires after transaction
     * ```
     */
    function temporaryApprove(
        address spender,
        uint256 value
    ) external returns (bool);
    
    /**
     * @notice Get current temporary allowance (valid only in same transaction)
     * @dev Uses EIP-1153 transient storage (TLOAD)
     * @param owner Token owner
     * @param spender Address to check allowance for
     * @return uint256 Current temporary allowance
     * 
     * Gas Cost: ~100 gas (vs ~2,100 for standard allowance)
     * 
     * Note: Returns 0 if checked in different transaction than approval
     */
    function temporaryAllowance(
        address owner,
        address spender
    ) external view returns (uint256);
    
    /**
     * @notice Increase temporary allowance
     * @param spender Address to increase allowance for
     * @param addedValue Amount to add
     * @return bool True if successful
     */
    function increaseTemporaryAllowance(
        address spender,
        uint256 addedValue
    ) external returns (bool);
    
    /**
     * @notice Decrease temporary allowance
     * @param spender Address to decrease allowance for
     * @param subtractedValue Amount to subtract
     * @return bool True if successful
     */
    function decreaseTemporaryAllowance(
        address spender,
        uint256 subtractedValue
    ) external returns (bool);
    
    /**
     * @notice Spend temporary allowance (called by token during transferFrom)
     * @dev Internal function called by token contract
     * @param owner Token owner
     * @param spender Address spending tokens
     * @param value Amount to spend
     */
    function spendTemporaryAllowance(
        address owner,
        address spender,
        uint256 value
    ) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Check if temporary approvals are enabled
     * @return bool True if module is active
     */
    function isTemporaryApprovalEnabled() external view returns (bool);
    
    /**
     * @notice Check if chain supports EIP-1153 transient storage
     * @return bool True if transient storage opcodes available
     */
    function supportsTransientStorage() external view returns (bool);
    
    /**
     * @notice Get gas cost savings vs standard approval
     * @return standardCost Gas cost of standard approve (~20,000)
     * @return temporaryCost Gas cost of temporary approve (~100)
     * @return savingsPercent Percentage savings (99.5%)
     */
    function getGasSavings() external pure returns (
        uint256 standardCost,
        uint256 temporaryCost,
        uint256 savingsPercent
    );
}
