// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IExtensible
 * @notice Interface for tokens that support modular extension attachment
 * @dev All master token contracts should implement this interface
 * 
 * Purpose:
 * - Provides standardized extension management across all token types
 * - Enables dynamic feature addition/removal after token deployment
 * - Maintains registry of attached extensions for discoverability
 * 
 * Extension Pattern:
 * 1. Token deployed with core functionality
 * 2. Extensions deployed separately via extension factories
 * 3. Extensions attached to token via attachExtension()
 * 4. Token queries extension registry for compatibility validation
 * 5. Extensions can be detached if no longer needed
 * 
 * Integration:
 * - Token factories call attachExtension() during deployment
 * - Extension factories create and register extension modules
 * - ExtensionRegistry validates compatibility
 * - Frontend queries getExtensions() for UI display
 */
interface IExtensible {
    // ============ Events ============
    
    /**
     * @notice Emitted when an extension is attached to the token
     * @param extension Address of the attached extension module
     * @param extensionType Type of extension from ExtensionRegistry enum
     */
    event ExtensionAttached(address indexed extension, uint8 extensionType);
    
    /**
     * @notice Emitted when an extension is detached from the token
     * @param extension Address of the detached extension module
     * @param extensionType Type of extension from ExtensionRegistry enum
     */
    event ExtensionDetached(address indexed extension, uint8 extensionType);
    
    // ============ Errors ============
    
    /// @notice Extension is already attached to this token
    error ExtensionAlreadyAttached(address extension);
    
    /// @notice Extension is not attached to this token
    error ExtensionNotAttached(address extension);
    
    /// @notice Invalid extension address (address(0))
    error InvalidExtensionAddress();
    
    /// @notice Extension type is not compatible with this token standard
    error IncompatibleExtensionType(uint8 extensionType, uint8 tokenStandard);
    
    /// @notice Extension of this type is already attached
    error ExtensionTypeAlreadyAttached(uint8 extensionType);
    
    // ============ Core Functions ============
    
    /**
     * @notice Attach an extension module to this token
     * @dev Only callable by token owner/admin
     * @param extension Address of the extension module to attach
     * 
     * Requirements:
     * - Extension address cannot be zero
     * - Extension cannot already be attached
     * - Extension type must be compatible with token standard
     * - Only one extension of each type allowed per token
     * 
     * Process:
     * 1. Validate extension address
     * 2. Query ExtensionRegistry for extension info
     * 3. Verify compatibility with token standard
     * 4. Check extension type not already attached
     * 5. Add to extensions array
     * 6. Update mappings
     * 7. Emit ExtensionAttached event
     */
    function attachExtension(address extension) external;
    
    /**
     * @notice Detach an extension module from this token
     * @dev Only callable by token owner/admin
     * @param extension Address of the extension module to detach
     * 
     * Requirements:
     * - Extension must be currently attached
     * 
     * Process:
     * 1. Verify extension is attached
     * 2. Remove from extensions array (swap and pop)
     * 3. Clear mappings
     * 4. Emit ExtensionDetached event
     */
    function detachExtension(address extension) external;
    
    /**
     * @notice Get all extensions attached to this token
     * @return Array of extension module addresses
     * @dev Returns empty array if no extensions attached
     */
    function getExtensions() external view returns (address[] memory);
    
    /**
     * @notice Check if a specific extension is attached
     * @param extension Address of the extension to check
     * @return True if extension is attached, false otherwise
     */
    function hasExtension(address extension) external view returns (bool);
    
    /**
     * @notice Get the extension address for a specific extension type
     * @param extensionType Type of extension to query (from ExtensionRegistry enum)
     * @return Address of the extension, or address(0) if not attached
     * 
     * Example:
     *   uint8 PERMIT = 0; // ExtensionType.PERMIT
     *   address permitModule = token.getExtensionByType(PERMIT);
     */
    function getExtensionByType(uint8 extensionType) external view returns (address);
    
    /**
     * @notice Get the extension registry address
     * @return Address of the ExtensionRegistry contract
     * @dev Used to validate compatibility when attaching extensions
     */
    function extensionRegistry() external view returns (address);
}
