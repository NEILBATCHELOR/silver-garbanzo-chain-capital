// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title ReserveLogic library
 * @author Chain Capital
 * @notice Implements functions to update the state of the reserves
 * @dev STUB - Full implementation coming next
 */
library ReserveLogic {
  /**
   * @notice Updates the liquidity cumulative index and the variable borrow index
   * @dev STUB - Does nothing for now
   * @param self The reserve object
   */
  function updateState(
    DataTypes.CommodityReserveData storage self
  ) internal {
    // STUB: Update logic will be implemented
  }

  /**
   * @notice Updates interest rates for a reserve after a liquidity event
   * @dev STUB - Does nothing for now
   * @param self The reserve object
   * @param liquidityAdded Amount of liquidity added
   * @param liquidityTaken Amount of liquidity taken
   */
  function updateInterestRates(
    DataTypes.CommodityReserveData storage self,
    address commodity,
    address cToken,
    uint256 liquidityAdded,
    uint256 liquidityTaken
  ) internal {
    // STUB: Interest rate update logic will be implemented
    // This will calculate and update:
    // - liquidityRate (supply APY)
    // - variableBorrowRate
    // - stableBorrowRate (if enabled)
  }

  /**
   * @notice Accumulates a predefined amount of asset to the reserve as a fixed, instantaneous income
   * @dev STUB - Does nothing for now
   * @param self The reserve object
   * @param totalLiquidity The total liquidity available in the reserve
   * @param amount The amount to accumulate
   * @return The next liquidity index of the reserve
   */
  function cumulateToLiquidityIndex(
    DataTypes.CommodityReserveData storage self,
    uint256 totalLiquidity,
    uint256 amount
  ) internal returns (uint256) {
    // STUB: Return current index for now
    return self.liquidityIndex;
  }

  /**
   * @notice Initializes a reserve
   * @dev STUB - Does nothing for now
   * @param self The reserve object
   * @param cTokenAddress The address of the overlying ctoken contract
   * @param stableDebtTokenAddress The address of the overlying stable debt token contract
   * @param variableDebtTokenAddress The address of the overlying variable debt token contract
   * @param interestRateStrategyAddress The address of the interest rate strategy contract
   */
  function init(
    DataTypes.CommodityReserveData storage self,
    address cTokenAddress,
    address stableDebtTokenAddress,
    address variableDebtTokenAddress,
    address interestRateStrategyAddress
  ) internal {
    // STUB: Initialization logic will be implemented
    self.cTokenAddress = cTokenAddress;
    self.stableDebtTokenAddress = stableDebtTokenAddress;
    self.variableDebtTokenAddress = variableDebtTokenAddress;
    self.interestRateStrategyAddress = interestRateStrategyAddress;
  }
}
