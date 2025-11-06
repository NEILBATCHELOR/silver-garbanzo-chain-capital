// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TemporaryApprovalStorage
 * @notice Storage layout for time-based temporary approval module
 * @dev Stores approval amounts with expiration timestamps
 * 
 * Storage Architecture:
 * - Approval struct: amount + expiry timestamp
 * - Duration configuration: default, min, max durations
 * - Module enabled/disabled flag
 */
contract TemporaryApprovalStorage {
    // ============ Structs ============
    
    /**
     * @notice Temporary approval data
     * @param amount Approved token amount
     * @param expiry Expiration timestamp (Unix timestamp)
     */
    struct TemporaryApproval {
        uint256 amount;
        uint256 expiry;
    }
    
    // ============ State Variables ============
    
    /**
     * @notice Module enabled/disabled flag
     */
    bool internal _enabled;
    
    /**
     * @notice Default approval duration in seconds
     * @dev Used when no duration specified
     */
    uint256 internal _defaultDuration;
    
    /**
     * @notice Maximum approval duration in seconds
     * @dev Enforces upper limit on approval lifetime
     */
    uint256 internal _maxDuration;
    
    /**
     * @notice Minimum approval duration in seconds
     * @dev Enforces lower limit on approval lifetime
     */
    uint256 internal _minDuration;
    
    /**
     * @notice Temporary approval mappings
     * @dev owner => spender => approval data
     */
    mapping(address => mapping(address => TemporaryApproval)) internal _temporaryApprovals;
    
    // ============ Storage Gap ============
    
    /**
     * @notice Storage gap for future upgrades
     * @dev Reserve 45 slots (50 - 5 used)
     */
    uint256[45] private __gap;
}
