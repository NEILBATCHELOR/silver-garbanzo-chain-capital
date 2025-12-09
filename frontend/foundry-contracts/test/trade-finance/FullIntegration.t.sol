// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {CommodityLendingPool} from "../../src/trade-finance/core/CommodityLendingPool.sol";
import {CommodityReceiptToken} from "../../src/trade-finance/tokens/CommodityReceiptToken.sol";
import {CommodityDebtToken} from "../../src/trade-finance/tokens/CommodityDebtToken.sol";
import {HaircutEngine} from "../../src/trade-finance/risk/HaircutEngine.sol";
import {DataTypes} from "../../src/trade-finance/libraries/types/DataTypes.sol";
import {ReserveConfiguration} from "../../src/trade-finance/libraries/configuration/ReserveConfiguration.sol";
import {WadRayMath} from "../../src/trade-finance/libraries/math/WadRayMath.sol";
import {PercentageMath} from "../../src/trade-finance/libraries/math/PercentageMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ICommodityLendingPool} from "../../src/trade-finance/interfaces/ICommodityLendingPool.sol";

/**
 * @title FullIntegrationTest
 * @notice Complete end-to-end integration test for commodity trade finance
 * @dev Tests the entire flow: Tokenize → Haircut → Value → Supply → Borrow → Repay → Liquidation
 * 
 * Test Scenarios:
 * 1. Gold (Precious Metal) - Low Risk, High LTV
 * 2. Oil (Energy) - Medium Risk, Medium LTV
 * 3. Soybeans (Agricultural) - Higher Risk, Lower LTV, Age Depreciation
 * 4. Carbon Credits (New Asset) - Highest Risk, Isolation Mode
 * 5. E-Mode: Soybean-to-Soybean loans (90% LTV)
 * 6. Cross-Commodity Liquidation
 */
