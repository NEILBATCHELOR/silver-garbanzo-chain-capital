// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SupplyCapStorage
 * @notice Storage layout for supply cap module (upgradeable-safe)
 */
contract SupplyCapStorage {
    // ============ Supply Data ============
    
    // Maximum supply per token ID (0 = unlimited)
    mapping(uint256 => uint256) internal _maxSupply;
    
    // Current supply per token ID
    mapping(uint256 => uint256) internal _currentSupply;
    
    // Supply cap locked status per token ID
    mapping(uint256 => bool) internal _supplyLocked;
    
    // ============ Global Cap ============
    
    // Default cap for tokens without specific caps (0 = unlimited)
    uint256 internal _defaultCap;
    
    // Global cap for total supply across all tokens (0 = no cap)
    uint256 internal _globalCap;
    
    // Total supply across all token IDs
    uint256 internal _totalGlobalSupply;
    
    // ============ Storage Gap ============
    uint256[44] private __gap;
}
