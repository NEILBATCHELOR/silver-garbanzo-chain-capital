// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20TemporaryApprovalModule
 * @notice Interface for time-based temporary approval extension
 * @dev Approvals automatically expire after specified duration
 * 
 * Key Features:
 * - Time-based expiration (seconds)
 * - Configurable duration limits (default, min, max)
 * - Automatic expiry checking
 * - Reduced security risk from forgotten approvals
 * 
 * Use Cases:
 * - Short-term DEX approvals
 * - Time-limited marketplace permissions
 * - Temporary vault access
 * - Controlled spender permissions
 */
interface IERC20TemporaryApprovalModule {
    // ============ Events ============
    
    /**
     * @notice Emitted when temporary approval is granted
     * @param owner Token owner granting approval
     * @param spender Address allowed to spend
     * @param value Amount approved
     * @param expiry Expiration timestamp
     */
    event TemporaryApprovalGranted(
        address indexed owner,
        address indexed spender,
        uint256 value,
        uint256 expiry
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
    
    /**
     * @notice Emitted when duration configuration is updated
     * @param defaultDuration New default duration
     * @param minDuration New minimum duration
     * @param maxDuration New maximum duration
     */
    event DurationConfigUpdated(
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    );
    
    // ============ Errors ============
    
    /**
     * @notice Thrown when temporary allowance is insufficient or expired
     */
    error InsufficientTemporaryAllowance(
        address owner,
        address spender,
        uint256 requested,
        uint256 available
    );
    
    /**
     * @notice Thrown when approval has expired
     */
    error ApprovalExpired(address owner, address spender, uint256 expiry);
    
    /**
     * @notice Thrown when trying to set approval for zero address
     */
    error InvalidSpender();
    
    /**
     * @notice Thrown when duration is invalid
     */
    error InvalidDuration(uint256 duration, uint256 min, uint256 max);
    
    // ============ Core Functions ============
    
    /**
     * @notice Grant temporary approval with default duration
     * @param spender Address allowed to spend tokens
     * @param value Amount to approve
     * @return bool True if approval successful
     */
    function temporaryApprove(
        address spender,
        uint256 value
    ) external returns (bool);
    
    /**
     * @notice Grant temporary approval with custom duration
     * @param spender Address allowed to spend tokens
     * @param value Amount to approve
     * @param duration Approval duration in seconds (must be between min/max)
     * @return bool True if approval successful
     */
    function temporaryApproveWithDuration(
        address spender,
        uint256 value,
        uint256 duration
    ) external returns (bool);
    
    /**
     * @notice Get current temporary allowance (checks expiration)
     * @param owner Token owner
     * @param spender Address to check allowance for
     * @return uint256 Current temporary allowance (0 if expired)
     */
    function temporaryAllowance(
        address owner,
        address spender
    ) external view returns (uint256);
    
    /**
     * @notice Get temporary allowance expiration time
     * @param owner Token owner
     * @param spender Address to check
     * @return uint256 Expiration timestamp (0 if no approval)
     */
    function temporaryAllowanceExpiry(
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
     */
    function isTemporaryApprovalEnabled() external view returns (bool);
    
    /**
     * @notice Get duration configuration
     * @return defaultDuration Default approval duration (seconds)
     * @return minDuration Minimum allowed duration (seconds)
     * @return maxDuration Maximum allowed duration (seconds)
     */
    function getDurationConfig() external view returns (
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    );
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update duration configuration
     * @param defaultDuration New default duration
     * @param minDuration New minimum duration
     * @param maxDuration New maximum duration
     */
    function setDurationConfig(
        uint256 defaultDuration,
        uint256 minDuration,
        uint256 maxDuration
    ) external;
}
