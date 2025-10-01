// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ControllerStorage
 * @notice Storage layout for controller operations module (upgradeable-safe)
 */
contract ControllerStorage {
    // ============ Controller Management ============
    
    // address => is controller
    mapping(address => bool) internal _controllers;
    
    // Array of all controllers
    address[] internal _controllerList;
    
    // controller => index in array (for removal)
    mapping(address => uint256) internal _controllerIndexes;
    
    // ============ Controllability ============
    
    bool internal _isControllable;
    
    // ============ Account Freezing ============
    
    /// @notice Frozen account information
    struct FreezeData {
        bool isFrozen;
        bytes32 reason;
        uint256 timestamp;
    }
    
    // account => freeze data
    mapping(address => FreezeData) internal _frozenAccounts;
    
    // Array of frozen accounts
    address[] internal _frozenAccountList;
    
    // account => index in frozen array
    mapping(address => uint256) internal _frozenIndexes;
    
    // ============ Storage Gap ============
    uint256[44] private __gap;
}
