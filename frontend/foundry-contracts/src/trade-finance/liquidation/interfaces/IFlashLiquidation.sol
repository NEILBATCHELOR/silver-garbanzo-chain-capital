// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IFlashLiquidation
 * @notice Interface for flash loan assisted liquidation
 */
interface IFlashLiquidation {
    
    struct FlashLiquidationParams {
        address user;
        address collateralAsset;
        address debtAsset;
        uint256 debtToCover;
        bool useAMM;
        address[] swapPath;
        uint256 minProfit;
    }
    
    struct LiquidationExecution {
        address initiator;
        uint256 flashLoanAmount;
        uint256 collateralReceived;
        uint256 debtCovered;
        uint256 flashLoanFee;
        uint256 profit;
        uint256 timestamp;
    }
    
    /**
     * @notice Approve or revoke DEX router
     */
    function setRouterApproval(
        address router,
        bool approved
    ) external;
    
    /**
     * @notice Set custom minimum profit
     */
    function setCustomMinProfit(
        address liquidator,
        uint256 minProfit
    ) external;
    
    /**
     * @notice Execute flash liquidation
     */
    function flashLiquidate(
        FlashLiquidationParams calldata params
    ) external;
    
    /**
     * @notice Calculate expected profit
     */
    function calculateProfit(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (uint256 expectedProfit, uint256 collateralReceived);
    
    /**
     * @notice Check if liquidation is profitable
     */
    function isProfitable(
        address user,
        address collateralAsset,
        address debtAsset,
        uint256 debtToCover
    ) external view returns (bool);
    
    /**
     * @notice Get liquidation history
     */
    function getLiquidation(
        uint256 liquidationId
    ) external view returns (LiquidationExecution memory);
}
