// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../interfaces/IERC20FeeModule.sol";

/**
 * @title FeeStorage
 * @notice Storage layout for Fee module (upgradeable-safe)
 */
contract FeeStorage {
    // ============ Fee Configuration ============
    IERC20FeeModule.FeeConfig internal _feeConfig;
    
    // ============ Fee Exemptions ============
    // account => exemption details
    mapping(address => IERC20FeeModule.FeeExemption) internal _exemptions;
    
    // ============ Fee Tracking ============
    uint256 internal _totalFeesCollected;
    
    // ============ Storage Gap ============
    uint256[46] private __gap;
}
