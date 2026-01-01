// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import "./FactoryBase.sol";
import "./ERC721ExtensionFactory.sol";
import "./libraries/ValidationLibrary.sol";
import "../masters/ERC721Master.sol";
import "../deployers/beacon/TokenBeacon.sol";

/**
 * @title ERC721Factory
 * @notice Factory for deploying ERC721 (NFT) collections using minimal proxy pattern
 * @dev Supports standard ERC721 with enumeration and URI storage
 * 
 * Gas Savings: 80-95% compared to full deployment
 * - Traditional deployment: ~3,000,000 gas
 * - Minimal proxy deployment: ~150,000-500,000 gas
 * 
 * Architecture Benefits:
 * - Size: ~250 lines (focused)
 * - Deployable: ~10KB (under 24KB limit)
 * - Focused: Only handles ERC721/NFT collections
 * - Testable: Independent unit testing
 * - Maintainable: Easy to audit and upgrade
 */
contract ERC721Factory is FactoryBase {
    using Clones for address;

    // ============ Immutable Configuration ============
    
    /// @notice Master implementation for ERC721
    address public immutable erc721Master;
    
    /// @notice Beacon for upgradeable ERC721 collections
    address public immutable erc721Beacon;
    
    /// @notice ERC721 Extension Factory for attaching extensions
    ERC721ExtensionFactory public immutable extensionFactory;

    // ============ Custom Errors ============
    
    error InvalidBeacon();

    // ============ Events ============
    
    event ERC721Deployed(
        address indexed collection,
        address indexed owner,
        string name,
        string symbol,
        uint256 maxSupply
    );
    
    event ERC721BeaconDeployed(
        address indexed collection,
        address indexed owner,
        address indexed beacon,
        string name,
        string symbol
    );

    // ============ Constructor ============
    
    /**
     * @notice Initialize the ERC721 factory
     * @param _erc721Master Master implementation for ERC721
     * @param _erc721Beacon Beacon for upgradeable ERC721
     * @param _extensionFactory ERC721ExtensionFactory for attaching extensions
     * @param _policyEngine PolicyEngine address (address(0) = disabled)
     * @param _tokenRegistry TokenRegistry address (address(0) = disabled)
     * @param _factoryRegistry FactoryRegistry address (address(0) = disabled)
     */
    constructor(
        address _erc721Master,
        address _erc721Beacon,
        address _extensionFactory,
        address _policyEngine,
        address _tokenRegistry,
        address _factoryRegistry
    ) FactoryBase(_policyEngine, _tokenRegistry, _factoryRegistry) {
        if (_erc721Master == address(0)) revert InvalidMaster();
        if (_extensionFactory == address(0)) revert InvalidMaster();
        
        erc721Master = _erc721Master;
        erc721Beacon = _erc721Beacon;
        extensionFactory = ERC721ExtensionFactory(_extensionFactory);
    }

    // ============ Standard ERC721 Deployment ============
    
    /**
     * @notice Deploy a standard ERC721 NFT collection
     * @param name Collection name
     * @param symbol Collection symbol
     * @param baseTokenURI Base URI for metadata
     * @param maxSupply Maximum supply (0 = unlimited)
     * @param owner Collection owner address
     * @param mintingEnabled Whether minting is initially enabled
     * @param burningEnabled Whether burning is initially enabled
     * @return collection Deployed collection address
     */
    function deployERC721(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        uint256 maxSupply,
        address owner,
        bool mintingEnabled,
        bool burningEnabled
    ) external returns (address collection) {
        // Validate parameters
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        // Clone and initialize
        collection = erc721Master.clone();
        ERC721Master(collection).initialize(
            name,
            symbol,
            baseTokenURI,
            maxSupply,
            owner,
            mintingEnabled,
            burningEnabled
        );
        
        // Register and validate
        _validateAndRegister(
            collection,
            erc721Master,
            owner,
            "ERC721",
            name,
            symbol,
            "DEPLOY_ERC721",
            0 // NFTs don't have initial supply
        );
        
        emit ERC721Deployed(collection, owner, name, symbol, maxSupply);
    }

    /**
     * @notice Deploy ERC721 with deterministic address (CREATE2)
     * @param salt Salt for deterministic deployment
     * @param name Collection name
     * @param symbol Collection symbol
     * @param baseTokenURI Base URI for metadata
     * @param maxSupply Maximum supply (0 = unlimited)
     * @param owner Collection owner address
     * @param mintingEnabled Whether minting is initially enabled
     * @param burningEnabled Whether burning is initially enabled
     * @return collection Deployed collection address
     */
    function deployERC721Deterministic(
        bytes32 salt,
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        uint256 maxSupply,
        address owner,
        bool mintingEnabled,
        bool burningEnabled
    ) external returns (address collection) {
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        collection = erc721Master.cloneDeterministic(salt);
        ERC721Master(collection).initialize(
            name,
            symbol,
            baseTokenURI,
            maxSupply,
            owner,
            mintingEnabled,
            burningEnabled
        );
        
        _validateAndRegister(
            collection,
            erc721Master,
            owner,
            "ERC721",
            name,
            symbol,
            "DEPLOY_ERC721",
            0
        );
        
        emit ERC721Deployed(collection, owner, name, symbol, maxSupply);
    }

    // ============ Upgradeable (Beacon) Deployment ============
    
    /**
     * @notice Deploy upgradeable ERC721 using beacon proxy
     * @dev All collections deployed via this beacon can be upgraded together
     * @param name Collection name
     * @param symbol Collection symbol
     * @param baseTokenURI Base URI for metadata
     * @param maxSupply Maximum supply (0 = unlimited)
     * @param owner Collection owner address
     * @param mintingEnabled Whether minting is initially enabled
     * @param burningEnabled Whether burning is initially enabled
     * @return collection Deployed collection address
     */
    function deployERC721Beacon(
        string memory name,
        string memory symbol,
        string memory baseTokenURI,
        uint256 maxSupply,
        address owner,
        bool mintingEnabled,
        bool burningEnabled
    ) external returns (address collection) {
        if (erc721Beacon == address(0)) revert InvalidBeacon();
        
        ValidationLibrary.validateDeploymentParams(name, symbol, owner);
        
        // Create beacon proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            name,
            symbol,
            baseTokenURI,
            maxSupply,
            owner,
            mintingEnabled,
            burningEnabled
        );
        
        collection = address(new BeaconProxy(erc721Beacon, initData));
        
        _validateAndRegister(
            collection,
            erc721Beacon,
            owner,
            "ERC721",
            name,
            symbol,
            "DEPLOY_ERC721_BEACON",
            0
        );
        
        emit ERC721BeaconDeployed(collection, owner, erc721Beacon, name, symbol);
    }

    // ============ Query Functions ============
    
    /**
     * @notice Predict deterministic deployment address
     * @param salt Salt for deterministic deployment
     * @return Predicted address
     */
    function predictERC721Address(bytes32 salt) external view returns (address) {
        return erc721Master.predictDeterministicAddress(salt);
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
        return erc721Master;
    }
    
    /**
     * @notice Get beacon address
     * @return Beacon address
     */
    function getBeacon() external view returns (address) {
        return erc721Beacon;
    }
    
    // ============ Phase 3: Extension Attachment Methods ============
    
    /**
     * @notice Attach Royalty extension for EIP-2981 royalties
     * @param token Token address to attach extension to
     * @param defaultRoyaltyReceiver Default royalty recipient address
     * @param defaultRoyaltyPercentage Default royalty percentage in basis points (e.g., 500 = 5%)
     * @param maxRoyaltyCap Maximum royalty cap in basis points
     * @return extension Deployed extension address
     */
    function attachRoyalty(
        address token,
        address defaultRoyaltyReceiver,
        uint96 defaultRoyaltyPercentage,
        uint96 maxRoyaltyCap
    ) external returns (address extension) {
        return extensionFactory.deployRoyalty(token, defaultRoyaltyReceiver, defaultRoyaltyPercentage, maxRoyaltyCap);
    }
    
    /**
     * @notice Attach Soulbound extension for non-transferable tokens
     * @param token Token address to attach extension to
     * @param allowOneTimeTransfer Allow one-time transfer after minting
     * @param burnableByOwner Allow token owner to burn
     * @param burnableByIssuer Allow issuer to burn
     * @param expirationEnabled Enable token expiration
     * @param expirationPeriod Expiration period in seconds
     * @return extension Deployed extension address
     */
    function attachSoulbound(
        address token,
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    ) external returns (address extension) {
        return extensionFactory.deploySoulbound(
            token,
            allowOneTimeTransfer,
            burnableByOwner,
            burnableByIssuer,
            expirationEnabled,
            expirationPeriod
        );
    }
    
    /**
     * @notice Attach Rental extension for NFT rentals
     * @param token Token address to attach extension to
     * @param feeRecipient Platform fee recipient address
     * @param platformFeeBps Platform fee in basis points
     * @param minRentalDuration Minimum rental duration in seconds
     * @param maxRentalDuration Maximum rental duration in seconds
     * @param minRentalPrice Minimum rental price in wei
     * @param depositRequired Whether deposit is required
     * @param minDepositBps Minimum deposit in basis points
     * @return extension Deployed extension address
     */
    function attachRental(
        address token,
        address feeRecipient,
        uint256 platformFeeBps,
        uint256 minRentalDuration,
        uint256 maxRentalDuration,
        uint256 minRentalPrice,
        bool depositRequired,
        uint256 minDepositBps
    ) external returns (address extension) {
        return extensionFactory.deployRental(
            token,
            feeRecipient,
            platformFeeBps,
            minRentalDuration,
            maxRentalDuration,
            minRentalPrice,
            depositRequired,
            minDepositBps
        );
    }
    
    /**
     * @notice Attach Fractionalization extension for fractional ownership
     * @param token Token address to attach extension to
     * @param minFractions Minimum number of fractions
     * @param maxFractions Maximum number of fractions
     * @param buyoutMultiplierBps Buyout price multiplier in basis points
     * @param redemptionEnabled Enable fraction redemption
     * @param fractionPrice Price per fraction in wei
     * @param tradingEnabled Enable fraction trading
     * @return extension Deployed extension address
     */
    function attachFractionalization(
        address token,
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplierBps,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    ) external returns (address extension) {
        return extensionFactory.deployFractionalization(
            token,
            minFractions,
            maxFractions,
            buyoutMultiplierBps,
            redemptionEnabled,
            fractionPrice,
            tradingEnabled
        );
    }
    
    /**
     * @notice Attach Metadata extension for EIP-4906 metadata update events
     * @param token Token address to attach extension to
     * @param batchUpdatesEnabled Enable batch metadata updates
     * @param emitOnTransfer Emit metadata update events on transfer
     * @return extension Deployed extension address
     */
    function attachMetadata(
        address token,
        bool batchUpdatesEnabled,
        bool emitOnTransfer
    ) external returns (address extension) {
        return extensionFactory.deployMetadata(token, batchUpdatesEnabled, emitOnTransfer);
    }
    
    /**
     * @notice Attach GranularApproval extension for EIP-5216 fine-grained approvals
     * @param token Token address to attach extension to
     * @return extension Deployed extension address
     */
    function attachGranularApproval(address token) external returns (address extension) {
        return extensionFactory.deployGranularApproval(token);
    }
    
    /**
     * @notice Attach Consecutive extension for EIP-2309 batch minting
     * @param token Token address to attach extension to
     * @param startTokenId Starting token ID for consecutive minting
     * @param maxBatchSize Maximum batch size for consecutive minting
     * @return extension Deployed extension address
     */
    function attachConsecutive(
        address token,
        uint256 startTokenId,
        uint256 maxBatchSize
    ) external returns (address extension) {
        return extensionFactory.deployConsecutive(token, startTokenId, maxBatchSize);
    }
}
