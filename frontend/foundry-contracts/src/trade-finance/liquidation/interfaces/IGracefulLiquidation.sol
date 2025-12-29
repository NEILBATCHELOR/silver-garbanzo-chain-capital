// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IGracefulLiquidation
 * @notice Interface for graceful liquidation with margin calls
 */
interface IGracefulLiquidation {
    
    struct GracePeriodConfig {
        uint256 duration;
        uint256 warningThreshold;
        uint256 marginCallThreshold;
        uint256 maxPartialLiquidation;
        bool allowInsuranceClaim;
    }
    
    struct MarginCall {
        address user;
        uint256 startTime;
        uint256 endTime;
        uint256 initialHealthFactor;
        uint256 requiredCollateral;
        bool resolved;
        bool liquidated;
    }
    
    /**
     * @notice Configure grace period
     */
    function configureGracePeriod(
        bytes32 commodityType,
        uint256 duration,
        uint256 warningThreshold,
        uint256 marginCallThreshold,
        uint256 maxPartialLiquidation,
        bool allowInsuranceClaim
    ) external;
    
    /**
     * @notice Issue margin call
     */
    function issueMarginCall(
        address user,
        bytes32 commodityType
    ) external;
    
    /**
     * @notice Resolve margin call by adding collateral
     */
    function resolveMarginCall(
        address collateralAsset,
        uint256 amount
    ) external;
    
    /**
     * @notice Execute partial liquidation
     */
    function executePartialLiquidation(
        address user,
        address collateralAsset,
        address debtAsset,
        bytes32 commodityType
    ) external returns (uint256 collateralLiquidated, uint256 debtCovered);
    
    /**
     * @notice Issue warning
     */
    function issueWarning(
        address user,
        uint256 healthFactor
    ) external;
    
    /**
     * @notice Initiate insurance claim
     */
    function initiateInsuranceClaim(
        bytes32 commodityType,
        uint256 claimAmount
    ) external;
    
    /**
     * @notice Check if user has active margin call
     */
    function hasActiveMarginCall(address user) external view returns (bool);
    
    /**
     * @notice Get margin call details
     */
    function getMarginCall(address user) external view returns (MarginCall memory);
    
    /**
     * @notice Get time remaining in grace period
     */
    function getTimeRemaining(address user) external view returns (uint256);
}
