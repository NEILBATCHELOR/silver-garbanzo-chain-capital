// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SnapshotStorage
 * @notice Storage layout for snapshot module (upgradeable-safe)
 */
contract SnapshotStorage {
    // ============ Snapshot Data Structures ============
    
    /**
     * @dev Snapshot of a value at a specific point in time
     */
    struct Snapshot {
        uint256 id;
        uint256 value;
    }
    
    /**
     * @dev Information about a snapshot
     */
    struct SnapshotInfo {
        uint256 timestamp;
        bool exists;
        bool scheduled;
        uint256 scheduledTime;
    }
    
    // ============ State Variables ============
    
    // Current snapshot ID counter
    uint256 internal _currentSnapshotId;
    
    // Snapshot ID => Snapshot info
    mapping(uint256 => SnapshotInfo) internal _snapshotInfo;
    
    // Account => Array of balance snapshots
    mapping(address => Snapshot[]) internal _accountBalanceSnapshots;
    
    // Array of total supply snapshots
    Snapshot[] internal _totalSupplySnapshots;
    
    // ============ Storage Gap ============
    uint256[44] private __gap;
}
