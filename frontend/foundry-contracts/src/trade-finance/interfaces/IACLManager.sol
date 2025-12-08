// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IACLManager
 * @notice Interface for the Access Control List Manager
 */
interface IACLManager {
    // Role constants
    function POOL_ADMIN_ROLE() external view returns (bytes32);
    function EMERGENCY_ADMIN_ROLE() external view returns (bytes32);
    function RISK_ADMIN_ROLE() external view returns (bytes32);
    function FLASH_BORROWER_ROLE() external view returns (bytes32);
    function BRIDGE_ROLE() external view returns (bytes32);
    function ASSET_LISTING_ADMIN_ROLE() external view returns (bytes32);

    // Role checks
    function hasRole(bytes32 role, address account) external view returns (bool);
    function isPoolAdmin(address admin) external view returns (bool);
    function isEmergencyAdmin(address admin) external view returns (bool);
    function isRiskAdmin(address admin) external view returns (bool);
    function isFlashBorrower(address borrower) external view returns (bool);
    function isBridge(address bridge) external view returns (bool);
    function isAssetListingAdmin(address admin) external view returns (bool);

    // Role management
    function addPoolAdmin(address admin) external;
    function removePoolAdmin(address admin) external;
    function addEmergencyAdmin(address admin) external;
    function removeEmergencyAdmin(address admin) external;
    function addRiskAdmin(address admin) external;
    function removeRiskAdmin(address admin) external;
    function addFlashBorrower(address borrower) external;
    function removeFlashBorrower(address borrower) external;
    function addBridge(address bridge) external;
    function removeBridge(address bridge) external;
    function addAssetListingAdmin(address admin) external;
    function removeAssetListingAdmin(address admin) external;
}
