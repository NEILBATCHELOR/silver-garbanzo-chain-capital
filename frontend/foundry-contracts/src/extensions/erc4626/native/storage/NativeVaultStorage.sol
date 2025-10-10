// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title NativeVaultStorage
 * @notice Storage layout for ERC-7535 Native ETH Vault functionality
 * @dev Minimal storage for WETH wrapper integration
 */
abstract contract NativeVaultStorage {
    // ============ State Variables ============
    
    /// @notice WETH contract address for wrapping/unwrapping
    address internal _weth;
    
    /// @notice Marker for native ETH (as per ERC-7535)
    /// @dev Returns 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE for asset()
    address internal constant NATIVE_ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    // ============ Storage Gap ============
    
    /**
     * @dev Storage gap for future storage layout changes
     */
    uint256[48] private __gap;
}
