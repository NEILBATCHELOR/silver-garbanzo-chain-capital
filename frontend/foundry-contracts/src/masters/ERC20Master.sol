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
 */
contract ERC20Master is 
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable
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
    
    // ============ Storage Gap ============
    // Reserve 43 slots for future upgrades (47 - 4 for new modules)
    uint256[43] private __gap;
    
    // ============ Events ============
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event ComplianceModuleUpdated(address indexed oldModule, address indexed newModule);
    event VestingModuleUpdated(address indexed oldModule, address indexed newModule);
    event FeesModuleUpdated(address indexed oldModule, address indexed newModule);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    
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
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param maxSupply_ Maximum supply (0 = unlimited)
     * @param initialSupply_ Initial supply to mint to deployer
     * @param owner_ Owner address (receives DEFAULT_ADMIN_ROLE)
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 initialSupply_,
        address owner_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __ERC20Pausable_init();
        __UUPSUpgradeable_init();
        
        // Grant roles to owner
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _grantRole(MINTER_ROLE, owner_);
        _grantRole(PAUSER_ROLE, owner_);
        _grantRole(UPGRADER_ROLE, owner_);
        
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
