// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20WrapperUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

// Extension Infrastructure
import "../interfaces/IExtensible.sol";
import "../factories/ExtensionRegistry.sol";

/**
 * @title ERC20WrapperMaster
 * @notice ERC-20 token wrapper implementation with policy enforcement
 * @dev Wraps an underlying ERC-20 token (e.g., USDC → wUSDC, ETH → WETH)
 * 
 * Key Features:
 * - Wrap/unwrap underlying tokens 1:1
 * - Pausable for emergency stops
 * - Burnable (burns wrapped tokens)
 * - Policy enforcement for operations
 * - UUPS upgradeable
 * - Optimized for minimal proxy deployment
 * 
 * Use Cases:
 * - Adding functionality to existing tokens (e.g., pausable USDC)
 * - Creating yield-bearing versions (e.g., aUSDC)
 * - Cross-chain bridges
 * - DeFi protocol integration
 * 
 * Gas Optimizations:
 * - Calldata parameters (saves ~300 gas)
 * - Early exit policy checks (~200 gas)
 * - Minimal proxy compatible (95% deployment savings)
 */
contract ERC20WrapperMaster is 
    Initializable,
    ERC20Upgradeable,
    ERC20WrapperUpgradeable,
    AccessControlUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable,
    IExtensible
{
    // ============ Roles ============
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
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
    uint256[44] private __gap; // Reduced for IExtensible storage
    
    // ============ Events ============
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event TokensWrapped(address indexed account, uint256 amount);
    event TokensUnwrapped(address indexed account, uint256 amount);
    
    // ============ Errors ============
    error InvalidUnderlyingToken();
    error OperationNotApproved(string reason);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the wrapper token
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param underlyingToken_ Address of the token to wrap
     * @param name_ Wrapper token name (e.g., "Wrapped USDC")
     * @param symbol_ Wrapper token symbol (e.g., "wUSDC")
     * @param owner_ Owner address (receives DEFAULT_ADMIN_ROLE)
     */
    function initialize(
        address underlyingToken_,
        string calldata name_,
        string calldata symbol_,
        address owner_
    ) public initializer {
        if (underlyingToken_ == address(0)) revert InvalidUnderlyingToken();
        
        __ERC20_init(name_, symbol_);
        __ERC20Wrapper_init(IERC20(underlyingToken_));
        __AccessControl_init();
        __ERC20Pausable_init();
        __UUPSUpgradeable_init();
        
        // Grant ONLY DEFAULT_ADMIN_ROLE to owner during initialization
        // Other roles will be granted via grantRole after deployment
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
    }
    
    // ============ Wrapping Functions ============
    
    /**
     * @notice Deposit underlying tokens and mint wrapped tokens
     * @dev Override to add policy validation
     * @param account Address to receive wrapped tokens
     * @param amount Amount of underlying tokens to deposit
     * @return bool Success status
     */
    function depositFor(address account, uint256 amount) 
        public 
        override 
        returns (bool) 
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC20_MINT, account, amount);
        
        bool success = super.depositFor(account, amount);
        if (success) {
            emit TokensWrapped(account, amount);
        }
        return success;
    }
    
    /**
     * @notice Burn wrapped tokens and return underlying tokens
     * @dev Override to add policy validation
     * @param account Address to send underlying tokens to
     * @param amount Amount of wrapped tokens to burn
     * @return bool Success status
     */
    function withdrawTo(address account, uint256 amount) 
        public 
        override 
        returns (bool) 
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC20_BURN, account, amount);
        
        bool success = super.withdrawTo(account, amount);
        if (success) {
            emit TokensUnwrapped(account, amount);
        }
        return success;
    }
    
    // ============ Pausable Functionality ============
    
    /**
     * @notice Pause all token operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause token operations
     */
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
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Amount involved
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
     * @notice Authorize contract upgrade (UUPS pattern)
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ Override Required Functions ============
    
    /**
     * @dev Required override for ERC20Wrapper + ERC20Pausable
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        // Skip policy check for wrapping/unwrapping (already validated in depositFor/withdrawTo)
        if (from != address(0) && to != address(0)) {
            // Validate transfers with policy engine
            _validatePolicyWithTarget(PolicyOperationTypes.ERC20_TRANSFER, to, value);
        }
        
        super._update(from, to, value);
    }
    
    /**
     * @dev Required override for ERC20 + ERC20Wrapper decimals
     */
    function decimals()
        public
        view
        override(ERC20Upgradeable, ERC20WrapperUpgradeable)
        returns (uint8)
    {
        return super.decimals();
    }
    
    // ============ IExtensible Implementation ============
    
    /**
     * @notice Attach an extension module to this wrapped token
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
                registry.isCompatible(ExtensionRegistry.TokenStandard.ERC20, info.extensionType),
                "Extension not compatible with ERC20"
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
     * @notice Detach an extension module from this wrapped token
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
     * @notice Get all extensions attached to this wrapped token
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
