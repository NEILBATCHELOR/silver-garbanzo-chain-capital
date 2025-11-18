// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./FactoryBase.sol";
import "./ERC1155ExtensionFactory.sol";
import "./libraries/ValidationLibrary.sol";
import "../masters/ERC1155Master.sol";
import "../deployers/beacon/TokenBeacon.sol";

/**
 * @title ERC1155Factory
 * @notice Factory for deploying ERC1155 (multi-token) collections using minimal proxy pattern
 * @dev Supports fungible and non-fungible tokens in a single contract
 * 
 * Gas Savings: 80-95% compared to full deployment
 * - Traditional deployment: ~4,000,000 gas
 * - Minimal proxy deployment: ~200,000-600,000 gas
 * 
 * Architecture Benefits:
 * - Size: ~260 lines (focused)
 * - Deployable: ~11KB (under 24KB limit)
 * - Focused: Only handles ERC1155 multi-token collections
 * - Testable: Independent unit testing
 * - Maintainable: Easy to audit and upgrade
 */
contract ERC1155Factory is FactoryBase {
    using Clones for address;

    // ============ Immutable Configuration ============
    
    /// @notice Master implementation for ERC1155
    address public immutable erc1155Master;
    
    /// @notice Beacon for upgradeable ERC1155 collections
    address public immutable erc1155Beacon;
    
    /// @notice ERC1155 Extension Factory for attaching extensions
    ERC1155ExtensionFactory public immutable extensionFactory;

    // ============ Custom Errors ============
    
    error InvalidBeacon();

    // ============ Events ============
    
    event ERC1155Deployed(
        address indexed collection,
        address indexed owner,
        string name,
        string symbol,
        string uri
    );
    
    event ERC1155BeaconDeployed(
        address indexed collection,
        address indexed owner,
        address indexed beacon,
        string name,
        string symbol
    );

    // ============ Constructor ============
    
    /**
     * @notice Initialize the ERC1155 factory
     * @param _erc1155Master Master implementation for ERC1155
     * @param _erc1155Beacon Beacon for upgradeable ERC1155
     * @param _extensionFactory ERC1155ExtensionFactory for attaching extensions
     * @param _policyEngine PolicyEngine address (address(0) = disabled)
     * @param _tokenRegistry TokenRegistry address (address(0) = disabled)
     * @param _factoryRegistry FactoryRegistry address (address(0) = disabled)
     */
    constructor(
        address _erc1155Master,
        address _erc1155Beacon,
        address _extensionFactory,
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) FactoryBase(_policyEngine, _tokenRegistry, _factoryRegistry) {
        if (_erc1155Master == address(0)) revert InvalidMaster();
        if (_extensionFactory == address(0)) revert InvalidMaster();
        
        erc1155Master = _erc1155Master;
        erc1155Beacon = _erc1155Beacon;
        extensionFactory = ERC1155ExtensionFactory(_extensionFactory);
    }

    // ============ Standard ERC1155 Deployment ============
    
    /**
     * @notice Deploy a standard ERC1155 multi-token collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param uri Base URI for metadata (supports {id} placeholder)
     * @param owner Collection owner address
     * @return collection Deployed collection address
     */
    function deployERC1155(
        string memory name,
        string memory symbol,
        string memory uri,
        address owner
    ) external returns (address collection) {
        // Validate parameters
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        // Clone and initialize
        collection = erc1155Master.clone();
        ERC1155Master(collection).initialize(name, symbol, uri, owner);
        
        // Register and validate
        _validateAndRegister(
            collection,
            erc1155Master,
            owner,
            "ERC1155",
            name,
            symbol,
            "DEPLOY_ERC1155",
            0 // Multi-tokens don't have initial supply
        );
        
        emit ERC1155Deployed(collection, owner, name, symbol, uri);
    }

    /**
     * @notice Deploy ERC1155 with deterministic address (CREATE2)
     * @param salt Salt for deterministic deployment
     * @param name Collection name
     * @param symbol Collection symbol
     * @param uri Base URI for metadata
     * @param owner Collection owner address
     * @return collection Deployed collection address
     */
    function deployERC1155Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory uri,
        address owner
    ) external returns (address collection) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        collection = erc1155Master.cloneDeterministic(salt);
        ERC1155Master(collection).initialize(name, symbol, uri, owner);
        
        _validateAndRegister(
            collection,
            erc1155Master,
            owner,
            "ERC1155",
            name,
            symbol,
            "DEPLOY_ERC1155",
            0
        );
        
        emit ERC1155Deployed(collection, owner, name, symbol, uri);
    }

    // ============ Upgradeable (Beacon) Deployment ============
    
    /**
     * @notice Deploy upgradeable ERC1155 using beacon proxy
     * @dev All collections deployed via this beacon can be upgraded together
     * @param name Collection name
     * @param symbol Collection symbol
     * @param uri Base URI for metadata
     * @param owner Collection owner address
     * @return collection Deployed collection address
     */
    function deployERC1155Beacon(
        string memory name,
        string memory symbol,
        string memory uri,
        address owner
    ) external returns (address collection) {
        if (erc1155Beacon == address(0)) revert InvalidBeacon();
        
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        // Create beacon proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1155Master.initialize.selector,
            name,
            symbol,
            uri,
            owner
        );
        
        collection = address(new BeaconProxy(erc1155Beacon, initData));
        
        _validateAndRegister(
            collection,
            erc1155Beacon,
            owner,
            "ERC1155",
            name,
            symbol,
            "DEPLOY_ERC1155_BEACON",
            0
        );
        
        emit ERC1155BeaconDeployed(collection, owner, erc1155Beacon, name, symbol);
    }

    // ============ Query Functions ============
    
    /**
     * @notice Predict deterministic deployment address
     * @param salt Salt for deterministic deployment
     * @return Predicted address
     */
    function predictERC1155Address(bytes32 salt) external view returns (address) {
        return erc1155Master.predictDeterministicAddress(salt);
    }
    
    /**
     * @notice Check if address is a collection from this factory
     * @param collection Address to check
     * @return True if collection was deployed by this factory
     */
    function isCollection(address collection) external view returns (bool) {
        return _isToken[collection];
    }
    
    /**
     * @notice Get master implementation address
     * @return Master implementation address
     */
    function getMasterImplementation() external view returns (address) {
        return erc1155Master;
    }
    
    /**
     * @notice Get beacon address
     * @return Beacon address
     */
    function getBeacon() external view returns (address) {
        return erc1155Beacon;
    }
    
    // ============ Phase 3: Extension Attachment Methods ============
    
    /**
     * @notice Attach URI Management extension for dynamic URIs
     * @param token Token address to attach extension to
     * @param baseURI Base URI for token metadata
     * @return extension Deployed extension address
     */
    function attachURIManagement(
        address token,
        string memory baseURI
    ) external returns (address extension) {
        return extensionFactory.deployURIManagement(token, baseURI);
    }
    
    /**
     * @notice Attach Supply Cap extension for per-ID supply limits
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function attachSupplyCap(address token) external returns (address extension) {
        return extensionFactory.deploySupplyCap(token);
    }
    
    /**
     * @notice Attach Royalty extension for per-token-type royalties
     * @param token Token address to attach extension to
     * @param defaultReceiver Default royalty receiver
     * @param defaultFeeNumerator Default royalty fee numerator (out of 10000)
     * @return extension Deployed extension address
     */
    function attachRoyalty(
        address token,
        address defaultReceiver,
        uint96 defaultFeeNumerator
    ) external returns (address extension) {
        return extensionFactory.deployRoyalty(token, defaultReceiver, defaultFeeNumerator);
    }
}
