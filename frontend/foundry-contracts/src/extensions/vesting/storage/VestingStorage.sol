// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IERC20VestingModule.sol";

/**
 * @title VestingStorage
 * @notice Storage layout for vesting module (upgradeable-safe)
 */
contract VestingStorage {
    // ============ Schedule Storage ============
    
    // scheduleId => VestingSchedule
    mapping(bytes32 => IERC20VestingModule.VestingSchedule) internal _vestingSchedules;
    
    // beneficiary => scheduleIds[]
    mapping(address => bytes32[]) internal _beneficiarySchedules;
    
    // Track all schedule IDs
    bytes32[] internal _allScheduleIds;
    
    // ============ Statistics ============
    
    // Total tokens locked across all schedules
    uint256 internal _totalLocked;
    
    // Total tokens released
    uint256 internal _totalReleased;
    
    // Schedule counter for unique IDs
    uint256 internal _scheduleCounter;
    
    // ============ Storage Gap ============
    
    uint256[45] private __gap;
}
