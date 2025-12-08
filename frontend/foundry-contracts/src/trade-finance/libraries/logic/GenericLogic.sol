// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {EModeLogic} from './EModeLogic.sol';

/**
 * @title GenericLogic library
 * @author Chain Capital
 * @notice Implements protocol-level logic for calculations and validations
 * @dev Based on Aave V3 GenericLogic with commodity-specific adaptations
 */
library GenericLogic {
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;

  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;

  /**
   * @dev Internal struct to hold calculation variables
   * Avoids stack too deep errors
   */
  struct CalculateUserAccountDataVars {
    uint256 assetPrice;
    uint256 assetUnit;
    uint256 userBalanceInBaseCurrency;
    uint256 decimals;
    uint256 ltv;
    uint256 liquidationThreshold;
    uint256 i;
    uint256 healthFactor;
    uint256 totalCollateralInBaseCurrency;
    uint256 totalDebtInBaseCurrency;
    uint256 avgLtv;
    uint256 avgLiquidationThreshold;
    uint256 eModeAssetPrice;
    uint256 eModeLtv;
    uint256 eModeLiqThreshold;
    uint8 eModeAssetCategory;
    address currentReserveAddress;
    bool hasZeroLtvCollateral;
    bool isInEModeCategory;
  }

  /**
   * @notice Calculates the user account data across all the reserves
   * @dev Iterates through user's positions to calculate total collateral, debt, and health factor
   * @param reserves Mapping of commodity reserves
   * @param reservesList Array of commodity addresses
   * @param eModeCategories Mapping of E-Mode categories
   * @param params Calculation parameters including user config and oracle
   * @return totalCollateralBase The total collateral of the user in the base currency
   * @return totalDebtBase The total debt of the user in the base currency
   * @return avgLtv The average loan to value of the user
   * @return avgLiquidationThreshold The average liquidation threshold of the user
   * @return healthFactor The current health factor of the user
   * @return hasZeroLtvCollateral True if the user has zero LTV collateral
   */
  function calculateUserAccountData(
    mapping(address => DataTypes.CommodityReserveData) storage reserves,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.CalculateUserAccountDataParams memory params
  )
    internal
    view
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 avgLtv,
      uint256 avgLiquidationThreshold,
      uint256 healthFactor,
      bool hasZeroLtvCollateral
    )
  {
    // If user has no positions, return safe defaults
    if (params.userConfig.isEmpty()) {
      return (0, 0, 0, 0, type(uint256).max, false);
    }

    CalculateUserAccountDataVars memory vars;

    // If user is in E-Mode, get E-Mode parameters
    if (params.userEModeCategory != 0) {
      DataTypes.CommodityConfigurationMap memory emptyConfig;
      address priceSource;
      (vars.eModeLtv, vars.eModeLiqThreshold, , priceSource, vars.eModeAssetPrice) = EModeLogic
        .getEModeConfiguration(
          emptyConfig,
          params.userEModeCategory,
          params.userEModeCategory,
          eModeCategories
        );
    }

    // Iterate through all commodities
    while (vars.i < params.commoditiesCount) {
      // Skip if user is not using this commodity as collateral or borrowing it
      if (!params.userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      vars.currentReserveAddress = reservesList[vars.i];

      // Skip if commodity is not initialized
      if (vars.currentReserveAddress == address(0)) {
        unchecked {
          ++vars.i;
        }
        continue;
      }

      DataTypes.CommodityReserveData storage currentReserve = reserves[vars.currentReserveAddress];

      // Get commodity configuration parameters
      vars.ltv = currentReserve.configuration.getLtv();
      vars.liquidationThreshold = currentReserve.configuration.getLiquidationThreshold();
      vars.decimals = currentReserve.configuration.getDecimals();
      vars.eModeAssetCategory = uint8(currentReserve.configuration.getEModeCategory());

      unchecked {
        vars.assetUnit = 10 ** vars.decimals;
      }

      // Use E-Mode price if applicable, otherwise get oracle price
      vars.assetPrice = vars.eModeAssetPrice != 0 &&
        params.userEModeCategory == vars.eModeAssetCategory
        ? vars.eModeAssetPrice
        : _getAssetPrice(params.oracle, vars.currentReserveAddress);

      // Calculate collateral value if commodity is used as collateral
      if (vars.liquidationThreshold != 0 && params.userConfig.isUsingAsCollateral(vars.i)) {
        vars.userBalanceInBaseCurrency = _getUserBalanceInBaseCurrency(
          params.user,
          currentReserve,
          vars.assetPrice,
          vars.assetUnit
        );

        vars.totalCollateralInBaseCurrency += vars.userBalanceInBaseCurrency;

        vars.isInEModeCategory = EModeLogic.isInEModeCategory(
          params.userEModeCategory,
          vars.eModeAssetCategory
        );

        // Calculate weighted average LTV
        if (vars.ltv != 0) {
          vars.avgLtv +=
            vars.userBalanceInBaseCurrency *
            (vars.isInEModeCategory ? vars.eModeLtv : vars.ltv);
        } else {
          vars.hasZeroLtvCollateral = true;
        }

        // Calculate weighted average liquidation threshold
        vars.avgLiquidationThreshold +=
          vars.userBalanceInBaseCurrency *
          (vars.isInEModeCategory ? vars.eModeLiqThreshold : vars.liquidationThreshold);
      }

      // Calculate debt value if user is borrowing this commodity
      if (params.userConfig.isBorrowing(vars.i)) {
        vars.totalDebtInBaseCurrency += _getUserDebtInBaseCurrency(
          params.user,
          currentReserve,
          vars.assetPrice,
          vars.assetUnit
        );
      }

      unchecked {
        ++vars.i;
      }
    }

    // Calculate weighted averages
    unchecked {
      vars.avgLtv = vars.totalCollateralInBaseCurrency != 0
        ? vars.avgLtv / vars.totalCollateralInBaseCurrency
        : 0;
      vars.avgLiquidationThreshold = vars.totalCollateralInBaseCurrency != 0
        ? vars.avgLiquidationThreshold / vars.totalCollateralInBaseCurrency
        : 0;
    }

    // Calculate health factor
    // HF = (Total Collateral * Liquidation Threshold) / Total Debt
    // HF > 1 = Healthy, HF < 1 = Liquidatable
    vars.healthFactor = (vars.totalDebtInBaseCurrency == 0)
      ? type(uint256).max
      : (vars.totalCollateralInBaseCurrency.percentMul(vars.avgLiquidationThreshold)).wadDiv(
        vars.totalDebtInBaseCurrency
      );

    return (
      vars.totalCollateralInBaseCurrency,
      vars.totalDebtInBaseCurrency,
      vars.avgLtv,
      vars.avgLiquidationThreshold,
      vars.healthFactor,
      vars.hasZeroLtvCollateral
    );
  }

  /**
   * @notice Calculates the maximum amount that can be borrowed
   * @dev Available borrows = (Total Collateral * LTV) - Total Debt
   * @param totalCollateralInBaseCurrency The total collateral in the base currency
   * @param totalDebtInBaseCurrency The total debt in the base currency
   * @param ltv The average loan to value
   * @return The amount available to borrow in the base currency
   */
  function calculateAvailableBorrows(
    uint256 totalCollateralInBaseCurrency,
    uint256 totalDebtInBaseCurrency,
    uint256 ltv
  ) internal pure returns (uint256) {
    uint256 availableBorrowsInBaseCurrency = totalCollateralInBaseCurrency.percentMul(ltv);

    if (availableBorrowsInBaseCurrency < totalDebtInBaseCurrency) {
      return 0;
    }

    availableBorrowsInBaseCurrency = availableBorrowsInBaseCurrency - totalDebtInBaseCurrency;
    return availableBorrowsInBaseCurrency;
  }

  /**
   * @notice Checks if a specific balance decrease is allowed
   * @dev Ensures withdrawal/transfer doesn't violate collateral requirements
   * @param commodity The commodity address
   * @param user The user address
   * @param amount The amount to decrease
   * @param reserves The reserves mapping
   * @param userConfig The user configuration
   * @param reservesList The reserves list
   * @param eModeCategories The E-Mode categories mapping
   * @param reservesCount The reserves count
   * @param oracle The oracle address
   * @param userEModeCategory The user's E-Mode category
   * @return True if balance decrease is allowed
   */
  function balanceDecreaseAllowed(
    address commodity,
    address user,
    uint256 amount,
    mapping(address => DataTypes.CommodityReserveData) storage reserves,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    uint256 reservesCount,
    address oracle,
    uint8 userEModeCategory
  ) internal view returns (bool) {
    // If user is not using commodity as collateral, allow withdrawal
    if (!userConfig.isUsingAsCollateral(reserves[commodity].id)) {
      return true;
    }

    // If user has no debt, allow withdrawal
    if (!userConfig.isBorrowingAny()) {
      return true;
    }

    // Calculate health factor after withdrawal
    (uint256 totalCollateralInBaseCurrency, uint256 totalDebtInBaseCurrency, , uint256 avgLiquidationThreshold, , ) = calculateUserAccountData(
      reserves,
      reservesList,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: userConfig,
        commoditiesCount: reservesCount,
        user: user,
        oracle: oracle,
        userEModeCategory: userEModeCategory
      })
    );

    // If withdrawing all, need to ensure health factor remains above 1
    if (totalCollateralInBaseCurrency == 0 || totalDebtInBaseCurrency == 0) {
      return true;
    }

    // Calculate value of amount being withdrawn
    DataTypes.CommodityReserveData storage reserve = reserves[commodity];
    uint256 decimals = reserve.configuration.getDecimals();
    uint256 assetUnit = 10 ** decimals;
    uint256 assetPrice = _getAssetPrice(oracle, commodity);
    uint256 amountToDecreaseInBaseCurrency = (assetPrice * amount) / assetUnit;

    // New collateral after withdrawal
    uint256 collateralBalanceAfterDecrease = totalCollateralInBaseCurrency - amountToDecreaseInBaseCurrency;

    // If removing all collateral, not allowed if user has debt
    if (collateralBalanceAfterDecrease == 0) {
      return false;
    }

    // Calculate new health factor
    uint256 liquidationThresholdAfterDecrease = (
      (totalCollateralInBaseCurrency * avgLiquidationThreshold) -
      (amountToDecreaseInBaseCurrency * avgLiquidationThreshold)
    ) / collateralBalanceAfterDecrease;

    uint256 healthFactorAfterDecrease = (
      collateralBalanceAfterDecrease.percentMul(liquidationThresholdAfterDecrease)
    ).wadDiv(totalDebtInBaseCurrency);

    // Health factor must remain above 1
    return healthFactorAfterDecrease >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
  }

  /**
   * @notice Calculates total debt of the user in the base currency
   * @dev Fetches variable and stable debt token balances
   * @param user The address of the user
   * @param reserve The data of the reserve
   * @param assetPrice The price of the asset
   * @param assetUnit The value representing one full unit of the asset
   * @return The total debt of the user normalized to the base currency
   */
  function _getUserDebtInBaseCurrency(
    address user,
    DataTypes.CommodityReserveData storage reserve,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    // Fetch variable debt (scaled balance * normalized debt index)
    uint256 userTotalDebt = IScaledBalanceToken(reserve.variableDebtTokenAddress).scaledBalanceOf(
      user
    );
    if (userTotalDebt != 0) {
      userTotalDebt = userTotalDebt.rayMul(reserve.variableBorrowIndex);
    }

    // Add stable debt
    userTotalDebt = userTotalDebt + IERC20(reserve.stableDebtTokenAddress).balanceOf(user);

    // Convert to base currency
    userTotalDebt = assetPrice * userTotalDebt;

    unchecked {
      return userTotalDebt / assetUnit;
    }
  }

  /**
   * @notice Calculates total cToken balance of the user in the base currency
   * @dev Fetches scaled balance and multiplies by liquidity index
   * @param user The address of the user
   * @param reserve The data of the reserve
   * @param assetPrice The price of the asset
   * @param assetUnit The value representing one full unit of the asset
   * @return The total cToken balance of the user normalized to the base currency
   */
  function _getUserBalanceInBaseCurrency(
    address user,
    DataTypes.CommodityReserveData storage reserve,
    uint256 assetPrice,
    uint256 assetUnit
  ) private view returns (uint256) {
    uint256 normalizedIncome = reserve.liquidityIndex;
    uint256 balance = (
      IScaledBalanceToken(reserve.cTokenAddress).scaledBalanceOf(user).rayMul(normalizedIncome)
    ) * assetPrice;

    unchecked {
      return balance / assetUnit;
    }
  }

  /**
   * @notice Gets the asset price from the oracle
   * @dev Wrapper function for oracle calls
   * @param oracle The oracle address
   * @param commodity The commodity address
   * @return The asset price
   */
  function _getAssetPrice(
    address oracle,
    address commodity
  ) private view returns (uint256) {
    // Call oracle to get price
    // This is a simplified version - real implementation would call IPriceOracleGetter
    return IPriceOracleGetter(oracle).getAssetPrice(commodity);
  }
}

/**
 * @dev Interface for scaled balance tokens (cTokens and debt tokens)
 */
interface IScaledBalanceToken {
  function scaledBalanceOf(address user) external view returns (uint256);
}

/**
 * @dev Interface for price oracle getter
 */
interface IPriceOracleGetter {
  function getAssetPrice(address asset) external view returns (uint256);
}
