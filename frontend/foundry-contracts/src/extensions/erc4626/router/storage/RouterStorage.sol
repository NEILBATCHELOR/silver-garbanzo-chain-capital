// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RouterStorage
 * @notice Storage layout for ERC4626Router
 * @dev Uses namespaced storage pattern to prevent collisions
 */
abstract contract RouterStorage {
    // ============ Storage Variables ============
    
    /// @dev Mapping of vault address to registration status
    mapping(address => bool) internal _registeredVaults;
    
    /// @dev Array of all registered vault addresses
    address[] internal _vaultList;
    
    /// @dev Mapping of vault to asset token
    mapping(address => address) internal _vaultAssets;
    
    // ============ Storage Gap ============
    /// @dev Reserved storage slots for future upgrades
    uint256[47] private __gap;
}
