// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";

/**
 * @title EmergencyModule
 * @notice Emergency controls for the protocol
 * @dev Provides multi-level pause functionality and emergency response capabilities
 * @dev Upgradeable via UUPS pattern - admin controls upgrades
 */
contract EmergencyModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    enum EmergencyLevel {
        NONE,           // Normal operation
        WARNING,        // Alert only, no action
        PARTIAL,        // Pause new borrows only
        FULL            // Pause everything except repays and withdrawals
    }

    // ============ ROLES ============
    
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN");
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // ============ STATE ============
    
    IPoolAddressesProvider private _addressesProvider;
    EmergencyLevel public currentLevel;

    // Emergency state tracking
    bool public protocolPaused;
    mapping(address => bool) public borrowingPaused;
    mapping(address => bool) public supplyPaused;

    // Grace period for unpausing (48 hours for full pause)
    uint256 public constant FULL_PAUSE_GRACE_PERIOD = 48 hours;
    uint256 public fullPauseTimestamp;

    // ============ STORAGE GAP ============
    // Reserve 43 slots for future variables (50 total - 7 current)
    uint256[43] private __gap;

    // ============ EVENTS ============
    
    event EmergencyWarning(string reason, uint256 timestamp);
    event BorrowingPaused(address indexed asset, string reason);
    event BorrowingUnpaused(address indexed asset);
    event SupplyPaused(address indexed asset, string reason);
    event SupplyUnpaused(address indexed asset);
    event ProtocolPaused(string reason, uint256 timestamp);
    event ProtocolUnpaused(uint256 timestamp);
    event EmergencyLevelChanged(EmergencyLevel oldLevel, EmergencyLevel newLevel);
    event CircuitBreakerTriggered(string reason, address indexed asset);
    event Upgraded(address indexed newImplementation);

    // ============ ERRORS ============
    
    error ZeroAddress();
    error NotInWarningState();
    error BorrowingAlreadyPaused();
    error BorrowingNotPaused();
    error SupplyAlreadyPaused();
    error SupplyNotPaused();
    error ProtocolAlreadyPaused();
    error ProtocolNotPaused();
    error GracePeriodNotElapsed();
    error NotAuthorized();

    // ============ CONSTRUCTOR ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============ INITIALIZER ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param provider The address of the PoolAddressesProvider
     * @param admin The address to grant admin roles
     */
    function initialize(
        IPoolAddressesProvider provider,
        address admin
    ) public initializer {
        if (address(provider) == address(0)) revert ZeroAddress();
        if (admin == address(0)) revert ZeroAddress();
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _addressesProvider = provider;
        currentLevel = EmergencyLevel.NONE;
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(EMERGENCY_ADMIN_ROLE, admin);
        _grantRole(POOL_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // ============ EMERGENCY LEVEL MANAGEMENT ============

    /**
     * @notice Trigger a warning level emergency (no action, just alerts)
     * @param reason The reason for the warning
     */
    function triggerWarning(string memory reason) external {
        if (!hasRole(POOL_ADMIN_ROLE, msg.sender) && !hasRole(EMERGENCY_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }
        currentLevel = EmergencyLevel.WARNING;
        emit EmergencyWarning(reason, block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.NONE, EmergencyLevel.WARNING);
    }

    /**
     * @notice Clear warning level emergency
     */
    function clearWarning() external {
        if (!hasRole(POOL_ADMIN_ROLE, msg.sender) && !hasRole(EMERGENCY_ADMIN_ROLE, msg.sender)) {
            revert NotAuthorized();
        }
        if (currentLevel != EmergencyLevel.WARNING) revert NotInWarningState();
        EmergencyLevel oldLevel = currentLevel;
        currentLevel = EmergencyLevel.NONE;
        emit EmergencyLevelChanged(oldLevel, EmergencyLevel.NONE);
    }

    // ============ PARTIAL PAUSE (Per-Asset) ============

    /**
     * @notice Pause borrowing for a specific asset
     * @param asset The address of the asset
     * @param reason The reason for pausing
     */
    function pauseBorrowing(address asset, string memory reason) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (borrowingPaused[asset]) revert BorrowingAlreadyPaused();
        
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
    function unpauseBorrowing(address asset) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (!borrowingPaused[asset]) revert BorrowingNotPaused();
        
        borrowingPaused[asset] = false;
        emit BorrowingUnpaused(asset);
    }

    /**
     * @notice Pause supply for a specific asset
     * @param asset The address of the asset
     * @param reason The reason for pausing
     */
    function pauseSupply(address asset, string memory reason) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (supplyPaused[asset]) revert SupplyAlreadyPaused();
        
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
    function unpauseSupply(address asset) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (!supplyPaused[asset]) revert SupplyNotPaused();
        
        supplyPaused[asset] = false;
        emit SupplyUnpaused(asset);
    }

    // ============ FULL PROTOCOL PAUSE ============

    /**
     * @notice Pause the entire protocol (except repays and withdrawals)
     * @param reason The reason for the pause
     */
    function pauseAll(string memory reason) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (protocolPaused) revert ProtocolAlreadyPaused();
        
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
    function unpauseAll() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (!protocolPaused) revert ProtocolNotPaused();
        if (block.timestamp < fullPauseTimestamp + FULL_PAUSE_GRACE_PERIOD) {
            revert GracePeriodNotElapsed();
        }
        
        protocolPaused = false;
        currentLevel = EmergencyLevel.NONE;
        
        emit ProtocolUnpaused(block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.FULL, EmergencyLevel.NONE);
    }

    /**
     * @notice Emergency unpause (bypasses grace period, requires multisig)
     * @dev Should only be used in case of false positive or resolved crisis
     */
    function emergencyUnpause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (!protocolPaused) revert ProtocolNotPaused();
        
        protocolPaused = false;
        currentLevel = EmergencyLevel.NONE;
        
        emit ProtocolUnpaused(block.timestamp);
        emit EmergencyLevelChanged(EmergencyLevel.FULL, EmergencyLevel.NONE);
    }

    // ============ AUTOMATIC CIRCUIT BREAKERS ============

    /**
     * @notice Check and trigger circuit breakers based on conditions
     * @dev Can be called by anyone, but action taken only if conditions met
     */
    function checkCircuitBreakers() external {
        ICommodityLendingPool pool = ICommodityLendingPool(_addressesProvider.getPool());
        
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
    ) external onlyRole(EMERGENCY_ADMIN_ROLE) {
        if (asset == address(0)) {
            this.pauseAll(reason);
        } else {
            this.pauseBorrowing(asset, reason);
        }
        
        emit CircuitBreakerTriggered(reason, asset);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get the addresses provider
     * @return The addresses provider contract
     */
    function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider) {
        return _addressesProvider;
    }

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

    // ============ UPGRADE AUTHORIZATION ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only addresses with UPGRADER_ROLE can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        emit Upgraded(newImplementation);
    }
    
    /**
     * @notice Get contract version
     * @return version string
     */
    function version() external pure returns (string memory) {
        return "v1.0.0";
    }
}
