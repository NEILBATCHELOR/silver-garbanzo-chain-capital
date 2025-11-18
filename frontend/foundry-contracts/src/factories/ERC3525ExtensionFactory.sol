// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ExtensionBase.sol";
import "./ExtensionRegistry.sol";
import "../extensions/erc3525/ERC3525SlotManagerModule.sol";
import "../extensions/erc3525/ERC3525SlotApprovableModule.sol";
import "../extensions/erc3525/ERC3525ValueExchangeModule.sol";

/**
 * @title ERC3525ExtensionFactory
 * @notice Factory for deploying ERC3525-specific extension modules
 * @dev Handles 3 ERC3525 extension types with beacon-based upgradeability
 * 
 * Supported Extensions:
 * 1. SLOT_MANAGER    - Advanced slot management for semi-fungible tokens
 * 2. SLOT_APPROVABLE - Slot-level approval mechanisms
 * 3. VALUE_EXCHANGE  - Value trading and exchange between slots
 * 
 * Architecture:
 * - One beacon per extension type (3 beacons total)
 * - Beacons enable upgradeability of extension logic
 * - All deployments go through ExtensionRegistry
 * - Policy validation via PolicyEngine
 * - Upgrade governance via UpgradeGovernor
 */
contract ERC3525ExtensionFactory is ExtensionBase {
    
    // ============ Beacons ============
    
    address public slotManagerBeacon;
    address public slotApprovableBeacon;
    address public valueExchangeBeacon;
    
    // ============ Events ============
    
    event SlotManagerExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event SlotApprovableExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    event ValueExchangeExtensionDeployed(address indexed token, address indexed extension, address indexed deployer);
    
    // ============ Constructor ============
    
    /**
     * @notice Initialize ERC3525 extension factory
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
     * @param slotManagerImpl Slot manager module implementation
     * @param slotApprovableImpl Slot approvable module implementation
     * @param valueExchangeImpl Value exchange module implementation
     */
    function initializeBeacons(
        address slotManagerImpl,
        address slotApprovableImpl,
        address valueExchangeImpl
    ) external onlyOwner {
        require(slotManagerBeacon == address(0), "Already initialized");
        
        slotManagerBeacon = _createBeacon(slotManagerImpl, ExtensionRegistry.ExtensionType.SLOT_MANAGER);
        slotApprovableBeacon = _createBeacon(slotApprovableImpl, ExtensionRegistry.ExtensionType.SLOT_APPROVABLE);
        valueExchangeBeacon = _createBeacon(valueExchangeImpl, ExtensionRegistry.ExtensionType.VALUE_EXCHANGE);
    }
    
    // ============ Extension Deployment Functions ============
    
    /**
     * @notice Deploy Slot Manager extension for advanced slot management
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deploySlotManager(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(slotManagerBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC3525SlotManagerModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(slotManagerBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.SLOT_MANAGER,
            ExtensionRegistry.TokenStandard.ERC3525,
            "DEPLOY_EXTENSION"
        );
        
        emit SlotManagerExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.SLOT_MANAGER, msg.sender, slotManagerBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Slot Approvable extension for slot-level approvals
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function deploySlotApprovable(
        address token
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(slotApprovableBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC3525SlotApprovableModule.initialize.selector,
            msg.sender,  // admin
            token
        );
        
        // Deploy via beacon
        extension = _deployExtension(slotApprovableBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.SLOT_APPROVABLE,
            ExtensionRegistry.TokenStandard.ERC3525,
            "DEPLOY_EXTENSION"
        );
        
        emit SlotApprovableExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.SLOT_APPROVABLE, msg.sender, slotApprovableBeacon);
        
        return extension;
    }
    
    /**
     * @notice Deploy Value Exchange extension for value trading
     * @param token Token address to attach extension to
     * @param exchangeFee Fee for value exchanges (in basis points)
     * @return extension Deployed extension address
     */
    function deployValueExchange(
        address token,
        uint256 exchangeFee
    ) external returns (address extension) {
        if (token == address(0)) revert InvalidToken();
        require(valueExchangeBeacon != address(0), "Beacon not initialized");
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            ERC3525ValueExchangeModule.initialize.selector,
            msg.sender,  // admin
            token,
            exchangeFee
        );
        
        // Deploy via beacon
        extension = _deployExtension(valueExchangeBeacon, initData);
        
        // Validate and register
        _validateAndRegister(
            extension,
            token,
            ExtensionRegistry.ExtensionType.VALUE_EXCHANGE,
            ExtensionRegistry.TokenStandard.ERC3525,
            "DEPLOY_EXTENSION"
        );
        
        emit ValueExchangeExtensionDeployed(token, extension, msg.sender);
        emit ExtensionDeployed(extension, token, ExtensionRegistry.ExtensionType.VALUE_EXCHANGE, msg.sender, valueExchangeBeacon);
        
        return extension;
    }
    
    // ============ Abstract Function Implementations ============
    
    /**
     * @notice Get the token standard this factory supports
     * @return ERC3525 token standard
     */
    function getTokenStandard()
        external
        pure
        override
        returns (ExtensionRegistry.TokenStandard)
    {
        return ExtensionRegistry.TokenStandard.ERC3525;
    }
    
    /**
     * @notice Get all supported extension types
     * @return Array of 3 ERC3525 extension types
     */
    function getSupportedExtensions()
        external
        pure
        override
        returns (ExtensionRegistry.ExtensionType[] memory)
    {
        ExtensionRegistry.ExtensionType[] memory extensions = new ExtensionRegistry.ExtensionType[](3);
        extensions[0] = ExtensionRegistry.ExtensionType.SLOT_MANAGER;
        extensions[1] = ExtensionRegistry.ExtensionType.SLOT_APPROVABLE;
        extensions[2] = ExtensionRegistry.ExtensionType.VALUE_EXCHANGE;
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
        
        if (extensionType == ExtensionRegistry.ExtensionType.SLOT_MANAGER) {
            beacon = slotManagerBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.SLOT_APPROVABLE) {
            beacon = slotApprovableBeacon;
        } else if (extensionType == ExtensionRegistry.ExtensionType.VALUE_EXCHANGE) {
            beacon = valueExchangeBeacon;
        } else {
            revert IncompatibleExtension();
        }
        
        _directBeaconUpgrade(beacon, newImplementation);
    }
}
