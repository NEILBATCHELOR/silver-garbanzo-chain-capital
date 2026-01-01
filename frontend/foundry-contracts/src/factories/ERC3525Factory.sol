// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./FactoryBase.sol";
import "./ERC3525ExtensionFactory.sol";
import "./libraries/ValidationLibrary.sol";
import "../masters/ERC3525Master.sol";
import "../deployers/beacon/TokenBeacon.sol";

/**
 * @title ERC3525Factory
 * @notice Factory for deploying ERC3525 (semi-fungible) tokens using minimal proxy pattern
 * @dev Supports slot-based tokens with transferable values
 * 
 * Gas Savings: 80-95% compared to full deployment
 * - Traditional deployment: ~4,500,000 gas
 * - Minimal proxy deployment: ~200,000-700,000 gas
 * 
 * Architecture Benefits:
 * - Size: ~270 lines (focused)
 * - Deployable: ~11KB (under 24KB limit)
 * - Focused: Only handles ERC3525 semi-fungible tokens
 * - Testable: Independent unit testing
 * - Maintainable: Easy to audit and upgrade
 * 
 * Use Cases:
 * - Financial instruments (bonds, derivatives)
 * - Fractional ownership
 * - Gaming items with attributes
 * - Subscription tiers
 */
contract ERC3525Factory is FactoryBase {
    using Clones for address;

    // ============ Immutable Configuration ============
    
    /// @notice Master implementation for ERC3525
    address public immutable erc3525Master;
    
    /// @notice Beacon for upgradeable ERC3525 tokens
    address public immutable erc3525Beacon;
    
    /// @notice ERC3525 Extension Factory for attaching extensions
    ERC3525ExtensionFactory public immutable extensionFactory;

    // ============ Custom Errors ============
    
    error InvalidBeacon();
    error InvalidDecimals();

    // ============ Events ============
    
    event ERC3525Deployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint8 decimals
    );
    
    event ERC3525BeaconDeployed(
        address indexed token,
        address indexed owner,
        address indexed beacon,
        string name,
        string symbol
    );

    // ============ Constructor ============
    
    /**
     * @notice Initialize the ERC3525 factory
     * @param _erc3525Master Master implementation for ERC3525
     * @param _erc3525Beacon Beacon for upgradeable ERC3525
     * @param _extensionFactory ERC3525ExtensionFactory for attaching extensions
     * @param _policyEngine PolicyEngine address (address(0) = disabled)
     * @param _tokenRegistry TokenRegistry address (address(0) = disabled)
     * @param _factoryRegistry FactoryRegistry address (address(0) = disabled)
     */
    constructor(
        address _erc3525Master,
        address _erc3525Beacon,
        address _extensionFactory,
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) FactoryBase(_policyEngine, _tokenRegistry, _factoryRegistry) {
        if (_erc3525Master == address(0)) revert InvalidMaster();
        if (_extensionFactory == address(0)) revert InvalidMaster();
        
        erc3525Master = _erc3525Master;
        erc3525Beacon = _erc3525Beacon;
        extensionFactory = ERC3525ExtensionFactory(_extensionFactory);
    }

    // ============ Standard ERC3525 Deployment ============
    
    /**
     * @notice Deploy a standard ERC3525 semi-fungible token
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Value decimals (typically 0-18)
     * @param owner Token owner address
     * @return token Deployed token address
     */
    function deployERC3525(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address token) {
        // Validate parameters
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        // Clone and initialize
        token = erc3525Master.clone();
        ERC3525Master(token).initialize(name, symbol, decimals, owner);
        
        // Register and validate
        _validateAndRegister(
            token,
            erc3525Master,
            owner,
            "ERC3525",
            name,
            symbol,
            "DEPLOY_ERC3525",
            0 // Semi-fungible tokens don't have initial supply
        );
        
        emit ERC3525Deployed(token, owner, name, symbol, decimals);
    }

    /**
     * @notice Deploy ERC3525 with deterministic address (CREATE2)
     * @param salt Salt for deterministic deployment
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Value decimals
     * @param owner Token owner address
     * @return token Deployed token address
     */
    function deployERC3525Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address token) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        token = erc3525Master.cloneDeterministic(salt);
        ERC3525Master(token).initialize(name, symbol, decimals, owner);
        
        _validateAndRegister(
            token,
            erc3525Master,
            owner,
            "ERC3525",
            name,
            symbol,
            "DEPLOY_ERC3525",
            0
        );
        
        emit ERC3525Deployed(token, owner, name, symbol, decimals);
    }

    // ============ Upgradeable (Beacon) Deployment ============
    
    /**
     * @notice Deploy upgradeable ERC3525 using beacon proxy
     * @dev All tokens deployed via this beacon can be upgraded together
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Value decimals
     * @param owner Token owner address
     * @return token Deployed token address
     */
    function deployERC3525Beacon(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner
    ) external returns (address token) {
        if (erc3525Beacon == address(0)) revert InvalidBeacon();
        
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        // Create beacon proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC3525Master.initialize.selector,
            name,
            symbol,
            decimals,
            owner
        );
        
        token = address(new BeaconProxy(erc3525Beacon, initData));
        
        _validateAndRegister(
            token,
            erc3525Beacon,
            owner,
            "ERC3525",
            name,
            symbol,
            "DEPLOY_ERC3525_BEACON",
            0
        );
        
        emit ERC3525BeaconDeployed(token, owner, erc3525Beacon, name, symbol);
    }

    // ============ Query Functions ============
    
    /**
     * @notice Predict deterministic deployment address
     * @param salt Salt for deterministic deployment
     * @return Predicted address
     */
    function predictERC3525Address(bytes32 salt) external view returns (address) {
        return erc3525Master.predictDeterministicAddress(salt);
    }
    
    /**
     * @notice Check if address is a token from this factory
     * @param token Address to check
     * @return True if token was deployed by this factory
     */
    function isToken(address token) external view override returns (bool) {
        return _isToken[token];
    }
    
    /**
     * @notice Get master implementation address
     * @return Master implementation address
     */
    function getMasterImplementation() external view returns (address) {
        return erc3525Master;
    }
    
    /**
     * @notice Get beacon address
     * @return Beacon address
     */
    function getBeacon() external view returns (address) {
        return erc3525Beacon;
    }
    
    // ============ Phase 3: Extension Attachment Methods ============
    
    /**
     * @notice Attach Slot Manager extension for advanced slot management
     * @param token Token address to attach extension to
     * @param allowDynamicSlotCreation Whether new slots can be created dynamically
     * @param restrictCrossSlot Whether transfers between slots are restricted
     * @param allowSlotMerging Whether values from different slots can be merged
     * @return extension Deployed extension address
     */
    function attachSlotManager(
        address token,
        bool allowDynamicSlotCreation,
        bool restrictCrossSlot,
        bool allowSlotMerging
    ) external returns (address extension) {
        return extensionFactory.deploySlotManager(token, allowDynamicSlotCreation, restrictCrossSlot, allowSlotMerging);
    }
    
    /**
     * @notice Attach Slot Approvable extension for slot-level approvals
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function attachSlotApprovable(address token) external returns (address extension) {
        return extensionFactory.deploySlotApprovable(token);
    }
    
    /**
     * @notice Attach Value Exchange extension for value trading
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     * @dev Exchange rates should be configured post-deployment via setExchangeRate()
     */
    function attachValueExchange(
        address token
    ) external returns (address extension) {
        return extensionFactory.deployValueExchange(token);
    }
}
