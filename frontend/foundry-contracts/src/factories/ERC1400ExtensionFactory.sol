// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/erc1400/ERC1400ControllerModule.sol";
import "../extensions/erc1400/ERC1400DocumentModule.sol";
import "../extensions/erc1400/ERC1400TransferRestrictionsModule.sol";

/**
 * @title ERC1400ExtensionFactory
 * @notice Factory for deploying ERC1400-specific security token extension modules
 * @dev Handles 3 ERC1400 extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1. CONTROLLER             - Centralized control for regulatory compliance
 * 2. DOCUMENT               - Document management for legal compliance
 * 3. TRANSFER_RESTRICTIONS  - Partition-based transfer restrictions
 * 
 * Architecture:
 * - One beacon per extension type (3 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC1400ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public controllerBeacon;
    address public documentBeacon;
    address public transferRestrictionsBeacon;
    
    // ============ Events ============
    
    event ControllerExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event DocumentExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event TransferRestrictionsExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC1400 extension factory
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
     * @param controllerImpl Controller module implementation
     * @param documentImpl Document module implementation
     * @param transferRestrictionsImpl TransferRestrictions module implementation
     */
    function initializeBeacons(
        address controllerImpl,
        address documentImpl,
        address transferRestrictionsImpl
    ) external onlyOwner {
        require(controllerBeacon == address(0), "Already initialized");
        
        controllerBeacon = _createBeacon(controllerImpl, ExtensionRegistry.ExtensionType.CONTROLLER);
        documentBeacon = _createBeacon(documentImpl, ExtensionRegistry.ExtensionType.DOCUMENT);
        transferRestrictionsBeacon = _createBeacon(transferRestrictionsImpl, ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy Controller extension for centralized regulatory control
     * @param token Token address to attach extension to
     * @param controllable Whether token is controllable
     * @return extension Deployed extension address
     */
    function deployController(
        address token,
        bool controllable
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(controllerBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1400ControllerModule.initialize.selector,
            msg.sender,  // admin
            controllable
        );
        
        // Deploy via beacon
        extension = _deployExtension(controllerBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.CONTROLLER,
            ExtensionRegistry.TokenStandard.ERC1400,
            "DEPLOY_EXTENSION"
        );
        
        emit ControllerExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.CONTROLLER, msg.sender, controllerBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Document extension for legal document management
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployDocument(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(documentBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1400DocumentModule.initialize.selector,
            msg.sender  // admin
        );
        
        // Deploy via beacon
        extension = _deployExtension(documentBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.DOCUMENT,
            ExtensionRegistry.TokenStandard.ERC1400,
            "DEPLOY_EXTENSION"
        );
        
        emit DocumentExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.DOCUMENT, msg.sender, documentBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy TransferRestrictions extension for partition-based transfer control
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deployTransferRestrictions(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(transferRestrictionsBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC1400TransferRestrictionsModule.initialize.selector,
            msg.sender  // admin
        );
        
        // Deploy via beacon
        extension = _deployExtension(transferRestrictionsBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS,
            ExtensionRegistry.TokenStandard.ERC1400,
            "DEPLOY_EXTENSION"
        );
        
        emit TransferRestrictionsExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS, msg.sender, transferRestrictionsBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC1400 security token standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC1400;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 3 ERC1400 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](3);
        extensions[0] = ExtensionRegistry.ExtensionType.CONTROLLER;
        extensions[1] = ExtensionRegistry.ExtensionType.DOCUMENT;
        extensions[2] = ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS;
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
        
        if (extensionType == ExtensionRegistry.ExtensionType.CONTROLLER) {
            beacon = controllerBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.DOCUMENT) {
            beacon = documentBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.TRANSFER_RESTRICTIONS) {
            beacon = transferRestrictionsBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}
