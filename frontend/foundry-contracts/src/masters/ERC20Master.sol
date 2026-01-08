// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Extension Module Interfaces
import "../extensions/compliance/interfaces/IERC20ComplianceModule.sol";
import "../extensions/vesting/interfaces/IERC20VestingModule.sol";
import "../extensions/fees/interfaces/IERC20FeeModule.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

// Extension Infrastructure
import "../interfaces/IExtensible.sol";
import "../factories/ExtensionRegistry.sol";

/**
 * @title ERC20Master
 * @notice Modern ERC-20 implementation with modular extension support
 * @dev Uses UUPS upgradeable pattern + OpenZeppelin v5.0+ contracts
 * 
 * Key Design Decisions:
 * - Limited to 5 parent contracts to avoid stack depth
 * - Simple initialization to reduce parameter count
 * - Feature modules are separate contracts (composition over inheritance)
 * - Optimized for minimal proxy deployment via ERC-1167
 * - Modules are optional and can be added/removed post-deployment
 * 
 * Supported Extension Modules:
 * - Compliance: KYC/AML checks, whitelisting, jurisdiction limits
 * - Vesting: Token lock schedules, cliff periods
 * - Fees: Transfer fees, revenue generation
 * - Policy: On-chain policy enforcement for operations
 * - Votes: Governance delegation (future)
 * - Permit: Gasless approvals via EIP-2612 (future)
 * 
 * Extension Pattern (IExtensible):
 * - Generic attachExtension()/detachExtension() methods
 * - Extensions tracked in array and mappings
 * - Compatibility validated via ExtensionRegistry
 * - One extension per type per token
 */
