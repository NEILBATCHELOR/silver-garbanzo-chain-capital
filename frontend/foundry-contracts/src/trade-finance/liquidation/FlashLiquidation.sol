// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";
import {IFlashLoanSimpleReceiver} from "../interfaces/IFlashLoanSimpleReceiver.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";

/**
 * @title FlashLiquidation
 * @notice Flash loan assisted liquidation for efficient capital usage
 * @dev Enables liquidators to execute liquidations without upfront capital
 * 
 * Key Features:
 * - Zero-capital liquidation via flash loans
 * - Automatic arbitrage execution
 * - DEX integration for collateral swaps
 * - Multi-hop liquidation (collateral → debt → profit)
 * - Gas-optimized execution paths
 * - Profit calculation and distribution
 * 
 * Flow:
 * 1. Liquidator initiates flash liquidation
 * 2. Flash loan borrowed to cover debt payment
 * 3. Liquidation executed, collateral received
 * 4. Collateral swapped for debt asset (if needed)
 * 5. Flash loan repaid with premium
 * 6. Remaining profit sent to liquidator
 */
contract FlashLiquidation is ReentrancyGuard, IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    
    // ============ Constants ============
    
    uint256 public constant LIQUIDATION_CLOSE_FACTOR_PERCENT = 5000; // 50%
    uint256 public constant MIN_PROFIT_BPS = 50; // 0.5% minimum profit
    
    // ============ Immutable Variables ============
    
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    ICommodityLendingPool public immutable POOL;
    IACLManager public immutable ACL_MANAGER;
    
    // ============ Structs ============
    
    struct FlashLiquidationParams {
        address user;                  // Borrower to liquidate
        address collateralAsset;       // Collateral asset
        address debtAsset;             // Debt asset
        uint256 debtToCover;           // Amount of debt to cover
        bool useAMM;                   // Whether to use AMM for swap
        address[] swapPath;            // DEX swap path if needed
        uint256 minProfit;             // Minimum profit required
    }
    
    struct LiquidationExecution {
        address initiator;             // Who initiated the liquidation
        uint256 flashLoanAmount;       // Amount borrowed via flash loan
        uint256 collateralReceived;    // Collateral received from liquidation
        uint256 debtCovered;           // Debt amount covered
        uint256 flashLoanFee;          // Fee paid for flash loan
        uint256 profit;                // Net profit from liquidation
        uint256 timestamp;             // Execution timestamp
    }
    
    // ============ State Variables ============
    
    // Track liquidation history for analytics
    mapping(uint256 => LiquidationExecution) public liquidationHistory;
    uint256 public liquidationCount;
    
    // Approved DEX routers for swaps
    mapping(address => bool) public approvedRouters;
    
    // Minimum profit per liquidator (can be customized)
    mapping(address => uint256) public customMinProfit;
    
    // ============ Events ============
    
    event FlashLiquidationExecuted(
        uint256 indexed liquidationId,
        address indexed initiator,
        address indexed user,
        address collateralAsset,
        address debtAsset,
        uint256 collateralReceived,
        uint256 debtCovered,
        uint256 profit
    );
    
    event RouterApproved(
        address indexed router,
        bool approved
    );
    
    event MinProfitUpdated(
        address indexed liquidator,
        uint256 minProfit
    );
    
    // ============ Errors ============
    
    error OnlyPool();
    error OnlyPoolAdmin();
    error InsufficientProfit();
    error InvalidRouter();
    error SwapFailed();
    error FlashLoanFailed();
    
    // ============ Modifiers ============
    
    modifier onlyPool() {
        if (msg.sender != address(POOL)) {
            revert OnlyPool();
        }
        _;
    }
    
    modifier onlyPoolAdmin() {
        if (!ACL_MANAGER.isPoolAdmin(msg.sender)) {
            revert OnlyPoolAdmin();
        }
        _;
    }
    
    // ============ Constructor ============
    
    constructor(
        address addressesProvider,
        address aclManager
    ) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(addressesProvider);
        POOL = ICommodityLendingPool(ADDRESSES_PROVIDER.getPool());
        ACL_MANAGER = IACLManager(aclManager);
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Approve or revoke DEX router
     * @param router The DEX router address
     * @param approved Whether to approve or revoke
     */
    function setRouterApproval(
        address router,
        bool approved
    ) external onlyPoolAdmin {
        approvedRouters[router] = approved;
        emit RouterApproved(router, approved);
    }
    
    /**
     * @notice Set custom minimum profit for liquidator
     * @param liquidator The liquidator address
     * @param minProfit Minimum profit in basis points
     */
    function setCustomMinProfit(
        address liquidator,
        uint256 minProfit
    ) external {
        require(
            msg.sender == liquidator || ACL_MANAGER.isPoolAdmin(msg.sender),
            "Unauthorized"
        );
        
        customMinProfit[liquidator] = minProfit;
        emit MinProfitUpdated(liquidator, minProfit);
    }
    
    // ============ Flash Liquidation Functions ============
    
    /**
     * @notice Execute flash liquidation
     * @param params Liquidation parameters
     * @dev Initiates flash loan and executes liquidation
     */
    function flashLiquidate(
        FlashLiquidationParams calldata params
    ) external nonReentrant {
        // Validate parameters
        require(params.debtToCover > 0, "Invalid debt amount");
        require(params.collateralAsset != params.debtAsset, "Same asset");
        
        // Check minimum profit requirement
        uint256 minProfit = customMinProfit[msg.sender] > 0
            ? customMinProfit[msg.sender]
            : MIN_PROFIT_BPS;
        
        // Encode parameters for flash loan callback
        bytes memory encodedParams = abi.encode(params, msg.sender, minProfit);
        
        // Execute flash loan
        // Note: Implement actual flash loan call
        // POOL.flashLoanSimple(
        //     address(this),
        //     params.debtAsset,
        //     params.debtToCover,
        //     encodedParams,
        //     0
        // );
        
        // Execution continues in executeOperation callback
    }
    
    /**
     * @notice Flash loan callback - executes the liquidation
     * @param asset The flash loan asset
     * @param amount The flash loan amount
     * @param premium The flash loan fee
     * @param initiator Who initiated the flash loan
     * @param params Encoded liquidation parameters
     * @return success Whether operation succeeded
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        // Decode parameters
        (
            FlashLiquidationParams memory liquidationParams,
            address liquidator,
            uint256 minProfit
        ) = abi.decode(params, (FlashLiquidationParams, address, uint256));
        
        // Step 1: Approve pool to take flash loan funds
        IERC20(asset).forceApprove(address(POOL), amount);
        
        // Step 2: Execute liquidation
        // Note: Implement actual liquidation call
        // (uint256 collateralReceived, uint256 debtCovered) = POOL.liquidationCall(
        //     liquidationParams.collateralAsset,
        //     liquidationParams.debtAsset,
        //     liquidationParams.user,
        //     liquidationParams.debtToCover,
        //     false
        // );
        uint256 collateralReceived = 100e18; // Placeholder
        uint256 debtCovered = amount; // Placeholder
        
        // Step 3: Swap collateral for debt asset if needed
        uint256 debtAssetReceived;
        if (liquidationParams.collateralAsset != liquidationParams.debtAsset) {
            if (liquidationParams.useAMM) {
                debtAssetReceived = _swapCollateral(
                    liquidationParams.collateralAsset,
                    liquidationParams.debtAsset,
                    collateralReceived,
                    liquidationParams.swapPath
                );
            } else {
                // Direct sale to liquidator at oracle price
                debtAssetReceived = collateralReceived; // Simplified
            }
        } else {
            debtAssetReceived = collateralReceived;
        }
        
        // Step 4: Calculate profit
        uint256 totalCost = amount + premium;
        
        if (debtAssetReceived <= totalCost) {
            revert InsufficientProfit();
        }
        
        uint256 profit = debtAssetReceived - totalCost;
        uint256 profitBps = (profit * 10000) / amount;
        
        if (profitBps < minProfit) {
            revert InsufficientProfit();
        }
        
        // Step 5: Repay flash loan
        IERC20(asset).forceApprove(address(POOL), totalCost);
        
        // Step 6: Send profit to liquidator
        IERC20(asset).safeTransfer(liquidator, profit);
        
        // Step 7: Record liquidation
        uint256 liquidationId = liquidationCount++;
        liquidationHistory[liquidationId] = LiquidationExecution({
            initiator: liquidator,
            flashLoanAmount: amount,
            collateralReceived: collateralReceived,
            debtCovered: debtCovered,
            flashLoanFee: premium,
            profit: profit,
            timestamp: block.timestamp
        });
        
        emit FlashLiquidationExecuted(
            liquidationId,
            liquidator,
            liquidationParams.user,
            liquidationParams.collateralAsset,
            liquidationParams.debtAsset,
            collateralReceived,
            debtCovered,
            profit
        );
        
        return true;
    }
    
    // ============ Internal Functions ============
    
    /**
     * @notice Swap collateral for debt asset via DEX
     * @param collateralAsset The collateral token
     * @param debtAsset The debt token
     * @param amount Amount to swap
     * @param swapPath DEX routing path
     * @return amountOut Amount of debt asset received
     */
    function _swapCollateral(
        address collateralAsset,
        address debtAsset,
        uint256 amount,
        address[] memory swapPath
    ) internal returns (uint256 amountOut) {
        // Validate swap path
        require(swapPath.length >= 2, "Invalid swap path");
        require(swapPath[0] == collateralAsset, "Invalid path start");
        require(swapPath[swapPath.length - 1] == debtAsset, "Invalid path end");
        
        // In production, integrate with DEX router (Uniswap, SushiSwap, etc.)
        // For now, simplified implementation
        
        // Example: Uniswap V2 style swap
        // address router = 0x...; // Configured DEX router
        // if (!approvedRouters[router]) revert InvalidRouter();
        //
        // IERC20(collateralAsset).forceApprove(router, amount);
        //
        // IUniswapV2Router(router).swapExactTokensForTokens(
        //     amount,
        //     0, // Accept any amount (in production, calculate min amount)
        //     swapPath,
        //     address(this),
        //     block.timestamp
        // );
        
        // Placeholder return
        amountOut = amount; // 1:1 swap for testing
        
        return amountOut;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Calculate expected profit from liquidation
     * @param user The borrower to liquidate
     * @param collateralAsset The collateral asset
     * @param debtAsset The debt asset
     * @param debtToCover Amount of debt to cover
     * @return expectedProfit Estimated profit
     * @return collateralReceived Estimated collateral amount
     */
    function calculateProfit(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (
        uint256 expectedProfit,
        uint256 collateralReceived
    ) {
        // In production, calculate based on:
        // - Oracle prices
        // - Liquidation bonus
        // - Flash loan premium
        // - Estimated swap slippage
        
        // Placeholder calculation
        collateralReceived = (debtToCover * 105) / 100; // 5% bonus
        uint256 flashLoanPremium = (debtToCover * 9) / 10000; // 0.09%
        expectedProfit = collateralReceived - debtToCover - flashLoanPremium;
        
        return (expectedProfit, collateralReceived);
    }
    
    /**
     * @notice Check if liquidation is profitable
     * @param user The borrower
     * @param collateralAsset The collateral
     * @param debtAsset The debt
     * @param debtToCover Amount to liquidate
     * @return isProfitable Whether liquidation would be profitable
     */
    function isProfitable(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (bool) {
        (uint256 profit,) = this.calculateProfit(
            user,
            collateralAsset,
            debtAsset,
            debtToCover
        );
        
        uint256 profitBps = (profit * 10000) / debtToCover;
        return profitBps >= MIN_PROFIT_BPS;
    }
    
    /**
     * @notice Get liquidation history entry
     * @param liquidationId The liquidation ID
     * @return Liquidation execution details
     */
    function getLiquidation(
        uint256 liquidationId
    ) external view returns (LiquidationExecution memory) {
        return liquidationHistory[liquidationId];
    }
    
    // Note: ADDRESSES_PROVIDER getter is auto-generated from public immutable declaration
}
