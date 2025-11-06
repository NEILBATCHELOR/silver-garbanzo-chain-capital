// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IERC20TimelockModule.sol";

/**
 * @title TimelockStorage
 * @notice Storage layout for timelock module (upgradeable-safe)
 */
contract TimelockStorage {
    // ============ Lock Data ============
    // account => lockId => Lock
    mapping(address => mapping(uint256 => IERC20TimelockModule.Lock)) internal _locks;
    
    // account => number of locks
    mapping(address => uint256) internal _lockCount;
    
    // account => total locked balance
    mapping(address => uint256) internal _totalLocked;
    
    // ============ Lock Configuration ============
    uint256 internal _minLockDuration;      // Minimum lock duration in seconds
    uint256 internal _maxLockDuration;      // Maximum lock duration in seconds
    uint256 internal _defaultLockDuration;  // Default lock duration (optional, 0 = none)
    bool internal _allowExtension;          // Whether locks can be extended
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}
