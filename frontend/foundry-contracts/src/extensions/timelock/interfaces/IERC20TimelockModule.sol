// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20TimelockModule
 * @notice Interface for enhanced token locking mechanisms
 * @dev Enterprise-grade locking with multiple concurrent locks
 * 
 * Use Cases:
 * - Vesting schedules (different from vesting module - simpler)
 * - Staking locks
 * - Escrow services
 * - Reward distribution locks
 */
interface IERC20TimelockModule {
    // ============ Structures ============
    struct Lock {
        uint256 amount;           // Locked amount
        uint256 unlockTime;       // When it unlocks
        string reason;            // Why it's locked
        bool active;              // Is lock active
        uint256 createdAt;        // Lock creation time
    }
    
    // ============ Events ============
    event TokensLocked(
        address indexed account, 
        uint256 indexed lockId, 
        uint256 amount, 
        uint256 unlockTime, 
        string reason
    );
    event TokensUnlocked(address indexed account, uint256 indexed lockId, uint256 amount);
    event LockExtended(address indexed account, uint256 indexed lockId, uint256 newUnlockTime);
    event LockCancelled(address indexed account, uint256 indexed lockId);
    
    // ============ Errors ============
    error LockNotFound();
    error LockStillActive();
    error InsufficientBalance();
    error InvalidUnlockTime();
    error LockNotActive();
    error DurationBelowMinimum();
    error DurationAboveMaximum();
    error ExtensionNotAllowed();
    
    // ============ Lock Management ============
    
    /**
     * @notice Create a new lock
     * @param amount Amount to lock
     * @param duration Lock duration in seconds
     * @param reason Reason for lock
     * @return lockId ID of created lock
     */
    function createLock(
        uint256 amount,
        uint256 duration,
        string memory reason
    ) external returns (uint256 lockId);
    
    /**
     * @notice Unlock expired lock
     * @param lockId Lock to unlock
     */
    function unlock(uint256 lockId) external;
    
    /**
     * @notice Unlock all expired locks for caller
     * @return unlockedAmount Total amount unlocked
     */
    function unlockExpired() external returns (uint256 unlockedAmount);
    
    /**
     * @notice Extend lock duration
     * @param lockId Lock to extend
     * @param additionalTime Additional seconds to add
     */
    function extendLock(uint256 lockId, uint256 additionalTime) external;
    
    /**
     * @notice Cancel active lock (admin only)
     * @param account Lock owner
     * @param lockId Lock to cancel
     */
    function cancelLock(address account, uint256 lockId) external;
    
    // ============ Query Functions ============
    
    /**
     * @notice Get total locked balance for account
     * @param account Address to check
     * @return uint256 Total locked amount
     */
    function getLockedBalance(address account) external view returns (uint256);
    
    /**
     * @notice Get all locks for account
     * @param account Address to check
     * @return Lock[] Array of locks
     */
    function getAllLocks(address account) external view returns (Lock[] memory);
    
    /**
     * @notice Get active locks for account
     * @param account Address to check
     * @return Lock[] Array of active locks
     */
    function getActiveLocks(address account) external view returns (Lock[] memory);
    
    /**
     * @notice Get specific lock details
     * @param account Lock owner
     * @param lockId Lock ID
     * @return Lock Lock details
     */
    function getLock(address account, uint256 lockId) external view returns (Lock memory);
    
    /**
     * @notice Check if lock is expired
     * @param account Lock owner
     * @param lockId Lock ID
     * @return bool True if expired
     */
    function isLockExpired(address account, uint256 lockId) external view returns (bool);
    
    /**
     * @notice Get time until lock expires
     * @param account Lock owner
     * @param lockId Lock ID
     * @return uint256 Seconds until unlock (0 if expired)
     */
    function getTimeUntilUnlock(address account, uint256 lockId) external view returns (uint256);
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Get lock duration constraints
     * @return minDuration Minimum lock duration
     * @return maxDuration Maximum lock duration
     * @return defaultDuration Default lock duration (0 if none)
     * @return extensionAllowed Whether extension is allowed
     */
    function getLockConfiguration() external view returns (
        uint256 minDuration,
        uint256 maxDuration,
        uint256 defaultDuration,
        bool extensionAllowed
    );
    
    /**
     * @notice Set lock duration constraints (admin only)
     * @param minDuration Minimum lock duration
     * @param maxDuration Maximum lock duration
     * @param defaultDuration Default lock duration (0 for none)
     */
    function setLockDurationConstraints(
        uint256 minDuration,
        uint256 maxDuration,
        uint256 defaultDuration
    ) external;
    
    /**
     * @notice Set whether lock extension is allowed (admin only)
     * @param allowed True to allow extension
     */
    function setExtensionAllowed(bool allowed) external;
}
