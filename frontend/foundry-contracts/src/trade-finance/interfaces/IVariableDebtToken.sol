// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {IScaledBalanceToken} from "./IScaledBalanceToken.sol";
import {IInitializableDebtToken} from "./IInitializableDebtToken.sol";

/**
 * @title IVariableDebtToken
 * @notice Defines the basic interface for a variable debt token.
 */
interface IVariableDebtToken is IScaledBalanceToken, IInitializableDebtToken {
  /**
   * @notice Emitted when borrow allowance is delegated
   * @param fromUser The address delegating the borrowing power
   * @param toUser The address receiving the delegated borrowing power
   * @param asset The address of the underlying asset
   * @param amount The amount of allowance delegated
   */
  event BorrowAllowanceDelegated(
    address indexed fromUser,
    address indexed toUser,
    address indexed asset,
    uint256 amount
  );

  /**
   * @notice Mints debt token to the `onBehalfOf` address
   * @param user The address receiving the borrowed underlying, being the delegatee in case
   * of credit delegate, or same as `onBehalfOf` otherwise
   * @param onBehalfOf The address receiving the debt tokens
   * @param amount The amount of debt being minted
   * @param index The variable debt index of the reserve
   * @return True if the previous balance of the user is 0, false otherwise
   * @return The scaled total debt of the reserve
   */
  function mint(
    address user,
    address onBehalfOf,
    uint256 amount,
    uint256 index
  ) external returns (bool, uint256);

  /**
   * @notice Burns user variable debt
   * @dev In some instances, a burn transaction will emit a mint event
   * if the amount to burn is less than the interest that the user accrued
   * @param from The address from which the debt will be burned
   * @param amount The amount getting burned
   * @param index The variable debt index of the reserve
   * @return The scaled total debt of the reserve
   */
  function burn(address from, uint256 amount, uint256 index) external returns (uint256);

  /**
   * @notice Returns the borrow allowance of the user
   * @param fromUser The user delegating the borrowing power
   * @param toUser The user receiving the delegated borrowing power
   * @return The borrow allowance
   */
  function borrowAllowance(address fromUser, address toUser) external view returns (uint256);

  /**
   * @notice Approves delegation of borrowing power
   * @param delegatee The address to delegate borrowing power to
   * @param amount The amount of borrowing power to delegate
   */
  function approveDelegation(address delegatee, uint256 amount) external;

  /**
   * @notice Returns the address of the underlying asset of this debtToken
   * @return The address of the underlying asset
   */
  function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
