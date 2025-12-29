// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";

// ============ Interfaces ============

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(
        uint amountIn,
        address[] calldata path
    ) external view returns (uint[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external returns (uint256 amountOut);
}

/**
 * @title DEXLiquidationAdapter
 * @notice Generic DEX integration for liquidation swaps
 * @dev Supports Uniswap V2/V3, Sushiswap, and similar AMMs
 * 
 * Key Features:
 * - Multi-DEX support (Uniswap, Sushiswap, etc.)
 * - Slippage protection
 * - Multi-hop swap paths
 * - Gas-optimized execution
 * - Flash loan integration
 */
contract DEXLiquidationAdapter is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using WadRayMath for uint256;
    
    // ============ Constants ============
    
    uint256 public constant MAX_SLIPPAGE_BPS = 500; // 5% max slippage
    uint256 public constant DEFAULT_DEADLINE_DELAY = 15 minutes;
    
    // ============ Immutable Variables ============
    
    ICommodityLendingPool public immutable POOL;
    IACLManager public immutable ACL_MANAGER;
    
    // ============ State Variables ============
    
    // Approved DEX routers
    mapping(address => bool) public approvedRouters;
    
    // Slippage tolerance per liquidator
    mapping(address => uint256) public customSlippage;
    
    // DEX type: 0 = UniswapV2, 1 = UniswapV3, 2 = Other
    mapping(address => uint8) public routerType;
    
    // ============ Structs ============
    
    struct SwapParams {
        address router;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        address[] path;
        uint24 fee; // For UniswapV3
    }
    
    struct LiquidationSwapParams {
        address user;
        address collateralAsset;
        address debtAsset;
        uint256 debtToCover;
        SwapParams swapParams;
    }
    
    // ============ Events ============
    
    event RouterApproved(address indexed router, bool approved, uint8 routerType);
    event SlippageUpdated(address indexed liquidator, uint256 slippageBps);
    event LiquidationSwapped(
        address indexed user,
        address indexed collateralAsset,
        address indexed debtAsset,
        uint256 collateralReceived,
        uint256 swappedAmount,
        uint256 profit
    );
    
    // ============ Errors ============
    
    error RouterNotApproved();
    error SlippageTooHigh();
    error SwapFailed();
    error InsufficientProfit();
    
    // ============ Constructor ============
    
    constructor(address pool, address aclManager) {
        POOL = ICommodityLendingPool(pool);
        ACL_MANAGER = IACLManager(aclManager);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Approve a DEX router
     */
    function approveRouter(
        address router,
        bool approved,
        uint8 _routerType
    ) external {
        require(ACL_MANAGER.isPoolAdmin(msg.sender), "Not admin");
        require(_routerType <= 2, "Invalid router type");
        
        approvedRouters[router] = approved;
        routerType[router] = _routerType;
        
        emit RouterApproved(router, approved, _routerType);
    }
    
    /**
     * @notice Set custom slippage for liquidator
     */
    function setCustomSlippage(uint256 slippageBps) external {
        require(slippageBps <= MAX_SLIPPAGE_BPS, "Slippage too high");
        customSlippage[msg.sender] = slippageBps;
        emit SlippageUpdated(msg.sender, slippageBps);
    }
    
    // ============ Liquidation Functions ============
    
    /**
     * @notice Execute liquidation with DEX swap
     */
    function liquidateWithSwap(
        LiquidationSwapParams calldata params
    ) external nonReentrant returns (uint256 profit) {
        if (!approvedRouters[params.swapParams.router]) revert RouterNotApproved();
        
        // Step 1: Execute liquidation
        uint256 collateralReceived = _executeLiquidation(
            params.user,
            params.collateralAsset,
            params.debtAsset,
            params.debtToCover
        );
        
        // Step 2: Swap collateral to debt asset (if different)
        uint256 swappedAmount;
        if (params.collateralAsset != params.debtAsset) {
            swappedAmount = _executeSwap(
                params.swapParams.router,
                params.collateralAsset,
                params.debtAsset,
                collateralReceived,
                params.swapParams.minAmountOut,
                params.swapParams.path,
                params.swapParams.fee
            );
        } else {
            swappedAmount = collateralReceived;
        }
        
        // Step 3: Calculate profit
        profit = swappedAmount > params.debtToCover ? 
            swappedAmount - params.debtToCover : 0;
        
        if (profit == 0) revert InsufficientProfit();
        
        // Step 4: Transfer profit to liquidator
        IERC20(params.debtAsset).safeTransfer(msg.sender, profit);
        
        emit LiquidationSwapped(
            params.user,
            params.collateralAsset,
            params.debtAsset,
            collateralReceived,
            swappedAmount,
            profit
        );
    }
    
    // ============ Internal Functions ============
    
    function _executeLiquidation(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) internal returns (uint256 collateralReceived) {
        // Approve pool to take debt tokens
        IERC20(debtAsset).approve(address(POOL), debtToCover);
        
        // Execute liquidation
        collateralReceived = POOL.liquidationCall(
            collateralAsset,
            debtAsset,
            user,
            debtToCover,
            false // Don't receive cToken
        );
    }
    
    function _executeSwap(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        uint8 _routerType = routerType[router];
        
        // Approve router
        IERC20(tokenIn).approve(router, amountIn);
        
        if (_routerType == 0) {
            // UniswapV2 style
            amountOut = _swapV2(router, amountIn, minAmountOut, path);
        } else if (_routerType == 1) {
            // UniswapV3 style
            amountOut = _swapV3(router, tokenIn, tokenOut, amountIn, minAmountOut, fee);
        } else {
            revert("Unsupported router type");
        }
        
        if (amountOut < minAmountOut) revert SwapFailed();
    }
    
    function _swapV2(
        address router,
        uint256 amountIn,
        uint256 minAmountOut,
        address[] memory path
    ) internal returns (uint256 amountOut) {
        uint[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + DEFAULT_DEADLINE_DELAY
        );
        
        amountOut = amounts[amounts.length - 1];
    }
    
    function _swapV3(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) internal returns (uint256 amountOut) {
        IUniswapV3Router.ExactInputSingleParams memory params = 
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp + DEFAULT_DEADLINE_DELAY,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            });
        
        amountOut = IUniswapV3Router(router).exactInputSingle(params);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get expected swap output for V2 router
     */
    function getExpectedSwapOutput(
        address router,
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256 amountOut) {
        if (routerType[router] == 0) {
            uint[] memory amounts = IUniswapV2Router(router).getAmountsOut(
                amountIn,
                path
            );
            amountOut = amounts[amounts.length - 1];
        }
    }
    
    /**
     * @notice Calculate minimum output with slippage
     */
    function calculateMinOutput(
        uint256 expectedOutput,
        address liquidator
    ) external view returns (uint256) {
        uint256 slippage = customSlippage[liquidator];
        if (slippage == 0) slippage = 100; // 1% default
        
        return expectedOutput * (10000 - slippage) / 10000;
    }
}
