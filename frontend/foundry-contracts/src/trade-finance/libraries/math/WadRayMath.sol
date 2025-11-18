// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WadRayMath library
 * @author Aave
 * @notice Provides functions for fixed-point arithmetic with 18 and 27 decimal precision
 * @dev Provides mul and div function for wads (decimal numbers with 18 digits of precision) and rays (decimal numbers with 27 digits of precision)
 * 
 * Operations are rounded. For instance:
 * wad * wad = wad (rounded down)
 * ray * ray = ray (rounded down)
 */
library WadRayMath {
  // CONSTANTS
  uint256 internal constant WAD = 1e18;
  uint256 internal constant HALF_WAD = 0.5e18;
  
  uint256 internal constant RAY = 1e27;
  uint256 internal constant HALF_RAY = 0.5e27;
  
  uint256 internal constant WAD_RAY_RATIO = 1e9;
  
  /**
   * @notice Multiplies two wad numbers, rounding half up
   * @dev Formula: (a * b + HALF_WAD) / WAD
   * @param a Wad number
   * @param b Wad number
   * @return c The result of a * b, in wad
   */
  function wadMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - HALF_WAD) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_WAD), b))))) {
        revert(0, 0)
      }

      c := div(add(mul(a, b), HALF_WAD), WAD)
    }
  }
  
  /**
   * @notice Divides two wad numbers, rounding half up
   * @dev Formula: (a * WAD + b/2) / b
   * @param a Wad number
   * @param b Wad number
   * @return c The result of a / b, in wad
   */
  function wadDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / WAD
    assembly {
      if or(
        iszero(b),
        iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), WAD))))
      ) {
        revert(0, 0)
      }
      
      c := div(add(mul(a, WAD), div(b, 2)), b)
    }
  }
  
  /**
   * @notice Multiplies two ray numbers, rounding half up
   * @dev Formula: (a * b + HALF_RAY) / RAY
   * @param a Ray number
   * @param b Ray number
   * @return c The result of a * b, in ray
   */
  function rayMul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - HALF_RAY) / b
    assembly {
      if iszero(or(iszero(b), iszero(gt(a, div(sub(not(0), HALF_RAY), b))))) {
        revert(0, 0)
      }
      
      c := div(add(mul(a, b), HALF_RAY), RAY)
    }
  }
  
  /**
   * @notice Divides two ray numbers, rounding half up
   * @dev Formula: (a * RAY + b/2) / b
   * @param a Ray number
   * @param b Ray number
   * @return c The result of a / b, in ray
   */
  function rayDiv(uint256 a, uint256 b) internal pure returns (uint256 c) {
    // to avoid overflow, a <= (type(uint256).max - halfB) / RAY
    assembly {
      if or(
        iszero(b),
        iszero(iszero(gt(a, div(sub(not(0), div(b, 2)), RAY))))
      ) {
        revert(0, 0)
      }
      
      c := div(add(mul(a, RAY), div(b, 2)), b)
    }
  }
  
  /**
   * @notice Converts a ray number to a wad number, rounding half up
   * @dev 1 WAD = 1e18, 1 RAY = 1e27, so 1 RAY = 1e9 WAD
   * Formula: (ray + WAD_RAY_RATIO/2) / WAD_RAY_RATIO
   * @param a Ray number
   * @return b Wad number
   */
  function rayToWad(uint256 a) internal pure returns (uint256 b) {
    assembly {
      b := div(a, WAD_RAY_RATIO)
      let remainder := mod(a, WAD_RAY_RATIO)
      if iszero(lt(remainder, div(WAD_RAY_RATIO, 2))) {
        b := add(b, 1)
      }
    }
  }
  
  /**
   * @notice Converts a wad number to a ray number
   * @dev 1 WAD = 1e18, 1 RAY = 1e27, so 1 WAD = 1e9 RAY (no rounding needed)
   * Formula: wad * WAD_RAY_RATIO
   * @param a Wad number
   * @return b Ray number
   */
  function wadToRay(uint256 a) internal pure returns (uint256 b) {
    // Possible overflow if a > type(uint256).max / WAD_RAY_RATIO
    assembly {
      b := mul(a, WAD_RAY_RATIO)
      
      if iszero(eq(div(b, WAD_RAY_RATIO), a)) {
        revert(0, 0)
      }
    }
  }
}
