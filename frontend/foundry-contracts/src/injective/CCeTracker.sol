// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BankERC20.sol";
import "./Exchange.sol";

/// @title Chain Capital eTracker - Product Agnostic Vault
/// @notice Yield-bearing receipt tokens for ANY product type
/// @dev Balance stays constant, value increases via exchange rate (like eTracker INJECTIVE20)
contract ChainCapitalVault is BankERC20 {
    IExchangeModule public constant EXCHANGE = 
        IExchangeModule(0x0000000000000000000000000000000000000065);
    
    address public vaultManager;
    address public backendOracle;
    
    // Product linkage
    string public productId;        // UUID from products table
    string public productType;      // bond, reit, fund, climate, etc.
    string public underlyingDenom;  // peggy0x... (USDT, USDC, etc.)
    
    // Exchange rate tracking (off-chain calculated)
    uint256 public exchangeRate;    // 18 decimals (e.g., 1.05e18 = 1.05 underlying per share)
    uint256 public lastUpdateTime;
    uint256 public totalValueLocked; // Total underlying value in vault
    
    // Strategy configuration
    struct VaultStrategy {
        string strategyName;
        bool active;
        uint256 allocationPct;  // Basis points (e.g., 5000 = 50%)
        uint256 targetAPY;      // Expected APY in basis points
    }
    
    VaultStrategy[] public strategies;
    
    event Deposited(address indexed user, uint256 underlyingAmount, uint256 sharesIssued);
    event Withdrawn(address indexed user, uint256 sharesBurned, uint256 underlyingAmount);
    event ExchangeRateUpdated(uint256 newRate, uint256 timestamp, uint256 totalValue);
    event StrategyAdded(uint256 indexed strategyId, string strategyName, uint256 allocation);
    event StrategyUpdated(uint256 indexed strategyId, bool active, uint256 allocation);
    event ProductConfigured(string indexed productId, string productType);
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        string memory _productId,
        string memory _productType,
        string memory _underlyingDenom,
        address _backendOracle
    ) BankERC20(name, symbol, decimals) {
        vaultManager = msg.sender;
        backendOracle = _backendOracle;
        productId = _productId;
        productType = _productType;
        underlyingDenom = _underlyingDenom;
        exchangeRate = 1e18; // Start at 1:1
        lastUpdateTime = block.timestamp;
        
        emit ProductConfigured(_productId, _productType);
    }
    
    modifier onlyManager() {
        require(msg.sender == vaultManager, "Not manager");
        _;
    }
    
    modifier onlyOracleOrManager() {
        require(msg.sender == vaultManager || msg.sender == backendOracle, "Not authorized");
        _;
    }
    
    /// @notice Deposit underlying and receive shares
    /// @param amount Amount of underlying token (CHAIN FORMAT)
    /// @param subaccountID Subaccount to deposit from
    function deposit(
        uint256 amount,
        string memory subaccountID
    ) external returns (uint256 shares) {
        require(amount > 0, "Amount must be > 0");
        
        // Transfer underlying from user to vault
        EXCHANGE.deposit(msg.sender, subaccountID, underlyingDenom, amount);
        
        // Calculate shares: amount * 1e18 / exchangeRate
        shares = (amount * 1e18) / exchangeRate;
        
        // Mint shares to user
        _mint(msg.sender, shares);
        
        // Update TVL
        totalValueLocked += amount;
        
        emit Deposited(msg.sender, amount, shares);
    }
    
    /// @notice Burn shares and receive underlying
    /// @param shares Amount of shares to burn
    /// @param subaccountID Subaccount to withdraw to
    function withdraw(
        uint256 shares,
        string memory subaccountID
    ) external returns (uint256 underlyingAmount) {
        require(balanceOf(msg.sender) >= shares, "Insufficient shares");
        
        // Calculate underlying: shares * exchangeRate / 1e18
        underlyingAmount = (shares * exchangeRate) / 1e18;
        
        // Check vault has liquidity
        require(underlyingAmount <= totalValueLocked, "Insufficient liquidity");
        
        // Burn shares
        _burn(msg.sender, shares);
        
        // Withdraw underlying to user
        EXCHANGE.withdraw(address(this), subaccountID, underlyingDenom, underlyingAmount);
        
        // Update TVL
        totalValueLocked -= underlyingAmount;
        
        emit Withdrawn(msg.sender, shares, underlyingAmount);
    }
    
    /// @notice Update exchange rate (called by oracle/backend)
    /// @dev Rate = totalVaultValue / totalShares
    function updateExchangeRate(uint256 newRate, uint256 newTVL) external onlyOracleOrManager {
        require(newRate > 0, "Invalid rate");
        exchangeRate = newRate;
        totalValueLocked = newTVL;
        lastUpdateTime = block.timestamp;
        
        emit ExchangeRateUpdated(newRate, block.timestamp, newTVL);
    }
    
    /// @notice Add yield strategy
    function addStrategy(
        string memory strategyName,
        uint256 allocationPct,
        uint256 targetAPY
    ) external onlyManager returns (uint256 strategyId) {
        require(allocationPct <= 10000, "Allocation > 100%");
        
        strategies.push(VaultStrategy({
            strategyName: strategyName,
            active: true,
            allocationPct: allocationPct,
            targetAPY: targetAPY
        }));
        
        strategyId = strategies.length - 1;
        emit StrategyAdded(strategyId, strategyName, allocationPct);
    }
    
    /// @notice Update strategy
    function updateStrategy(
        uint256 strategyId,
        bool active,
        uint256 allocationPct
    ) external onlyManager {
        require(strategyId < strategies.length, "Invalid strategy");
        require(allocationPct <= 10000, "Allocation > 100%");
        
        strategies[strategyId].active = active;
        strategies[strategyId].allocationPct = allocationPct;
        
        emit StrategyUpdated(strategyId, active, allocationPct);
    }
    
    /// @notice Get current value of user's shares
    function getShareValue(address user) external view returns (uint256) {
        return (balanceOf(user) * exchangeRate) / 1e18;
    }
    
    /// @notice Get total strategies
    function getStrategyCount() external view returns (uint256) {
        return strategies.length;
    }
    
    /// @notice Get strategy details
    function getStrategy(uint256 strategyId) 
        external 
        view 
        returns (VaultStrategy memory) 
    {
        require(strategyId < strategies.length, "Invalid strategy");
        return strategies[strategyId];
    }
    
    /// @notice Update backend oracle
    function updateOracle(address newOracle) external onlyManager {
        backendOracle = newOracle;
    }
    
    /// @notice Get vault statistics
    function getVaultStats() external view returns (
        uint256 rate,
        uint256 tvl,
        uint256 totalSupply_,
        uint256 lastUpdate
    ) {
        return (
            exchangeRate,
            totalValueLocked,
            totalSupply(),
            lastUpdateTime
        );
    }
}
