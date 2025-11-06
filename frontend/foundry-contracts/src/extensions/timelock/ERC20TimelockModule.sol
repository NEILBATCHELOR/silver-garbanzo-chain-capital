// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./interfaces/IERC20TimelockModule.sol";
import "./storage/TimelockStorage.sol";

/**
 * @title ERC20TimelockModule
 * @notice Enhanced token locking with multiple concurrent locks
 * @dev Separate contract to avoid stack depth in master contracts
 */
contract ERC20TimelockModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20TimelockModule,
    TimelockStorage
{
    // ============ Roles ============
    bytes32 public constant LOCK_MANAGER_ROLE = keccak256("LOCK_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // Reference to token contract
    address public tokenContract;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize timelock module
     * @param admin Admin address
     * @param token Token contract address
     * @param minDuration Minimum lock duration (default: 1 hour)
     * @param maxDuration Maximum lock duration (default: 1 year)
     * @param allowExt Whether to allow lock extension
     */
    function initialize(
        address admin, 
        address token,
        uint256 minDuration,
        uint256 maxDuration,
        bool allowExt
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LOCK_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        tokenContract = token;
        
        // Set defaults if not provided
        _minLockDuration = minDuration > 0 ? minDuration : 3600; // Default: 1 hour
        _maxLockDuration = maxDuration > 0 ? maxDuration : 31536000; // Default: 1 year
        _allowExtension = allowExt;
    }
    
    // ============ Lock Management ============
    
    /**
     * @notice Create a new lock
     */
    function createLock(
        uint256 amount,
        uint256 duration,
        string memory reason
    ) external override returns (uint256 lockId) {
        if (amount == 0) revert InsufficientBalance();
        if (duration == 0) revert InvalidUnlockTime();
        
        // Validate duration constraints
        if (duration < _minLockDuration) revert DurationBelowMinimum();
        if (_maxLockDuration > 0 && duration > _maxLockDuration) revert DurationAboveMaximum();
        
        lockId = _lockCount[msg.sender]++;
        uint256 unlockTime = block.timestamp + duration;
        
        _locks[msg.sender][lockId] = Lock({
            amount: amount,
            unlockTime: unlockTime,
            reason: reason,
            active: true,
            createdAt: block.timestamp
        });
        
        _totalLocked[msg.sender] += amount;
        
        emit TokensLocked(msg.sender, lockId, amount, unlockTime, reason);
    }
    
    /**
     * @notice Unlock expired lock
     */
    function unlock(uint256 lockId) external override {
        Lock storage lock = _locks[msg.sender][lockId];
        
        if (!lock.active) revert LockNotActive();
        if (block.timestamp < lock.unlockTime) revert LockStillActive();
        
        uint256 amount = lock.amount;
        lock.active = false;
        _totalLocked[msg.sender] -= amount;
        
        emit TokensUnlocked(msg.sender, lockId, amount);
    }
    
    /**
     * @notice Unlock all expired locks
     */
    function unlockExpired() external override returns (uint256 unlockedAmount) {
        uint256 lockCount = _lockCount[msg.sender];
        
        for (uint256 i = 0; i < lockCount; i++) {
            Lock storage lock = _locks[msg.sender][i];
            
            if (lock.active && block.timestamp >= lock.unlockTime) {
                unlockedAmount += lock.amount;
                lock.active = false;
                _totalLocked[msg.sender] -= lock.amount;
                emit TokensUnlocked(msg.sender, i, lock.amount);
            }
        }
    }
    
    /**
     * @notice Extend lock duration
     */
    function extendLock(uint256 lockId, uint256 additionalTime) external override {
        if (!_allowExtension) revert ExtensionNotAllowed();
        
        Lock storage lock = _locks[msg.sender][lockId];
        
        if (!lock.active) revert LockNotActive();
        if (additionalTime == 0) revert InvalidUnlockTime();
        
        uint256 newUnlockTime = lock.unlockTime + additionalTime;
        uint256 totalDuration = newUnlockTime - lock.createdAt;
        
        // Validate new total duration doesn't exceed max
        if (_maxLockDuration > 0 && totalDuration > _maxLockDuration) {
            revert DurationAboveMaximum();
        }
        
        lock.unlockTime = newUnlockTime;
        emit LockExtended(msg.sender, lockId, newUnlockTime);
    }
    
    /**
     * @notice Cancel active lock (admin only)
     */
    function cancelLock(address account, uint256 lockId) 
        external 
        override 
        onlyRole(LOCK_MANAGER_ROLE) 
    {
        Lock storage lock = _locks[account][lockId];
        
        if (!lock.active) revert LockNotActive();
        
        uint256 amount = lock.amount;
        lock.active = false;
        _totalLocked[account] -= amount;
        
        emit LockCancelled(account, lockId);
    }
    
    // ============ Query Functions ============
    
    function getLockedBalance(address account) external view override returns (uint256) {
        return _totalLocked[account];
    }
    
    function getAllLocks(address account) external view override returns (Lock[] memory) {
        uint256 count = _lockCount[account];
        Lock[] memory locks = new Lock[](count);
        
        for (uint256 i = 0; i < count; i++) {
            locks[i] = _locks[account][i];
        }
        
        return locks;
    }
    
    function getActiveLocks(address account) external view override returns (Lock[] memory) {
        uint256 count = _lockCount[account];
        uint256 activeCount = 0;
        
        // Count active locks
        for (uint256 i = 0; i < count; i++) {
            if (_locks[account][i].active) {
                activeCount++;
            }
        }
        
        // Build array
        Lock[] memory activeLocks = new Lock[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < count; i++) {
            if (_locks[account][i].active) {
                activeLocks[index++] = _locks[account][i];
            }
        }
        
        return activeLocks;
    }
    
    function getLock(address account, uint256 lockId) 
        external 
        view 
        override 
        returns (Lock memory) 
    {
        if (lockId >= _lockCount[account]) revert LockNotFound();
        return _locks[account][lockId];
    }
    
    function isLockExpired(address account, uint256 lockId) 
        external 
        view 
        override 
        returns (bool) 
    {
        if (lockId >= _lockCount[account]) revert LockNotFound();
        Lock memory lock = _locks[account][lockId];
        return !lock.active || block.timestamp >= lock.unlockTime;
    }
    
    function getTimeUntilUnlock(address account, uint256 lockId) 
        external 
        view 
        override 
        returns (uint256) 
    {
        if (lockId >= _lockCount[account]) revert LockNotFound();
        Lock memory lock = _locks[account][lockId];
        
        if (!lock.active || block.timestamp >= lock.unlockTime) {
            return 0;
        }
        
        return lock.unlockTime - block.timestamp;
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Get lock configuration
     */
    function getLockConfiguration() 
        external 
        view 
        override 
        returns (
            uint256 minDuration,
            uint256 maxDuration,
            uint256 defaultDuration,
            bool extensionAllowed
        ) 
    {
        return (
            _minLockDuration,
            _maxLockDuration,
            _defaultLockDuration,
            _allowExtension
        );
    }
    
    /**
     * @notice Set lock duration constraints
     */
    function setLockDurationConstraints(
        uint256 minDuration,
        uint256 maxDuration,
        uint256 defaultDuration
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(minDuration > 0, "Min duration must be > 0");
        require(maxDuration >= minDuration, "Max must be >= min");
        require(defaultDuration == 0 || 
                (defaultDuration >= minDuration && defaultDuration <= maxDuration),
                "Default must be in range");
        
        _minLockDuration = minDuration;
        _maxLockDuration = maxDuration;
        _defaultLockDuration = defaultDuration;
    }
    
    /**
     * @notice Set whether lock extension is allowed
     */
    function setExtensionAllowed(bool allowed) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _allowExtension = allowed;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
