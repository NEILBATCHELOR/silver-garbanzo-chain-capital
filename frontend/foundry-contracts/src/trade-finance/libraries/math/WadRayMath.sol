// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WadRayMath library
 * @author Chain Capital
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

  /**
   * @notice Divides two ray numbers, rounding down (floor)
   * @dev Used for operations where protocol should never over-account
   * Example: Minting cTokens (user deposits) - round down so protocol never gives too many tokens
   * Formula: (a * RAY) / b
   * @param a Ray number (numerator)
   * @param b Ray number (denominator)
   * @return c The result of a / b, in ray, rounded down
   */
  function rayDivFloor(uint256 a, uint256 b) internal pure returns (uint256 c) {
    assembly {
      // Overflow check: Ensure a * RAY does not exceed uint256 max
      if or(iszero(b), iszero(iszero(gt(a, div(not(0), RAY))))) {
        revert(0, 0)
      }
      c := div(mul(a, RAY), b)
    }
  }

  /**
   * @notice Divides two ray numbers, rounding up (ceiling)
   * @dev Used for operations where protocol should never under-account
   * Example: Burning cTokens (user withdraws) - round up so user never withdraws too much
   * Example: Minting dTokens (borrowing) - round up so protocol never under-accounts debt
   * Formula: (a * RAY + b - 1) / b
   * @param a Ray number (numerator)
   * @param b Ray number (denominator)  
   * @return c The result of a / b, in ray, rounded up
   */
  function rayDivCeil(uint256 a, uint256 b) internal pure returns (uint256 c) {
    assembly {
      // Overflow check: Ensure a * RAY does not exceed uint256 max
      if or(iszero(b), iszero(iszero(gt(a, div(not(0), RAY))))) {
        revert(0, 0)
      }
      let scaled := mul(a, RAY)
      // Round up: add 1 if there's a remainder
      c := add(div(scaled, b), iszero(iszero(mod(scaled, b))))
    }
  }

  /**
   * @notice Multiplies two ray numbers, rounding down (floor)
   * @dev Used for operations where protocol should never over-account
   * Formula: (a * b) / RAY
   * @param a Ray number
   * @param b Ray number
   * @return c The result of a * b, in ray, rounded down
   */
  function rayMulFloor(uint256 a, uint256 b) internal pure returns (uint256 c) {
    assembly {
      // Overflow check: Ensure a * b does not exceed uint256 max
      if iszero(or(iszero(b), iszero(gt(a, div(not(0), b))))) {
        revert(0, 0)
      }
      c := div(mul(a, b), RAY)
    }
  }

  /**
   * @notice Multiplies two ray numbers, rounding up (ceiling)
   * @dev Used for operations where protocol should never under-account
   * Formula: (a * b + RAY - 1) / RAY
   * @param a Ray number
   * @param b Ray number
   * @return c The result of a * b, in ray, rounded up
   */
  function rayMulCeil(uint256 a, uint256 b) internal pure returns (uint256 c) {
    assembly {
      // Overflow check: Ensure a * b does not exceed uint256 max
      if iszero(or(iszero(b), iszero(gt(a, div(not(0), b))))) {
        revert(0, 0)
      }
      let product := mul(a, b)
      // Round up: add 1 if there's a remainder
      c := add(div(product, RAY), iszero(iszero(mod(product, RAY))))
    }
  }
}
