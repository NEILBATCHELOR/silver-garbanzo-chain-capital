// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {CommodityLendingPool} from "../../src/trade-finance/core/CommodityLendingPool.sol";
import {CommodityReceiptToken} from "../../src/trade-finance/tokens/CommodityReceiptToken.sol";
import {CommodityDebtToken} from "../../src/trade-finance/tokens/CommodityDebtToken.sol";
import {ICommodityLendingPool} from "../../src/trade-finance/interfaces/ICommodityLendingPool.sol";
import {DataTypes} from "../../src/trade-finance/libraries/types/DataTypes.sol";
import {ReserveConfiguration} from "../../src/trade-finance/libraries/configuration/ReserveConfiguration.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CommodityLendingPoolTest
 * @notice Integration tests for the complete commodity lending system
 * @dev Tests: Supply → Borrow → Repay → Withdraw → Liquidation → E-Mode
 */
contract CommodityLendingPoolTest is Test {
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;

    // ============ Contracts ============
    CommodityLendingPool public pool;
    MockERC20 public gold; // Collateral commodity
    MockERC20 public usdc; // Borrowable stablecoin
    CommodityReceiptToken public cGold;
    CommodityDebtToken public dUSDC;
    MockPriceOracle public oracle;

    // ============ Test Actors ============
    address public admin;
    address public supplier;
    address public borrower;
    address public liquidator;

    // ============ Constants ============
    uint256 constant GOLD_PRICE = 2000e8; // $2000 per oz (Chainlink format)
    uint8 constant USDC_DECIMALS = 6;
    uint8 constant GOLD_DECIMALS = 18;
    
    // Risk parameters
    uint256 constant LTV = 8000; // 80%
    uint256 constant LIQUIDATION_THRESHOLD = 8500; // 85%
    uint256 constant LIQUIDATION_BONUS = 500; // 5%

    // ============ Events to Test ============
    event Supply(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        uint16 indexed referralCode
    );

    event Borrow(
        address indexed reserve,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        DataTypes.InterestRateMode interestRateMode,
        uint256 borrowRate,
        uint16 indexed referralCode
    );

    event Repay(
        address indexed reserve,
        address indexed user,
        address indexed repayer,
        uint256 amount,
        bool useATokens
    );

    event Withdraw(
        address indexed reserve,
        address indexed user,
        address indexed to,
        uint256 amount
    );

    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
    );

    // ============ Setup ============

    function setUp() public {
        // Create test actors
        admin = makeAddr("admin");
        supplier = makeAddr("supplier");
        borrower = makeAddr("borrower");
        liquidator = makeAddr("liquidator");

        vm.startPrank(admin);

        // Deploy mock tokens
        gold = new MockERC20("Gold Token", "GOLD", GOLD_DECIMALS);
        usdc = new MockERC20("USD Coin", "USDC", USDC_DECIMALS);

        // Deploy oracle
        oracle = new MockPriceOracle();
        oracle.setPrice(address(gold), GOLD_PRICE);
        oracle.setPrice(address(usdc), 1e8); // $1

        // Deploy pool
        pool = new CommodityLendingPool();

        // Deploy receipt and debt tokens
        cGold = new CommodityReceiptToken(
            address(pool),
            address(gold),
            "Commodity Gold",
            "cGOLD"
        );

        dUSDC = new CommodityDebtToken(
            ICommodityLendingPool(address(pool)),
            "Debt USDC",
            "dUSDC",
            USDC_DECIMALS
        );
        dUSDC.initialize(address(usdc));

        // Initialize reserves
        _initializeGoldReserve();
        _initializeUSDCReserve();

        vm.stopPrank();

        // Fund test accounts
        _fundTestAccounts();
    }

    // ============ Helper Functions ============

    function _initializeGoldReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(LTV);
        config.setLiquidationThreshold(LIQUIDATION_THRESHOLD);
        config.setLiquidationBonus(LIQUIDATION_BONUS);
        config.setDecimals(uint8(GOLD_DECIMALS));
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(false); // Gold is collateral only

        pool.initReserve(
            address(gold),
            address(cGold),
            address(0), // No stable debt token
            address(0), // No variable debt token for collateral
            address(0)  // No interest rate strategy for collateral
        );

        pool.setConfiguration(address(gold), config);
    }

    function _initializeUSDCReserve() internal {
        DataTypes.CommodityConfigurationMap memory config;
        
        config.setLtv(0); // USDC is not used as collateral
        config.setLiquidationThreshold(0);
        config.setLiquidationBonus(0);
        config.setDecimals(uint8(USDC_DECIMALS));
        config.setActive(true);
        config.setFrozen(false);
        config.setBorrowingEnabled(true); // USDC is borrowable

        pool.initReserve(
            address(usdc),
            address(0), // No receipt token for borrowable asset
            address(0), // No stable debt token (using variable only)
            address(dUSDC),
            address(0)  // No interest rate strategy for now
        );

        pool.setConfiguration(address(usdc), config);
    }

    function _fundTestAccounts() internal {
        // Give gold to supplier and borrower
        gold.mint(supplier, 100e18); // 100 oz gold
        gold.mint(borrower, 50e18);  // 50 oz gold
        gold.mint(liquidator, 10e18); // 10 oz gold

        // Give USDC to supplier (for liquidity) and liquidator
        usdc.mint(supplier, 500_000e6); // $500K USDC
        usdc.mint(liquidator, 100_000e6); // $100K USDC
    }

    function _supplyGold(address user, uint256 amount) internal {
        vm.startPrank(user);
        gold.approve(address(pool), amount);
        pool.supply(address(gold), amount, user, 0);
        vm.stopPrank();
    }

    function _supplyUSDC(address user, uint256 amount) internal {
        vm.startPrank(user);
        usdc.approve(address(pool), amount);
        pool.supply(address(usdc), amount, user, 0);
        vm.stopPrank();
    }

    function _borrow(address user, uint256 amount) internal {
        vm.prank(user);
        pool.borrow(
            address(usdc),
            amount,
            uint256(DataTypes.InterestRateMode.VARIABLE),
            0,
            user
        );
    }

    // ============ Test 1: Supply ============

    function test_Supply_Success() public {
        uint256 supplyAmount = 10e18; // 10 oz gold

        vm.startPrank(supplier);
        gold.approve(address(pool), supplyAmount);

        vm.expectEmit(true, true, true, true);
        emit Supply(address(gold), supplier, supplier, supplyAmount, 0);

        pool.supply(address(gold), supplyAmount, supplier, 0);
        vm.stopPrank();

        // Verify balances
        assertEq(cGold.balanceOf(supplier), supplyAmount, "cGold balance incorrect");
        assertEq(gold.balanceOf(address(cGold)), supplyAmount, "Pool gold balance incorrect");
    }

    function testFail_Supply_InsufficientBalance() public {
        uint256 supplyAmount = 1000e18; // More than user has

        vm.startPrank(supplier);
        gold.approve(address(pool), supplyAmount);
        pool.supply(address(gold), supplyAmount, supplier, 0);
        vm.stopPrank();
    }

    function testFail_Supply_ReserveNotActive() public {
        // Deactivate reserve
        vm.prank(admin);
        DataTypes.CommodityConfigurationMap memory config;
        config.setActive(false);
        pool.setConfiguration(address(gold), config);

        // Try to supply
        vm.startPrank(supplier);
        gold.approve(address(pool), 10e18);
        pool.supply(address(gold), 10e18, supplier, 0);
        vm.stopPrank();
    }

    // ============ Test 2: Borrow ============

    function test_Borrow_Success() public {
        // Setup: Supply gold as collateral
        _supplyGold(borrower, 10e18); // 10 oz gold = $20,000

        // Setup: Supply USDC liquidity
        _supplyUSDC(supplier, 100_000e6); // $100K USDC

        // Borrow amount: 80% LTV on $20K = $16K
        uint256 borrowAmount = 16_000e6; // $16,000 USDC

        vm.expectEmit(true, true, true, true);
        emit Borrow(
            address(usdc),
            borrower,
            borrower,
            borrowAmount,
            DataTypes.InterestRateMode.VARIABLE,
            0, // borrowRate (will be calculated)
            0
        );

        _borrow(borrower, borrowAmount);

        // Verify balances
        assertEq(usdc.balanceOf(borrower), borrowAmount, "USDC balance incorrect");
        assertEq(dUSDC.balanceOf(borrower), borrowAmount, "Debt token balance incorrect");
    }

    function testFail_Borrow_InsufficientCollateral() public {
        // Supply small collateral
        _supplyGold(borrower, 1e18); // 1 oz gold = $2,000

        // Supply USDC liquidity
        _supplyUSDC(supplier, 100_000e6);

        // Try to borrow more than LTV allows
        uint256 borrowAmount = 5_000e6; // $5,000 > $2,000 * 80%
        _borrow(borrower, borrowAmount);
    }

    function testFail_Borrow_NoCollateral() public {
        // Supply USDC liquidity
        _supplyUSDC(supplier, 100_000e6);

        // Try to borrow without collateral
        _borrow(borrower, 1000e6);
    }

    // ============ Test 3: Repay ============

    function test_Repay_Success() public {
        // Setup: Supply and borrow
        _supplyGold(borrower, 10e18);
        _supplyUSDC(supplier, 100_000e6);
        uint256 borrowAmount = 10_000e6; // $10K
        _borrow(borrower, borrowAmount);

        // Repay half
        uint256 repayAmount = 5_000e6;

        vm.startPrank(borrower);
        usdc.approve(address(pool), repayAmount);

        vm.expectEmit(true, true, true, true);
        emit Repay(address(usdc), borrower, borrower, repayAmount, false);

        pool.repay(address(usdc), repayAmount, uint256(DataTypes.InterestRateMode.VARIABLE), borrower);
        vm.stopPrank();

        // Verify debt reduced
        assertEq(dUSDC.balanceOf(borrower), borrowAmount - repayAmount, "Debt not reduced");
    }

    function test_Repay_Full() public {
        // Setup: Supply and borrow
        _supplyGold(borrower, 10e18);
        _supplyUSDC(supplier, 100_000e6);
        uint256 borrowAmount = 10_000e6;
        _borrow(borrower, borrowAmount);

        // Repay everything (use type(uint256).max)
        vm.startPrank(borrower);
        usdc.approve(address(pool), type(uint256).max);
        pool.repay(address(usdc), type(uint256).max, uint256(DataTypes.InterestRateMode.VARIABLE), borrower);
        vm.stopPrank();

        // Verify debt is zero
        assertEq(dUSDC.balanceOf(borrower), 0, "Debt not fully repaid");
    }

    // ============ Test 4: Withdraw ============

    function test_Withdraw_Success() public {
        // Supply gold
        uint256 supplyAmount = 10e18;
        _supplyGold(supplier, supplyAmount);

        // Withdraw half
        uint256 withdrawAmount = 5e18;

        vm.expectEmit(true, true, true, true);
        emit Withdraw(address(gold), supplier, supplier, withdrawAmount);

        vm.prank(supplier);
        pool.withdraw(address(gold), withdrawAmount, supplier);

        // Verify balances
        assertEq(cGold.balanceOf(supplier), supplyAmount - withdrawAmount, "cGold balance incorrect");
        assertEq(gold.balanceOf(supplier), 100e18 - supplyAmount + withdrawAmount, "Gold balance incorrect");
    }

    function testFail_Withdraw_WithActiveLoan() public {
        // Supply gold and borrow against it
        _supplyGold(borrower, 10e18);
        _supplyUSDC(supplier, 100_000e6);
        _borrow(borrower, 10_000e6);

        // Try to withdraw collateral while having active loan
        vm.prank(borrower);
        pool.withdraw(address(gold), 10e18, borrower);
    }

    // ============ Test 5: Liquidation ============

    function test_Liquidation_Success() public {
        // Setup: Borrower supplies gold and borrows USDC
        _supplyGold(borrower, 10e18); // $20,000 gold
        _supplyUSDC(supplier, 100_000e6);
        _borrow(borrower, 16_000e6); // $16,000 USDC (80% LTV)

        // Price crash: Gold drops 30%
        vm.prank(admin);
        oracle.setPrice(address(gold), 1400e8); // $1,400 per oz

        // Now: $14,000 collateral, $16,000 debt
        // HF = ($14,000 * 85%) / $16,000 = 0.74 (liquidatable!)

        // Liquidator liquidates
        uint256 debtToCover = 8_000e6; // Liquidate half

        vm.startPrank(liquidator);
        usdc.approve(address(pool), debtToCover);

        vm.expectEmit(true, true, true, true);
        emit LiquidationCall(
            address(gold),
            address(usdc),
            borrower,
            debtToCover,
            0, // liquidatedCollateralAmount (calculated by pool)
            liquidator,
            false
        );

        pool.liquidationCall(
            address(gold),
            address(usdc),
            borrower,
            debtToCover,
            false // Don't receive aToken
        );
        vm.stopPrank();

        // Verify liquidator received gold with bonus
        // debtToCover = $8,000
        // collateralValue = $8,000 * 1.05 = $8,400
        // goldAmount = $8,400 / $1,400 = 6 oz
        assertGt(gold.balanceOf(liquidator), 10e18, "Liquidator should receive gold");
    }

    function testFail_Liquidation_HealthyPosition() public {
        // Setup: Healthy position
        _supplyGold(borrower, 10e18);
        _supplyUSDC(supplier, 100_000e6);
        _borrow(borrower, 10_000e6); // Only 50% LTV

        // Try to liquidate healthy position
        vm.startPrank(liquidator);
        usdc.approve(address(pool), 5_000e6);
        pool.liquidationCall(address(gold), address(usdc), borrower, 5_000e6, false);
        vm.stopPrank();
    }

    // ============ Test 6: E-Mode ============

    function test_EMode_HigherLTV() public {
        // Configure E-Mode category for stablecoins
        vm.startPrank(admin);
        
        pool.configureEModeCategory(
            1,      // categoryId
            9700,   // ltv (97%)
            9800,   // liquidationThreshold (98%)
            200,    // liquidationBonus (2%)
            address(0), // priceSource
            "Stablecoins", // label
            type(uint128).max, // collateralBitmap (all assets allowed)
            type(uint128).max  // borrowableBitmap (all assets allowed)
        );

        vm.stopPrank();

        // User enters E-Mode
        vm.prank(borrower);
        pool.setUserEMode(1);

        // Verify user is in E-Mode
        assertEq(pool.getUserEMode(borrower), 1, "User not in E-Mode");
    }

    // ============ Test 7: Interest Accrual ============

    function test_InterestAccrual() public {
        // Setup: Supply and borrow
        _supplyGold(borrower, 10e18);
        _supplyUSDC(supplier, 100_000e6);
        uint256 borrowAmount = 10_000e6;
        _borrow(borrower, borrowAmount);

        // Record initial debt
        uint256 initialDebt = dUSDC.balanceOf(borrower);

        // Advance time by 1 year
        vm.warp(block.timestamp + 365 days);

        // Check debt has increased
        uint256 finalDebt = dUSDC.balanceOf(borrower);
        assertGt(finalDebt, initialDebt, "Interest not accrued");
    }

    // ============ Test 8: Health Factor ============
    // TODO: Implement getUserAccountData in CommodityLendingPool
    /*
    function test_HealthFactor_Calculation() public {
        // Setup: Supply and borrow
        _supplyGold(borrower, 10e18); // $20K gold
        _supplyUSDC(supplier, 100_000e6);
        _borrow(borrower, 10_000e6); // $10K USDC

        // Calculate expected HF
        // HF = ($20,000 * 85%) / $10,000 = 1.7

        (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            ,
            uint256 currentLiquidationThreshold,
            ,
            uint256 healthFactor
        ) = pool.getUserAccountData(borrower);

        console2.log("Health Factor:", healthFactor);
        assertGt(healthFactor, 1e18, "Health factor should be > 1");
    }
    */
}

// ============ Mock Contracts ============

contract MockERC20 is ERC20 {
    uint8 private _decimals;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        _decimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract MockPriceOracle {
    mapping(address => uint256) public prices;

    function setPrice(address asset, uint256 price) external {
        prices[asset] = price;
    }

    function getAssetPrice(address asset) external view returns (uint256) {
        return prices[asset];
    }
}
