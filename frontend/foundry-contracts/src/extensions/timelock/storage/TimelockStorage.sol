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
    
    // ============ Storage Gap ============
    uint256[47] private __gap;
}
