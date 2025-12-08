// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {MathUtils} from '../math/MathUtils.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';

/**
 * @title ReserveLogic library
 * @author Chain Capital
 * @notice Implements functions to update the state of the commodity reserves
 * @dev Based on Aave V3 ReserveLogic with commodity-specific adaptations
 */
library ReserveLogic {
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeCast for uint256;
  using SafeERC20 for IERC20;
  using ReserveLogic for DataTypes.CommodityReserveData;
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;

  /**
   * @dev Emitted when reserve data is updated
   * @param commodity The commodity address
   * @param liquidityRate The updated liquidity rate
   * @param stableBorrowRate The updated stable borrow rate
   * @param variableBorrowRate The updated variable borrow rate
   * @param liquidityIndex The updated liquidity index
   * @param variableBorrowIndex The updated variable borrow index
   */
  event CommodityDataUpdated(
    address indexed commodity,
    uint256 liquidityRate,
    uint256 stableBorrowRate,
    uint256 variableBorrowRate,
    uint256 liquidityIndex,
    uint256 variableBorrowIndex
  );

  /**
   * @notice Returns the ongoing normalized income for the commodity
   * @dev A value of 1e27 means there is no income. As time passes, income accrues
   * @param reserve The commodity reserve object
   * @return The normalized income, expressed in ray
   */
  function getNormalizedIncome(
    DataTypes.CommodityReserveData storage reserve
  ) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;

    // If index was updated in same block, no need to recalculate
    if (timestamp == uint40(block.timestamp)) {
      return reserve.liquidityIndex;
    } else {
      return
        MathUtils.calculateLinearInterest(reserve.currentLiquidityRate, timestamp).rayMul(
          reserve.liquidityIndex
        );
    }
  }

  /**
   * @notice Returns the ongoing normalized variable debt for the commodity
   * @dev A value of 1e27 means there is no debt. As time passes, debt accrues
   * @param reserve The commodity reserve object
   * @return The normalized variable debt, expressed in ray
   */
  function getNormalizedDebt(
    DataTypes.CommodityReserveData storage reserve
  ) internal view returns (uint256) {
    uint40 timestamp = reserve.lastUpdateTimestamp;

    // If index was updated in same block, no need to recalculate
    if (timestamp == uint40(block.timestamp)) {
      return reserve.variableBorrowIndex;
    } else {
      return
        MathUtils.calculateCompoundedInterest(reserve.currentVariableBorrowRate, timestamp).rayMul(
          reserve.variableBorrowIndex
        );
    }
  }

  /**
   * @notice Updates the liquidity cumulative index and the variable borrow index
   * @dev This is the main state update function
   * @param reserve The commodity reserve object
   * @param commodityCache The caching layer for the reserve data
   */
  function updateState(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.CommodityCache memory commodityCache
  ) internal {
    // If time didn't pass since last timestamp, skip update
    if (reserve.lastUpdateTimestamp == uint40(block.timestamp)) {
      return;
    }

    _updateIndexes(reserve, commodityCache);
    _accrueToTreasury(reserve, commodityCache);

    reserve.lastUpdateTimestamp = uint40(block.timestamp);
  }

  /**
   * @dev Struct to hold local variables for interest rate update
   */
  struct UpdateInterestRatesLocalVars {
    uint256 nextLiquidityRate;
    uint256 nextStableRate;
    uint256 nextVariableRate;
    uint256 totalVariableDebt;
  }

  /**
   * @notice Updates interest rates for a commodity reserve
   * @dev Calls the interest rate strategy to calculate new rates
   * @param reserve The commodity reserve to be updated
   * @param commodityCache The caching layer for the reserve data
   * @param commodityAddress The address of the commodity
   * @param liquidityAdded Amount supplied or repaid
   * @param liquidityTaken Amount withdrawn or borrowed
   */
  function updateInterestRates(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.CommodityCache memory commodityCache,
    address commodityAddress,
    uint256 liquidityAdded,
    uint256 liquidityTaken
  ) internal {
    UpdateInterestRatesLocalVars memory vars;

    vars.totalVariableDebt = commodityCache.nextScaledVariableDebt.rayMul(
      commodityCache.nextVariableBorrowIndex
    );

    (
      vars.nextLiquidityRate,
      vars.nextStableRate,
      vars.nextVariableRate
    ) = IReserveInterestRateStrategy(reserve.interestRateStrategyAddress).calculateInterestRates(
      DataTypes.CalculateInterestRatesParams({
        unbacked: reserve.unbacked,
        liquidityAdded: liquidityAdded,
        liquidityTaken: liquidityTaken,
        totalStableDebt: commodityCache.nextTotalStableDebt,
        totalVariableDebt: vars.totalVariableDebt,
        averageStableBorrowRate: commodityCache.nextAvgStableBorrowRate,
        reserveFactor: commodityCache.reserveFactor,
        commodity: commodityAddress,
        cToken: commodityCache.cTokenAddress
      })
    );

    reserve.currentLiquidityRate = vars.nextLiquidityRate.toUint128();
    reserve.currentStableBorrowRate = vars.nextStableRate.toUint128();
    reserve.currentVariableBorrowRate = vars.nextVariableRate.toUint128();

    emit CommodityDataUpdated(
      commodityAddress,
      vars.nextLiquidityRate,
      vars.nextStableRate,
      vars.nextVariableRate,
      commodityCache.nextLiquidityIndex,
      commodityCache.nextVariableBorrowIndex
    );
  }

  /**
   * @notice Accumulates flash loan fees to the reserve as instant income
   * @dev Spreads fees across all suppliers proportionally
   * @param reserve The commodity reserve object
   * @param totalLiquidity The total liquidity available
   * @param amount The fee amount to accumulate
   * @return The next liquidity index
   */
  function cumulateToLiquidityIndex(
    DataTypes.CommodityReserveData storage reserve,
    uint256 totalLiquidity,
    uint256 amount
  ) internal returns (uint256) {
    // Next liquidity index = ((amount / totalLiquidity) + 1) * liquidityIndex
    // Division done in ray for precision
    uint256 result = (amount.wadToRay().rayDiv(totalLiquidity.wadToRay()) + WadRayMath.RAY).rayMul(
      reserve.liquidityIndex
    );
    reserve.liquidityIndex = result.toUint128();
    return result;
  }

  /**
   * @notice Initializes a commodity reserve
   * @dev Sets initial indices to RAY (1e27) and stores token addresses
   * @param reserve The commodity reserve object
   * @param cTokenAddress The cToken (receipt token) address
   * @param stableDebtTokenAddress The stable debt token address
   * @param variableDebtTokenAddress The variable debt token address
   * @param interestRateStrategyAddress The interest rate strategy address
   */
  function init(
    DataTypes.CommodityReserveData storage reserve,
    address cTokenAddress,
    address stableDebtTokenAddress,
    address variableDebtTokenAddress,
    address interestRateStrategyAddress
  ) internal {
    require(reserve.cTokenAddress == address(0), Errors.RESERVE_ALREADY_INITIALIZED);

    reserve.liquidityIndex = uint128(WadRayMath.RAY);
    reserve.variableBorrowIndex = uint128(WadRayMath.RAY);
    reserve.cTokenAddress = cTokenAddress;
    reserve.stableDebtTokenAddress = stableDebtTokenAddress;
    reserve.variableDebtTokenAddress = variableDebtTokenAddress;
    reserve.interestRateStrategyAddress = interestRateStrategyAddress;
  }

  /**
   * @dev Struct to hold local variables for treasury accrual
   */
  struct AccrueToTreasuryLocalVars {
    uint256 prevTotalStableDebt;
    uint256 prevTotalVariableDebt;
    uint256 currTotalVariableDebt;
    uint256 cumulatedStableInterest;
    uint256 totalDebtAccrued;
    uint256 amountToMint;
  }

  /**
   * @notice Mints part of repaid interest to treasury as protocol fees
   * @dev Fee is a percentage of interest paid (reserve factor)
   * @param reserve The commodity reserve
   * @param commodityCache The caching layer
   */
  function _accrueToTreasury(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.CommodityCache memory commodityCache
  ) internal {
    AccrueToTreasuryLocalVars memory vars;

    if (commodityCache.reserveFactor == 0) {
      return;
    }

    // Calculate total variable debt at last interaction
    vars.prevTotalVariableDebt = commodityCache.currScaledVariableDebt.rayMul(
      commodityCache.currVariableBorrowIndex
    );

    // Calculate new total variable debt after interest accumulation
    vars.currTotalVariableDebt = commodityCache.currScaledVariableDebt.rayMul(
      commodityCache.nextVariableBorrowIndex
    );

    // Calculate stable debt until last timestamp
    vars.cumulatedStableInterest = MathUtils.calculateCompoundedInterest(
      commodityCache.currAvgStableBorrowRate,
      commodityCache.stableDebtLastUpdateTimestamp,
      commodityCache.commodityLastUpdateTimestamp
    );

    vars.prevTotalStableDebt = commodityCache.currPrincipalStableDebt.rayMul(
      vars.cumulatedStableInterest
    );

    // Total debt accrued = current debt - debt at last update
    vars.totalDebtAccrued =
      vars.currTotalVariableDebt +
      commodityCache.currTotalStableDebt -
      vars.prevTotalVariableDebt -
      vars.prevTotalStableDebt;

    vars.amountToMint = vars.totalDebtAccrued.percentMul(commodityCache.reserveFactor);

    if (vars.amountToMint != 0) {
      reserve.accruedToTreasury += vars
        .amountToMint
        .rayDiv(commodityCache.nextLiquidityIndex)
        .toUint128();
    }
  }

  /**
   * @notice Updates the reserve indices
   * @dev Updates liquidity index and variable borrow index
   * @param reserve The commodity reserve
   * @param commodityCache The cache layer
   */
  function _updateIndexes(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.CommodityCache memory commodityCache
  ) internal {
    // Update supply side if there is income being produced
    // Reserve factor 100% means no income (currentLiquidityRate == 0)
    if (commodityCache.currLiquidityRate != 0) {
      uint256 cumulatedLiquidityInterest = MathUtils.calculateLinearInterest(
        commodityCache.currLiquidityRate,
        commodityCache.commodityLastUpdateTimestamp
      );
      commodityCache.nextLiquidityIndex = cumulatedLiquidityInterest.rayMul(
        commodityCache.currLiquidityIndex
      );
      reserve.liquidityIndex = commodityCache.nextLiquidityIndex.toUint128();
    }

    // Update variable borrow index only if there is variable debt
    if (commodityCache.currScaledVariableDebt != 0) {
      uint256 cumulatedVariableBorrowInterest = MathUtils.calculateCompoundedInterest(
        commodityCache.currVariableBorrowRate,
        commodityCache.commodityLastUpdateTimestamp
      );
      commodityCache.nextVariableBorrowIndex = cumulatedVariableBorrowInterest.rayMul(
        commodityCache.currVariableBorrowIndex
      );
      reserve.variableBorrowIndex = commodityCache.nextVariableBorrowIndex.toUint128();
    }
  }

  /**
   * @notice Creates a cache object to avoid repeated storage reads
   * @dev Cache prevents multiple expensive storage reads during operations
   * @param reserve The commodity reserve
   * @return The cache object
   */
  function cache(
    DataTypes.CommodityReserveData storage reserve
  ) internal view returns (DataTypes.CommodityCache memory) {
    DataTypes.CommodityCache memory commodityCache;

    commodityCache.commodityConfiguration = reserve.configuration;
    commodityCache.reserveFactor = commodityCache.commodityConfiguration.getReserveFactor();
    commodityCache.currLiquidityIndex = commodityCache.nextLiquidityIndex = reserve.liquidityIndex;
    commodityCache.currVariableBorrowIndex = commodityCache.nextVariableBorrowIndex = reserve
      .variableBorrowIndex;
    commodityCache.currLiquidityRate = reserve.currentLiquidityRate;
    commodityCache.currVariableBorrowRate = reserve.currentVariableBorrowRate;

    commodityCache.cTokenAddress = reserve.cTokenAddress;
    commodityCache.stableDebtTokenAddress = reserve.stableDebtTokenAddress;
    commodityCache.variableDebtTokenAddress = reserve.variableDebtTokenAddress;

    commodityCache.commodityLastUpdateTimestamp = reserve.lastUpdateTimestamp;

    commodityCache.currScaledVariableDebt = commodityCache.nextScaledVariableDebt = IVariableDebtToken(
      commodityCache.variableDebtTokenAddress
    ).scaledTotalSupply();

    (
      commodityCache.currPrincipalStableDebt,
      commodityCache.currTotalStableDebt,
      commodityCache.currAvgStableBorrowRate,
      commodityCache.stableDebtLastUpdateTimestamp
    ) = IStableDebtToken(commodityCache.stableDebtTokenAddress).getSupplyData();

    // By default, actions don't affect debt balances
    // If action involves mint/burn of debt, cache needs updating
    commodityCache.nextTotalStableDebt = commodityCache.currTotalStableDebt;
    commodityCache.nextAvgStableBorrowRate = commodityCache.currAvgStableBorrowRate;

    return commodityCache;
  }
}

/**
 * @dev Interface for interest rate strategy
 */
interface IReserveInterestRateStrategy {
  function calculateInterestRates(
    DataTypes.CalculateInterestRatesParams memory params
  ) external view returns (uint256, uint256, uint256);
}

/**
 * @dev Interface for variable debt token
 */
interface IVariableDebtToken {
  function scaledTotalSupply() external view returns (uint256);
}

/**
 * @dev Interface for stable debt token
 */
interface IStableDebtToken {
  function getSupplyData() external view returns (uint256, uint256, uint256, uint40);
}
