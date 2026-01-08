// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

// Extension Infrastructure
import "../interfaces/IExtensible.sol";
import "../factories/ExtensionRegistry.sol";

/**
 * @title ERC1155Master
 * @notice Modern ERC-1155 multi-token implementation with minimal complexity
 * @dev Uses UUPS upgradeable pattern + OpenZeppelin v5.0+ contracts
 * 
 * Key Features:
 * - Multi-token support (fungible + non-fungible in one contract)
 * - Batch minting and transfers
 * - Supply tracking per token ID
 * - Role-based access control
 * - Pausable functionality
 * - Burnable tokens
 * - Policy enforcement for operations
 */
contract ERC1155Master is 
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ERC1155PausableUpgradeable,
    ERC1155BurnableUpgradeable,
    ERC1155SupplyUpgradeable,
    UUPSUpgradeable,
    IExtensible
{
    // ============ Roles ============
    bytes32 public constant URI_SETTER_ROLE = keccak256("URI_SETTER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    string public name;
    string public symbol;
    mapping(uint256 => uint256) public maxSupply;
    
    // ============ Extension Modules ============
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    /// @notice Compliance module for KYC/AML/whitelist checks
    address public complianceModule;
    
    /// @notice Document module for attaching documents to tokens
    address public documentModule;
    
    /// @notice Royalty module for EIP-2981 creator royalties
    address public royaltyModule;
    
    /// @notice Supply cap module for per-token-id supply limits
    address public supplyCapModule;
    
    /// @notice URI management module for dynamic URI updates
    address public uriManagementModule;
    
    /// @notice Vesting module for token lock schedules
    address public vestingModule;
    
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
    // Reserve 35 slots for future upgrades (47 - 12 variables)
    uint256[35] private __gap;
    
    // ============ Events ============
    event MaxSupplySet(uint256 indexed tokenId, uint256 maxSupply);
    event URIUpdated(string newuri);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event ComplianceModuleUpdated(address indexed oldModule, address indexed newModule);
    event DocumentModuleUpdated(address indexed oldModule, address indexed newModule);
    event RoyaltyModuleUpdated(address indexed oldModule, address indexed newModule);
    event SupplyCapModuleUpdated(address indexed oldModule, address indexed newModule);
    event UriManagementModuleUpdated(address indexed oldModule, address indexed newModule);
    event VestingModuleUpdated(address indexed oldModule, address indexed newModule);
    
    // ============ Errors ============
    error MaxSupplyExceeded(uint256 tokenId);
    error InvalidMaxSupply();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the collection
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param name_ Collection name
     * @param symbol_ Collection symbol
     * @param uri_ Base URI for metadata
     * @param owner_ Owner address
     */
    function initialize(
        string calldata name_,
        string calldata symbol_,
        string calldata uri_,
        address owner_
    ) public initializer {
        __ERC1155_init(uri_);
        __AccessControl_init();
        __ERC1155Pausable_init();
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __UUPSUpgradeable_init();
        
        name = name_;
        symbol = symbol_;
        
        // Set up role admin hierarchy - DEFAULT_ADMIN_ROLE can manage all other roles
        _setRoleAdmin(URI_SETTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(UPGRADER_ROLE, DEFAULT_ADMIN_ROLE);
        
        // Grant ONLY DEFAULT_ADMIN_ROLE to owner during initialization
        // Other roles (URI_SETTER, MINTER, PAUSER, UPGRADER) will be granted via grantRole after deployment
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
    }
    
    // ============ Minting Functions ============
    
    /**
     * @notice Mint tokens to address
     * @param to Recipient address
     * @param id Token ID
     * @param amount Amount to mint
     * @param data Additional data
     */
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC1155_MINT, amount);
        
        if (maxSupply[id] > 0 && totalSupply(id) + amount > maxSupply[id]) {
            revert MaxSupplyExceeded(id);
        }
        _mint(to, id, amount, data);
    }
    
    /**
     * @notice Batch mint multiple token types
     * @param to Recipient address
     * @param ids Array of token IDs
     * @param amounts Array of amounts
     * @param data Additional data
     */
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyRole(MINTER_ROLE) {
        // Calculate total amount for policy validation
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
            
            // Check max supply
            if (maxSupply[ids[i]] > 0 && totalSupply(ids[i]) + amounts[i] > maxSupply[ids[i]]) {
                revert MaxSupplyExceeded(ids[i]);
            }
        }
        
        // Validate with policy engine (total amount)
        _validatePolicy(PolicyOperationTypes.ERC1155_MINT_BATCH, totalAmount);
        
        _mintBatch(to, ids, amounts, data);
    }
    
    // ============ Burning Functions ============
    
    /**
     * @notice Burn tokens (override to add policy validation)
     * @param account Account to burn from
     * @param id Token ID
     * @param value Amount to burn
     */
    function burn(
        address account,
        uint256 id,
        uint256 value
    ) public override {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC1155_BURN, value);
        
        super.burn(account, id, value);
    }
    
    /**
     * @notice Batch burn tokens (override to add policy validation)
     * @param account Account to burn from
     * @param ids Token IDs
     * @param values Amounts to burn
     */
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public override {
        // Calculate total amount for policy validation
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalAmount += values[i];
        }
        
        // Validate with policy engine (total amount)
        _validatePolicy(PolicyOperationTypes.ERC1155_BURN_BATCH, totalAmount);
        
        super.burnBatch(account, ids, values);
    }
    
    // ============ Supply Management ============
    
    /**
     * @notice Set maximum supply for a token ID
     * @param id Token ID
     * @param max Maximum supply (0 = unlimited)
     */
    function setMaxSupply(uint256 id, uint256 max) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (max > 0 && max < totalSupply(id)) {
            revert InvalidMaxSupply();
        }
        maxSupply[id] = max;
        emit MaxSupplySet(id, max);
    }
    
    // ============ URI Management ============
    
    /**
     * @notice Update base URI
     * @param newuri New base URI
     */
    function setURI(string memory newuri) external onlyRole(URI_SETTER_ROLE) {
        _setURI(newuri);
        emit URIUpdated(newuri);
    }
    
    // ============ Pausable Functions ============
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ Extension Module Management ============
    
    /**
     * @notice Set or update the policy engine
     * @param engine_ Address of policy engine (address(0) to disable)
     * @dev Only admin can update policy engine
     */
    function setPolicyEngine(address engine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    /**
     * @notice Set or update the compliance module
     * @param module_ Address of compliance module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setComplianceModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = complianceModule;
        complianceModule = module_;
        emit ComplianceModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the document module
     * @param module_ Address of document module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setDocumentModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = documentModule;
        documentModule = module_;
        emit DocumentModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the royalty module
     * @param module_ Address of royalty module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setRoyaltyModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = royaltyModule;
        royaltyModule = module_;
        emit RoyaltyModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the supply cap module
     * @param module_ Address of supply cap module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setSupplyCapModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = supplyCapModule;
        supplyCapModule = module_;
        emit SupplyCapModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the URI management module
     * @param module_ Address of URI management module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setUriManagementModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = uriManagementModule;
        uriManagementModule = module_;
        emit UriManagementModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the vesting module
     * @param module_ Address of vesting module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setVestingModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = vestingModule;
        vestingModule = module_;
        emit VestingModuleUpdated(oldModule, module_);
    }
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Total amount involved
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
        require(approved, reason);
    }
    
    /**
     * @notice Validate operation with target address (for transfers)
     * @param operationType Operation type constant
     * @param target Target address (to/from)
     * @param amount Total amount involved
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
        require(approved, reason);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ Overrides ============
    
    /**
     * @notice Override _update to add policy validation for transfers
     * @dev Called for all transfers, mints, and burns
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155Upgradeable, ERC1155PausableUpgradeable, ERC1155SupplyUpgradeable) {
        // Skip policy check for minting/burning (already validated)
        if (from != address(0) && to != address(0)) {
            // Calculate total value for policy validation
            uint256 totalValue = 0;
            for (uint256 i = 0; i < values.length; i++) {
                totalValue += values[i];
            }
            
            // Determine operation type (single or batch)
            string memory opType = ids.length == 1 
                ? PolicyOperationTypes.ERC1155_TRANSFER 
                : PolicyOperationTypes.ERC1155_BATCH_TRANSFER;
            
            // Validate with policy engine
            _validatePolicyWithTarget(opType, to, totalValue);
        }
        
        super._update(from, to, ids, values);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    // ============ IExtensible Implementation ============
    
    /**
     * @notice Attach an extension module to this token
     * @dev Implements IExtensible.attachExtension()
     */
    function attachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (extension == address(0)) revert InvalidExtensionAddress();
        if (_isExtension[extension]) revert ExtensionAlreadyAttached(extension);
        
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            
            require(info.extensionAddress == extension, "Extension not registered");
            require(
                registry.isCompatible(ExtensionRegistry.TokenStandard.ERC1155, info.extensionType),
                "Extension not compatible with ERC1155"
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
     * @notice Detach an extension module from this token
     * @dev Implements IExtensible.detachExtension()
     */
    function detachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
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
     * @notice Get all extensions attached to this token
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
    function setExtensionRegistry(address registry_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        extensionRegistry = registry_;
    }
}
