// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IERC20SnapshotModule.sol";
import "./storage/SnapshotStorage.sol";

/**
 * @title ERC20SnapshotModule
 * @notice Historical balance tracking via snapshots
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Implementation based on OpenZeppelin Snapshots pattern with gas optimizations
 */
contract ERC20SnapshotModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20SnapshotModule,
    SnapshotStorage
{
    // ============ Roles ============
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // Reference to token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize snapshot module
     * @param admin Admin address
     * @param token Token contract address
     */
    function initialize(address admin, address token) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SNAPSHOT_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        tokenContract = token;
        _currentSnapshotId = 0;
    }
    
    // ============ Snapshot Management ============
    
    /**
     * @notice Create a new snapshot
     * @return snapshotId ID of created snapshot
     */
    function snapshot() external override onlyRole(SNAPSHOT_ROLE) returns (uint256 snapshotId) {
        _currentSnapshotId++;
        snapshotId = _currentSnapshotId;
        
        _snapshotInfo[snapshotId] = SnapshotInfo({
            timestamp: block.timestamp,
            exists: true,
            scheduled: false,
            scheduledTime: 0
        });
        
        emit SnapshotCreated(snapshotId, block.timestamp);
    }
    
    /**
     * @notice Schedule a snapshot for future time
     * @param scheduledTime Timestamp to create snapshot
     * @return snapshotId ID of scheduled snapshot
     */
    function scheduleSnapshot(uint256 scheduledTime) 
        external 
        override 
        onlyRole(SNAPSHOT_ROLE) 
        returns (uint256 snapshotId) 
    {
        require(scheduledTime > block.timestamp, "Scheduled time must be in future");
        
        _currentSnapshotId++;
        snapshotId = _currentSnapshotId;
        
        _snapshotInfo[snapshotId] = SnapshotInfo({
            timestamp: 0,
            exists: false,
            scheduled: true,
            scheduledTime: scheduledTime
        });
        
        emit SnapshotScheduled(snapshotId, scheduledTime);
    }
    
    /**
     * @notice Execute scheduled snapshot if time has passed
     * @param snapshotId ID of scheduled snapshot
     */
    function executeScheduledSnapshot(uint256 snapshotId) external override {
        SnapshotInfo storage info = _snapshotInfo[snapshotId];
        
        if (!info.scheduled) revert SnapshotNotFound();
        if (block.timestamp < info.scheduledTime) revert InvalidSnapshotId();
        if (info.exists) revert SnapshotAlreadyExists();
        
        info.timestamp = block.timestamp;
        info.exists = true;
        info.scheduled = false;
        
        emit SnapshotCreated(snapshotId, block.timestamp);
    }
    
    // ============ Balance Queries ============
    
    /**
     * @notice Get balance at specific snapshot
     * @param account Address to query
     * @param snapshotId Snapshot ID
     * @return Balance at snapshot
     */
    function balanceOfAt(address account, uint256 snapshotId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        if (!_snapshotInfo[snapshotId].exists) revert SnapshotNotFound();
        return _valueAt(snapshotId, _accountBalanceSnapshots[account]);
    }
    
    /**
     * @notice Get total supply at specific snapshot
     * @param snapshotId Snapshot ID
     * @return Total supply at snapshot
     */
    function totalSupplyAt(uint256 snapshotId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        if (!_snapshotInfo[snapshotId].exists) revert SnapshotNotFound();
        return _valueAt(snapshotId, _totalSupplySnapshots);
    }
    
    // ============ Snapshot Info ============
    
    function getCurrentSnapshotId() external view override returns (uint256) {
        return _currentSnapshotId;
    }
    
    function getSnapshotTime(uint256 snapshotId) external view override returns (uint256) {
        if (!_snapshotInfo[snapshotId].exists) revert SnapshotNotFound();
        return _snapshotInfo[snapshotId].timestamp;
    }
    
    function snapshotExists(uint256 snapshotId) external view override returns (bool) {
        return _snapshotInfo[snapshotId].exists;
    }
    
    // ============ Account Updates ============
    
    /**
     * @notice Update account balance in snapshots
     * @dev Called by token contract on balance changes
     * @param account Account address
     * @param newBalance New balance
     */
    function updateAccountSnapshot(address account, uint256 newBalance) external override {
        require(msg.sender == tokenContract, "Only token contract");
        if (_currentSnapshotId > 0) {
            _updateSnapshot(_accountBalanceSnapshots[account], newBalance);
        }
    }
    
    /**
     * @notice Update total supply in snapshots
     * @dev Called by token contract on supply changes
     * @param newTotalSupply New total supply
     */
    function updateTotalSupplySnapshot(uint256 newTotalSupply) external override {
        require(msg.sender == tokenContract, "Only token contract");
        if (_currentSnapshotId > 0) {
            _updateSnapshot(_totalSupplySnapshots, newTotalSupply);
        }
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Update snapshot array with new value
     * Only creates a new snapshot entry if we're at a new snapshot ID
     */
    function _updateSnapshot(Snapshot[] storage snapshots, uint256 currentValue) private {
        uint256 currentId = _currentSnapshotId;
        uint256 lastId = _lastSnapshotId(snapshots);
        
        // If this is a new snapshot ID, create a new entry
        if (lastId < currentId) {
            snapshots.push(Snapshot({id: currentId, value: currentValue}));
        } else if (lastId == currentId) {
            // Update the existing snapshot value for current snapshot
            snapshots[snapshots.length - 1].value = currentValue;
        }
    }
    
    /**
     * @dev Get value at snapshot
     * Returns the most recent value at or before the snapshot ID
     */
    function _valueAt(uint256 snapshotId, Snapshot[] storage snapshots) 
        private 
        view 
        returns (uint256) 
    {
        if (snapshots.length == 0) {
            return 0;
        }
        
        uint256 index = _findIndexAt(snapshotId, snapshots);
        
        // If no snapshot found at or before snapshotId, return 0
        if (index == snapshots.length) {
            return 0;
        }
        
        return snapshots[index].value;
    }
    
    /**
     * @dev Binary search to find snapshot index
     * Returns the index of the most recent snapshot at or before snapshotId
     * Returns snapshots.length if no such snapshot exists (all snapshots are after snapshotId)
     */
    function _findIndexAt(uint256 snapshotId, Snapshot[] storage snapshots) 
        private 
        view 
        returns (uint256) 
    {
        uint256 length = snapshots.length;
        
        if (length == 0) {
            return 0;
        }
        
        // Check if the first snapshot is already after the requested snapshot
        if (snapshots[0].id > snapshotId) {
            return length;
        }
        
        // Check last snapshot first (most common case - querying most recent)
        uint256 lastIndex = length - 1;
        if (snapshots[lastIndex].id <= snapshotId) {
            return lastIndex;
        }
        
        // Binary search for the right snapshot
        uint256 low = 0;
        uint256 high = lastIndex;
        
        while (low < high) {
            uint256 mid = (low + high + 1) / 2;
            
            if (snapshots[mid].id <= snapshotId) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }
        
        return low;
    }
    
    /**
     * @dev Get last snapshot ID in array
     */
    function _lastSnapshotId(Snapshot[] storage snapshots) private view returns (uint256) {
        uint256 length = snapshots.length;
        
        if (length == 0) {
            return 0;
        }
        
        return snapshots[length - 1].id;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
