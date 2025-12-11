// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.10;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVariableDebtToken} from "../../interfaces/IVariableDebtToken.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {ValidationLogic} from "./ValidationLogic.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {IsolationModeLogic} from "./IsolationModeLogic.sol";
import {ICommodityToken} from "../../tokens/CommodityReceiptToken.sol";

/**
 * @title BorrowLogic library
 * @notice Implements the base logic for all borrowing actions in commodity trade finance
 */
library BorrowLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.CommodityReserveData;
  using SafeERC20 for IERC20;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
  using SafeCast for uint256;

  event Borrow(
    address indexed reserve,
    address user,
    address indexed onBehalfOf,
    uint256 amount,
    DataTypes.InterestRateMode interestRateMode,
    uint256 borrowRate,
    uint16 indexed referralCode
  );
  
  event Repay(
    address indexed reserve,
    address indexed user,
    address indexed repayer,
    uint256 amount,
    bool useATokens
  );
  
  event IsolationModeTotalDebtUpdated(address indexed asset, uint256 totalDebt);
  event ReserveUsedAsCollateralDisabled(address indexed reserve, address indexed user);

  /**
   * @notice Implements the borrow feature for commodity-backed loans
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The user configuration mapping
   * @param params The borrow parameters
   */
  function executeBorrow(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteBorrowParams memory params
  ) external {
    DataTypes.CommodityReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();

    reserve.updateState(reserveCache);

    (
      bool isolationModeActive,
      address isolationModeCollateralAddress,
      uint256 isolationModeDebtCeiling
    ) = userConfig.getIsolationModeState(reservesData, reservesList);

    ValidationLogic.validateBorrow(
      reservesData,
      reservesList,
      eModeCategories,
      DataTypes.ValidateBorrowParams({
        reserveCache: reserveCache,
        userConfig: userConfig,
        asset: params.asset,
        userAddress: params.onBehalfOf,
        amount: params.amount,
        interestRateMode: params.interestRateMode,
        reservesCount: params.reservesCount,
        oracle: params.oracle,
        userEModeCategory: params.userEModeCategory,
        priceOracleSentinel: params.priceOracleSentinel,
        isolationModeActive: isolationModeActive,
        isolationModeCollateralAddress: isolationModeCollateralAddress,
        isolationModeDebtCeiling: isolationModeDebtCeiling
      })
    );

    // WEEK 2 ENHANCEMENT: Credit Delegation - Check borrow allowance if borrowing on behalf of another user
    if (params.user != params.onBehalfOf) {
      IVariableDebtToken debtToken = IVariableDebtToken(reserveCache.variableDebtTokenAddress);
      uint256 currentAllowance = debtToken.borrowAllowance(params.onBehalfOf, params.user);
      
      require(
        currentAllowance >= params.amount,
        "Insufficient credit delegation allowance"
      );
      
      // Decrease the allowance after successful borrow (done in mint function)
      // The debt token handles the allowance decrease internally
    }

    bool isFirstBorrowing;

    // GAS OPTIMIZATION: Cache variable debt token address to avoid multiple storage reads
    address variableDebtTokenAddress = reserveCache.variableDebtTokenAddress;
    (isFirstBorrowing, reserveCache.nextScaledVariableDebt) = IVariableDebtToken(
      variableDebtTokenAddress
    ).mint(params.user, params.onBehalfOf, params.amount, reserveCache.nextVariableBorrowIndex);

    if (isFirstBorrowing) {
      userConfig.setBorrowing(reserve.id, true);
    }

    if (isolationModeActive) {
      // GAS OPTIMIZATION: Use unchecked for safe arithmetic
      unchecked {
        uint256 nextIsolationModeTotalDebt = reservesData[isolationModeCollateralAddress]
          .isolationModeTotalDebt += (params.amount /
          10 **
            (reserveCache.commodityConfiguration.getDecimals() -
              ReserveConfiguration.DEBT_CEILING_DECIMALS)).toUint128();
        emit IsolationModeTotalDebtUpdated(
          isolationModeCollateralAddress,
          nextIsolationModeTotalDebt
        );
      }
    }

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      0,
      params.releaseUnderlying ? params.amount : 0
    );

    if (params.releaseUnderlying) {
      ICommodityToken(reserveCache.cTokenAddress).transferUnderlyingTo(params.user, params.amount);
    }

    emit Borrow(
      params.asset,
      params.user,
      params.onBehalfOf,
      params.amount,
      DataTypes.InterestRateMode.VARIABLE,
      reserve.currentVariableBorrowRate,
      params.referralCode
    );
  }

  /**
   * @notice Implements the repay feature for commodity-backed loans
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param userConfig The user configuration mapping
   * @param params The repay parameters
   * @return The actual amount being repaid
   */
  function executeRepay(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.ExecuteRepayParams memory params
  ) external returns (uint256) {
    DataTypes.CommodityReserveData storage reserve = reservesData[params.asset];
    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);

    uint256 variableDebt = IERC20(reserveCache.variableDebtTokenAddress).balanceOf(
      params.onBehalfOf
    );

    ValidationLogic.validateRepay(
      reserveCache,
      params.amount,
      params.interestRateMode,
      params.onBehalfOf,
      variableDebt
    );

    uint256 paybackAmount = variableDebt;

    // Allows repayment with commodity tokens without leaving dust from interest
    if (params.useATokens && params.amount == type(uint256).max) {
      params.amount = ICommodityToken(reserveCache.cTokenAddress).balanceOf(msg.sender);
    }

    if (params.amount < paybackAmount) {
      paybackAmount = params.amount;
    }

    reserveCache.nextScaledVariableDebt = IVariableDebtToken(reserveCache.variableDebtTokenAddress)
      .burn(params.onBehalfOf, paybackAmount, reserveCache.nextVariableBorrowIndex);

    reserve.updateInterestRatesAndVirtualBalance(
      reserveCache,
      params.asset,
      params.useATokens ? 0 : paybackAmount,
      0
    );

    if (variableDebt - paybackAmount == 0) {
      userConfig.setBorrowing(reserve.id, false);
    }

    IsolationModeLogic.updateIsolatedDebtIfIsolated(
      reservesData,
      reservesList,
      userConfig,
      reserveCache,
      paybackAmount
    );

    // Handle commodity token repayment
    if (params.useATokens) {
      ICommodityToken(reserveCache.cTokenAddress).burn(
        msg.sender,
        reserveCache.cTokenAddress,
        paybackAmount,
        reserveCache.nextLiquidityIndex
      );
      
      bool isCollateral = userConfig.isUsingAsCollateral(reserve.id);
      if (isCollateral && ICommodityToken(reserveCache.cTokenAddress).scaledBalanceOf(msg.sender) == 0) {
        userConfig.setUsingAsCollateral(reserve.id, false);
        emit ReserveUsedAsCollateralDisabled(params.asset, msg.sender);
      }
    } else {
      IERC20(params.asset).safeTransferFrom(msg.sender, reserveCache.cTokenAddress, paybackAmount);
      ICommodityToken(reserveCache.cTokenAddress).handleRepayment(
        msg.sender,
        params.onBehalfOf,
        paybackAmount
      );
    }

    emit Repay(params.asset, params.onBehalfOf, msg.sender, paybackAmount, params.useATokens);

    return paybackAmount;
  }
}