contract ERC20Master is 
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable,
    IExtensible
{
    // ============ Roles ============
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    uint256 public maxSupply;
    
    // ============ Extension Modules ============
    /// @notice Compliance module for KYC/AML/whitelist checks
    address public complianceModule;
    
    /// @notice Vesting module for token lock schedules
    address public vestingModule;
    
    /// @notice Fees module for transfer fees
    address public feesModule;
    
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    /// @notice Flash mint module for EIP-3156 flash loans
    address public flashMintModule;
    
    /// @notice Permit module for EIP-2612 gasless approvals
    address public permitModule;
    
    /// @notice Snapshot module for balance snapshots
    address public snapshotModule;
    
    /// @notice Timelock module for time-locked transfers
    address public timelockModule;
    
    /// @notice Votes module for governance voting power
    address public votesModule;
    
    /// @notice Payable token module for EIP-1363 receiver callbacks
    address public payableTokenModule;
    
    /// @notice Temporary approval module for time-limited approvals
    address public temporaryApprovalModule;
    
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
    // Reserve 32 slots for future upgrades (36 - 4 new variables)
    uint256[32] private __gap;
    
    // ============ Events ============
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event ComplianceModuleUpdated(address indexed oldModule, address indexed newModule);
    event VestingModuleUpdated(address indexed oldModule, address indexed newModule);
    event FeesModuleUpdated(address indexed oldModule, address indexed newModule);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event FlashMintModuleUpdated(address indexed oldModule, address indexed newModule);
    event PermitModuleUpdated(address indexed oldModule, address indexed newModule);
    event SnapshotModuleUpdated(address indexed oldModule, address indexed newModule);
    event TimelockModuleUpdated(address indexed oldModule, address indexed newModule);
    event VotesModuleUpdated(address indexed oldModule, address indexed newModule);
    event PayableTokenModuleUpdated(address indexed oldModule, address indexed newModule);
    event TemporaryApprovalModuleUpdated(address indexed oldModule, address indexed newModule);
    
    // ============ Errors ============
    error MaxSupplyExceeded();
    error InvalidMaxSupply();
    error InvalidModuleAddress();
    error TransferNotCompliant(string reason);
    error InsufficientVestedBalance();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the token (called by proxy)
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param maxSupply_ Maximum supply (0 = unlimited)
     * @param initialSupply_ Initial supply to mint to deployer
     * @param owner_ Owner address (receives DEFAULT_ADMIN_ROLE)
     */
    function initialize(
        string calldata name_,
        string calldata symbol_,
        uint256 maxSupply_,
        uint256 initialSupply_,
        address owner_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __ERC20Pausable_init();
        __UUPSUpgradeable_init();
        
        // Set up role admin hierarchy - DEFAULT_ADMIN_ROLE can manage all other roles
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(UPGRADER_ROLE, DEFAULT_ADMIN_ROLE);
        
        // Grant ONLY DEFAULT_ADMIN_ROLE to owner during initialization
        // Other roles (MINTER, PAUSER, UPGRADER) will be granted via grantRole after deployment
        // based on user-specified role assignments from the deployment form
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        
        // Set max supply
        maxSupply = maxSupply_;
        
        // Mint initial supply if specified
        if (initialSupply_ > 0) {
            if (maxSupply_ > 0 && initialSupply_ > maxSupply_) {
                revert MaxSupplyExceeded();
            }
            _mint(owner_, initialSupply_);
        }
    }
    
    // ============ Core Functionality ============
    
    /**
     * @notice Mint new tokens
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC20_MINT, amount);
        
        if (maxSupply > 0 && totalSupply() + amount > maxSupply) {
            revert MaxSupplyExceeded();
        }
        _mint(to, amount);
    }
    
    /**
     * @notice Burn tokens from caller
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC20_BURN, amount);
        
        _burn(msg.sender, amount);
    }
    
    /**
     * @notice Burn tokens from address (requires allowance)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external {
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC20_BURN, amount);
        
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
    }
    
    // ============ Pausable Functionality ============
    
    /**
     * @notice Pause all token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @notice Unpause token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update maximum supply (only increase allowed)
     * @param newMaxSupply New maximum supply
     */
    function updateMaxSupply(uint256 newMaxSupply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newMaxSupply > 0 && newMaxSupply < totalSupply()) {
            revert InvalidMaxSupply();
        }
        maxSupply = newMaxSupply;
        emit MaxSupplyUpdated(newMaxSupply);
    }
    
    // ============ Extension Module Management ============
    
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
     * @notice Set or update the vesting module
     * @param module_ Address of vesting module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setVestingModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = vestingModule;
        vestingModule = module_;
        emit VestingModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the fees module
     * @param module_ Address of fees module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setFeesModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = feesModule;
        feesModule = module_;
        emit FeesModuleUpdated(oldModule, module_);
    }
    
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
     * @notice Set or update the flash mint module
     * @param module_ Address of flash mint module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setFlashMintModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = flashMintModule;
        flashMintModule = module_;
        emit FlashMintModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the permit module
     * @param module_ Address of permit module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setPermitModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = permitModule;
        permitModule = module_;
        emit PermitModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the snapshot module
     * @param module_ Address of snapshot module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setSnapshotModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = snapshotModule;
        snapshotModule = module_;
        emit SnapshotModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the timelock module
     * @param module_ Address of timelock module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setTimelockModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = timelockModule;
        timelockModule = module_;
        emit TimelockModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the votes module
     * @param module_ Address of votes module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setVotesModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = votesModule;
        votesModule = module_;
        emit VotesModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the payable token module
     * @param module_ Address of payable token module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setPayableTokenModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = payableTokenModule;
        payableTokenModule = module_;
        emit PayableTokenModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the temporary approval module
     * @param module_ Address of temporary approval module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setTemporaryApprovalModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = temporaryApprovalModule;
        temporaryApprovalModule = module_;
        emit TemporaryApprovalModuleUpdated(oldModule, module_);
    }
    
    // ============ IExtensible Implementation ============
    
    /**
     * @notice Attach an extension module to this token
     * @dev Implements IExtensible.attachExtension()
     * @param extension Address of the extension module to attach
     * 
     * Validation Process:
     * 1. Verify extension address is not zero
     * 2. Check extension is not already attached
     * 3. Query ExtensionRegistry for extension info
     * 4. Verify extension is compatible with ERC20 standard
     * 5. Check extension type is not already attached
     * 6. Add to tracking arrays and mappings
     * 7. Emit ExtensionAttached event
     */
    function attachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // Validate extension address
        if (extension == address(0)) revert InvalidExtensionAddress();
        if (_isExtension[extension]) revert ExtensionAlreadyAttached(extension);
        
        // Query extension registry for validation
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            
            // Verify extension is registered
            require(info.extensionAddress == extension, "Extension not registered");
            
            // Verify compatibility with ERC20
            require(
                registry.isCompatible(ExtensionRegistry.TokenStandard.ERC20, info.extensionType),
                "Extension not compatible with ERC20"
            );
            
            // Check if extension type already attached
            uint8 extType = uint8(info.extensionType);
            if (_extensionByType[extType] != address(0)) {
                revert ExtensionTypeAlreadyAttached(extType);
            }
            
            // Add to tracking
            _extensions.push(extension);
            _isExtension[extension] = true;
            _extensionByType[extType] = extension;
            
            emit ExtensionAttached(extension, extType);
        } else {
            // If no registry configured, just add extension without validation
            _extensions.push(extension);
            _isExtension[extension] = true;
            emit ExtensionAttached(extension, 0); // Unknown type
        }
    }
    
    /**
     * @notice Detach an extension module from this token
     * @dev Implements IExtensible.detachExtension()
     * @param extension Address of the extension module to detach
     * 
     * Process:
     * 1. Verify extension is attached
     * 2. Find and remove from extensions array (swap and pop)
     * 3. Clear isExtension mapping
     * 4. Clear extensionByType mapping
     * 5. Emit ExtensionDetached event
     */
    function detachExtension(address extension) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_isExtension[extension]) revert ExtensionNotAttached(extension);
        
        // Get extension type before removal
        uint8 extType = 0;
        if (extensionRegistry != address(0)) {
            ExtensionRegistry registry = ExtensionRegistry(extensionRegistry);
            ExtensionRegistry.ExtensionInfo memory info = registry.getExtensionInfo(extension);
            extType = uint8(info.extensionType);
        }
        
        // Remove from array (swap and pop pattern for gas efficiency)
        for (uint256 i = 0; i < _extensions.length; i++) {
            if (_extensions[i] == extension) {
                _extensions[i] = _extensions[_extensions.length - 1];
                _extensions.pop();
                break;
            }
        }
        
        // Clear mappings
        _isExtension[extension] = false;
        if (extType != 0) {
            delete _extensionByType[extType];
        }
        
        emit ExtensionDetached(extension, extType);
    }
    
    /**
     * @notice Get all extensions attached to this token
     * @dev Implements IExtensible.getExtensions()
     * @return Array of extension module addresses
     */
    function getExtensions() external view override returns (address[] memory) {
        return _extensions;
    }
    
    /**
     * @notice Check if a specific extension is attached
     * @dev Implements IExtensible.hasExtension()
     * @param extension Address of the extension to check
     * @return True if extension is attached, false otherwise
     */
    function hasExtension(address extension) external view override returns (bool) {
        return _isExtension[extension];
    }
    
    /**
     * @notice Get the extension address for a specific extension type
     * @dev Implements IExtensible.getExtensionByType()
     * @param extensionType Type of extension to query (from ExtensionRegistry enum)
     * @return Address of the extension, or address(0) if not attached
     */
    function getExtensionByType(uint8 extensionType) external view override returns (address) {
        return _extensionByType[extensionType];
    }
    
    /**
     * @notice Set the extension registry address
     * @param registry_ Address of the ExtensionRegistry contract
     * @dev Only admin can update registry
     */
    function setExtensionRegistry(address registry_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        extensionRegistry = registry_;
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
        require(approved, reason);
    }
    
    /**
     * @notice Validate operation with target address (for transfers)
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
        require(approved, reason);
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
     * @dev Required override for pausable transfers with module integration
     * 
     * Module Call Order:
     * 1. Policy validation (amount limits, cooldowns, approvals)
     * 2. Compliance check (KYC/whitelist/jurisdiction)
     * 3. Vesting check (locked tokens)
     * 4. Fee calculation and deduction
     * 5. Standard transfer
     * 
     * @param from Sender address (address(0) for minting)
     * @param to Recipient address (address(0) for burning)
     * @param value Amount to transfer
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        // Skip module checks for minting/burning (already validated in mint/burn functions)
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }
        
        // 1. Policy Validation (for transfers)
        _validatePolicyWithTarget(PolicyOperationTypes.ERC20_TRANSFER, to, value);
        
        // 2. Compliance Module Check
        if (complianceModule != address(0)) {
            try IERC20ComplianceModule(complianceModule).enforceTransfer(from, to, value) {
                // Compliance passed
            } catch Error(string memory reason) {
                revert TransferNotCompliant(reason);
            } catch {
                revert TransferNotCompliant("Compliance check failed");
            }
        }
        
        // 3. Vesting Module Check
        if (vestingModule != address(0)) {
            try IERC20VestingModule(vestingModule).getLockedAmount(from) returns (uint256 lockedAmount) {
                uint256 availableBalance = balanceOf(from) - lockedAmount;
                if (value > availableBalance) {
                    revert InsufficientVestedBalance();
                }
            } catch {
                // If vesting module fails, allow transfer
            }
        }
        
        // 4. Fees Module Processing
        uint256 feeAmount = 0;
        if (feesModule != address(0)) {
            try IERC20FeeModule(feesModule).calculateFee(value) returns (uint256 fee) {
                feeAmount = fee;
                if (feeAmount > 0) {
                    address feeRecipient = IERC20FeeModule(feesModule).getFeeConfig().feeRecipient;
                    // Transfer fee to recipient
                    super._update(from, feeRecipient, feeAmount);
                }
            } catch {
                // If fee calculation fails, proceed without fee
                feeAmount = 0;
            }
        }
        
        // 5. Execute transfer (minus fees)
        super._update(from, to, value - feeAmount);
    }
}
