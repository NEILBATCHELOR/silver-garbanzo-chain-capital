// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";

/**
 * @title EmergencyModule
 * @notice Emergency controls for the protocol
 * @dev Provides multi-level pause functionality and emergency response capabilities
 */
contract EmergencyModule {
    enum EmergencyLevel {
        NONE,           // Normal operation
        WARNING,        // Alert only, no action
        PARTIAL,        // Pause new borrows only
        FULL            // Pause everything except repays and withdrawals
    }

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    EmergencyLevel public currentLevel;

    // Emergency state tracking
    bool public protocolPaused;
    mapping(address => bool) public borrowingPaused;
    mapping(address => bool) public supplyPaused;

    // Grace period for unpausing (48 hours for full pause)
    uint256 public constant FULL_PAUSE_GRACE_PERIOD = 48 hours;
    uint256 public fullPauseTimestamp;

    // Events
    event EmergencyWarning(string reason, uint256 timestamp);
    event BorrowingPaused(address indexed asset, string reason);
    event BorrowingUnpaused(address indexed asset);
    event SupplyPaused(address indexed asset, string reason);
    event SupplyUnpaused(address indexed asset);
    event ProtocolPaused(string reason, uint256 timestamp);
    event ProtocolUnpaused(uint256 timestamp);
    event EmergencyLevelChanged(EmergencyLevel oldLevel, EmergencyLevel newLevel);
    event CircuitBreakerTriggered(string reason, address indexed asset);

    /**
     * @dev Constructor
     * @param provider The address of the PoolAddressesProvider
     */
    constructor(IPoolAddressesProvider provider) {
        ADDRESSES_PROVIDER = provider;
        currentLevel = EmergencyLevel.NONE;
    }

    // ============ Modifiers ============

    modifier onlyEmergencyAdmin() {
        _onlyEmergencyAdmin();
        _;
    }

    modifier onlyPoolOrEmergencyAdmin() {
        _onlyPoolOrEmergencyAdmin();
        _;
    }

    function _onlyEmergencyAdmin() internal view {
        address aclManager = ADDRESSES_PROVIDER.getACLManager();
        require(
            IACLManager(aclManager).hasRole(keccak256("EMERGENCY_ADMIN"), msg.sender),
            "EmergencyModule: Caller is not emergency admin"
        );
    }

    function _onlyPoolOrEmergencyAdmin() internal view {
        address aclManager = ADDRESSES_PROVIDER.getACLManager();
        require(
            IACLManager(aclManager).hasRole(keccak256("POOL_ADMIN"), msg.sender) ||
            IACLManager(aclManager).hasRole(keccak256("EMERGENCY_ADMIN"), msg.sender),
            "EmergencyModule: Caller is not authorized"
        );
    }

    // ============ Emergency Level Management ============

    /**
     * @notice Trigger a warning level emergency (no action, just alerts)
     * @param reason The reason for the warning
     */
    function triggerWarning(string memory reason) external onlyPoolOrEmergencyAdmin {
        currentLevel = EmergencyLevel.WARNING;
        emit EmergencyWarning(reason, block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.NONE, EmergencyLevel.WARNING);
    }

    /**
     * @notice Clear warning level emergency
     */
    function clearWarning() external onlyPoolOrEmergencyAdmin {
        require(currentLevel == EmergencyLevel.WARNING, "EmergencyModule: Not in warning state");
        EmergencyLevel oldLevel = currentLevel;
        currentLevel = EmergencyLevel.NONE;
        emit EmergencyLevelChanged(oldLevel, EmergencyLevel.NONE);
    }

    // ============ Partial Pause (Per-Asset) ============

    /**
     * @notice Pause borrowing for a specific asset
     * @param asset The address of the asset
     * @param reason The reason for pausing
     */
    function pauseBorrowing(address asset, string memory reason) external onlyEmergencyAdmin {
        require(!borrowingPaused[asset], "EmergencyModule: Borrowing already paused");
        
        borrowingPaused[asset] = true;
        
        if (currentLevel == EmergencyLevel.NONE) {
            currentLevel = EmergencyLevel.PARTIAL;
        }
        
        emit BorrowingPaused(asset, reason);
    }

    /**
     * @notice Unpause borrowing for a specific asset
     * @param asset The address of the asset
     */
    function unpauseBorrowing(address asset) external onlyEmergencyAdmin {
        require(borrowingPaused[asset], "EmergencyModule: Borrowing not paused");
        
        borrowingPaused[asset] = false;
        emit BorrowingUnpaused(asset);
    }

    /**
     * @notice Pause supply for a specific asset
     * @param asset The address of the asset
     * @param reason The reason for pausing
     */
    function pauseSupply(address asset, string memory reason) external onlyEmergencyAdmin {
        require(!supplyPaused[asset], "EmergencyModule: Supply already paused");
        
        supplyPaused[asset] = true;
        
        if (currentLevel == EmergencyLevel.NONE) {
            currentLevel = EmergencyLevel.PARTIAL;
        }
        
        emit SupplyPaused(asset, reason);
    }

    /**
     * @notice Unpause supply for a specific asset
     * @param asset The address of the asset
     */
    function unpauseSupply(address asset) external onlyEmergencyAdmin {
        require(supplyPaused[asset], "EmergencyModule: Supply not paused");
        
        supplyPaused[asset] = false;
        emit SupplyUnpaused(asset);
    }

    // ============ Full Protocol Pause ============

    /**
     * @notice Pause the entire protocol (except repays and withdrawals)
     * @param reason The reason for the pause
     */
    function pauseAll(string memory reason) external onlyEmergencyAdmin {
        require(!protocolPaused, "EmergencyModule: Protocol already paused");
        
        protocolPaused = true;
        fullPauseTimestamp = block.timestamp;
        currentLevel = EmergencyLevel.FULL;
        
        emit ProtocolPaused(reason, block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.PARTIAL, EmergencyLevel.FULL);
    }

    /**
     * @notice Unpause the protocol
     * @dev Requires governance approval or grace period to have passed
     */
    function unpauseAll() external onlyEmergencyAdmin {
        require(protocolPaused, "EmergencyModule: Protocol not paused");
        require(
            block.timestamp >= fullPauseTimestamp + FULL_PAUSE_GRACE_PERIOD,
            "EmergencyModule: Grace period not elapsed"
        );
        
        protocolPaused = false;
        currentLevel = EmergencyLevel.NONE;
        
        emit ProtocolUnpaused(block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.FULL, EmergencyLevel.NONE);
    }

    /**
     * @notice Emergency unpause (bypasses grace period, requires multisig)
     * @dev Should only be used in case of false positive or resolved crisis
     */
    function emergencyUnpause() external onlyEmergencyAdmin {
        require(protocolPaused, "EmergencyModule: Protocol not paused");
        
        protocolPaused = false;
        currentLevel = EmergencyLevel.NONE;
        
        emit ProtocolUnpaused(block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.FULL, EmergencyLevel.NONE);
    }

    // ============ Automatic Circuit Breakers ============

    /**
     * @notice Check and trigger circuit breakers based on conditions
     * @dev Can be called by anyone, but action taken only if conditions met
     */
    function checkCircuitBreakers() external {
        ICommodityLendingPool pool = ICommodityLendingPool(ADDRESSES_PROVIDER.getPool());
        
        // Check various conditions that might trigger circuit breakers
        // These would be implemented based on specific risk parameters
        
        // Example: Check if oracle is stale
        // Example: Check if utilization is too high
        // Example: Check for large liquidation waves
        
        // This is a placeholder - actual implementation would check real conditions
    }

    /**
     * @notice Manual circuit breaker trigger for specific condition
     * @param reason The reason for triggering the circuit breaker
     * @param asset The affected asset (address(0) for protocol-wide)
     */
    function triggerCircuitBreaker(
        string memory reason,
        address asset
    ) external onlyEmergencyAdmin {
        if (asset == address(0)) {
            this.pauseAll(reason);
        } else {
            this.pauseBorrowing(asset, reason);
        }
        
        emit CircuitBreakerTriggered(reason, asset);
    }

    // ============ View Functions ============

    /**
     * @notice Check if borrowing is allowed for an asset
     * @param asset The address of the asset
     * @return True if borrowing is allowed
     */
    function isBorrowingAllowed(address asset) external view returns (bool) {
        if (protocolPaused) return false;
        if (borrowingPaused[asset]) return false;
        return true;
    }

    /**
     * @notice Check if supply is allowed for an asset
     * @param asset The address of the asset
     * @return True if supply is allowed
     */
    function isSupplyAllowed(address asset) external view returns (bool) {
        if (protocolPaused) return false;
        if (supplyPaused[asset]) return false;
        return true;
    }

    /**
     * @notice Check if liquidations are allowed
     * @return True if liquidations are allowed
     */
    function isLiquidationAllowed() external view returns (bool) {
        // Liquidations are always allowed unless protocol is fully paused
        return !protocolPaused;
    }

    /**
     * @notice Get current emergency status
     * @return level The current emergency level
     * @return paused Whether protocol is fully paused
     * @return gracePeriodRemaining Time remaining until unpause allowed (0 if not in grace period)
     */
    function getEmergencyStatus() external view returns (
        EmergencyLevel level,
        bool paused,
        uint256 gracePeriodRemaining
    ) {
        level = currentLevel;
        paused = protocolPaused;
        
        if (protocolPaused && block.timestamp < fullPauseTimestamp + FULL_PAUSE_GRACE_PERIOD) {
            gracePeriodRemaining = (fullPauseTimestamp + FULL_PAUSE_GRACE_PERIOD) - block.timestamp;
        } else {
            gracePeriodRemaining = 0;
        }
    }
}
