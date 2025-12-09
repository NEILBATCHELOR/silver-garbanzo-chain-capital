// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.10;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";
import {EModeConfiguration} from "../configuration/EModeConfiguration.sol";
import {Errors} from "../helpers/Errors.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {PercentageMath} from "../math/PercentageMath.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {GenericLogic} from "./GenericLogic.sol";

// Commodity-specific imports
import {ICommodityOracle} from "../../interfaces/ICommodityOracle.sol";
import {IPriceOracleSentinel} from "../../interfaces/IPriceOracleSentinel.sol";
import {IPoolAddressesProvider} from "../../interfaces/IPoolAddressesProvider.sol";

/**
 * @title ValidationLogic library
 * @author Chain Capital (adapted for Chain Capital)
 * @notice Implements functions to validate the different actions of the protocol
 */
library ValidationLogic {
  using ReserveLogic for DataTypes.CommodityReserveData;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeCast for uint256;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;
  using Address for address;

  // Factor to apply to "only-variable-debt" liquidity rate to get threshold for rebalancing, expressed in bps
  // A value of 0.9e4 results in 90%
  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 0.9e4;

  // Minimum health factor allowed under any circumstance
  // A value of 0.95e18 results in 0.95
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95e18;

  /**
   * @dev Minimum health factor to consider a user position healthy
   * A value of 1e18 results in 1
   */
  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1e18;

  /**
   * @dev Role identifier for the role allowed to supply isolated reserves as collateral
   */
  bytes32 public constant ISOLATED_COLLATERAL_SUPPLIER_ROLE =
    keccak256('ISOLATED_COLLATERAL_SUPPLIER');

  /**
   * @notice Validates a supply action.
   * @param reserveCache The cached data of the reserve
   * @param amount The amount to be supplied
   */
  function validateSupply(
    DataTypes.ReserveCache memory reserveCache,
    DataTypes.CommodityReserveData storage reserve,
    uint256 amount,
    address onBehalfOf
  ) internal view {
    require(amount != 0, Errors.INVALID_AMOUNT);

    (bool isActive, bool isFrozen, , , bool isPaused) = reserveCache.commodityConfiguration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    require(!isFrozen, Errors.COMMODITY_FROZEN);
    require(onBehalfOf != reserveCache.cTokenAddress, Errors.SUPPLY_TO_ATOKEN);

    uint256 supplyCap = reserveCache.commodityConfiguration.getSupplyCap();
    require(
      supplyCap == 0 ||
        (IERC20(reserveCache.cTokenAddress).totalSupply() + amount) <=
        supplyCap * (10 ** reserveCache.commodityConfiguration.getDecimals()),
      Errors.SUPPLY_CAP_EXCEEDED
    );
  }

  /**
   * @notice Validates a withdraw action.
   * @param reserveCache The cached data of the reserve
   * @param amount The amount to be withdrawn
   * @param userBalance The balance of the user
   */
  function validateWithdraw(
    DataTypes.ReserveCache memory reserveCache,
    uint256 amount,
    uint256 userBalance
  ) internal pure {
    require(amount != 0, Errors.INVALID_AMOUNT);
    require(amount <= userBalance, Errors.NOT_ENOUGH_AVAILABLE_USER_BALANCE);

    (bool isActive, , , , bool isPaused) = reserveCache.commodityConfiguration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates a borrow action.
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param params Additional validation parameters
   */
  function validateBorrow(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.ValidateBorrowParams memory params
  ) internal view {
    require(params.amount != 0, Errors.INVALID_AMOUNT);

    // Local variables for validation
    bool isActive;
    bool isFrozen;
    bool isPaused;
    bool borrowingEnabled;
    uint256 reserveDecimals;
    uint256 borrowCap;
    uint256 assetUnit;
    uint256 totalSupplyVariableDebt;
    uint256 totalDebt;
    uint256 userCollateralInBaseCurrency;
    uint256 userDebtInBaseCurrency;
    uint256 currentLtv;
    uint256 healthFactor;
    uint256 amountInBaseCurrency;

    (isActive, isFrozen, , , isPaused) = 
      params.reserveCache.commodityConfiguration.getFlags();

    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    require(!isFrozen, Errors.COMMODITY_FROZEN);
    
    borrowingEnabled = params.reserveCache.commodityConfiguration.getBorrowingEnabled();
    require(borrowingEnabled, Errors.BORROWING_NOT_ENABLED);

    require(
      params.priceOracleSentinel == address(0) ||
        IPriceOracleSentinel(params.priceOracleSentinel).isBorrowingAllowed(),
      Errors.PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    // Validate interest rate mode
    require(
      params.interestRateMode == DataTypes.InterestRateMode.VARIABLE,
      Errors.INVALID_INTEREST_RATE_MODE_SELECTED
    );

    reserveDecimals = params.reserveCache.commodityConfiguration.getDecimals();
    borrowCap = params.reserveCache.commodityConfiguration.getBorrowCap();
    unchecked {
      assetUnit = 10 ** reserveDecimals;
    }

    // Check borrow cap
    if (borrowCap != 0) {
      totalSupplyVariableDebt = params.reserveCache.currScaledVariableDebt;
      totalDebt = totalSupplyVariableDebt + params.amount;

      unchecked {
        require(totalDebt <= borrowCap * assetUnit, Errors.BORROW_CAP_EXCEEDED);
      }
    }

    // Isolation mode checks
    if (params.isolationModeActive) {
      require(
        params.reserveCache.commodityConfiguration.getBorrowableInIsolation(),
        Errors.ASSET_NOT_BORROWABLE_IN_ISOLATION
      );

      require(
        reservesData[params.isolationModeCollateralAddress].isolationModeTotalDebt +
          (params.amount /
            10 ** (reserveDecimals - ReserveConfiguration.DEBT_CEILING_DECIMALS))
            .toUint128() <=
          params.isolationModeDebtCeiling,
        Errors.DEBT_CEILING_EXCEEDED
      );
    }

    // E-Mode checks
    if (params.userEModeCategory != 0) {
      require(
        EModeConfiguration.isReserveEnabledOnBitmap(
          eModeCategories[params.userEModeCategory].borrowableBitmap,
          reservesData[params.asset].id
        ),
        Errors.NOT_BORROWABLE_IN_EMODE
      );
    }

    // Calculate user account data
    (
      userCollateralInBaseCurrency,
      userDebtInBaseCurrency,
      currentLtv,
      ,
      healthFactor,

    ) = GenericLogic.calculateUserAccountData(
      reservesData,
      reservesList,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: params.userConfig,
        reservesCount: params.reservesCount,
        user: params.userAddress,
        oracle: params.oracle,
        userEModeCategory: params.userEModeCategory
      })
    );

    require(userCollateralInBaseCurrency != 0, Errors.COLLATERAL_BALANCE_IS_ZERO);
    require(currentLtv != 0, Errors.LTV_VALIDATION_FAILED);

    require(
      healthFactor > HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    // Calculate amount in base currency
    amountInBaseCurrency =
      ICommodityOracle(params.oracle).getAssetPrice(params.asset) *
      params.amount;
    unchecked {
      amountInBaseCurrency /= assetUnit;
    }

    // Ensure borrow doesn't exceed available borrowing power
    require(
      userCollateralInBaseCurrency.percentMul(currentLtv) >=
        userDebtInBaseCurrency + amountInBaseCurrency,
      Errors.COLLATERAL_CANNOT_COVER_NEW_BORROW
    );
  }

  /**
   * @notice Validates a liquidation action.
   * @param params The validation parameters
   */
  function validateLiquidationCall(
    DataTypes.ValidateLiquidationCallParams memory params
  ) internal view {
    require(
      params.healthFactor < HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_NOT_BELOW_THRESHOLD
    );

    require(
      params.priceOracleSentinel == address(0) ||
        IPriceOracleSentinel(params.priceOracleSentinel).isLiquidationAllowed(),
      Errors.PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    (bool isActive, , , , bool isPaused) = params.debtReserveCache.commodityConfiguration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates setting a user's eMode category
   * @param eModeCategories The eMode categories configuration
   * @param userConfig The user configuration
   * @param reservesCount The number of initialized reserves
   * @param categoryId The eMode category id to set
   */
  function validateSetUserEMode(
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    uint256 reservesCount,
    uint8 categoryId
  ) internal view {
    // If setting to category 0 (no eMode), no validation needed
    if (categoryId == 0) {
      return;
    }

    // Ensure the category exists and has valid LTV
    require(
      eModeCategories[categoryId].ltv != 0,
      Errors.INCONSISTENT_EMODE_CATEGORY
    );

    // Ensure user is not in isolation mode when trying to enable eMode
    require(
      !userConfig.isUsingAsCollateralAny() ||
        !userConfig.isUsingAsCollateral(userConfig.getIsolationModeCollateral(reservesCount)),
      Errors.INVALID_EMODE_CATEGORY_ASSIGNMENT
    );
  }

  /**
   * @notice Validates the health factor of a user
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves  
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The user configuration
   * @param user The user address
   * @param userEModeCategory The user's eMode category
   * @param reservesCount The number of initialized reserves
   * @param oracle The price oracle
   */
  function validateHealthFactor(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    uint8 userEModeCategory,
    uint256 reservesCount,
    address oracle
  ) internal view {
    (, , , , uint256 healthFactor, ) = GenericLogic.calculateUserAccountData(
      reservesData,
      reservesList,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: userConfig,
        reservesCount: reservesCount,
        user: user,
        oracle: oracle,
        userEModeCategory: userEModeCategory
      })
    );

    require(
      healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );
  }

  /**
   * @notice Validates if a reserve should be automatically enabled as collateral for a user
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param userConfig The user configuration
   * @param reserveConfig The reserve configuration
   * @param cTokenAddress The address of the cToken
   * @return True if the reserve can be automatically enabled as collateral, false otherwise
   */
  function validateAutomaticUseAsCollateral(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    DataTypes.UserConfigurationMap memory userConfig,
    DataTypes.CommodityConfigurationMap memory reserveConfig,
    address cTokenAddress
  ) internal view returns (bool) {
    // Get the reserve configuration flags
    (, , , bool usageAsCollateralEnabled, ) = reserveConfig.getFlags();
    
    // If the reserve is not usable as collateral, return false
    if (!usageAsCollateralEnabled) {
      return false;
    }

    // Check if user is in isolation mode
    if (userConfig.isUsingAsCollateralAny()) {
      // Get the isolation mode collateral (if any)
      address isolationModeCollateral = reservesList[
        userConfig.getIsolationModeCollateral(reservesData[reservesList[0]].id)
      ];
      
      // If user is in isolation mode and this is not the isolation collateral, don't enable
      if (isolationModeCollateral != address(0) && isolationModeCollateral != cTokenAddress) {
        return false;
      }
    }

    return true;
  }

  /**
   * @notice Validates the health factor and LTV after a withdrawal
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The user configuration
   * @param asset The asset being withdrawn
   * @param from The address withdrawing
   * @param reservesCount The number of initialized reserves
   * @param oracle The price oracle
   * @param userEModeCategory The user's eMode category
   */
  function validateHFAndLtv(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    address asset,
    address from,
    uint256 reservesCount,
    address oracle,
    uint8 userEModeCategory
  ) internal view {
    DataTypes.CommodityReserveData storage reserve = reservesData[asset];

    (
      ,
      ,
      ,
      ,
      uint256 healthFactor,
      bool hasZeroLtvCollateral
    ) = GenericLogic.calculateUserAccountData(
      reservesData,
      reservesList,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: userConfig,
        reservesCount: reservesCount,
        user: from,
        oracle: oracle,
        userEModeCategory: userEModeCategory
      })
    );

    require(
      healthFactor >= HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    require(
      !hasZeroLtvCollateral || reserve.configuration.getLtv() == 0,
      Errors.LTV_VALIDATION_FAILED
    );
  }

  /**
   * @notice Validates a transfer of cTokens
   * @param reserve The reserve data
   */
  function validateTransfer(
    DataTypes.CommodityReserveData storage reserve
  ) internal view {
    (bool isActive, , , , bool isPaused) = reserve.configuration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates setting a reserve as collateral
   * @param reserveCache The cached reserve data
   * @param userBalance The user's balance of the reserve
   */
  function validateSetUseReserveAsCollateral(
    DataTypes.ReserveCache memory reserveCache,
    uint256 userBalance
  ) internal pure {
    require(userBalance != 0, Errors.UNDERLYING_BALANCE_ZERO);
  }

  /**
   * @notice Validates a repay action
   * @param reserveCache The cached reserve data
   * @param amount The amount to repay
   * @param interestRateMode The interest rate mode
   * @param onBehalfOf The address for which the repayment is being made
   * @param userDebt The current debt of the user
   */
  function validateRepay(
    DataTypes.ReserveCache memory reserveCache,
    uint256 amount,
    DataTypes.InterestRateMode interestRateMode,
    address onBehalfOf,
    uint256 userDebt
  ) internal pure {
    require(amount != 0, Errors.INVALID_AMOUNT);
    require(userDebt != 0, Errors.NO_DEBT_OF_SELECTED_TYPE);
    
    (bool isActive, , , , bool isPaused) = reserveCache.commodityConfiguration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    
    require(
      interestRateMode == DataTypes.InterestRateMode.VARIABLE,
      Errors.INVALID_INTEREST_RATE_MODE_SELECTED
    );
  }
}
