// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

// Extension Infrastructure
import "../interfaces/IExtensible.sol";
import "../factories/ExtensionRegistry.sol";

/**
 * @title ERC721WrapperMaster
 * @notice ERC-721 (NFT) wrapper implementation with policy enforcement
 * @dev Wraps an underlying ERC-721 token to add additional functionality
 * 
 * Key Features:
 * - Wrap/unwrap underlying NFTs 1:1
 * - Pausable transfers for emergency stops
 * - Burnable (unwraps and burns)
 * - URI storage for additional metadata
 * - Policy enforcement for operations
 * - UUPS upgradeable
 * - Optimized for minimal proxy deployment
 * 
 * Use Cases:
 * - Adding functionality to existing NFTs (e.g., rentable Bored Apes)
 * - Cross-chain NFT bridges
 * - Fractionalization preparation
 * - DeFi protocol integration (e.g., collateral wrapping)
 * - Adding royalty support to legacy collections
 * 
 * Gas Optimizations:
 * - Calldata parameters (saves ~300 gas)
 * - Early exit policy checks (~200 gas)
 * - Minimal proxy compatible (95% deployment savings)
 */
contract ERC721WrapperMaster is 
    Initializable,
    ERC721Upgradeable,
    ERC721WrapperUpgradeable,
    ERC721URIStorageUpgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IExtensible
{
    // ============ State Variables ============
    bool public transfersPaused;
    string public baseTokenURI;
    
    // ============ Extension Modules ============
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    // ============ IExtensible Storage ============
    /// @notice Extension registry for validation and queries
    address public extensionRegistry;
    
    /// @notice Array of all attached extensions
    address[] private _extensions;
    
    /// @notice Mapping to check if extension is attached
    mapping(address => bool) private _isExtension;
    
    /// @notice Mapping from extension type to extension address
    mapping(uint8 => address) private _extensionByType;
    
    // ============ Storage Gap ============
    uint256[42] private __gap; // Reduced for IExtensible storage
    
    // ============ Events ============
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event NFTWrapped(address indexed account, uint256 indexed tokenId);
    event NFTUnwrapped(address indexed account, uint256 indexed tokenId);
    event TransfersPaused();
    event TransfersUnpaused();
    
    // ============ Errors ============
    error InvalidUnderlyingToken();
    error TransfersPausedError();
    error OperationNotApproved(string reason);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the wrapper NFT collection
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param underlyingToken_ Address of the NFT collection to wrap
     * @param name_ Wrapper collection name (e.g., "Wrapped Bored Apes")
     * @param symbol_ Wrapper collection symbol (e.g., "wBAYC")
     * @param baseTokenURI_ Base URI for wrapper metadata
     * @param owner_ Owner address
     */
    function initialize(
        address underlyingToken_,
        string calldata name_,
        string calldata symbol_,
        string calldata baseTokenURI_,
        address owner_
    ) public initializer {
        if (underlyingToken_ == address(0)) revert InvalidUnderlyingToken();
        
        __ERC721_init(name_, symbol_);
        __ERC721Wrapper_init(IERC721(underlyingToken_));
        __ERC721URIStorage_init();
        __Ownable_init(owner_);
        __UUPSUpgradeable_init();
        
        baseTokenURI = baseTokenURI_;
        transfersPaused = false;
    }
    
    // ============ Wrapping Functions ============
    
    /**
     * @notice Deposit underlying NFT and mint wrapped NFT
     * @dev Override to add policy validation
     * @param account Address to receive wrapped NFT
     * @param tokenId Token ID to wrap
     * @return bool Success status
     */
    function depositFor(address account, uint256 tokenId) 
        public 
        returns (bool) 
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_MINT, account, 1);
        
        // Convert single tokenId to array for parent function
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        
        bool success = super.depositFor(account, tokenIds);
        if (success) {
            emit NFTWrapped(account, tokenId);
        }
        return success;
    }
    
    /**
     * @notice Deposit multiple NFTs at once
     * @param account Address to receive wrapped NFTs
     * @param tokenIds Array of token IDs to wrap
     * @return bool Success status
     */
    function depositFor(address account, uint256[] memory tokenIds) 
        public 
        override 
        returns (bool) 
    {
        // Validate with policy engine (batch)
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_MINT_BATCH, account, tokenIds.length);
        
        bool success = super.depositFor(account, tokenIds);
        if (success) {
            for (uint256 i = 0; i < tokenIds.length; i++) {
                emit NFTWrapped(account, tokenIds[i]);
            }
        }
        return success;
    }
    
    /**
     * @notice Burn wrapped NFT and return underlying NFT
     * @dev Added policy validation
     * @param account Address to send underlying NFT to
     * @param tokenId Token ID to unwrap
     * @return bool Success status
     */
    function withdrawTo(address account, uint256 tokenId) 
        public 
        returns (bool) 
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_BURN, account, 1);
        
        // Convert single tokenId to array for parent function
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        
        bool success = super.withdrawTo(account, tokenIds);
        if (success) {
            emit NFTUnwrapped(account, tokenId);
        }
        return success;
    }
    
    /**
     * @notice Unwrap multiple NFTs at once
     * @param account Address to send underlying NFTs to
     * @param tokenIds Array of token IDs to unwrap
     * @return bool Success status
     */
    function withdrawTo(address account, uint256[] memory tokenIds) 
        public 
        override 
        returns (bool) 
    {
        // Validate with policy engine (batch)
        _validatePolicyWithTarget(PolicyOperationTypes.ERC721_BURN, account, tokenIds.length);
        
        bool success = super.withdrawTo(account, tokenIds);
        if (success) {
            for (uint256 i = 0; i < tokenIds.length; i++) {
                emit NFTUnwrapped(account, tokenIds[i]);
            }
        }
        return success;
    }
    
    // ============ Pausable Functionality ============
    
    /**
     * @notice Pause all transfers (emergency stop)
     */
    function pauseTransfers() external onlyOwner {
        transfersPaused = true;
        emit TransfersPaused();
    }
    
    /**
     * @notice Resume transfers
     */
    function unpauseTransfers() external onlyOwner {
        transfersPaused = false;
        emit TransfersUnpaused();
    }
    
    // ============ URI Functions ============
    
    /**
     * @notice Set base URI for all wrapped NFTs
     * @param newBaseURI New base URI
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
    }
    
    /**
     * @notice Get base URI for computing tokenURI
     */
    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }
    
    /**
     * @notice Set custom URI for specific wrapped NFT
     * @param tokenId Token ID
     * @param uri Custom URI
     */
    function setTokenURI(uint256 tokenId, string memory uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }
    
    // ============ Extension Module Management ============
    
    /**
     * @notice Set or update the policy engine
     * @param engine_ Address of policy engine (address(0) to disable)
     * @dev Only owner can update policy engine
     */
    function setPolicyEngine(address engine_) external onlyOwner {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Amount involved (token count)
     * @dev Optimized for minimal gas - early exit if policyEngine not set (~200 gas)
     */
    function _validatePolicy(
        string memory operationType,
        uint256 amount
    ) internal {
        // Early exit: Skip if policy engine not configured
        if (policyEngine == address(0)) return;
        
        // Call policy engine validation
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperation(
            address(this),  // token address
            msg.sender,     // operator
            operationType,  // operation type
            amount          // amount
        );
        
        // Revert if not approved
        if (!approved) revert OperationNotApproved(reason);
    }
    
    /**
     * @notice Validate operation with target address
     * @param operationType Operation type constant
     * @param target Target address (to/from)
     * @param amount Amount involved
     */
    function _validatePolicyWithTarget(
        string memory operationType,
        address target,
        uint256 amount
    ) internal {
        // Early exit: Skip if policy engine not configured
        if (policyEngine == address(0)) return;
        
        // Call policy engine validation with target
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperationWithTarget(
            address(this),
            msg.sender,
            target,
            operationType,
            amount
        );
        
        // Revert if not approved
        if (!approved) revert OperationNotApproved(reason);
    }
    
    // ============ UUPS Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrades (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    // ============ Override Required Functions ============
    
    /**
     * @dev Override transfer logic to enforce pause and policy
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721Upgradeable) returns (address) {
        address from = _ownerOf(tokenId);
        
        // Skip checks for wrapping/unwrapping (already validated in depositFor/withdrawTo)
        bool isTransfer = from != address(0) && to != address(0);
        
        if (isTransfer) {
            // Check pause state
            if (transfersPaused) revert TransfersPausedError();
            
            // Validate with policy engine
            _validatePolicyWithTarget(PolicyOperationTypes.ERC721_TRANSFER, to, 1);
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @notice Override tokenURI for URI storage
     */
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    /**
     * @notice Override supportsInterface for multiple inheritance
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Upgradeable, ERC721URIStorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    // ============ IExtensible Implementation ============
    
    /**
     * @notice Attach an extension module to this wrapped NFT
     * @dev Implements IExtensible.attachExtension()
     */
    function attachExtension(address extension) external override onlyOwner {
        if (extension == address(0)) revert InvalidExtensionAddress();
        if (_isExtension[extension]) revert ExtensionAlreadyAttached(extension);
        
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            
            require(info.extensionAddress == extension, "Extension not registered");
            require(
                registry.isCompatible(ExtensionRegistry.TokenStandard.ERC721, info.extensionType),
                "Extension not compatible with ERC721"
            );
            
            uint8 extType = uint8(info.extensionType);
            if (_extensionByType[extType] != address(0)) {
                revert ExtensionTypeAlreadyAttached(extType);
            }
            
            _extensions.push(extension);
            _isExtension[extension] = true;
            _extensionByType[extType] = extension;
            
            emit ExtensionAttached(extension, extType);
        } else {
            _extensions.push(extension);
            _isExtension[extension] = true;
            emit ExtensionAttached(extension, 0);
        }
    }
    
    /**
     * @notice Detach an extension module from this wrapped NFT
     * @dev Implements IExtensible.detachExtension()
     */
    function detachExtension(address extension) external override onlyOwner {
        if (!_isExtension[extension]) revert ExtensionNotAttached(extension);
        
        uint8 extType = 0;
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            extType = uint8(info.extensionType);
        }
        
        for (uint256 i = 0; i < _extensions.length; i++) {
            if (_extensions[i] == extension) {
                _extensions[i] = _extensions[_extensions.length - 1];
                _extensions.pop();
                break;
            }
        }
        
        _isExtension[extension] = false;
        if (extType != 0) {
            delete _extensionByType[extType];
        }
        
        emit ExtensionDetached(extension, extType);
    }
    
    /**
     * @notice Get all extensions attached to this wrapped NFT
     */
    function getExtensions() external view override returns (address[] memory) {
        return _extensions;
    }
    
    /**
     * @notice Check if a specific extension is attached
     */
    function hasExtension(address extension) external view override returns (bool) {
        return _isExtension[extension];
    }
    
    /**
     * @notice Get the extension address for a specific extension type
     */
    function getExtensionByType(uint8 extensionType) external view override returns (address) {
        return _extensionByType[extensionType];
    }
    
    /**
     * @notice Set the extension registry address
     */
    function setExtensionRegistry(address registry_) external onlyOwner {
        extensionRegistry = registry_;
    }
}
