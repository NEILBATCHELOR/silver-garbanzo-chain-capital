// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC4626Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

/**
 * @title ERC4626Master
 * @notice Modern ERC-4626 tokenized vault implementation
 * @dev Uses UUPS upgradeable pattern + OpenZeppelin v5.0+ contracts
 * 
 * Key Features:
 * - Tokenized vault standard
 * - Deposit/withdraw with share calculation
 * - Role-based access control
 * - Pausable functionality
 * - UUPS upgradeable
 * - Policy enforcement for vault operations
 * 
 * Use Cases:
 * - Yield-bearing tokens
 * - Liquidity pools
 * - Staking vaults
 * - Treasury management
 * 
 * Policy Engine Integration:
 * - Deposit operations (ERC4626_DEPOSIT)
 * - Mint operations (ERC4626_MINT)
 * - Withdraw operations (ERC4626_WITHDRAW)
 * - Redeem operations (ERC4626_REDEEM)
 * - Share transfer operations (ERC4626_TRANSFER)
 */
contract ERC4626Master is 
    Initializable,
    ERC4626Upgradeable,
    AccessControlUpgradeable,
    ERC20PausableUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    
    // ============ State Variables ============
    uint256 public depositCap;
    uint256 public minimumDeposit;
    
    // ============ Extension Modules ============
    /// @notice Policy engine for operation validation
    address public policyEngine;
    
    /// @notice Compliance module for KYC/AML/whitelist checks
    address public complianceModule;
    
    /// @notice Document module for attaching documents to vault
    address public documentModule;
    
    /// @notice Fee strategy module for vault fee management
    address public feeStrategyModule;
    
    /// @notice Withdrawal queue module for delayed withdrawals
    address public withdrawalQueueModule;
    
    /// @notice Yield strategy module for yield generation
    address public yieldStrategyModule;
    
    /// @notice Async vault module for delayed deposit/redeem (RWA)
    address public asyncVaultModule;
    
    /// @notice Native vault module for native ETH vaults
    address public nativeVaultModule;
    
    /// @notice Router module for multi-vault routing
    address public routerModule;
    
    /// @notice Multi-asset vault module for multi-asset support
    address public multiAssetVaultModule;
    
    // ============ Storage Gap ============
    // Reserve 38 slots for future upgrades (48 - 10 module addresses)
    uint256[38] private __gap;
    
    // ============ Events ============
    event DepositCapUpdated(uint256 newCap);
    event MinimumDepositUpdated(uint256 newMinimum);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    event ComplianceModuleUpdated(address indexed oldModule, address indexed newModule);
    event DocumentModuleUpdated(address indexed oldModule, address indexed newModule);
    event FeeStrategyModuleUpdated(address indexed oldModule, address indexed newModule);
    event WithdrawalQueueModuleUpdated(address indexed oldModule, address indexed newModule);
    event YieldStrategyModuleUpdated(address indexed oldModule, address indexed newModule);
    event AsyncVaultModuleUpdated(address indexed oldModule, address indexed newModule);
    event NativeVaultModuleUpdated(address indexed oldModule, address indexed newModule);
    event RouterModuleUpdated(address indexed oldModule, address indexed newModule);
    event MultiAssetVaultModuleUpdated(address indexed oldModule, address indexed newModule);
    
    // ============ Errors ============
    error DepositCapExceeded();
    error BelowMinimumDeposit();
    error InvalidParameter();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the vault
     * @dev OPTIMIZED: Uses calldata instead of memory (saves ~300 gas)
     * @param asset_ Underlying asset token address
     * @param name_ Vault share token name
     * @param symbol_ Vault share token symbol
     * @param depositCap_ Maximum total assets (0 = unlimited)
     * @param minimumDeposit_ Minimum deposit amount
     * @param owner_ Owner address
     */
    function initialize(
        address asset_,
        string calldata name_,
        string calldata symbol_,
        uint256 depositCap_,
        uint256 minimumDeposit_,
        address owner_
    ) public initializer {
        __ERC4626_init(IERC20(asset_));
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __ERC20Pausable_init();
        __UUPSUpgradeable_init();
        
        depositCap = depositCap_;
        minimumDeposit = minimumDeposit_;
        
        // Grant roles to owner
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _grantRole(PAUSER_ROLE, owner_);
        _grantRole(UPGRADER_ROLE, owner_);
        _grantRole(ASSET_MANAGER_ROLE, owner_);
    }
    
    // ============ Deposit/Withdraw Overrides ============
    
    /**
     * @notice Deposit assets with cap, minimum, and policy checks
     */
    function deposit(uint256 assets, address receiver)
        public
        virtual
        override
        returns (uint256)
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC4626_DEPOSIT, receiver, assets);
        
        if (assets < minimumDeposit) revert BelowMinimumDeposit();
        if (depositCap > 0 && totalAssets() + assets > depositCap) {
            revert DepositCapExceeded();
        }
        return super.deposit(assets, receiver);
    }
    
    /**
     * @notice Mint shares with cap, minimum, and policy checks
     */
    function mint(uint256 shares, address receiver)
        public
        virtual
        override
        returns (uint256)
    {
        uint256 assets = previewMint(shares);
        
        // Validate with policy engine (using asset amount)
        _validatePolicyWithTarget(PolicyOperationTypes.ERC4626_MINT, receiver, assets);
        
        if (assets < minimumDeposit) revert BelowMinimumDeposit();
        if (depositCap > 0 && totalAssets() + assets > depositCap) {
            revert DepositCapExceeded();
        }
        return super.mint(shares, receiver);
    }
    
    /**
     * @notice Withdraw assets with policy validation
     */
    function withdraw(uint256 assets, address receiver, address owner)
        public
        virtual
        override
        returns (uint256)
    {
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC4626_WITHDRAW, receiver, assets);
        
        return super.withdraw(assets, receiver, owner);
    }
    
    /**
     * @notice Redeem shares with policy validation
     */
    function redeem(uint256 shares, address receiver, address owner)
        public
        virtual
        override
        returns (uint256)
    {
        uint256 assets = previewRedeem(shares);
        
        // Validate with policy engine (using asset amount)
        _validatePolicyWithTarget(PolicyOperationTypes.ERC4626_REDEEM, receiver, assets);
        
        return super.redeem(shares, receiver, owner);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update deposit cap
     * @param newCap New deposit cap (0 = unlimited)
     */
    function setDepositCap(uint256 newCap) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newCap > 0 && newCap < totalAssets()) {
            revert InvalidParameter();
        }
        depositCap = newCap;
        emit DepositCapUpdated(newCap);
    }
    
    /**
     * @notice Update minimum deposit
     * @param newMinimum New minimum deposit amount
     */
    function setMinimumDeposit(uint256 newMinimum) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        minimumDeposit = newMinimum;
        emit MinimumDepositUpdated(newMinimum);
    }
    
    /**
     * @notice Sweep accidentally sent tokens
     * @dev Cannot sweep the underlying asset
     * @param token Token to sweep
     * @param to Recipient address
     */
    function sweepTokens(address token, address to) 
        external 
        onlyRole(ASSET_MANAGER_ROLE) 
    {
        require(token != asset(), "Cannot sweep underlying asset");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transfer(to, balance), "Transfer failed");
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
     * @notice Set or update the fee strategy module
     * @param module_ Address of fee strategy module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setFeeStrategyModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = feeStrategyModule;
        feeStrategyModule = module_;
        emit FeeStrategyModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the withdrawal queue module
     * @param module_ Address of withdrawal queue module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setWithdrawalQueueModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = withdrawalQueueModule;
        withdrawalQueueModule = module_;
        emit WithdrawalQueueModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the yield strategy module
     * @param module_ Address of yield strategy module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setYieldStrategyModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = yieldStrategyModule;
        yieldStrategyModule = module_;
        emit YieldStrategyModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the async vault module
     * @param module_ Address of async vault module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setAsyncVaultModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = asyncVaultModule;
        asyncVaultModule = module_;
        emit AsyncVaultModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the native vault module
     * @param module_ Address of native vault module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setNativeVaultModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = nativeVaultModule;
        nativeVaultModule = module_;
        emit NativeVaultModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the router module
     * @param module_ Address of router module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setRouterModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = routerModule;
        routerModule = module_;
        emit RouterModuleUpdated(oldModule, module_);
    }
    
    /**
     * @notice Set or update the multi-asset vault module
     * @param module_ Address of multi-asset vault module (address(0) to disable)
     * @dev Only admin can update modules
     */
    function setMultiAssetVaultModule(address module_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldModule = multiAssetVaultModule;
        multiAssetVaultModule = module_;
        emit MultiAssetVaultModuleUpdated(oldModule, module_);
    }
    
    // ============ Policy Validation Helpers ============
    
    /**
     * @notice Validate operation with policy engine (if configured)
     * @param operationType Operation type constant from PolicyOperationTypes
     * @param amount Asset amount involved
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
     * @notice Validate operation with target address (for deposits/withdrawals)
     * @param operationType Operation type constant
     * @param target Target address (receiver)
     * @param amount Asset amount involved
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
    
    // ============ Pausable Functions ============
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
    
    // ============ Override Required Functions ============
    
    /**
     * @notice Override decimals to resolve conflict between ERC20 and ERC4626
     */
    function decimals()
        public
        view
        virtual
        override(ERC20Upgradeable, ERC4626Upgradeable)
        returns (uint8)
    {
        return super.decimals();
    }
    
    /**
     * @notice Virtual Offset Configuration - Production Security
     * @dev Implements OpenZeppelin's recommended inflation attack protection
     * 
     * SECURITY IMPLEMENTATION:
     * - Offset = 3 provides moderate protection (attack cost: $1K-10K)
     * - Offset = 6 provides maximum protection (attack cost: $1M+)
     * - Current setting: 6 (maximum security for institutional vaults)
     * 
     * HOW IT WORKS:
     * - Adds 10^offset virtual shares to exchange rate calculations
     * - Makes donation/inflation attacks economically infeasible
     * - Protects vault even when empty or with low liquidity
     * 
     * CONVERSION BEHAVIOR:
     * - Initial deposits show affected by virtual share factor
     * - Ratio normalizes as vault accumulates real assets
     * - All preview functions automatically account for offset
     * - Integrators should always use previewDeposit/previewMint
     * 
     * CONFIGURATION OPTIONS:
     * - return 0; // TESTING ONLY - No protection (vulnerable)
     * - return 3; // PRODUCTION - Moderate security (recommended for general use)
     * - return 6; // HIGH-VALUE - Maximum security (recommended for institutional vaults)
     * 
     * OpenZeppelin References:
     * - Guide: https://docs.openzeppelin.com/contracts/5.x/erc4626
     * - Defense: https://www.openzeppelin.com/news/a-novel-defense-against-erc4626-inflation-attacks
     * 
     * @return uint8 Decimal offset (6 = 1M virtual shares for maximum protection)
     */
    function _decimalsOffset() internal pure virtual override returns (uint8) {
        return 6; // MAXIMUM SECURITY - Institutional-grade protection
    }
    
    /**
     * @notice Override _update to add policy validation for share transfers
     * @dev Called for all share transfers (not asset transfers)
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20Upgradeable, ERC20PausableUpgradeable)
    {
        // Skip policy check for minting/burning (already validated in deposit/withdraw)
        if (from != address(0) && to != address(0)) {
            // Validate share transfer with policy engine
            _validatePolicyWithTarget(PolicyOperationTypes.ERC4626_TRANSFER, to, value);
        }
        
        super._update(from, to, value);
    }
    
    /**
     * @notice Get maximum deposit allowed
     * @dev Considers deposit cap
     */
    function maxDeposit(address)
        public
        view
        virtual
        override
        returns (uint256)
    {
        if (paused()) return 0;
        if (depositCap == 0) return type(uint256).max;
        
        uint256 currentAssets = totalAssets();
        if (currentAssets >= depositCap) return 0;
        
        return depositCap - currentAssets;
    }
    
    /**
     * @notice Get maximum mint allowed
     * @dev Considers deposit cap
     */
    function maxMint(address)
        public
        view
        virtual
        override
        returns (uint256)
    {
        if (paused()) return 0;
        uint256 maxAssets = maxDeposit(address(0));
        if (maxAssets == type(uint256).max) return type(uint256).max;
        
        return convertToShares(maxAssets);
    }
}
