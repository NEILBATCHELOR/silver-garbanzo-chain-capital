// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";

/**
 * @title ACLManager
 * @notice Access Control List Manager for the protocol
 * @dev Manages all roles and permissions for the commodity trade finance protocol
 */
contract ACLManager is AccessControl {
    // Role definitions
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN");
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN");
    bytes32 public constant FLASH_BORROWER_ROLE = keccak256("FLASH_BORROWER");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE");
    bytes32 public constant ASSET_LISTING_ADMIN_ROLE = keccak256("ASSET_LISTING_ADMIN");

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

    /**
     * @dev Constructor
     * @param provider The address of the PoolAddressesProvider
     */
    constructor(IPoolAddressesProvider provider) {
        ADDRESSES_PROVIDER = provider;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
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

    /**
     * @notice Add a pool admin
     * @param admin The address to be added as pool admin
     */
    function addPoolAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(POOL_ADMIN_ROLE, admin);
    }

    /**
     * @notice Remove a pool admin
     * @param admin The address to be removed from pool admin
     */
    function removePoolAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(POOL_ADMIN_ROLE, admin);
    }

    /**
     * @notice Check if an address is a pool admin
     * @param admin The address to check
     * @return True if the address is a pool admin
     */
    function isPoolAdmin(address admin) external view returns (bool) {
        return hasRole(POOL_ADMIN_ROLE, admin);
    }

    /**
     * @notice Add an emergency admin
     * @param admin The address to be added as emergency admin
     */
    function addEmergencyAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    /**
     * @notice Remove an emergency admin
     * @param admin The address to be removed from emergency admin
     */
    function removeEmergencyAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    /**
     * @notice Check if an address is an emergency admin
     * @param admin The address to check
     * @return True if the address is an emergency admin
     */
    function isEmergencyAdmin(address admin) external view returns (bool) {
        return hasRole(EMERGENCY_ADMIN_ROLE, admin);
    }

    /**
     * @notice Add a risk admin
     * @param admin The address to be added as risk admin
     */
    function addRiskAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(RISK_ADMIN_ROLE, admin);
    }

    /**
     * @notice Remove a risk admin
     * @param admin The address to be removed from risk admin
     */
    function removeRiskAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(RISK_ADMIN_ROLE, admin);
    }

    /**
     * @notice Check if an address is a risk admin
     * @param admin The address to check
     * @return True if the address is a risk admin
     */
    function isRiskAdmin(address admin) external view returns (bool) {
        return hasRole(RISK_ADMIN_ROLE, admin);
    }

    /**
     * @notice Add a flash borrower
     * @param borrower The address to be added as flash borrower
     */
    function addFlashBorrower(address borrower) external onlyPoolAdmin {
        grantRole(FLASH_BORROWER_ROLE, borrower);
    }

    /**
     * @notice Remove a flash borrower
     * @param borrower The address to be removed from flash borrower
     */
    function removeFlashBorrower(address borrower) external onlyPoolAdmin {
        revokeRole(FLASH_BORROWER_ROLE, borrower);
    }

    /**
     * @notice Check if an address is a flash borrower
     * @param borrower The address to check
     * @return True if the address is a flash borrower
     */
    function isFlashBorrower(address borrower) external view returns (bool) {
        return hasRole(FLASH_BORROWER_ROLE, borrower);
    }

    /**
     * @notice Add a bridge
     * @param bridge The address to be added as bridge
     */
    function addBridge(address bridge) external onlyPoolAdmin {
        grantRole(BRIDGE_ROLE, bridge);
    }

    /**
     * @notice Remove a bridge
     * @param bridge The address to be removed from bridge
     */
    function removeBridge(address bridge) external onlyPoolAdmin {
        revokeRole(BRIDGE_ROLE, bridge);
    }

    /**
     * @notice Check if an address is a bridge
     * @param bridge The address to check
     * @return True if the address is a bridge
     */
    function isBridge(address bridge) external view returns (bool) {
        return hasRole(BRIDGE_ROLE, bridge);
    }

    /**
     * @notice Add an asset listing admin
     * @param admin The address to be added as asset listing admin
     */
    function addAssetListingAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }

    /**
     * @notice Remove an asset listing admin
     * @param admin The address to be removed from asset listing admin
     */
    function removeAssetListingAdmin(address admin) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }

    /**
     * @notice Check if an address is an asset listing admin
     * @param admin The address to check
     * @return True if the address is an asset listing admin
     */
    function isAssetListingAdmin(address admin) external view returns (bool) {
        return hasRole(ASSET_LISTING_ADMIN_ROLE, admin);
    }
}
