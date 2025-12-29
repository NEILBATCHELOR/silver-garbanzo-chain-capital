// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILiquidationDataProvider
 * @notice Interface for liquidation data provider
 */
interface ILiquidationDataProvider {
    
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
    
    function isPositionLiquidatable(address user) external view returns (bool);
    
    function getUserPositionData(address user) 
        external 
        view 
        returns (UserPositionData memory);
    
    function calculateLiquidationProfit(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (uint256 estimatedProfit);
    
    function getLiquidatablePosition(address user) 
        external 
        view 
        returns (LiquidatablePosition memory);
    
    function batchCheckLiquidatable(address[] calldata users) 
        external 
        view 
        returns (LiquidatablePosition[] memory);
    
    function getLiquidationMetrics(address[] calldata users) 
        external 
        view 
        returns (LiquidationMetrics memory);
}
