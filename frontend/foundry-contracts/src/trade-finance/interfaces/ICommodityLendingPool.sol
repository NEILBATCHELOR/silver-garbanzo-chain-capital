// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from "../libraries/types/DataTypes.sol";

/**
 * @title ICommodityLendingPool
 * @notice Interface for the Commodity Lending Pool contract
 */
interface ICommodityLendingPool {
    /**
     * @notice Returns the normalized variable debt for a reserve
     * @param asset The address of the underlying asset
     * @return The normalized variable debt
     */
    function getReserveNormalizedVariableDebt(address asset) external view returns (uint256);

    /**
     * @notice Returns the normalized income for a reserve
     * @param asset The address of the underlying asset
     * @return The normalized income
     */
    function getReserveNormalizedIncome(address asset) external view returns (uint256);

    /**
     * @notice Returns the configuration of a reserve
     * @param asset The address of the underlying asset
     * @return The configuration map
     */
    function getConfiguration(address asset) external view returns (DataTypes.CommodityConfigurationMap memory);

    /**
     * @notice Sets the configuration of a reserve
     * @param asset The address of the underlying asset
     * @param configuration The new configuration
     */
    function setConfiguration(address asset, DataTypes.CommodityConfigurationMap memory configuration) external;
    
    /**
     * @notice Returns the user account data across all reserves
     * @param user The address of the user
     * @return totalCollateralValue The total collateral value in base currency
     * @return totalDebtValue The total debt value in base currency
     * @return availableBorrowsValue The borrowing power available in base currency
     * @return currentLiquidationThreshold The weighted average liquidation threshold
     * @return ltv The weighted average loan to value
     * @return healthFactor The current health factor
     */
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralValue,
            uint256 totalDebtValue,
            uint256 availableBorrowsValue,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
    
    /**
     * @notice Function to liquidate a position if its Health Factor drops below 1
     * @param collateralAsset The address of the collateral asset
     * @param debtAsset The address of the debt asset
     * @param user The address of the borrower getting liquidated
     * @param debtToCover The debt amount to cover
     * @param receivecToken True if the liquidator wants to receive cTokens, false otherwise
     * @return The actual collateral amount liquidated
     */
    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receivecToken
    ) external returns (uint256);
    
    /**
     * @notice Returns the list of reserves a user has interacted with
     * @param user The address of the user
     * @return The list of reserve addresses
     */
    function getUserReserves(address user) external view returns (address[] memory);
    
    /**
     * @notice Returns the state and configuration data of a user for a specific reserve
     * @param asset The address of the reserve asset
     * @param user The address of the user
     * @return currentCTokenBalance The current cToken balance
     * @return currentStableDebt The current stable debt
     * @return currentVariableDebt The current variable debt
     * @return principalStableDebt The principal stable debt
     * @return scaledVariableDebt The scaled variable debt
     * @return stableBorrowRate The stable borrow rate
     * @return liquidityRate The liquidity rate
     * @return stableRateLastUpdated Timestamp of last stable rate update
     * @return usageAsCollateralEnabled Whether the asset is used as collateral
     */
    function getUserReserveData(address asset, address user)
        external
        view
        returns (
            uint256 currentCTokenBalance,
            uint256 currentStableDebt,
            uint256 currentVariableDebt,
            uint256 principalStableDebt,
            uint256 scaledVariableDebt,
            uint256 stableBorrowRate,
            uint256 liquidityRate,
            uint40 stableRateLastUpdated,
            bool usageAsCollateralEnabled
        );
    
    /**
     * @notice Returns the configuration data of a reserve
     * @param asset The address of the reserve asset
     * @return ltv The loan to value
     * @return liquidationThreshold The liquidation threshold
     * @return decimals The decimals of the reserve asset
     * @return reserveFactor The reserve factor
     * @return usageAsCollateralEnabled Whether usage as collateral is enabled
     * @return borrowingEnabled Whether borrowing is enabled
     * @return stableBorrowRateEnabled Whether stable borrow rate is enabled
     * @return liquidationBonus The liquidation bonus (position 8)
     * @return isActive Whether the reserve is active
     */
    function getReserveData(address asset)
        external
        view
        returns (
            uint256 ltv,
            uint256 liquidationThreshold,
            uint256 decimals,
            uint256 reserveFactor,
            bool usageAsCollateralEnabled,
            bool borrowingEnabled,
            bool stableBorrowRateEnabled,
            uint256 liquidationBonus,
            bool isActive
        );
}
