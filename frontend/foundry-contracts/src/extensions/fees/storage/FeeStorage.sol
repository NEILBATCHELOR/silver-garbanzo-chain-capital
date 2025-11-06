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
    
    // ============ DEX Pairs ============
    // address => is DEX pair
    mapping(address => bool) internal _dexPairs;
    
    // ============ Fee Tracking ============
    uint256 internal _totalFeesCollected;
    
    // ============ Storage Gap ============
    uint256[45] private __gap; // Reduced by 1 for new mapping
}