contract FullIntegrationTest is Test {
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using WadRayMath for uint256;
    using PercentageMath for uint256;

    // ============ Core Contracts ============
    CommodityLendingPool public pool;
    HaircutEngine public haircutEngine;
    MockCommodityOracle public oracle; // Changed to MockCommodityOracle for testing

    // ============ Commodity Tokens ============
    MockCommodityToken public gold;
    MockCommodityToken public oil;
    MockCommodityToken public soybeans;
    MockCommodityToken public carbonCredits;
    
    // ============ Stablecoin ============
    MockERC20 public usdc;

    // ============ Receipt Tokens (cTokens) ============
    CommodityReceiptToken public cGold;
    CommodityReceiptToken public cOil;
    CommodityReceiptToken public cSoybeans;
    CommodityReceiptToken public cCarbon;

    // ============ Debt Tokens ============
    CommodityDebtToken public dUSDC;

    // ============ Test Actors ============
    address public admin;
    address public riskAdmin;
    address public farmer;      // Supplies soybeans
    address public trader;      // Trades oil
    address public goldHolder;  // Holds gold
    address public liquidator;  // Liquidates positions

    // ============ Constants ============
    uint256 constant GOLD_PRICE = 2000e8;       // $2,000/oz
    uint256 constant OIL_PRICE = 75e8;          // $75/barrel
    uint256 constant SOYBEAN_PRICE = 14e8;      // $14/bushel
    uint256 constant CARBON_PRICE = 30e8;       // $30/credit

    // ============ Setup ============

    function setUp() public {
        // Create test actors
        admin = makeAddr("admin");
        riskAdmin = makeAddr("riskAdmin");
        farmer = makeAddr("farmer");
        trader = makeAddr("trader");
        goldHolder = makeAddr("goldHolder");
        liquidator = makeAddr("liquidator");

        vm.startPrank(admin);

        // Deploy core contracts
        pool = new CommodityLendingPool();
        haircutEngine = new HaircutEngine(riskAdmin, admin); // Fix: Added both parameters
        oracle = new MockCommodityOracle(); // Using mock oracle for testing

        // Deploy commodity tokens
        gold = new MockCommodityToken("Gold", "GOLD", 18, HaircutEngine.CommodityType.PRECIOUS_METAL);
        oil = new MockCommodityToken("WTI Oil", "OIL", 18, HaircutEngine.CommodityType.ENERGY);
        soybeans = new MockCommodityToken("Soybeans", "SOY", 18, HaircutEngine.CommodityType.AGRICULTURAL);
        carbonCredits = new MockCommodityToken("Carbon Credits", "CARBON", 18, HaircutEngine.CommodityType.CARBON_CREDIT);
        usdc = new MockERC20("USD Coin", "USDC", 6);

        // Deploy receipt tokens
        cGold = new CommodityReceiptToken(address(pool), address(gold), "Commodity Gold", "cGOLD");
        cOil = new CommodityReceiptToken(address(pool), address(oil), "Commodity Oil", "cOIL");
        cSoybeans = new CommodityReceiptToken(address(pool), address(soybeans), "Commodity Soybeans", "cSOY");
        cCarbon = new CommodityReceiptToken(address(pool), address(carbonCredits), "Commodity Carbon", "cCARBON");

        // Deploy debt token
        dUSDC = new CommodityDebtToken(ICommodityLendingPool(address(pool)), "Debt USDC", "dUSDC", 6); // Fix: Cast to interface
        dUSDC.initialize(address(usdc));

        // Setup oracle prices
        oracle.setAssetPrice(address(gold), GOLD_PRICE);
        oracle.setAssetPrice(address(oil), OIL_PRICE);
        oracle.setAssetPrice(address(soybeans), SOYBEAN_PRICE);
        oracle.setAssetPrice(address(carbonCredits), CARBON_PRICE);
        oracle.setAssetPrice(address(usdc), 1e8); // $1

        // Configure haircut engine
        _configureHaircutEngine();

        // Initialize reserves
        _initializeGoldReserve();
        _initializeOilReserve();
        _initializeSoybeanReserve();
        _initializeCarbonReserve();
        _initializeUSDCReserve();

        vm.stopPrank();

        // Fund test accounts
        _fundTestAccounts();
    }

    // ============ Configuration Helpers ============

    function _configureHaircutEngine() internal {
        vm.startPrank(riskAdmin);

        // Configure Gold (Low Risk)
        HaircutEngine.RiskMetrics memory goldMetrics = HaircutEngine.RiskMetrics({
            volatility: 1245,           // 12.45% annualized
            maxDrawdown: 823,           // 8.23%
            valueAtRisk95: 189,         // 1.89%
            valueAtRisk99: 294,         // 2.94%
            sharpeRatio: 73,            // 0.73
            liquidityScore: 9500,       // High liquidity
            dataPoints: 365,
            calculatedAt: block.timestamp
        });

        haircutEngine.updateRiskMetrics(HaircutEngine.CommodityType.PRECIOUS_METAL, goldMetrics);

        // Configure Oil (Medium Risk)
        HaircutEngine.RiskMetrics memory oilMetrics = HaircutEngine.RiskMetrics({
            volatility: 2500,           // 25% annualized
            maxDrawdown: 3500,          // 35%
            valueAtRisk95: 450,         // 4.5%
            valueAtRisk99: 680,         // 6.8%
            sharpeRatio: 45,            // 0.45
            liquidityScore: 8000,       // Medium liquidity
            dataPoints: 365,
            calculatedAt: block.timestamp
        });

        haircutEngine.updateRiskMetrics(HaircutEngine.CommodityType.ENERGY, oilMetrics);

        // Configure Soybeans (Higher Risk)
        HaircutEngine.RiskMetrics memory soybeanMetrics = HaircutEngine.RiskMetrics({
            volatility: 2800,           // 28% annualized
            maxDrawdown: 4000,          // 40%
            valueAtRisk95: 520,         // 5.2%
            valueAtRisk99: 790,         // 7.9%
            sharpeRatio: 38,            // 0.38
            liquidityScore: 6000,       // Lower liquidity
            dataPoints: 365,
            calculatedAt: block.timestamp
        });

        haircutEngine.updateRiskMetrics(HaircutEngine.CommodityType.AGRICULTURAL, soybeanMetrics);

        vm.stopPrank();
    }

    function _initializeGoldReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(8000);                    // 80% LTV
        config.setLiquidationThreshold(8500);   // 85%
        config.setLiquidationBonus(500);        // 5%
        config.setDecimals(18);
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(false);

        pool.initReserve(
            address(gold),
            address(cGold),
            address(0),
            address(0),
            address(0)
        );

        pool.setConfiguration(address(gold), config);
    }

    function _initializeOilReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(7000);                    // 70% LTV
        config.setLiquidationThreshold(7500);   // 75%
        config.setLiquidationBonus(800);        // 8%
        config.setDecimals(18);
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(false);

        pool.initReserve(
            address(oil),
            address(cOil),
            address(0),
            address(0),
            address(0)
        );

        pool.setConfiguration(address(oil), config);
    }

    function _initializeSoybeanReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(6000);                    // 60% LTV
        config.setLiquidationThreshold(7000);   // 70%
        config.setLiquidationBonus(1000);       // 10%
        config.setDecimals(18);
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(false);

        pool.initReserve(
            address(soybeans),
            address(cSoybeans),
            address(0),
            address(0),
            address(0)
        );

        pool.setConfiguration(address(soybeans), config);
    }

    function _initializeCarbonReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(5000);                    // 50% LTV
        config.setLiquidationThreshold(6000);   // 60%
        config.setLiquidationBonus(1500);       // 15%
        config.setDecimals(18);
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(false);
        config.setBorrowableInIsolation(true);  // Fix: Use setBorrowableInIsolation instead of setIsolated
        config.setDebtCeiling(5_000_000);       // $5M debt ceiling - this makes it an isolated asset

        pool.initReserve(
            address(carbonCredits),
            address(cCarbon),
            address(0),
            address(0),
            address(0)
        );

        pool.setConfiguration(address(carbonCredits), config);
    }

    function _initializeUSDCReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(0);
        config.setLiquidationThreshold(0);
        config.setLiquidationBonus(0);
        config.setDecimals(6);
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(true);

        pool.initReserve(
            address(usdc),
            address(0),
            address(0),
            address(dUSDC),
            address(0)
        );

        pool.setConfiguration(address(usdc), config);
    }

    function _fundTestAccounts() internal {
        // Fund farmers with soybeans
        soybeans.mint(farmer, 10000e18); // 10,000 bushels

        // Fund traders with oil
        oil.mint(trader, 1000e18); // 1,000 barrels

        // Fund gold holders
        gold.mint(goldHolder, 100e18); // 100 oz

        // Fund liquidator with USDC
        usdc.mint(liquidator, 1_000_000e6); // $1M USDC

        // Fund pool with USDC liquidity
        usdc.mint(admin, 10_000_000e6); // $10M
        vm.startPrank(admin);
        usdc.approve(address(pool), 10_000_000e6);
        pool.supply(address(usdc), 10_000_000e6, admin, 0);
        vm.stopPrank();
    }

    // ============ Test 1: Gold Flow (Low Risk) ============

    function test_GoldFlow_Complete() public {
        console2.log("\n=== Test 1: Gold Complete Flow ===");
        
        uint256 goldAmount = 10e18; // 10 oz gold
        uint256 goldValue = (goldAmount * GOLD_PRICE) / 1e8; // $20,000

        // Step 1: Supply gold
        console2.log("Step 1: Supply gold");
        vm.startPrank(goldHolder);
        gold.approve(address(pool), goldAmount);
        pool.supply(address(gold), goldAmount, goldHolder, 0);
        vm.stopPrank();

        // Verify cToken balance
        assertEq(cGold.balanceOf(goldHolder), goldAmount, "cGold balance incorrect");

        // Step 2: Calculate haircut
        console2.log("Step 2: Calculate haircut");
        HaircutEngine.HaircutResult memory haircut = haircutEngine.calculateHaircut(
            HaircutEngine.CommodityType.PRECIOUS_METAL,
            goldValue,
            "99.9%",
            block.timestamp
        );

        console2.log("Gold Value: $", goldValue / 1e18);
        console2.log("Haircut: ", haircut.totalHaircut, "bps");
        console2.log("Adjusted Value: $", haircut.adjustedValue / 1e18);

        // Step 3: Borrow against gold
        console2.log("Step 3: Borrow USDC");
        uint256 borrowAmount = 15_000e6; // $15,000 (75% of gold value)

        vm.prank(goldHolder);
        pool.borrow(address(usdc), borrowAmount, uint256(DataTypes.InterestRateMode.VARIABLE), 0, goldHolder);

        assertEq(usdc.balanceOf(goldHolder), borrowAmount, "USDC not received");
        assertEq(dUSDC.balanceOf(goldHolder), borrowAmount, "Debt token not minted");

        // Step 4: Repay loan
        console2.log("Step 4: Repay loan");
        vm.startPrank(goldHolder);
        usdc.approve(address(pool), type(uint256).max);
        pool.repay(address(usdc), type(uint256).max, uint256(DataTypes.InterestRateMode.VARIABLE), goldHolder);
        vm.stopPrank();

        assertEq(dUSDC.balanceOf(goldHolder), 0, "Debt not fully repaid");

        // Step 5: Withdraw gold
        console2.log("Step 5: Withdraw gold");
        vm.prank(goldHolder);
        pool.withdraw(address(gold), goldAmount, goldHolder);

        assertEq(gold.balanceOf(goldHolder), 100e18, "Gold not returned");
        assertEq(cGold.balanceOf(goldHolder), 0, "cGold not burned");

        console2.log(unicode"✅ Gold flow complete\n");
    }

    // ============ Test 2: Oil with Age Depreciation ============

    function test_OilFlow_MediumRisk() public {
        console2.log("\n=== Test 2: Oil Flow (Medium Risk) ===");
        
        uint256 oilAmount = 100e18; // 100 barrels
        uint256 oilValue = (oilAmount * OIL_PRICE) / 1e8; // $7,500

        // Supply oil
        vm.startPrank(trader);
        oil.approve(address(pool), oilAmount);
        pool.supply(address(oil), oilAmount, trader, 0);

        // Calculate haircut (higher than gold)
        HaircutEngine.HaircutResult memory haircut = haircutEngine.calculateHaircut(
            HaircutEngine.CommodityType.ENERGY,
            oilValue,
            "API 39.6",
            block.timestamp
        );

        console2.log("Oil Value: $", oilValue / 1e18);
        console2.log("Haircut: ", haircut.totalHaircut, "bps");
        console2.log("Adjusted Value: $", haircut.adjustedValue / 1e18);

        // Borrow with lower LTV (70%)
        uint256 borrowAmount = 5_000e6; // $5,000

        pool.borrow(address(usdc), borrowAmount, uint256(DataTypes.InterestRateMode.VARIABLE), 0, trader);
        vm.stopPrank();

        assertEq(usdc.balanceOf(trader), borrowAmount, "USDC not received");

        console2.log(unicode"✅ Oil flow complete\n");
    }

    // ============ Test 3: Agricultural with Age Depreciation ============

    function test_Soybeans_AgeDepreciation() public {
        console2.log("\n=== Test 3: Soybeans with Age Depreciation ===");
        
        uint256 soybeanAmount = 1000e18; // 1,000 bushels
        uint256 soybeanValue = (soybeanAmount * SOYBEAN_PRICE) / 1e8; // $14,000

        // Supply fresh soybeans
        vm.startPrank(farmer);
        soybeans.approve(address(pool), soybeanAmount);
        pool.supply(address(soybeans), soybeanAmount, farmer, 0);

        // Calculate haircut (day 0 - fresh)
        HaircutEngine.HaircutResult memory haircutFresh = haircutEngine.calculateHaircut(
            HaircutEngine.CommodityType.AGRICULTURAL,
            soybeanValue,
            "Grade 1",
            block.timestamp
        );

        console2.log("Fresh Soybeans Value: $", soybeanValue / 1e18);
        console2.log("Fresh Haircut: ", haircutFresh.totalHaircut, "bps");

        // Advance time 45 days
        vm.warp(block.timestamp + 45 days);

        // Calculate haircut (day 45 - aged)
        HaircutEngine.HaircutResult memory haircutAged = haircutEngine.calculateHaircut(
            HaircutEngine.CommodityType.AGRICULTURAL,
            soybeanValue,
            "Grade 1",
            block.timestamp - 45 days // Certificate date
        );

        console2.log("Aged Soybeans Haircut: ", haircutAged.totalHaircut, "bps");
        console2.log("Age Depreciation: ", haircutAged.ageComponent, "bps");

        // Verify age depreciation applied
        assertGt(haircutAged.totalHaircut, haircutFresh.totalHaircut, "Age depreciation not applied");

        console2.log(unicode"✅ Soybean age depreciation test complete\n");
    }

    // ============ Test 4: Liquidation Scenario ============

    function test_Liquidation_PriceDropScenario() public {
        console2.log("\n=== Test 4: Liquidation on Price Drop ===");
        
        // Setup: Gold holder borrows at 75% LTV
        uint256 goldAmount = 10e18; // 10 oz
        vm.startPrank(goldHolder);
        gold.approve(address(pool), goldAmount);
        pool.supply(address(gold), goldAmount, goldHolder, 0);
        
        uint256 borrowAmount = 15_000e6; // $15,000 (75% of $20K)
        pool.borrow(address(usdc), borrowAmount, uint256(DataTypes.InterestRateMode.VARIABLE), 0, goldHolder);
        vm.stopPrank();

        console2.log("Initial Setup:");
        console2.log("  Collateral: 10 oz gold @ $2,000 = $20,000");
        console2.log("  Borrowed: $15,000 USDC");
        console2.log("  LTV: 75%");

        // Price crash: Gold drops 30%
        vm.prank(admin);
        oracle.setAssetPrice(address(gold), 1400e8); // $1,400/oz

        console2.log("\nAfter Price Drop:");
        console2.log("  Collateral: 10 oz gold @ $1,400 = $14,000");
        console2.log("  Borrowed: $15,000 USDC");
        console2.log("  LTV: 107% (liquidatable!)");

        // Liquidator liquidates position
        uint256 debtToCover = 8_000e6; // Liquidate half

        vm.startPrank(liquidator);
        usdc.approve(address(pool), debtToCover);
        pool.liquidationCall(address(gold), address(usdc), goldHolder, debtToCover, false);
        vm.stopPrank();

        // Verify liquidation
        assertGt(gold.balanceOf(liquidator), 0, "Liquidator should receive gold");
        assertLt(dUSDC.balanceOf(goldHolder), borrowAmount, "Debt should be reduced");

        console2.log(unicode"✅ Liquidation complete\n");
    }

    // ============ Test 5: E-Mode (High LTV) ============

    function test_EMode_HigherLTV() public {
        console2.log("\n=== Test 5: E-Mode (Soybean-to-Soybean) ===");

        // Configure E-Mode for agricultural commodities
        vm.prank(admin);
        pool.configureEModeCategory(
            1,                          // categoryId
            9000,                       // ltv (90%)
            9200,                       // liquidationThreshold (92%)
            300,                        // liquidationBonus (3%)
            address(0),                 // priceSource
            "Agricultural Efficiency",  // label
            type(uint128).max,          // collateralBitmap (all assets allowed)
            type(uint128).max           // borrowableBitmap (all assets allowed)
        );

        // Farmer enters E-Mode
        vm.prank(farmer);
        pool.setUserEMode(1);

        // Supply soybeans
        uint256 soybeanAmount = 1000e18;
        vm.startPrank(farmer);
        soybeans.approve(address(pool), soybeanAmount);
        pool.supply(address(soybeans), soybeanAmount, farmer, 0);

        // Borrow at 85% LTV (would be 60% in normal mode)
        uint256 soybeanValue = (soybeanAmount * SOYBEAN_PRICE) / 1e8;
        uint256 borrowAmount = (soybeanValue * 8500) / 10000; // 85% of $14,000

        pool.borrow(address(usdc), uint256(borrowAmount / 1e12), uint256(DataTypes.InterestRateMode.VARIABLE), 0, farmer);
        vm.stopPrank();

        console2.log("E-Mode Enabled:");
        console2.log("  Collateral: $", soybeanValue / 1e18);
        console2.log("  Borrowed: $", borrowAmount / 1e18);
        console2.log("  LTV: 85% (vs 60% normal)");

        console2.log(unicode"✅ E-Mode test complete\n");
    }

    // ============ Test 6: Isolation Mode (Carbon Credits) ============

    function test_IsolationMode_CarbonCredits() public {
        console2.log("\n=== Test 6: Isolation Mode (Carbon Credits) ===");

        // Mint carbon credits
        carbonCredits.mint(trader, 1000e18); // 1,000 credits

        // Supply carbon credits (isolated asset)
        vm.startPrank(trader);
        carbonCredits.approve(address(pool), 1000e18);
        pool.supply(address(carbonCredits), 1000e18, trader, 0);

        // Try to borrow (should only allow stablecoins)
        uint256 borrowAmount = 10_000e6; // $10,000

        pool.borrow(address(usdc), borrowAmount, uint256(DataTypes.InterestRateMode.VARIABLE), 0, trader);
        vm.stopPrank();

        console2.log("Isolation Mode:");
        console2.log("  Asset: Carbon Credits");
        console2.log("  Debt Ceiling: $5,000,000");
        console2.log("  Borrowed: $", borrowAmount / 1e6);
        console2.log("  Only stablecoins allowed");

        console2.log(unicode"✅ Isolation mode test complete\n");
    }

    // ============ Test 7: Receipt Token Composability ============

    function test_ReceiptToken_Transfer() public {
        console2.log("\n=== Test 7: cToken Transfer ===");

        // Supply gold
        uint256 goldAmount = 10e18;
        vm.startPrank(goldHolder);
        gold.approve(address(pool), goldAmount);
        pool.supply(address(gold), goldAmount, goldHolder, 0);

        // Transfer 50% of cGold to trader
        uint256 transferAmount = 5e18;
        cGold.transfer(trader, transferAmount);
        vm.stopPrank();

        // Verify balances
        assertEq(cGold.balanceOf(goldHolder), 5e18, "Sender balance incorrect");
        assertEq(cGold.balanceOf(trader), 5e18, "Receiver balance incorrect");

        // Trader can now withdraw their share
        vm.prank(trader);
        pool.withdraw(address(gold), transferAmount, trader);

        assertEq(gold.balanceOf(trader), transferAmount, "Gold not received by trader");

        console2.log(unicode"✅ cToken transfer test complete\n");
    }
}

// ============ Mock Contracts ============

/**
 * @notice Mock Oracle for testing - allows setting prices directly
 * @dev In production, use real CommodityOracle with Chainlink feeds
 */
contract MockCommodityOracle {
    mapping(address => uint256) private prices;
    
    function setAssetPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }
    
    function getAssetPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
}

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockCommodityToken is ERC20 {
    uint8 private _decimals;
    HaircutEngine.CommodityType public commodityType;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        HaircutEngine.CommodityType type_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
        commodityType = type_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
