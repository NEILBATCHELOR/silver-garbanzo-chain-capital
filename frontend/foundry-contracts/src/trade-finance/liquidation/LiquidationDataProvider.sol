// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommodityLendingPool} from "../interfaces/ICommodityLendingPool.sol";
import {IPriceOracleGetter} from "../interfaces/IPriceOracleGetter.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";

/**
 * @title LiquidationDataProvider
 * @notice Pre-computes and tracks liquidatable positions for efficient liquidator monitoring
 * @dev Off-chain indexers can query this to identify liquidation opportunities
 * 
 * Key Features:
 * - Real-time health factor calculations
 * - Batch position analysis
 * - Liquidation profitability estimation
 * - Gas-optimized view functions
 * - Historical liquidation data
 */
contract LiquidationDataProvider {
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    
    // ============ Structs ============
    
    struct LiquidatablePosition {
        address user;
        address collateralAsset;
        address debtAsset;
        uint256 collateralAmount;
        uint256 debtAmount;
        uint256 healthFactor;
        uint256 liquidationBonus;
        uint256 estimatedProfit;
        bool isLiquidatable;
    }
    
    struct UserPositionData {
        uint256 totalCollateralValue;
        uint256 totalDebtValue;
        uint256 healthFactor;
        uint256 ltv;
        uint256 liquidationThreshold;
        address[] collateralAssets;
        address[] debtAssets;
        uint256[] collateralAmounts;
        uint256[] debtAmounts;
    }
    
    struct LiquidationMetrics {
        uint256 totalLiquidatablePositions;
        uint256 totalCollateralAtRisk;
        uint256 totalDebtAtRisk;
        uint256 averageHealthFactor;
        uint256 timestamp;
    }
    
    // ============ Immutable Variables ============
    
    ICommodityLendingPool public immutable POOL;
    IPriceOracleGetter public immutable PRICE_ORACLE;
    
    // ============ Constants ============
    
    uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;
    uint256 public constant CLOSE_FACTOR_HF_THRESHOLD = 0.95e18;
    uint256 public constant MAX_LIQUIDATABLE_POSITIONS = 100;
    
    // ============ Constructor ============
    
    constructor(address pool, address priceOracle) {
        POOL = ICommodityLendingPool(pool);
        PRICE_ORACLE = IPriceOracleGetter(priceOracle);
    }
    
    // ============ Public View Functions ============
    
    /**
     * @notice Check if a position is liquidatable
     */
    function isPositionLiquidatable(address user) external view returns (bool) {
        (
            uint256 totalCollateralValue,
            uint256 totalDebtValue,
            ,
            ,
            ,
            uint256 healthFactor
        ) = POOL.getUserAccountData(user);
        
        return healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
    }
    
    /**
     * @notice Get detailed position data for a user
     */
    function getUserPositionData(address user) 
        external 
        view 
        returns (UserPositionData memory) 
    {
        (
            uint256 totalCollateralValue,
            uint256 totalDebtValue,
            uint256 availableBorrowsValue,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        ) = POOL.getUserAccountData(user);
        
        // Get user reserves
        address[] memory reserves = POOL.getUserReserves(user);
        uint256 collateralCount = 0;
        uint256 debtCount = 0;
        
        // Count collateral and debt positions
        for (uint256 i = 0; i < reserves.length; i++) {
            (
                uint256 currentCTokenBalance,
                ,
                uint256 currentDebtBalance,
                ,
                ,
                ,
                ,
                ,
            ) = POOL.getUserReserveData(reserves[i], user);
            
            if (currentCTokenBalance > 0) collateralCount++;
            if (currentDebtBalance > 0) debtCount++;
        }
        
        // Populate arrays
        address[] memory collateralAssets = new address[](collateralCount);
        address[] memory debtAssets = new address[](debtCount);
        uint256[] memory collateralAmounts = new uint256[](collateralCount);
        uint256[] memory debtAmounts = new uint256[](debtCount);
        
        uint256 cIdx = 0;
        uint256 dIdx = 0;
        
        for (uint256 i = 0; i < reserves.length; i++) {
            (
                uint256 currentCTokenBalance,
                ,
                uint256 currentDebtBalance,
                ,
                ,
                ,
                ,
                ,
            ) = POOL.getUserReserveData(reserves[i], user);
            
            if (currentCTokenBalance > 0) {
                collateralAssets[cIdx] = reserves[i];
                collateralAmounts[cIdx] = currentCTokenBalance;
                cIdx++;
            }
            
            if (currentDebtBalance > 0) {
                debtAssets[dIdx] = reserves[i];
                debtAmounts[dIdx] = currentDebtBalance;
                dIdx++;
            }
        }
        
        return UserPositionData({
            totalCollateralValue: totalCollateralValue,
            totalDebtValue: totalDebtValue,
            healthFactor: healthFactor,
            ltv: ltv,
            liquidationThreshold: currentLiquidationThreshold,
            collateralAssets: collateralAssets,
            debtAssets: debtAssets,
            collateralAmounts: collateralAmounts,
            debtAmounts: debtAmounts
        });
    }
    
    /**
     * @notice Calculate liquidation profitability for a position
     */
    function calculateLiquidationProfit(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (uint256 estimatedProfit) {
        // Get collateral and debt prices
        uint256 collateralPrice = PRICE_ORACLE.getAssetPrice(collateralAsset);
        uint256 debtPrice = PRICE_ORACLE.getAssetPrice(debtAsset);
        
        // Get liquidation bonus
        (, , , , , , , uint256 liquidationBonus, ) = 
            POOL.getReserveData(collateralAsset);
        
        // Calculate collateral to receive (with bonus)
        uint256 collateralAmount = (debtToCover * debtPrice * (10000 + liquidationBonus)) / 
            (collateralPrice * 10000);
        
        uint256 collateralValue = collateralAmount * collateralPrice;
        uint256 debtValue = debtToCover * debtPrice;
        
        // Estimated profit = collateral value - debt value - fees
        if (collateralValue > debtValue) {
            uint256 grossProfit = collateralValue - debtValue;
            // Assume 0.3% total transaction costs
            uint256 estimatedCosts = (grossProfit * 30) / 10000;
            estimatedProfit = grossProfit > estimatedCosts ? 
                grossProfit - estimatedCosts : 0;
        }
    }
    
    /**
     * @notice Get liquidatable position details
     */
    function getLiquidatablePosition(address user) 
        external 
        view 
        returns (LiquidatablePosition memory) 
    {
        UserPositionData memory userData = this.getUserPositionData(user);
        
        if (userData.healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
            return LiquidatablePosition({
                user: user,
                collateralAsset: address(0),
                debtAsset: address(0),
                collateralAmount: 0,
                debtAmount: 0,
                healthFactor: userData.healthFactor,
                liquidationBonus: 0,
                estimatedProfit: 0,
                isLiquidatable: false
            });
        }
        
        // Find best liquidation opportunity
        uint256 maxProfit = 0;
        address bestCollateral;
        address bestDebt;
        uint256 bestDebtAmount;
        uint256 bestCollateralAmount;
        uint256 bestBonus;
        
        for (uint256 i = 0; i < userData.collateralAssets.length; i++) {
            for (uint256 j = 0; j < userData.debtAssets.length; j++) {
                uint256 debtToCover = userData.debtAmounts[j];
                
                uint256 profit = this.calculateLiquidationProfit(
                    user,
                    userData.collateralAssets[i],
                    userData.debtAssets[j],
                    debtToCover
                );
                
                if (profit > maxProfit) {
                    maxProfit = profit;
                    bestCollateral = userData.collateralAssets[i];
                    bestDebt = userData.debtAssets[j];
                    bestDebtAmount = debtToCover;
                    bestCollateralAmount = userData.collateralAmounts[i];
                    (, , , , , , , bestBonus, ) = POOL.getReserveData(bestCollateral);
                }
            }
        }
        
        return LiquidatablePosition({
            user: user,
            collateralAsset: bestCollateral,
            debtAsset: bestDebt,
            collateralAmount: bestCollateralAmount,
            debtAmount: bestDebtAmount,
            healthFactor: userData.healthFactor,
            liquidationBonus: bestBonus,
            estimatedProfit: maxProfit,
            isLiquidatable: true
        });
    }
    
    /**
     * @notice Batch check multiple users for liquidation
     */
    function batchCheckLiquidatable(address[] calldata users) 
        external 
        view 
        returns (LiquidatablePosition[] memory) 
    {
        uint256 liquidatableCount = 0;
        
        // First pass: count liquidatable positions
        for (uint256 i = 0; i < users.length; i++) {
            (, , , , , uint256 healthFactor) = POOL.getUserAccountData(users[i]);
            if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
                liquidatableCount++;
            }
        }
        
        // Create result array
        LiquidatablePosition[] memory positions = 
            new LiquidatablePosition[](liquidatableCount);
        
        uint256 idx = 0;
        for (uint256 i = 0; i < users.length && idx < liquidatableCount; i++) {
            (, , , , , uint256 healthFactor) = POOL.getUserAccountData(users[i]);
            if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
                positions[idx] = this.getLiquidatablePosition(users[i]);
                idx++;
            }
        }
        
        return positions;
    }
    
    /**
     * @notice Get system-wide liquidation metrics
     */
    function getLiquidationMetrics(address[] calldata users) 
        external 
        view 
        returns (LiquidationMetrics memory) 
    {
        uint256 liquidatablePositions = 0;
        uint256 totalCollateralAtRisk = 0;
        uint256 totalDebtAtRisk = 0;
        uint256 healthFactorSum = 0;
        
        for (uint256 i = 0; i < users.length; i++) {
            (
                uint256 totalCollateralValue,
                uint256 totalDebtValue,
                ,
                ,
                ,
                uint256 healthFactor
            ) = POOL.getUserAccountData(users[i]);
            
            if (healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD) {
                liquidatablePositions++;
                totalCollateralAtRisk += totalCollateralValue;
                totalDebtAtRisk += totalDebtValue;
            }
            
            healthFactorSum += healthFactor;
        }
        
        return LiquidationMetrics({
            totalLiquidatablePositions: liquidatablePositions,
            totalCollateralAtRisk: totalCollateralAtRisk,
            totalDebtAtRisk: totalDebtAtRisk,
            averageHealthFactor: users.length > 0 ? healthFactorSum / users.length : 0,
            timestamp: block.timestamp
        });
    }
}
