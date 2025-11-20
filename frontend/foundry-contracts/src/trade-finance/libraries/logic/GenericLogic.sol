// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from '../types/DataTypes.sol';

/**
 * @title GenericLogic library
 * @author Chain Capital
 * @notice Implements protocol-level logic for calculations and validations
 * @dev STUB - Full implementation coming next
 */
library GenericLogic {
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;

  /**
   * @notice Calculates the user account data across all the reserves
   * @dev STUB - Returns placeholder values for compilation
   * @return totalCollateralBase The total collateral of the user in the base currency
   * @return totalDebtBase The total debt of the user in the base currency
   * @return availableBorrowsBase The borrowing power left of the user in the base currency
   * @return currentLiquidationThreshold The liquidation threshold of the user
   * @return healthFactor The current health factor of the user
   * @return hasZeroLtvCollateral True if the user has zero LTV collateral
   */
  function calculateUserAccountData(
    mapping(address => DataTypes.CommodityReserveData) storage,
    mapping(uint256 => address) storage,
    mapping(uint8 => DataTypes.EModeCategory) storage,
    DataTypes.CalculateUserAccountDataParams memory
  )
    internal
    view
    returns (
      uint256 totalCollateralBase,
      uint256 totalDebtBase,
      uint256 availableBorrowsBase,
      uint256 currentLiquidationThreshold,
      uint256 healthFactor,
      bool hasZeroLtvCollateral
    )
  {
    // STUB: Return safe defaults for now
    return (0, 0, 0, 0, type(uint256).max, false);
  }

  /**
   * @notice Checks if a specific balance decrease is allowed
   * @dev STUB - Always returns true for now
   */
  function balanceDecreaseAllowed(
    address,
    address,
    uint256,
    mapping(address => DataTypes.CommodityReserveData) storage,
    DataTypes.UserConfigurationMap storage,
    mapping(uint256 => address) storage,
    uint256,
    address,
    uint8
  ) internal view returns (bool) {
    // STUB: Allow all balance decreases for now
    return true;
  }
}
