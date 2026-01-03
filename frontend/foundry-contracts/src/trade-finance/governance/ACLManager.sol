// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";

/**
 * @title ACLManager
 * @notice Access Control List Manager for the protocol
 * @dev Manages all roles and permissions for the commodity trade finance protocol
 * 
 * UPGRADEABILITY:
 * - Pattern: UUPS (Universal Upgradeable Proxy Standard)
 * - Upgrade Control: Only DEFAULT_ADMIN_ROLE can upgrade
 * - Storage: Uses storage gaps for future variables
 * - Initialization: Uses initialize() instead of constructor
 */
contract ACLManager is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Role Definitions ============
    
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN");
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN");
    bytes32 public constant FLASH_BORROWER_ROLE = keccak256("FLASH_BORROWER");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE");
    bytes32 public constant ASSET_LISTING_ADMIN_ROLE = keccak256("ASSET_LISTING_ADMIN");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    
    // Changed from immutable to storage variable for upgradeability
    IPoolAddressesProvider private _addressesProvider;
    
    // ============ Storage Gap ============
    // Reserve 49 slots for future variables (50 total - 1 current)
    uint256[49] private __gap;
    
    // ============ Events ============
    
    event Upgraded(address indexed newImplementation);
    
    // ============ Errors ============
    
    error ZeroAddress();
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ Initializer ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param provider The address of the PoolAddressesProvider
     * @param admin The default admin address
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
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Getters ============
    
    /**
     * @notice Returns the addresses provider
     */
    function ADDRESSES_PROVIDER() external view returns (IPoolAddressesProvider) {
        return _addressesProvider;
    }
    
    // ============ Role Modifiers ============

    modifier onlyPoolAdmin() {
        require(hasRole(POOL_ADMIN_ROLE, msg.sender), "ACLManager: Caller is not pool admin");
        _;
    }

    modifier onlyEmergencyAdmin() {
        require(hasRole(EMERGENCY_ADMIN_ROLE, msg.sender), "ACLManager: Caller is not emergency admin");
        _;
    }

    modifier onlyRiskAdmin() {
        require(hasRole(RISK_ADMIN_ROLE, msg.sender), "ACLManager: Caller is not risk admin");
        _;
    }

    modifier onlyAssetListingAdmin() {
        require(hasRole(ASSET_LISTING_ADMIN_ROLE, msg.sender), "ACLManager: Caller is not asset listing admin");
        _;
    }

    // ============ Role Management Functions ============

    function addPoolAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(POOL_ADMIN_ROLE, admin);
    }

    function removePoolAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(POOL_ADMIN_ROLE, admin);
    }

    function isPoolAdmin(address admin) external view returns (bool) {
        return hasRole(POOL_ADMIN_ROLE, admin);
    }

    function addEmergencyAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    function removeEmergencyAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    function isEmergencyAdmin(address admin) external view returns (bool) {
        return hasRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    function addRiskAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(RISK_ADMIN_ROLE, admin);
    }

    function removeRiskAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(RISK_ADMIN_ROLE, admin);
    }

    function isRiskAdmin(address admin) external view returns (bool) {
        return hasRole(RISK_ADMIN_ROLE, admin);
    }

    function addFlashBorrower(address borrower) external onlyPoolAdmin {
        grantRole(FLASH_BORROWER_ROLE, borrower);
    }

    function removeFlashBorrower(address borrower) external onlyPoolAdmin {
        revokeRole(FLASH_BORROWER_ROLE, borrower);
    }

    function isFlashBorrower(address borrower) external view returns (bool) {
        return hasRole(FLASH_BORROWER_ROLE, borrower);
    }

    function addBridge(address bridge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(BRIDGE_ROLE, bridge);
    }

    function removeBridge(address bridge) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BRIDGE_ROLE, bridge);
    }

    function isBridge(address bridge) external view returns (bool) {
        return hasRole(BRIDGE_ROLE, bridge);
    }

    function addAssetListingAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }

    function removeAssetListingAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }

    function isAssetListingAdmin(address admin) external view returns (bool) {
        return hasRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }
    
    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only UPGRADER_ROLE can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        emit Upgraded(newImplementation);
    }
}
