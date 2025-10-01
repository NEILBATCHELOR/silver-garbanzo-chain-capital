// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Policy Engine Integration
import "../policy/interfaces/IPolicyEngine.sol";
import "../policy/libraries/PolicyOperationTypes.sol";

/**
 * @title ERC20RebasingMaster
 * @notice Shares-based rebasing ERC-20 implementation for stablecoins
 * @dev Optimized for gas efficiency using shares model (similar to Lido stETH)
 * 
 * Key Design:
 * - Users hold "shares" representing portion of total pooled tokens
 * - Balance = (userShares * totalPooled) / totalShares
 * - Rebase only updates totalPooled (O(1) cost ~30K gas)
 * - Compatible with existing ERC-20 infrastructure
 * 
 * Gas Optimization:
 * - Rebase: ~30,000 gas (vs. millions for elastic supply)
 * - Transfer: ~50,000 gas (standard ERC-20 + share calculation)
 * - balanceOf: ~3,000 gas (view function)
 */
contract ERC20RebasingMaster is 
    Initializable,
    ERC20Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // ============ Roles ============
    bytes32 public constant REBASE_ROLE = keccak256("REBASE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Shares State ============
    /// @notice Total shares in existence
    uint256 private _totalShares;
    
    /// @notice Total pooled tokens (can increase/decrease via rebase)
    uint256 private _totalPooled;
    
    /// @notice User shares mapping
    mapping(address => uint256) private _sharesOf;
    
    // ============ Policy Engine ============
    address public policyEngine;
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
    
    // ============ Events ============
    event Rebase(uint256 indexed epoch, uint256 oldTotalPooled, uint256 newTotalPooled);
    event SharesTransferred(
        address indexed from, 
        address indexed to, 
        uint256 sharesValue
    );
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    
    // ============ Errors ============
    error InsufficientShares();
    error InvalidRebaseAmount();
    error ZeroAddress();
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize rebasing token
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param initialSupply_ Initial supply to mint
     * @param owner_ Owner address
     */
    function initialize(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address owner_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
        _grantRole(REBASE_ROLE, owner_);
        _grantRole(UPGRADER_ROLE, owner_);
        
        // Initialize with 1:1 shares:tokens ratio
        if (initialSupply_ > 0) {
            _totalShares = initialSupply_;
            _totalPooled = initialSupply_;
            _sharesOf[owner_] = initialSupply_;
            
            emit Transfer(address(0), owner_, initialSupply_);
        }
    }
    
    // ============ Rebasing Mechanism ============
    
    /**
     * @notice Execute rebase (adjust total pooled tokens)
     * @param newTotalPooled New total pooled amount
     * @dev Only accounts with REBASE_ROLE can call
     * 
     * Gas Cost: ~30,000 gas (O(1) - no iteration)
     */
    function rebase(uint256 newTotalPooled) external onlyRole(REBASE_ROLE) {
        if (newTotalPooled == 0) revert InvalidRebaseAmount();
        
        // Validate with policy engine
        _validatePolicy(PolicyOperationTypes.ERC20_MINT, newTotalPooled);
        
        uint256 oldTotalPooled = _totalPooled;
        _totalPooled = newTotalPooled;
        
        emit Rebase(block.number, oldTotalPooled, newTotalPooled);
    }
    
    /**
     * @notice Get shares balance of account
     */
    function sharesOf(address account) public view returns (uint256) {
        return _sharesOf[account];
    }
    
    /**
     * @notice Convert shares to tokens
     */
    function getPooledTokenByShares(uint256 shares) public view returns (uint256) {
        if (_totalShares == 0) return 0;
        return (shares * _totalPooled) / _totalShares;
    }
    
    /**
     * @notice Convert tokens to shares
     */
    function getSharesByPooledToken(uint256 amount) public view returns (uint256) {
        if (_totalPooled == 0) return 0;
        return (amount * _totalShares) / _totalPooled;
    }
    
    // ============ ERC-20 Overrides ============
    
    /**
     * @notice Get token balance (shares converted to tokens)
     */
    function balanceOf(address account) public view override returns (uint256) {
        return getPooledTokenByShares(_sharesOf[account]);
    }
    
    /**
     * @notice Get total supply (total pooled tokens)
     */
    function totalSupply() public view override returns (uint256) {
        return _totalPooled;
    }
    
    /**
     * @notice Transfer tokens
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _transferShares(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Transfer tokens from address
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transferShares(from, to, amount);
        return true;
    }
    
    // ============ Internal Shares Transfer ============
    
    /**
     * @dev Internal transfer with shares conversion
     */
    function _transferShares(
        address from,
        address to,
        uint256 amount
    ) internal {
        if (from == address(0)) revert ZeroAddress();
        if (to == address(0)) revert ZeroAddress();
        
        // Validate with policy engine
        _validatePolicyWithTarget(PolicyOperationTypes.ERC20_TRANSFER, to, amount);
        
        // Convert amount to shares
        uint256 sharesToTransfer = getSharesByPooledToken(amount);
        if (sharesToTransfer == 0) revert InsufficientShares();
        
        uint256 currentShares = _sharesOf[from];
        if (sharesToTransfer > currentShares) revert InsufficientShares();
        
        // Transfer shares
        _sharesOf[from] = currentShares - sharesToTransfer;
        _sharesOf[to] += sharesToTransfer;
        
        emit Transfer(from, to, amount);
        emit SharesTransferred(from, to, sharesToTransfer);
    }
    
    // ============ Mint/Burn Functions ============
    
    /**
     * @notice Mint new tokens
     */
    function mint(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _validatePolicy(PolicyOperationTypes.ERC20_MINT, amount);
        _mintShares(to, amount);
    }
    
    /**
     * @notice Burn tokens
     */
    function burn(uint256 amount) external {
        _validatePolicy(PolicyOperationTypes.ERC20_BURN, amount);
        _burnShares(msg.sender, amount);
    }
    
    /**
     * @dev Internal mint function
     */
    function _mintShares(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddress();
        
        // Convert to shares
        uint256 sharesToMint = getSharesByPooledToken(amount);
        if (sharesToMint == 0) {
            // First mint or very small amount
            sharesToMint = amount;
            _totalPooled += amount;
        } else {
            _totalPooled += amount;
        }
        
        _totalShares += sharesToMint;
        _sharesOf[account] += sharesToMint;
        
        emit Transfer(address(0), account, amount);
    }
    
    /**
     * @dev Internal burn function
     */
    function _burnShares(address account, uint256 amount) internal {
        if (account == address(0)) revert ZeroAddress();
        
        uint256 sharesToBurn = getSharesByPooledToken(amount);
        uint256 currentShares = _sharesOf[account];
        
        if (sharesToBurn > currentShares) revert InsufficientShares();
        
        _totalShares -= sharesToBurn;
        _totalPooled -= amount;
        _sharesOf[account] = currentShares - sharesToBurn;
        
        emit Transfer(account, address(0), amount);
    }
    
    // ============ Policy Engine Integration ============
    
    /**
     * @notice Set policy engine address
     */
    function setPolicyEngine(address engine_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldEngine = policyEngine;
        policyEngine = engine_;
        emit PolicyEngineUpdated(oldEngine, engine_);
    }
    
    /**
     * @dev Validate operation with policy engine
     */
    function _validatePolicy(
        string memory operationType,
        uint256 amount
    ) internal {
        if (policyEngine == address(0)) return;
        
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperation(
            address(this),
            msg.sender,
            operationType,
            amount
        );
        
        require(approved, reason);
    }
    
    /**
     * @dev Validate operation with target address
     */
    function _validatePolicyWithTarget(
        string memory operationType,
        address target,
        uint256 amount
    ) internal {
        if (policyEngine == address(0)) return;
        
        (bool approved, string memory reason) = IPolicyEngine(policyEngine).validateOperationWithTarget(
            address(this),
            msg.sender,
            target,
            operationType,
            amount
        );
        
        require(approved, reason);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get total shares supply
     */
    function getTotalShares() external view returns (uint256) {
        return _totalShares;
    }
    
    /**
     * @notice Get total pooled tokens
     */
    function getTotalPooled() external view returns (uint256) {
        return _totalPooled;
    }
    
    /**
     * @notice Get share price (tokens per share)
     */
    function getSharePrice() external view returns (uint256) {
        if (_totalShares == 0) return 1e18;
        return (_totalPooled * 1e18) / _totalShares;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
