// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20SnapshotModule
 * @notice Interface for historical balance tracking via snapshots
 * @dev Enables point-in-time balance queries for governance and dividends
 * 
 * Use Cases:
 * - Governance voting (based on historical holdings)
 * - Dividend/airdrop distribution
 * - Audit trails
 * - Fair launch mechanisms
 */
interface IERC20SnapshotModule {
    // ============ Events ============
    event SnapshotCreated(uint256 indexed snapshotId, uint256 timestamp);
    event SnapshotScheduled(uint256 indexed snapshotId, uint256 scheduledTime);
    
    // ============ Errors ============
    error InvalidSnapshotId();
    error SnapshotNotFound();
    error SnapshotAlreadyExists();
    
    // ============ Snapshot Management ============
    
    /**
     * @notice Create a new snapshot
     * @return snapshotId ID of created snapshot
     */
    function snapshot() external returns (uint256 snapshotId);
    
    /**
     * @notice Schedule a snapshot for future time
     * @param scheduledTime Timestamp to create snapshot
     * @return snapshotId ID of scheduled snapshot
     */
    function scheduleSnapshot(uint256 scheduledTime) external returns (uint256 snapshotId);
    
    /**
     * @notice Execute scheduled snapshot if time has passed
     * @param snapshotId ID of scheduled snapshot
     */
    function executeScheduledSnapshot(uint256 snapshotId) external;
    
    // ============ Balance Queries ============
    
    /**
     * @notice Get balance at specific snapshot
     * @param account Address to query
     * @param snapshotId Snapshot ID
     * @return uint256 Balance at snapshot
     */
    function balanceOfAt(address account, uint256 snapshotId) 
        external 
        view 
        returns (uint256);
    
    /**
     * @notice Get total supply at specific snapshot
     * @param snapshotId Snapshot ID
     * @return uint256 Total supply at snapshot
     */
    function totalSupplyAt(uint256 snapshotId) 
        external 
        view 
        returns (uint256);
    
    // ============ Snapshot Info ============
    
    /**
     * @notice Get current snapshot ID
     * @return uint256 Latest snapshot ID
     */
    function getCurrentSnapshotId() external view returns (uint256);
    
    /**
     * @notice Get snapshot creation time
     * @param snapshotId Snapshot ID
     * @return uint256 Timestamp of snapshot creation
     */
    function getSnapshotTime(uint256 snapshotId) external view returns (uint256);
    
    /**
     * @notice Check if snapshot exists
     * @param snapshotId Snapshot ID to check
     * @return bool True if snapshot exists
     */
    function snapshotExists(uint256 snapshotId) external view returns (bool);
    
    // ============ Account Updates ============
    
    /**
     * @notice Update account balance in snapshots (called by token contract)
     * @param account Account address
     * @param newBalance New balance
     */
    function updateAccountSnapshot(address account, uint256 newBalance) external;
    
    /**
     * @notice Update total supply in snapshots (called by token contract)
     * @param newTotalSupply New total supply
     */
    function updateTotalSupplySnapshot(uint256 newTotalSupply) external;
}
