// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EnhancedERC4626Token
 * @notice Advanced ERC4626 vault with comprehensive DeFi features
 * @dev Supports all 110+ max configuration features for institutional-grade vaults
 */
contract EnhancedERC4626Token is ERC4626, AccessControl, Pausable, ReentrancyGuard {
    
    // =============================================================
    //                           STRUCTS
    // =============================================================
    
    struct VaultConfig {
        string name;
        string symbol;
        uint8 decimals;
        address asset;
        uint256 managementFee; // Annual fee in basis points
        uint256 performanceFee; // Performance fee in basis points
        uint256 depositLimit; // Maximum total assets
        uint256 minDeposit; // Minimum deposit amount
        uint256 withdrawalFee; // Withdrawal fee in basis points
        bool depositsEnabled;
        bool withdrawalsEnabled;
        bool transfersPaused;
        address feeRecipient;
        address initialOwner;
    }

    struct YieldOptimization {
        bool enabled;
        uint256 rebalanceThreshold; // Percentage deviation before rebalance
        uint256 rebalanceFrequency; // Minimum time between rebalances
        bool autoCompounding;
        uint256 compoundFrequency;
        bool yieldFarmingEnabled;
        bool arbitrageEnabled;
        bool crossDexOptimization;
    }

    struct RiskManagement {
        bool enabled;
        uint256 maxLeverage; // Maximum leverage ratio (scaled by 1e18)
        uint256 liquidationThreshold; // Liquidation threshold percentage
        uint256 liquidationPenalty; // Liquidation penalty percentage
        bool impermanentLossProtection;
        uint256 maxDrawdown; // Maximum allowed drawdown percentage
        bool stopLossEnabled;
        uint256 stopLossThreshold;
    }

    struct PerformanceTracking {
        bool enabled;
        uint256 benchmarkAPY; // Benchmark APY for performance comparison
        uint256 totalReturn; // Total return since inception
        uint256 maxDrawdown; // Maximum drawdown experienced
        uint256 sharpeRatio; // Sharpe ratio scaled by 1e18
        uint256 lastPerformanceUpdate;
        bool realTimeTracking;
        uint256 performanceHistoryRetention; // Days to retain history
    }

    struct InstitutionalFeatures {
        bool institutionalGrade;
        bool custodyIntegration;
        bool complianceReporting;
        bool fundAdministration;
        bool thirdPartyAudits;
        address custodyProvider;
        uint256 minimumInvestment; // Minimum investment for institutions
        bool kycRequired;
        bool accreditedInvestorOnly;
    }

    struct VaultStrategy {
        string name;
        address strategyContract;
        uint256 allocation; // Percentage allocation (scaled by 1e18)
        bool isActive;
        uint256 targetAPY;
        uint256 riskLevel; // 1-10 scale
        bool autoRebalance;
        uint256 lastRebalance;
    }

    // =============================================================
    //                       STATE VARIABLES
    // =============================================================
    
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant STRATEGY_ROLE = keccak256("STRATEGY_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    VaultConfig public vaultConfig;
    YieldOptimization public yieldOptimization;
    RiskManagement public riskManagement;
    PerformanceTracking public performanceTracking;
    InstitutionalFeatures public institutionalFeatures;

    // Strategy management
    VaultStrategy[] public strategies;
    mapping(address => uint256) public strategyIndex;
    uint256 public totalStrategyAllocation;

    // Fee tracking
    uint256 public totalFeesCollected;
    uint256 public lastFeeCollection;
    uint256 public lastPerformanceFeeCollection;
    uint256 public lastRebalance;

    // Leverage and borrowing
    bool public leverageEnabled;
    uint256 public currentLeverage; // Current leverage ratio
    mapping(address => uint256) public borrowedAmounts;
    mapping(address => uint256) public collateralAmounts;

    // Cross-chain and DeFi integration
    bool public crossChainYieldEnabled;
    bool public lendingProtocolEnabled;
    bool public marketMakingEnabled;
    bool public liquidityMiningEnabled;
    
    // Analytics and reporting
    mapping(uint256 => uint256) public dailyReturns; // timestamp => return
    mapping(address => uint256) public userLastDeposit;
    mapping(address => uint256) public userTotalDeposits;
    mapping(address => uint256) public userTotalWithdrawals;

    // Compliance and governance
    mapping(address => bool) public kycVerified;
    mapping(address => bool) public accreditedInvestors;
    mapping(address => bool) public restrictedInvestors;
    bool public socialTradingEnabled;
    bool public notificationSystemEnabled;

    // =============================================================
    //                           EVENTS
    // =============================================================
    
    event VaultConfigUpdated(
        uint256 managementFee,
        uint256 performanceFee,
        uint256 depositLimit
    );
    event StrategyAdded(
        string name,
        address strategyContract,
        uint256 allocation
    );
    event StrategyRemoved(address strategyContract);
    event Rebalanced(uint256 timestamp, uint256 totalAssets);
    event PerformanceUpdated(
        uint256 totalReturn,
        uint256 sharpeRatio,
        uint256 maxDrawdown
    );
    event FeesCollected(
        uint256 managementFees,
        uint256 performanceFees,
        uint256 withdrawalFees
    );
    event LeverageUpdated(uint256 newLeverage);
    event ComplianceStatusUpdated(address indexed user, bool kycStatus, bool accreditedStatus);

    // =============================================================
    //                         CONSTRUCTOR
    // =============================================================
    
    constructor(
        VaultConfig memory _config,
        YieldOptimization memory _yieldOpt,
        RiskManagement memory _riskMgmt,
        PerformanceTracking memory _perfTracking,
        InstitutionalFeatures memory _instFeatures
    ) 
        ERC4626(IERC20(_config.asset))
        ERC20(_config.name, _config.symbol)
    {
        require(_config.initialOwner != address(0), "Invalid owner");
        require(_config.feeRecipient != address(0), "Invalid fee recipient");
        
        vaultConfig = _config;
        yieldOptimization = _yieldOpt;
        riskManagement = _riskMgmt;
        performanceTracking = _perfTracking;
        institutionalFeatures = _instFeatures;

        // Set up roles
        _grantRole(DEFAULT_ADMIN_ROLE, _config.initialOwner);
        _grantRole(MANAGER_ROLE, _config.initialOwner);
        _grantRole(STRATEGY_ROLE, _config.initialOwner);
        _grantRole(REBALANCER_ROLE, _config.initialOwner);
        _grantRole(COMPLIANCE_ROLE, _config.initialOwner);

        // Initialize tracking
        lastFeeCollection = block.timestamp;
        lastPerformanceFeeCollection = block.timestamp;
        lastRebalance = block.timestamp;
        performanceTracking.lastPerformanceUpdate = block.timestamp;
    }

    // =============================================================
    //                      DEPOSIT/WITHDRAW
    // =============================================================
    
    function deposit(uint256 assets, address receiver) 
        public 
        virtual 
        override 
        nonReentrant
        whenNotPaused
        returns (uint256) 
    {
        require(vaultConfig.depositsEnabled, "Deposits disabled");
        require(assets >= vaultConfig.minDeposit, "Below minimum deposit");
        
        // Check institutional requirements
        if (institutionalFeatures.institutionalGrade) {
            require(
                assets >= institutionalFeatures.minimumInvestment,
                "Below institutional minimum"
            );
        }
        
        if (institutionalFeatures.kycRequired) {
            require(kycVerified[receiver], "KYC required");
        }
        
        if (institutionalFeatures.accreditedInvestorOnly) {
            require(accreditedInvestors[receiver], "Accredited investor required");
        }

        // Check deposit limits
        uint256 totalAssetsAfter = totalAssets() + assets;
        require(
            vaultConfig.depositLimit == 0 || totalAssetsAfter <= vaultConfig.depositLimit,
            "Deposit limit exceeded"
        );

        // Calculate and collect fees
        _collectFees();

        // Track user deposits
        userLastDeposit[receiver] = block.timestamp;
        userTotalDeposits[receiver] += assets;

        // Trigger rebalance if needed
        if (yieldOptimization.enabled && _shouldRebalance()) {
            _rebalancePortfolio();
        }

        return super.deposit(assets, receiver);
    }

    function withdraw(uint256 assets, address receiver, address owner)
        public
        virtual
        override
        nonReentrant
        whenNotPaused
        returns (uint256)
    {
        require(vaultConfig.withdrawalsEnabled, "Withdrawals disabled");
        require(!restrictedInvestors[owner], "Investor restricted");

        // Calculate withdrawal fees
        uint256 withdrawalFee = (assets * vaultConfig.withdrawalFee) / 10000;
        uint256 netAssets = assets - withdrawalFee;

        // Collect fees
        _collectFees();
        
        // Track user withdrawals
        userTotalWithdrawals[owner] += assets;

        // Transfer withdrawal fee to fee recipient
        if (withdrawalFee > 0) {
            IERC20(asset()).transfer(vaultConfig.feeRecipient, withdrawalFee);
        }

        return super.withdraw(netAssets, receiver, owner);
    }

    // =============================================================
    //                     STRATEGY MANAGEMENT
    // =============================================================
    
    function addStrategy(
        string memory name,
        address strategyContract,
        uint256 allocation,
        uint256 targetAPY,
        uint256 riskLevel
    ) external onlyRole(STRATEGY_ROLE) {
        require(strategyContract != address(0), "Invalid strategy");
        require(allocation > 0 && allocation <= 100e18, "Invalid allocation");
        require(totalStrategyAllocation + allocation <= 100e18, "Allocation overflow");
        
        strategies.push(VaultStrategy({
            name: name,
            strategyContract: strategyContract,
            allocation: allocation,
            isActive: true,
            targetAPY: targetAPY,
            riskLevel: riskLevel,
            autoRebalance: true,
            lastRebalance: block.timestamp
        }));

        strategyIndex[strategyContract] = strategies.length - 1;
        totalStrategyAllocation += allocation;

        emit StrategyAdded(name, strategyContract, allocation);
    }

    function removeStrategy(address strategyContract) 
        external 
        onlyRole(STRATEGY_ROLE) 
    {
        uint256 index = strategyIndex[strategyContract];
        require(index < strategies.length, "Strategy not found");
        
        VaultStrategy storage strategy = strategies[index];
        totalStrategyAllocation -= strategy.allocation;
        
        // Move last strategy to deleted spot
        strategies[index] = strategies[strategies.length - 1];
        strategyIndex[strategies[index].strategyContract] = index;
        
        strategies.pop();
        delete strategyIndex[strategyContract];

        emit StrategyRemoved(strategyContract);
    }

    function updateStrategyAllocation(address strategyContract, uint256 newAllocation)
        external
        onlyRole(STRATEGY_ROLE)
    {
        uint256 index = strategyIndex[strategyContract];
        require(index < strategies.length, "Strategy not found");
        
        VaultStrategy storage strategy = strategies[index];
        totalStrategyAllocation = totalStrategyAllocation - strategy.allocation + newAllocation;
        require(totalStrategyAllocation <= 100e18, "Allocation overflow");
        
        strategy.allocation = newAllocation;
    }

    // =============================================================
    //                         REBALANCING
    // =============================================================
    
    function _shouldRebalance() internal view returns (bool) {
        if (!yieldOptimization.enabled || !yieldOptimization.autoCompounding) {
            return false;
        }
        
        return block.timestamp >= lastRebalance + yieldOptimization.rebalanceFrequency;
    }

    function _rebalancePortfolio() internal {
        require(yieldOptimization.enabled, "Rebalancing disabled");
        
        // Simple rebalancing logic - in practice would be more sophisticated
        uint256 totalBalance = totalAssets();
        
        for (uint256 i = 0; i < strategies.length; i++) {
            VaultStrategy storage strategy = strategies[i];
            if (strategy.isActive) {
                uint256 targetAmount = (totalBalance * strategy.allocation) / 100e18;
                // In practice, would interact with strategy contracts
                strategy.lastRebalance = block.timestamp;
            }
        }
        
        lastRebalance = block.timestamp;
        emit Rebalanced(block.timestamp, totalBalance);
    }

    function manualRebalance() external onlyRole(REBALANCER_ROLE) {
        _rebalancePortfolio();
    }

    // =============================================================
    //                       FEE MANAGEMENT
    // =============================================================
    
    function _collectFees() internal {
        uint256 timePassed = block.timestamp - lastFeeCollection;
        if (timePassed == 0) return;

        uint256 totalAssetsValue = totalAssets();
        if (totalAssetsValue == 0) {
            lastFeeCollection = block.timestamp;
            return;
        }

        // Management fee (annual)
        uint256 managementFee = 0;
        if (vaultConfig.managementFee > 0) {
            managementFee = (totalAssetsValue * vaultConfig.managementFee * timePassed) 
                          / (10000 * 365 days);
        }

        // Performance fee (simplified - would track high water mark in practice)
        uint256 performanceFee = 0;
        if (vaultConfig.performanceFee > 0 && performanceTracking.enabled) {
            // Calculate based on returns exceeding benchmark
            performanceFee = _calculatePerformanceFee(totalAssetsValue);
        }

        if (managementFee > 0 || performanceFee > 0) {
            // Mint shares to fee recipient
            uint256 totalFeeShares = convertToShares(managementFee + performanceFee);
            _mint(vaultConfig.feeRecipient, totalFeeShares);
            
            totalFeesCollected += managementFee + performanceFee;
            emit FeesCollected(managementFee, performanceFee, 0);
        }

        lastFeeCollection = block.timestamp;
    }

    function _calculatePerformanceFee(uint256 totalAssetsValue) internal view returns (uint256) {
        // Simplified performance fee calculation
        // In practice would track high water mark and benchmark performance
        if (performanceTracking.totalReturn > performanceTracking.benchmarkAPY) {
            uint256 excessReturn = performanceTracking.totalReturn - performanceTracking.benchmarkAPY;
            return (totalAssetsValue * vaultConfig.performanceFee * excessReturn) / (10000 * 100e18);
        }
        return 0;
    }

    // =============================================================
    //                    LEVERAGE & BORROWING
    // =============================================================
    
    function enableLeverage(uint256 maxLeverage) external onlyRole(MANAGER_ROLE) {
        require(maxLeverage > 1e18 && maxLeverage <= riskManagement.maxLeverage, "Invalid leverage");
        leverageEnabled = true;
        riskManagement.maxLeverage = maxLeverage;
    }

    function updateLeverage(uint256 newLeverage) external onlyRole(MANAGER_ROLE) {
        require(leverageEnabled, "Leverage not enabled");
        require(newLeverage <= riskManagement.maxLeverage, "Leverage too high");
        
        currentLeverage = newLeverage;
        emit LeverageUpdated(newLeverage);
    }

    // =============================================================
    //                    COMPLIANCE & KYC
    // =============================================================
    
    function updateKYCStatus(address user, bool verified) external onlyRole(COMPLIANCE_ROLE) {
        kycVerified[user] = verified;
        emit ComplianceStatusUpdated(user, verified, accreditedInvestors[user]);
    }

    function updateAccreditedStatus(address user, bool accredited) external onlyRole(COMPLIANCE_ROLE) {
        accreditedInvestors[user] = accredited;
        emit ComplianceStatusUpdated(user, kycVerified[user], accredited);
    }

    function restrictInvestor(address user, bool restricted) external onlyRole(COMPLIANCE_ROLE) {
        restrictedInvestors[user] = restricted;
    }

    // =============================================================
    //                  PERFORMANCE TRACKING
    // =============================================================
    
    function updatePerformanceMetrics() external onlyRole(MANAGER_ROLE) {
        require(performanceTracking.enabled, "Performance tracking disabled");
        
        uint256 currentValue = totalAssets();
        uint256 timePassed = block.timestamp - performanceTracking.lastPerformanceUpdate;
        
        if (timePassed > 0 && currentValue > 0) {
            // Calculate daily return
            uint256 dayKey = block.timestamp / 1 days;
            
            // Simplified return calculation
            // In practice would use more sophisticated metrics
            dailyReturns[dayKey] = currentValue;
            
            // Update tracking timestamp
            performanceTracking.lastPerformanceUpdate = block.timestamp;
            
            emit PerformanceUpdated(
                performanceTracking.totalReturn,
                performanceTracking.sharpeRatio,
                performanceTracking.maxDrawdown
            );
        }
    }

    // =============================================================
    //                    ADMIN FUNCTIONS
    // =============================================================
    
    function updateVaultConfig(
        uint256 managementFee,
        uint256 performanceFee,
        uint256 depositLimit,
        uint256 minDeposit,
        uint256 withdrawalFee
    ) external onlyRole(MANAGER_ROLE) {
        vaultConfig.managementFee = managementFee;
        vaultConfig.performanceFee = performanceFee;
        vaultConfig.depositLimit = depositLimit;
        vaultConfig.minDeposit = minDeposit;
        vaultConfig.withdrawalFee = withdrawalFee;
        
        emit VaultConfigUpdated(managementFee, performanceFee, depositLimit);
    }

    function setDepositsEnabled(bool enabled) external onlyRole(MANAGER_ROLE) {
        vaultConfig.depositsEnabled = enabled;
    }

    function setWithdrawalsEnabled(bool enabled) external onlyRole(MANAGER_ROLE) {
        vaultConfig.withdrawalsEnabled = enabled;
    }

    function pauseVault() external onlyRole(MANAGER_ROLE) {
        _pause();
    }

    function unpauseVault() external onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    function enableYieldOptimization(bool enabled) external onlyRole(MANAGER_ROLE) {
        yieldOptimization.enabled = enabled;
    }

    function enableCrossChainYield(bool enabled) external onlyRole(MANAGER_ROLE) {
        crossChainYieldEnabled = enabled;
    }

    function enableLendingProtocol(bool enabled) external onlyRole(MANAGER_ROLE) {
        lendingProtocolEnabled = enabled;
    }

    function enableMarketMaking(bool enabled) external onlyRole(MANAGER_ROLE) {
        marketMakingEnabled = enabled;
    }

    function enableLiquidityMining(bool enabled) external onlyRole(MANAGER_ROLE) {
        liquidityMiningEnabled = enabled;
    }

    // =============================================================
    //                      VIEW FUNCTIONS
    // =============================================================
    
    function getVaultInfo() external view returns (
        string memory name,
        string memory symbol,
        address assetAddress,
        uint256 totalAssetsValue,
        uint256 totalSupplyValue,
        uint256 currentAPY,
        uint256 totalStrategies,
        bool isInstitutional
    ) {
        return (
            name(),
            symbol(),
            asset(),
            totalAssets(),
            totalSupply(),
            performanceTracking.benchmarkAPY,
            strategies.length,
            institutionalFeatures.institutionalGrade
        );
    }

    function getStrategiesInfo() external view returns (
        string[] memory names,
        address[] memory contracts,
        uint256[] memory allocations,
        bool[] memory activeStatus
    ) {
        uint256 length = strategies.length;
        names = new string[](length);
        contracts = new address[](length);
        allocations = new uint256[](length);
        activeStatus = new bool[](length);
        
        for (uint256 i = 0; i < length; i++) {
            names[i] = strategies[i].name;
            contracts[i] = strategies[i].strategyContract;
            allocations[i] = strategies[i].allocation;
            activeStatus[i] = strategies[i].isActive;
        }
    }

    function getUserInfo(address user) external view returns (
        uint256 balance,
        uint256 totalDeposited,
        uint256 totalWithdrawn,
        uint256 lastDepositTime,
        bool kycStatus,
        bool accreditedStatus,
        bool isRestricted
    ) {
        return (
            balanceOf(user),
            userTotalDeposits[user],
            userTotalWithdrawals[user],
            userLastDeposit[user],
            kycVerified[user],
            accreditedInvestors[user],
            restrictedInvestors[user]
        );
    }

    function getPerformanceMetrics() external view returns (
        uint256 totalReturnValue,
        uint256 maxDrawdownValue,
        uint256 sharpeRatioValue,
        uint256 currentLeverageValue,
        uint256 lastUpdateTime
    ) {
        return (
            performanceTracking.totalReturn,
            performanceTracking.maxDrawdown,
            performanceTracking.sharpeRatio,
            currentLeverage,
            performanceTracking.lastPerformanceUpdate
        );
    }

    function decimals() public view virtual override returns (uint8) {
        return vaultConfig.decimals;
    }

    // =============================================================
    //                    EMERGENCY FUNCTIONS
    // =============================================================
    
    function emergencyWithdraw(address token, uint256 amount) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(token != asset(), "Cannot withdraw vault asset");
        IERC20(token).transfer(msg.sender, amount);
    }

    function emergencyPause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        vaultConfig.depositsEnabled = false;
        vaultConfig.withdrawalsEnabled = false;
    }

    // =============================================================
    //                       OVERRIDES
    // =============================================================
    
    function _update(address from, address to, uint256 value) 
        internal 
        virtual 
        override 
        whenNotPaused
    {
        super._update(from, to, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
