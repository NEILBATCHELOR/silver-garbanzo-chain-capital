// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PercentageMath library
 * @author Chain Capital
 * @notice Provides functions to perform percentage calculations
 * @dev Percentages are defined with 2 decimals of precision (10000 = 100.00%)
 * 
 * Example:
 * - 100.00% = 10000
 * - 50.00%  = 5000
 * - 1.50%   = 150
 * - 0.01%   = 1
 */
library PercentageMath {
  // CONSTANTS
  uint256 internal constant PERCENTAGE_FACTOR = 1e4; // 10000 basis points = 100%
  uint256 internal constant HALF_PERCENTAGE_FACTOR = 0.5e4; // 5000 = 50%
  
  /**
   * @notice Executes a percentage multiplication, rounding half up
   * @dev Formula: value * percentage / PERCENTAGE_FACTOR
   * @param value The value to multiply by the percentage
   * @param percentage The percentage to multiply (10000 = 100%)
   * @return result The result of the multiplication
   */
  function percentMul(uint256 value, uint256 percentage) internal pure returns (uint256 result) {
    // to avoid overflow: value <= (type(uint256).max - HALF_PERCENTAGE_FACTOR) / percentage
    assembly {
      if iszero(
        or(
          iszero(percentage),
          iszero(gt(value, div(sub(not(0), HALF_PERCENTAGE_FACTOR), percentage)))
        )
      ) {
        revert(0, 0)
      }
      
      result := div(
        add(mul(value, percentage), HALF_PERCENTAGE_FACTOR),
        PERCENTAGE_FACTOR
      )
    }
  }
  
  /**
   * @notice Executes a percentage division, rounding half up
   * @dev Formula: value * PERCENTAGE_FACTOR / percentage
   * @param value The value to divide
   * @param percentage The percentage to divide by (10000 = 100%)
   * @return result The result of the division
   */
  function percentDiv(uint256 value, uint256 percentage) internal pure returns (uint256 result) {
    // to avoid overflow: value <= (type(uint256).max - halfPercentage) / PERCENTAGE_FACTOR
    assembly {
      if or(
        iszero(percentage),
        iszero(iszero(gt(value, div(sub(not(0), div(percentage, 2)), PERCENTAGE_FACTOR))))
      ) {
        revert(0, 0)
      }
      
      result := div(
        add(mul(value, PERCENTAGE_FACTOR), div(percentage, 2)),
        percentage
      )
    }
  }
}
