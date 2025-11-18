// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ExtensionRegistry
 * @notice Central registry for tracking all deployed extension modules
 * @dev UUPS upgradeable registry with comprehensive extension tracking
 * 
 * Features:
 * - Track all extension deployments across all token types
 * - Map extensions to tokens (many-to-many)
 * - Define compatibility matrix (which extensions work with which token standards)
 * - Query extensions by token, type, or standard
 * - Monitor extension usage and adoption
 * 
 * Integration:
 * - Called by extension factories on deployment
 * - Queried by frontend for extension discovery
 * - Used by token factories to validate compatibility
 * 
 * Architecture:
 *   Token → Extensions (1:N)
 *   Extension → Tokens (1:N)
 *   TokenStandard → Compatible Extensions (1:N)
 */
contract ExtensionRegistry is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Enums ============
    
    /// @notice Token standards
    enum TokenStandard {
        ERC20,
        ERC721,
        ERC1155,
        ERC3525,
        ERC4626,
        ERC1400
    }
    
    /// @notice Extension types
    enum ExtensionType {
        // ERC20 Extensions
        PERMIT,              // EIP-2612 gasless approvals
        COMPLIANCE,          // KYC/whitelist
        VESTING,             // Time-locked releases
        SNAPSHOT,            // Historical balances
        TIMELOCK,            // Delayed transfers
        FLASHMINT,           // Flash loan support
        VOTES,               // Governance voting
        FEES,                // Transfer fees
        TEMPORARY_APPROVAL,  // Time-limited approvals
        PAYABLE,             // ERC-1363 payable token
        
        // ERC721 Extensions
        ROYALTY,             // EIP-2981 royalties
        SOULBOUND,           // Non-transferable NFTs
        RENTAL,              // NFT rentals
        FRACTIONALIZATION,   // Fractional ownership
        METADATA,            // EIP-4906 metadata updates
        GRANULAR_APPROVAL,   // EIP-5216 fine-grained approvals
        CONSECUTIVE,         // Batch minting
        
        // ERC1155 Extensions
        URI_MANAGEMENT,      // Dynamic URIs
        SUPPLY_CAP,          // Per-ID supply limits
        
        // ERC3525 Extensions
        SLOT_MANAGER,        // Slot management
        SLOT_APPROVABLE,     // Slot-level approvals
        VALUE_EXCHANGE,      // Value trading
        
        // ERC4626 Extensions
        YIELD_STRATEGY,      // Yield generation
        WITHDRAWAL_QUEUE,    // Ordered withdrawals
        FEE_STRATEGY,        // Vault fees
        ASYNC_VAULT,         // EIP-7540 async deposits/withdrawals
        NATIVE_VAULT,        // EIP-7535 native token wrapping
        VAULT_ROUTER,        // Vault routing
        MULTI_ASSET_VAULT,   // EIP-7575 multi-asset support
        
        // ERC1400 Extensions
        CONTROLLER,          // Centralized control
        DOCUMENT,            // Document management
        TRANSFER_RESTRICTIONS // Partition-based restrictions
    }
    
    // ============ Structs ============
    
    struct ExtensionInfo {
        address extensionAddress;    // Extension module address
        address tokenAddress;        // Token it's attached to
        ExtensionType extensionType; // Type of extension
        TokenStandard tokenStandard; // Standard of token
        address deployer;            // Who deployed it
        address factory;             // Factory that deployed it
        uint256 deployedAt;          // Deployment timestamp
        bool isActive;               // Whether extension is active
        string version;              // Extension version
    }
    
    struct TokenExtensions {
        address tokenAddress;
        TokenStandard standard;
        address[] extensions;
        mapping(ExtensionType => address) extensionByType;
        mapping(address => bool) hasExtension;
    }
    
    // ============ State Variables ============
    
    uint256 public totalExtensions;
    uint256 public totalTokensWithExtensions;
    
    // ============ Storage Mappings ============
    
    // extension address => ExtensionInfo
    mapping(address => ExtensionInfo) public extensions;
    
    // token address => TokenExtensions
    mapping(address => TokenExtensions) private _tokenExtensions;
    
    // Array of all extension addresses
    address[] public extensionList;
    
    // Array of all tokens with extensions
    address[] public tokensWithExtensions;
    
    // extension type => beacon address (for upgrades)
    mapping(ExtensionType => address) public extensionBeacons;
    
    // token standard => extension type => is compatible
    mapping(TokenStandard => mapping(ExtensionType => bool)) public compatibility;
    
    // extension type => deployed extension addresses
    mapping(ExtensionType => address[]) public extensionsByType;
    
    // token standard => token addresses
    mapping(TokenStandard => address[]) public tokensByStandard;
    
    // factory address => is registered
    mapping(address => bool) public isRegisteredFactory;
    
    // ============ Events ============
    
    event ExtensionRegistered(
        address indexed extension,
        address indexed token,
        ExtensionType indexed extensionType,
        TokenStandard tokenStandard,
        address deployer,
        address factory
    );
    
    event ExtensionDeactivated(
        address indexed extension,
        address indexed token,
        ExtensionType extensionType
    );
    
    event ExtensionReactivated(
        address indexed extension,
        address indexed token,
        ExtensionType extensionType
    );
    
    event BeaconRegistered(
        ExtensionType indexed extensionType,
        address indexed beacon
    );
    
    event CompatibilitySet(
        TokenStandard indexed standard,
        ExtensionType indexed extensionType,
        bool compatible
    );
    
    event FactoryRegistered(
        address indexed factory,
        string factoryType
    );
    
    // ============ Errors ============
    
    error ExtensionAlreadyRegistered(address extension);
    error ExtensionNotFound(address extension);
    error TokenNotFound(address token);
    error IncompatibleExtension(TokenStandard standard, ExtensionType extensionType);
    error UnauthorizedFactory(address factory);
    error InvalidAddress();
    error ExtensionAlreadyAttached(address token, ExtensionType extensionType);
    
    // ============ Constructor ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the registry
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        
        _initializeCompatibilityMatrix();
    }
    
    // ============ Registration Functions ============
    
    /**
     * @notice Register a newly deployed extension
     * @param extension Extension module address
     * @param token Token address
     * @param extensionType Type of extension
     * @param tokenStandard Token standard
     * @param deployer Who deployed it
     */
    function registerExtension(
        address extension,
        address token,
        ExtensionType extensionType,
        TokenStandard tokenStandard,
        address deployer
    ) external onlyRole(REGISTRAR_ROLE) {
        if (extension == address(0) || token == address(0)) revert InvalidAddress();
        if (extensions[extension].extensionAddress != address(0)) {
            revert ExtensionAlreadyRegistered(extension);
        }
        
        // Check compatibility
        if (!compatibility[tokenStandard][extensionType]) {
            revert IncompatibleExtension(tokenStandard, extensionType);
        }
        
        // Check if extension type already attached
        if (_tokenExtensions[token].extensionByType[extensionType] != address(0)) {
            revert ExtensionAlreadyAttached(token, extensionType);
        }
        
        // Register extension
        extensions[extension] = ExtensionInfo({
            extensionAddress: extension,
            tokenAddress: token,
            extensionType: extensionType,
            tokenStandard: tokenStandard,
            deployer: deployer,
            factory: msg.sender,
            deployedAt: block.timestamp,
            isActive: true,
            version: "1.0.0"
        });
        
        extensionList.push(extension);
        extensionsByType[extensionType].push(extension);
        totalExtensions++;
        
        // Update token extensions
        TokenExtensions storage tokenExt = _tokenExtensions[token];
        
        if (tokenExt.tokenAddress == address(0)) {
            // First extension for this token
            tokenExt.tokenAddress = token;
            tokenExt.standard = tokenStandard;
            tokensWithExtensions.push(token);
            tokensByStandard[tokenStandard].push(token);
            totalTokensWithExtensions++;
        }
        
        tokenExt.extensions.push(extension);
        tokenExt.extensionByType[extensionType] = extension;
        tokenExt.hasExtension[extension] = true;
        
        emit ExtensionRegistered(
            extension,
            token,
            extensionType,
            tokenStandard,
            deployer,
            msg.sender
        );
    }
    
    /**
     * @notice Deactivate an extension
     * @param extension Extension address to deactivate
     */
    function deactivateExtension(address extension) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (extensions[extension].extensionAddress == address(0)) {
            revert ExtensionNotFound(extension);
        }
        
        extensions[extension].isActive = false;
        
        emit ExtensionDeactivated(
            extension,
            extensions[extension].tokenAddress,
            extensions[extension].extensionType
        );
    }
    
    /**
     * @notice Reactivate an extension
     * @param extension Extension address to reactivate
     */
    function reactivateExtension(address extension) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (extensions[extension].extensionAddress == address(0)) {
            revert ExtensionNotFound(extension);
        }
        
        extensions[extension].isActive = true;
        
        emit ExtensionReactivated(
            extension,
            extensions[extension].tokenAddress,
            extensions[extension].extensionType
        );
    }
    
    /**
     * @notice Register a beacon for an extension type
     * @param extensionType Extension type
     * @param beacon Beacon address
     */
    function registerBeacon(
        ExtensionType extensionType,
        address beacon
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (beacon == address(0)) revert InvalidAddress();
        
        extensionBeacons[extensionType] = beacon;
        
        emit BeaconRegistered(extensionType, beacon);
    }
    
    /**
     * @notice Register a factory
     * @param factory Factory address
     * @param factoryType Type of factory (e.g., "ERC20Extensions")
     */
    function registerFactory(
        address factory,
        string memory factoryType
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (factory == address(0)) revert InvalidAddress();
        
        isRegisteredFactory[factory] = true;
        _grantRole(REGISTRAR_ROLE, factory);
        
        emit FactoryRegistered(factory, factoryType);
    }
    
    /**
     * @notice Set compatibility between token standard and extension type
     * @param standard Token standard
     * @param extensionType Extension type
     * @param compatible Whether they're compatible
     */
    function setCompatibility(
        TokenStandard standard,
        ExtensionType extensionType,
        bool compatible
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        compatibility[standard][extensionType] = compatible;
        
        emit CompatibilitySet(standard, extensionType, compatible);
    }
    
    // ============ Query Functions ============
    
    /**
     * @notice Get all extensions for a token
     * @param token Token address
     * @return Array of extension addresses
     */
    function getTokenExtensions(address token) 
        external 
        view 
        returns (address[] memory) 
    {
        return _tokenExtensions[token].extensions;
    }
    
    /**
     * @notice Get extension by type for a token
     * @param token Token address
     * @param extensionType Extension type
     * @return Extension address (address(0) if not found)
     */
    function getTokenExtensionByType(
        address token,
        ExtensionType extensionType
    ) external view returns (address) {
        return _tokenExtensions[token].extensionByType[extensionType];
    }
    
    /**
     * @notice Check if token has an extension
     * @param token Token address
     * @param extension Extension address
     * @return True if token has the extension
     */
    function tokenHasExtension(
        address token,
        address extension
    ) external view returns (bool) {
        return _tokenExtensions[token].hasExtension[extension];
    }
    
    /**
     * @notice Check if token has extension of specific type
     * @param token Token address
     * @param extensionType Extension type
     * @return True if token has extension of that type
     */
    function tokenHasExtensionType(
        address token,
        ExtensionType extensionType
    ) external view returns (bool) {
        return _tokenExtensions[token].extensionByType[extensionType] != address(0);
    }
    
    /**
     * @notice Get all extensions of a specific type
     * @param extensionType Extension type
     * @return Array of extension addresses
     */
    function getExtensionsByType(ExtensionType extensionType)
        external
        view
        returns (address[] memory)
    {
        return extensionsByType[extensionType];
    }
    
    /**
     * @notice Get all tokens with a specific standard
     * @param standard Token standard
     * @return Array of token addresses
     */
    function getTokensByStandard(TokenStandard standard)
        external
        view
        returns (address[] memory)
    {
        return tokensByStandard[standard];
    }
    
    /**
     * @notice Check if extension type is compatible with token standard
     * @param standard Token standard
     * @param extensionType Extension type
     * @return True if compatible
     */
    function isCompatible(
        TokenStandard standard,
        ExtensionType extensionType
    ) external view returns (bool) {
        return compatibility[standard][extensionType];
    }
    
    /**
     * @notice Get beacon for extension type
     * @param extensionType Extension type
     * @return Beacon address
     */
    function getBeacon(ExtensionType extensionType)
        external
        view
        returns (address)
    {
        return extensionBeacons[extensionType];
    }
    
    /**
     * @notice Get extension info
     * @param extension Extension address
     * @return ExtensionInfo struct
     */
    function getExtensionInfo(address extension)
        external
        view
        returns (ExtensionInfo memory)
    {
        return extensions[extension];
    }
    
    /**
     * @notice Get total number of extensions
     * @return Total extensions count
     */
    function getTotalExtensions() external view returns (uint256) {
        return totalExtensions;
    }
    
    /**
     * @notice Get total number of tokens with extensions
     * @return Total tokens with extensions count
     */
    function getTotalTokensWithExtensions() external view returns (uint256) {
        return totalTokensWithExtensions;
    }
    
    // ============ Compatibility Matrix Initialization ============
    
    /**
     * @notice Initialize compatibility matrix
     * @dev Sets which extensions work with which token standards
     */
    function _initializeCompatibilityMatrix() internal {
        // ERC20 compatible extensions
        compatibility[TokenStandard.ERC20][ExtensionType.PERMIT] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.COMPLIANCE] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.VESTING] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.SNAPSHOT] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.TIMELOCK] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.FLASHMINT] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.VOTES] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.FEES] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.TEMPORARY_APPROVAL] = true;
        compatibility[TokenStandard.ERC20][ExtensionType.PAYABLE] = true;
        
        // ERC721 compatible extensions
        compatibility[TokenStandard.ERC721][ExtensionType.ROYALTY] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.SOULBOUND] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.RENTAL] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.FRACTIONALIZATION] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.METADATA] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.GRANULAR_APPROVAL] = true;
        compatibility[TokenStandard.ERC721][ExtensionType.CONSECUTIVE] = true;
        
        // ERC1155 compatible extensions
        compatibility[TokenStandard.ERC1155][ExtensionType.ROYALTY] = true;
        compatibility[TokenStandard.ERC1155][ExtensionType.URI_MANAGEMENT] = true;
        compatibility[TokenStandard.ERC1155][ExtensionType.SUPPLY_CAP] = true;
        
        // ERC3525 compatible extensions
        compatibility[TokenStandard.ERC3525][ExtensionType.SLOT_MANAGER] = true;
        compatibility[TokenStandard.ERC3525][ExtensionType.SLOT_APPROVABLE] = true;
        compatibility[TokenStandard.ERC3525][ExtensionType.VALUE_EXCHANGE] = true;
        
        // ERC4626 compatible extensions
        compatibility[TokenStandard.ERC4626][ExtensionType.YIELD_STRATEGY] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.WITHDRAWAL_QUEUE] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.FEE_STRATEGY] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.ASYNC_VAULT] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.NATIVE_VAULT] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.VAULT_ROUTER] = true;
        compatibility[TokenStandard.ERC4626][ExtensionType.MULTI_ASSET_VAULT] = true;
        
        // ERC1400 compatible extensions
        compatibility[TokenStandard.ERC1400][ExtensionType.CONTROLLER] = true;
        compatibility[TokenStandard.ERC1400][ExtensionType.DOCUMENT] = true;
        compatibility[TokenStandard.ERC1400][ExtensionType.TRANSFER_RESTRICTIONS] = true;
    }
    
    // ============ Upgrade Authorization ============
    
    /**
     * @notice Authorize UUPS upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
