// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./FactoryBase.sol";
import "./ERC1400ExtensionFactory.sol";
import "./libraries/ValidationLibrary.sol";
import "../masters/ERC1400Master.sol";
import "../deployers/beacon/TokenBeacon.sol";

/**
 * @title ERC1400Factory
 * @notice Factory for deploying ERC1400 (security token) contracts using minimal proxy pattern
 * @dev Supports regulated securities with partition-based management
 * 
 * Gas Savings: 80-95% compared to full deployment
 * - Traditional deployment: ~5,000,000 gas
 * - Minimal proxy deployment: ~250,000-800,000 gas
 * 
 * Architecture Benefits:
 * - Size: ~300 lines (focused)
 * - Deployable: ~13KB (under 24KB limit)
 * - Focused: Only handles ERC1400 security tokens
 * - Testable: Independent unit testing
 * - Maintainable: Easy to audit and upgrade
 * 
 * Use Cases:
 * - Equity (common/preferred shares)
 * - Private equity
 * - Bonds
 * - Asset-backed securities
 * - Regulated securities requiring SEC/MiFID II compliance
 */
contract ERC1400Factory is FactoryBase {
    using Clones for address;

    // ============ Immutable Configuration ============
    
    /// @notice Master implementation for ERC1400
    address public immutable erc1400Master;
    
    /// @notice Beacon for upgradeable ERC1400 tokens
    address public immutable erc1400Beacon;
    
    /// @notice ERC1400 Extension Factory for attaching extensions
    ERC1400ExtensionFactory public immutable extensionFactory;

    // ============ Custom Errors ============
    
    error InvalidBeacon();
    error InvalidDecimals();

    // ============ Events ============
    
    event ERC1400Deployed(
        address indexed token,
        address indexed owner,
        string name,
        string symbol,
        uint8 decimals,
        bool isControllable
    );
    
    event ERC1400BeaconDeployed(
        address indexed token,
        address indexed owner,
        address indexed beacon,
        string name,
        string symbol
    );

    // ============ Constructor ============
    
    /**
     * @notice Initialize the ERC1400 factory
     * @param _erc1400Master Master implementation for ERC1400
     * @param _erc1400Beacon Beacon for upgradeable ERC1400
     * @param _extensionFactory ERC1400ExtensionFactory for attaching extensions
     * @param _policyEngine PolicyEngine address (address(0) = disabled)
     * @param _tokenRegistry TokenRegistry address (address(0) = disabled)
     * @param _factoryRegistry FactoryRegistry address (address(0) = disabled)
     */
    constructor(
        address _erc1400Master,
        address _erc1400Beacon,
        address _extensionFactory,
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) FactoryBase(_policyEngine, _tokenRegistry, _factoryRegistry) {
        if (_erc1400Master == address(0)) revert InvalidMaster();
        if (_extensionFactory == address(0)) revert InvalidMaster();
        
        erc1400Master = _erc1400Master;
        erc1400Beacon = _erc1400Beacon;
        extensionFactory = ERC1400ExtensionFactory(_extensionFactory);
    }

    // ============ Standard ERC1400 Deployment ============
    
    /**
     * @notice Deploy a standard ERC1400 security token
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals (typically 0-18)
     * @param defaultPartitions Initial partitions (e.g., ["COMMON", "PREFERRED"])
     * @param owner Token owner address
     * @param isControllable Whether controllers can force transfers
     * @return token Deployed token address
     */
    function deployERC1400(
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes32[] memory defaultPartitions,
        address owner,
        bool isControllable
    ) external returns (address token) {
        // Validate parameters
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        // Clone and initialize
        token = erc1400Master.clone();
        ERC1400Master(token).initialize(
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
        
        // Register and validate
        _validateAndRegister(
            token,
            erc1400Master,
            owner,
            "ERC1400",
            name,
            symbol,
            "DEPLOY_ERC1400",
            0 // Security tokens don't have initial supply (minted per partition)
        );
        
        emit ERC1400Deployed(token, owner, name, symbol, decimals, isControllable);
    }

    /**
     * @notice Deploy ERC1400 with deterministic address (CREATE2)
     * @param salt Salt for deterministic deployment
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param defaultPartitions Initial partitions
     * @param owner Token owner address
     * @param isControllable Whether controllers can force transfers
     * @return token Deployed token address
     */
    function deployERC1400Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes32[] memory defaultPartitions,
        address owner,
        bool isControllable
    ) external returns (address token) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        token = erc1400Master.cloneDeterministic(salt);
        ERC1400Master(token).initialize(
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
        
        _validateAndRegister(
            token,
            erc1400Master,
            owner,
            "ERC1400",
            name,
            symbol,
            "DEPLOY_ERC1400",
            0
        );
        
        emit ERC1400Deployed(token, owner, name, symbol, decimals, isControllable);
    }

    // ============ Upgradeable (Beacon) Deployment ============
    
    /**
     * @notice Deploy upgradeable ERC1400 using beacon proxy
     * @dev All tokens deployed via this beacon can be upgraded together
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param defaultPartitions Initial partitions
     * @param owner Token owner address
     * @param isControllable Whether controllers can force transfers
     * @return token Deployed token address
     */
    function deployERC1400Beacon(
        string memory name,
        string memory symbol,
        uint8 decimals,
        bytes32[] memory defaultPartitions,
        address owner,
        bool isControllable
    ) external returns (address token) {
        if (erc1400Beacon == address(0)) revert InvalidBeacon();
        
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        if (decimals > 18) revert InvalidDecimals();
        
        // Create beacon proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1400Master.initialize.selector,
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
        
        token = address(new BeaconProxy(erc1400Beacon, initData));
        
        _validateAndRegister(
            token,
            erc1400Beacon,
            owner,
            "ERC1400",
            name,
            symbol,
            "DEPLOY_ERC1400_BEACON",
            0
        );
        
        emit ERC1400BeaconDeployed(token, owner, erc1400Beacon, name, symbol);
    }

    // ============ Convenience Function ============
    
    /**
     * @notice Deploy ERC1400 with default common partition
     * @dev Simplifies deployment for basic use cases
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param owner Token owner address
     * @param isControllable Whether controllers can force transfers
     * @return token Deployed token address
     */
    function deployERC1400Simple(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address owner,
        bool isControllable
    ) external returns (address token) {
        // Create default "COMMON" partition
        bytes32[] memory defaultPartitions = new bytes32[](1);
        defaultPartitions[0] = bytes32("COMMON");
        
        return this.deployERC1400(
            name,
            symbol,
            decimals,
            defaultPartitions,
            owner,
            isControllable
        );
    }

    // ============ Query Functions ============
    
    /**
     * @notice Predict deterministic deployment address
     * @param salt Salt for deterministic deployment
     * @return Predicted address
     */
    function predictERC1400Address(bytes32 salt) external view returns (address) {
        return erc1400Master.predictDeterministicAddress(salt);
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
        return erc1400Master;
    }
    
    /**
     * @notice Get beacon address
     * @return Beacon address
     */
    function getBeacon() external view returns (address) {
        return erc1400Beacon;
    }
    
    // ============ Phase 3: Extension Attachment Methods ============
    
    /**
     * @notice Attach Controller extension for centralized regulatory control
     * @param token Token address to attach extension to
     * @param controllers Array of authorized controller addresses
     * @return extension Deployed extension address
     */
    function attachController(
        address token,
        address[] memory controllers
    ) external returns (address extension) {
        return extensionFactory.deployController(token, controllers);
    }
    
    /**
     * @notice Attach Document extension for legal document management
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function attachDocument(address token) external returns (address extension) {
        return extensionFactory.deployDocument(token);
    }
    
    /**
     * @notice Attach TransferRestrictions extension for partition-based transfer control
     * @param token Token address to attach extension to
     * @param defaultPartitions Array of default partition names
     * @return extension Deployed extension address
     */
    function attachTransferRestrictions(
        address token,
        bytes32[] memory defaultPartitions
    ) external returns (address extension) {
        return extensionFactory.deployTransferRestrictions(token, defaultPartitions);
    }
}
