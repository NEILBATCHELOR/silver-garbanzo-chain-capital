// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/uri-management/ERC1155URIModule.sol";
import "../extensions/supply-cap/ERC1155SupplyCapModule.sol";
import "../extensions/royalty/ERC1155RoyaltyModule.sol";

/**
 * @title ERC1155ExtensionFactory
 * @notice Factory for deploying ERC1155-specific extension modules
 * @dev Handles 3 ERC1155 extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1. URI_MANAGEMENT  - Dynamic URI management per token ID
 * 2. SUPPLY_CAP      - Per-token-ID supply limits
 * 3. ROYALTY         - Per-token-type royalty tracking
 * 
 * Architecture:
 * - One beacon per extension type (3 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC1155ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public uriManagementBeacon;
    address public supplyCapBeacon;
    address public royaltyBeacon;
    
    // ============ Events ============
    
    event URIManagementExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event SupplyCapExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event RoyaltyExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC1155 extension factory
     * @param _extensionRegistry ExtensionRegistry address
     * @param _policyEngine PolicyEngine address (address(0) to disable)
     * @param _upgradeGovernor UpgradeGovernor address (address(0) to disable)
     */
    constructor(
        address _extensionRegistry,
        address _policyEngine,
        address _upgradeGovernor
    ) ExtensionBase(_extensionRegistry, _policyEngine, _upgradeGovernor) {}
    
    // ============ Beacon Initialization ============
    
    /**
     * @notice Initialize all beacons with master implementations
     * @param uriManagementImpl URI management module implementation
     * @param supplyCapImpl Supply cap module implementation
     * @param royaltyImpl Royalty module implementation
     */
    function initializeBeacons(
        address uriManagementImpl,
        address supplyCapImpl,
        address royaltyImpl
    ) external onlyOwner {
        require(uriManagementBeacon == address(0), "Already initialized");
        
        uriManagementBeacon = _createBeacon(uriManagementImpl, ExtensionRegistry.ExtensionType.URI_MANAGEMENT);
        supplyCapBeacon = _createBeacon(supplyCapImpl, ExtensionRegistry.ExtensionType.SUPPLY_CAP);
        royaltyBeacon = _createBeacon(royaltyImpl, ExtensionRegistry.ExtensionType.ROYALTY);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy URI Management extension for dynamic URIs
     * @param token Token address to attach extension to
     * @param baseURI Base URI for token metadata
     * @return extension Deployed extension address
     */
    function deployURIManagement(
        address token,
        string memory baseURI
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(uriManagementBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1155URIModule.initialize.selector,
            msg.sender,  // admin
            token,
            baseURI
        );
        
        // Deploy via beacon
        extension = _deployExtension(uriManagementBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.URI_MANAGEMENT,
            ExtensionRegistry.TokenStandard.ERC1155,
            "DEPLOY_EXTENSION"
        );
        
        emit URIManagementExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.URI_MANAGEMENT, msg.sender, uriManagementBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Supply Cap extension for per-ID supply limits
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deploySupplyCap(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(supplyCapBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1155SupplyCapModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(supplyCapBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.SUPPLY_CAP,
            ExtensionRegistry.TokenStandard.ERC1155,
            "DEPLOY_EXTENSION"
        );
        
        emit SupplyCapExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.SUPPLY_CAP, msg.sender, supplyCapBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Royalty extension for per-token-type royalties
     * @param token Token address to attach extension to
     * @param defaultReceiver Default royalty receiver
     * @param defaultFeeNumerator Default royalty fee numerator (out of 10000)
     * @return extension Deployed extension address
     */
    function deployRoyalty(
        address token,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(royaltyBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1155RoyaltyModule.initialize.selector,
            msg.sender,  // admin
            token,
            defaultReceiver,
            defaultFeeNumerator
        );
        
        // Deploy via beacon
        extension = _deployExtension(royaltyBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.ROYALTY,
            ExtensionRegistry.TokenStandard.ERC1155,
            "DEPLOY_EXTENSION"
        );
        
        emit RoyaltyExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.ROYALTY, msg.sender, royaltyBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC1155 token standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC1155;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 3 ERC1155 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](3);
        extensions[0] = ExtensionRegistry.ExtensionType.URI_MANAGEMENT;
        extensions[1] = ExtensionRegistry.ExtensionType.SUPPLY_CAP;
        extensions[2] = ExtensionRegistry.ExtensionType.ROYALTY;
        return extensions;
    }
    
    // ============ Beacon Upgrade Functions ============
    
    /**
     * @notice Upgrade a specific beacon implementation
     * @param extensionType Type of extension to upgrade
     * @param newImplementation New implementation address
     */
    function upgradeBeacon(
        ExtensionRegistry.ExtensionType extensionType,
        address newImplementation
    ) external onlyOwner {
        address beacon;
        
        if (extensionType == ExtensionRegistry.ExtensionType.URI_MANAGEMENT) {
            beacon = uriManagementBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.SUPPLY_CAP) {
            beacon = supplyCapBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.ROYALTY) {
            beacon = royaltyBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}
