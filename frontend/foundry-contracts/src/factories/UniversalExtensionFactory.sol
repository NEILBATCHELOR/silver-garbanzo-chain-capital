// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ExtensionRegistry.sol";

/**
 * @title UniversalExtensionFactory
 * @notice Central router for deploying extension modules across all token standards
 * @dev Routes deployment requests to specific extension factories based on token type
 * 
 * PURPOSE: Provides unified interface for extension deployment
 * - Single contract for all extension deployments
 * - Automatic routing to appropriate specialized factory
 * - Compatibility validation
 * - Factory discovery and registration
 * 
 * ARCHITECTURE: Router/Facade Pattern
 * - Delegates to specialized extension factories
 * - Maintains registry of all factories
 * - Pure routing logic only (no state except registry)
 * 
 * FLOW:
 * 1. User calls deployExtension()
 * 2. Router validates token standard + extension type compatibility
 * 3. Router looks up appropriate factory
 * 4. Router delegates to specialized factory
 * 5. Extension deployed and registered
 */
contract UniversalExtensionFactory is Ownable {
    // ============ Immutable Infrastructure ============
    
    /// @notice ExtensionRegistry for tracking and compatibility
    ExtensionRegistry public immutable extensionRegistry;
    
    // ============ State Variables ============
    
    /// @notice Mapping of token standard => extension factory
    mapping(ExtensionRegistry.TokenStandard => address) public factories;
    
    /// @notice Mapping of extension type => factory address
    /// @dev Some extensions may have dedicated factories
    mapping(ExtensionRegistry.ExtensionType => address) public extensionFactories;
    
    /// @notice Array of all registered factories
    address[] public allFactories;
    
    /// @notice Factory metadata
    mapping(address => FactoryInfo) public factoryInfo;
    
    struct FactoryInfo {
        address factoryAddress;
        string factoryType;
        ExtensionRegistry.TokenStandard standard;
        bool isActive;
        uint256 registeredAt;
    }
    
    // ============ Events ============
    
    event FactoryRegistered(
        address indexed factory,
        ExtensionRegistry.TokenStandard indexed standard,
        string factoryType
    );
    
    event FactoryDeactivated(
        address indexed factory
    );
    
    event FactoryReactivated(
        address indexed factory
    );
    
    event ExtensionRouted(
        address indexed factory,
        address indexed token,
        ExtensionRegistry.ExtensionType indexed extensionType,
        address extension
    );
    
    // ============ Errors ============
    
    error InvalidRegistry();
    error InvalidFactory();
    error InvalidToken();
    error NoFactoryForStandard(ExtensionRegistry.TokenStandard standard);
    error NoFactoryForExtension(ExtensionRegistry.ExtensionType extensionType);
    error IncompatibleExtension(
        ExtensionRegistry.TokenStandard standard,
        ExtensionRegistry.ExtensionType extensionType
    );
    error FactoryNotActive(address factory);
    error FactoryAlreadyRegistered(address factory);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize router with extension registry
     * @param _extensionRegistry ExtensionRegistry address
     */
    constructor(address _extensionRegistry) Ownable(msg.sender) {
        if (_extensionRegistry == address(0)) revert InvalidRegistry();
        
        extensionRegistry = ExtensionRegistry(_extensionRegistry);
    }
    
    // ============ Factory Registration ============
    
    /**
     * @notice Register a specialized extension factory
     * @param factory Factory address
     * @param standard Token standard this factory supports
     * @param factoryType Type description (e.g., "ERC20Extensions")
     */
    function registerFactory(
        address factory,
        ExtensionRegistry.TokenStandard standard,
        string memory factoryType
    ) external onlyOwner {
        if (factory == address(0)) revert InvalidFactory();
        if (factoryInfo[factory].factoryAddress != address(0)) {
            revert FactoryAlreadyRegistered(factory);
        }
        
        factories[standard] = factory;
        
        factoryInfo[factory] = FactoryInfo({
            factoryAddress: factory,
            factoryType: factoryType,
            standard: standard,
            isActive: true,
            registeredAt: block.timestamp
        });
        
        allFactories.push(factory);
        
        emit FactoryRegistered(factory, standard, factoryType);
    }
    
    /**
     * @notice Register factory for specific extension type
     * @param factory Factory address
     * @param extensionType Extension type
     * @dev Some extension types may need dedicated factories
     */
    function registerExtensionFactory(
        address factory,
        ExtensionRegistry.ExtensionType extensionType
    ) external onlyOwner {
        if (factory == address(0)) revert InvalidFactory();
        
        extensionFactories[extensionType] = factory;
    }
    
    /**
     * @notice Deactivate a factory
     * @param factory Factory address
     */
    function deactivateFactory(address factory) external onlyOwner {
        if (factoryInfo[factory].factoryAddress == address(0)) revert InvalidFactory();
        
        factoryInfo[factory].isActive = false;
        
        emit FactoryDeactivated(factory);
    }
    
    /**
     * @notice Reactivate a factory
     * @param factory Factory address
     */
    function reactivateFactory(address factory) external onlyOwner {
        if (factoryInfo[factory].factoryAddress == address(0)) revert InvalidFactory();
        
        factoryInfo[factory].isActive = true;
        
        emit FactoryReactivated(factory);
    }
    
    // ============ Routing Functions ============
    
    /**
     * @notice Get factory for a token standard
     * @param standard Token standard
     * @return Factory address
     */
    function getFactory(ExtensionRegistry.TokenStandard standard)
        public
        view
        returns (address)
    {
        address factory = factories[standard];
        if (factory == address(0)) revert NoFactoryForStandard(standard);
        if (!factoryInfo[factory].isActive) revert FactoryNotActive(factory);
        
        return factory;
    }
    
    /**
     * @notice Get factory for specific extension type
     * @param extensionType Extension type
     * @return Factory address (address(0) if none registered)
     */
    function getExtensionFactory(ExtensionRegistry.ExtensionType extensionType)
        public
        view
        returns (address)
    {
        return extensionFactories[extensionType];
    }
    
    /**
     * @notice Validate extension compatibility before deployment
     * @param tokenStandard Token standard
     * @param extensionType Extension type
     * @return True if compatible
     */
    function validateCompatibility(
        ExtensionRegistry.TokenStandard tokenStandard,
        ExtensionRegistry.ExtensionType extensionType
    ) public view returns (bool) {
        return extensionRegistry.isCompatible(tokenStandard, extensionType);
    }
    
    /**
     * @notice Check if extension can be deployed for token
     * @param token Token address
     * @param tokenStandard Token standard
     * @param extensionType Extension type
     * @dev Checks compatibility and if extension already attached
     */
    function canDeployExtension(
        address token,
        ExtensionRegistry.TokenStandard tokenStandard,
        ExtensionRegistry.ExtensionType extensionType
    ) external view returns (bool) {
        // Check compatibility
        if (!extensionRegistry.isCompatible(tokenStandard, extensionType)) {
            return false;
        }
        
        // Check if already attached
        if (extensionRegistry.tokenHasExtensionType(token, extensionType)) {
            return false;
        }
        
        // Check if factory exists
        try this.getFactory(tokenStandard) returns (address factory) {
            return factory != address(0);
        } catch {
            return false;
        }
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Get all registered factories
     * @return Array of factory addresses
     */
    function getAllFactories() external view returns (address[] memory) {
        return allFactories;
    }
    
    /**
     * @notice Get factory info
     * @param factory Factory address
     * @return FactoryInfo struct
     */
    function getFactoryInfo(address factory)
        external
        view
        returns (FactoryInfo memory)
    {
        return factoryInfo[factory];
    }
    
    /**
     * @notice Check if factory is active
     * @param factory Factory address
     * @return True if active
     */
    function isFactoryActive(address factory) external view returns (bool) {
        return factoryInfo[factory].isActive;
    }
    
    /**
     * @notice Get available extension types for a token standard
     * @param standard Token standard
     * @return Array of compatible extension types
     * @dev This requires iterating through all extension types
     */
    function getAvailableExtensions(ExtensionRegistry.TokenStandard standard)
        external
        view
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        // Count compatible extensions
        uint256 count = 0;
        for (uint256 i = 0; i < 32; i++) { // 32 total extension types (0-31)
            ExtensionRegistry.ExtensionType extType = ExtensionRegistry.ExtensionType(i);
            if (extensionRegistry.isCompatible(standard, extType)) {
                count++;
            }
        }
        
        // Collect compatible extensions
        ExtensionRegistry.ExtensionType[] memory available = 
            new ExtensionRegistry.ExtensionType[](count);
        
        uint256 index = 0;
        for (uint256 i = 0; i < 32; i++) {
            ExtensionRegistry.ExtensionType extType = ExtensionRegistry.ExtensionType(i);
            if (extensionRegistry.isCompatible(standard, extType)) {
                available[index] = extType;
                index++;
            }
        }
        
        return available;
    }
    
    /**
     * @notice Get extensions already attached to a token
     * @param token Token address
     * @return Array of extension addresses
     */
    function getTokenExtensions(address token)
        external
        view
        returns (address[] memory)
    {
        return extensionRegistry.getTokenExtensions(token);
    }
    
    /**
     * @notice Get extension by type for a token
     * @param token Token address
     * @param extensionType Extension type
     * @return Extension address (address(0) if not found)
     */
    function getTokenExtensionByType(
        address token,
        ExtensionRegistry.ExtensionType extensionType
    ) external view returns (address) {
        return extensionRegistry.getTokenExtensionByType(token, extensionType);
    }
    
    // ============ Helper Functions ============
    
    /**
     * @notice Check if token has extension
     * @param token Token address
     * @param extension Extension address
     * @return True if token has the extension
     */
    function tokenHasExtension(
        address token,
        address extension
    ) external view returns (bool) {
        return extensionRegistry.tokenHasExtension(token, extension);
    }
    
    /**
     * @notice Check if token has extension of specific type
     * @param token Token address
     * @param extensionType Extension type
     * @return True if token has extension of that type
     */
    function tokenHasExtensionType(
        address token,
        ExtensionRegistry.ExtensionType extensionType
    ) external view returns (bool) {
        return extensionRegistry.tokenHasExtensionType(token, extensionType);
    }
}
