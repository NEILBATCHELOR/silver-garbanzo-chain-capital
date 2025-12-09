// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {ICommodityLendingPool} from "./ICommodityLendingPool.sol";

/**
 * @title IInitializableAToken
 * @notice Interface for the initialize function on AToken (cToken for commodities)
 */
interface IInitializableAToken {
  /**
   * @dev Emitted when a cToken (commodity receipt token) is initialized
   * @param underlyingAsset The address of the underlying commodity asset
   * @param pool The address of the associated pool
   * @param treasury The address of the treasury
   * @param aTokenDecimals The decimals of the underlying
   * @param aTokenName The name of the cToken
   * @param aTokenSymbol The symbol of the cToken
   * @param params A set of encoded parameters for additional initialization
   */
  event Initialized(
    address indexed underlyingAsset,
    address indexed pool,
    address treasury,
    uint8 aTokenDecimals,
    string aTokenName,
    string aTokenSymbol,
    bytes params
  );

  /**
   * @notice Initializes the cToken
   * @param pool The pool contract that is initializing this contract
   * @param treasury The address of the treasury, receiving the fees on this cToken
   * @param underlyingAsset The address of the underlying commodity asset
   * @param aTokenDecimals The decimals of the cToken, same as the underlying asset's
   * @param aTokenName The name of the cToken
   * @param aTokenSymbol The symbol of the cToken
   * @param params A set of encoded parameters for additional initialization
   */
  function initialize(
    ICommodityLendingPool pool,
    address treasury,
    address underlyingAsset,
    uint8 aTokenDecimals,
    string calldata aTokenName,
    string calldata aTokenSymbol,
    bytes calldata params
  ) external;
}
