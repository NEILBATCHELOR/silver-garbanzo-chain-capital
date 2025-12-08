// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';
import {PercentageMath} from '../math/PercentageMath.sol';
import {WadRayMath} from '../math/WadRayMath.sol';
import {DataTypes} from '../types/DataTypes.sol';
import {ReserveConfiguration} from '../configuration/ReserveConfiguration.sol';
import {UserConfiguration} from '../configuration/UserConfiguration.sol';
import {Errors} from '../helpers/Errors.sol';
import {ReserveLogic} from './ReserveLogic.sol';
import {GenericLogic} from './GenericLogic.sol';
import {SafeCast} from '@openzeppelin/contracts/utils/math/SafeCast.sol';

/**
 * @title ValidationLogic library
 * @author Chain Capital
 * @notice Implements validation functions for all commodity pool operations
 */
library ValidationLogic {
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeCast for uint256;
  using SafeERC20 for IERC20;
  using ReserveLogic for DataTypes.CommodityReserveData;
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  // Factor to apply to "only-variable-debt" liquidity rate to get threshold for rebalancing, expressed in bps
  // A value of 0.9e4 results in 90%
  uint256 public constant REBALANCE_UP_LIQUIDITY_RATE_THRESHOLD = 0.9e4;

  // Minimum health factor allowed under any circumstance
  // A value of 0.95e18 results in 0.95
  uint256 public constant MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 0.95e18;

  /**
   * @notice Validates a supply operation
   * @param commodityConfig The commodity configuration being supplied
   * @param amount The amount to supply
   */
  function validateSupply(
    DataTypes.CommodityConfigurationMap memory commodityConfig,
    uint256 amount
  ) internal pure {
    require(amount != 0, Errors.INVALID_AMOUNT);
    
    (bool isActive, bool isFrozen, , , bool isPaused) = commodityConfig.getFlags();
    
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    require(!isFrozen, Errors.COMMODITY_FROZEN);
  }

  /**
   * @notice Validates a withdraw operation
   * @param commodityAddress The address of the commodity
   * @param amount The amount to withdraw
   * @param userBalance The user's cToken balance
   * @param commoditiesData The commodities data
   * @param userConfig The user configuration
   * @param commodities The list of all commodity addresses
   * @param commoditiesCount The count of commodities
   * @param oracle The price oracle address
   * @param userEModeCategory The eMode category of the user
   */
  function validateWithdraw(
    address commodityAddress,
    uint256 amount,
    uint256 userBalance,
    mapping(address => DataTypes.CommodityReserveData) storage commoditiesData,
    DataTypes.UserConfigurationMap storage userConfig,
    mapping(uint256 => address) storage commodities,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    uint256 commoditiesCount,
    address oracle,
    uint8 userEModeCategory
  ) internal view {
    require(amount != 0, Errors.INVALID_AMOUNT);
    require(amount <= userBalance, Errors.NOT_ENOUGH_AVAILABLE_USER_BALANCE);

    DataTypes.CommodityReserveData storage commodity = commoditiesData[commodityAddress];
    (bool isActive, , , , bool isPaused) = commodity.configuration.getFlags();
    
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);

    // If user is using this commodity as collateral, validate health factor
    if (userConfig.isUsingAsCollateral(commodity.id)) {
      require(
        GenericLogic.balanceDecreaseAllowed(
          commodityAddress,
          msg.sender,
          amount,
          commoditiesData,
          userConfig,
          commodities,
          eModeCategories,
          commoditiesCount,
          oracle,
          userEModeCategory
        ),
        Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
      );
    }
  }

  /**
   * @notice Validates a basic withdraw operation (simple version)
   * @param reserve The commodity reserve data
   * @param amount The amount to withdraw
   * @param userBalance The user's cToken balance
   */
  function validateWithdraw(
    DataTypes.CommodityReserveData storage reserve,
    uint256 amount,
    uint256 userBalance
  ) internal view {
    require(amount != 0, Errors.INVALID_AMOUNT);
    require(amount <= userBalance, Errors.NOT_ENOUGH_AVAILABLE_USER_BALANCE);

    (bool isActive, , , , bool isPaused) = reserve.configuration.getFlags();
    
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates a borrow operation
   * @param commoditiesData The state of all the commodities
   * @param commoditiesList The addresses of all the active commodities
   * @param eModeCategories The eMode categories configuration
   * @param params The params for the borrow validation
   */
  function validateBorrow(
    mapping(address => DataTypes.CommodityReserveData) storage commoditiesData,
    mapping(uint256 => address) storage commoditiesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.ValidateBorrowParams memory params
  ) internal view {
    require(params.amount != 0, Errors.INVALID_AMOUNT);

    require(
      params.commodityCache.commodityConfiguration.getBorrowingEnabled(),
      Errors.BORROWING_NOT_ENABLED
    );

    (bool isActive, bool isFrozen, , , bool isPaused) =
      params.commodityCache.commodityConfiguration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    require(!isFrozen, Errors.COMMODITY_FROZEN);

    require(
      params.priceOracleSentinel == address(0) ||
        IPriceOracleSentinel(params.priceOracleSentinel).isBorrowAllowed(),
      Errors.PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    // Validate borrow cap
    uint256 borrowCap = params.commodityCache.commodityConfiguration.getBorrowCap();
    if (borrowCap != 0) {
      uint256 totalSupplyVariableDebt = params.commodityCache.currScaledVariableDebt.rayMul(
        params.commodityCache.nextVariableBorrowIndex
      );

      uint256 totalDebt = params.commodityCache.currTotalStableDebt + totalSupplyVariableDebt + params.amount;
      
      unchecked {
        require(
          totalDebt <= borrowCap * (10 ** params.commodityCache.commodityConfiguration.getDecimals()),
          Errors.BORROW_CAP_EXCEEDED
        );
      }
    }

    // Validate eMode category
    if (params.userEModeCategory != 0) {
      require(
        eModeCategories[params.userEModeCategory].ltv != 0,
        Errors.INCONSISTENT_EMODE_CATEGORY
      );
      unchecked {
        require(
          params.commodityCache.commodityConfiguration.getEModeCategory() ==
            params.userEModeCategory ||
            params.commodityCache.commodityConfiguration.getEModeCategory() == 0,
          Errors.INCONSISTENT_EMODE_CATEGORY
        );
      }
    }

    // Validate isolation mode
    (bool isolationModeActive, address isolationModeCollateralAddress, ) =
      params.userConfig.getIsolationModeState(
        commoditiesData,
        commoditiesList
      );

    if (isolationModeActive) {
      require(
        commoditiesData[params.commodity].configuration.getBorrowableInIsolation(),
        Errors.COMMODITY_NOT_BORROWABLE_IN_ISOLATION
      );

      uint256 isolationModeTotalDebt =
        commoditiesData[isolationModeCollateralAddress].isolationModeTotalDebt;

      uint256 nextIsolationModeTotalDebt = isolationModeTotalDebt + params.amount;

      require(
        nextIsolationModeTotalDebt <=
          commoditiesData[isolationModeCollateralAddress].configuration.getDebtCeiling(),
        Errors.DEBT_CEILING_EXCEEDED
      );
    }

    // Validate siloed borrowing
    if (params.commodityCache.commodityConfiguration.getSiloedBorrowing()) {
      require(
        !params.userConfig.isBorrowingAny() ||
          params.userConfig.isBorrowingOne(params.commodity),
        Errors.SILOED_BORROWING_VIOLATION
      );
    }

    // Calculate and validate health factor
    (
      ,
      ,
      ,
      ,
      uint256 healthFactor,
    ) = GenericLogic.calculateUserAccountData(
      commoditiesData,
      commoditiesList,
      eModeCategories,
      DataTypes.CalculateUserAccountDataParams({
        userConfig: params.userConfig,
        commoditiesCount: params.commoditiesCount,
        user: params.userAddress,
        oracle: params.oracle,
        userEModeCategory: params.userEModeCategory
      })
    );

    require(
      healthFactor >= GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    // Validate stable rate borrowing
    if (params.interestRateMode == DataTypes.InterestRateMode.STABLE) {
      require(
        params.commodityCache.commodityConfiguration.getStableRateBorrowingEnabled(),
        Errors.STABLE_BORROWING_NOT_ENABLED
      );

      require(
        !params.userConfig.isUsingAsCollateral(params.commodityCache.commodityConfiguration.getEModeCategory()),
        Errors.COLLATERAL_SAME_AS_BORROWING_CURRENCY
      );

      uint256 maxLoanSizePercent = params.maxStableLoanPercent;
      if (maxLoanSizePercent != 0) {
        uint256 availableLiquidity = IERC20(params.commodity).balanceOf(
          params.commodityCache.cTokenAddress
        );

        require(
          params.amount <= availableLiquidity.percentMul(maxLoanSizePercent),
          Errors.AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE
        );
      }
    }
  }

  /**
   * @notice Validates a repay operation
   * @param commodity The commodity being repaid
   * @param amountSent The amount sent for repayment
   * @param interestRateMode The interest rate mode of the debt being repaid
   * @param onBehalfOf The address of the user for whom the repayment is being made
   * @param stableDebt The current stable debt of the user
   * @param variableDebt The current variable debt of the user
   */
  function validateRepay(
    DataTypes.CommodityReserveData storage commodity,
    uint256 amountSent,
    DataTypes.InterestRateMode interestRateMode,
    address onBehalfOf,
    uint256 stableDebt,
    uint256 variableDebt
  ) internal view {
    require(amountSent != 0, Errors.INVALID_AMOUNT);
    require(
      (stableDebt != 0 &&
        interestRateMode == DataTypes.InterestRateMode.STABLE) ||
        (variableDebt != 0 &&
          interestRateMode == DataTypes.InterestRateMode.VARIABLE),
      Errors.NO_DEBT_OF_SELECTED_TYPE
    );

    (bool isActive, , , , bool isPaused) = commodity.configuration.getFlags();
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates a liquidation call
   * @param userConfig The user configuration mapping
   * @param collateralCommodity The commodity used as collateral
   * @param params Liquidation validation parameters
   */
  function validateLiquidationCall(
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.CommodityReserveData storage collateralCommodity,
    DataTypes.ValidateLiquidationCallParams memory params
  ) internal view {
    ValidateLiquidationCallLocalVars memory vars;

    (vars.collateralActive, , , , vars.collateralPaused) = collateralCommodity
      .configuration
      .getFlags();

    require(vars.collateralActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!vars.collateralPaused, Errors.COMMODITY_PAUSED);

    require(
      params.priceOracleSentinel == address(0) ||
        params.healthFactor < MINIMUM_HEALTH_FACTOR_LIQUIDATION_THRESHOLD ||
        IPriceOracleSentinel(params.priceOracleSentinel).isLiquidationAllowed(),
      Errors.PRICE_ORACLE_SENTINEL_CHECK_FAILED
    );

    require(
      params.healthFactor < GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_NOT_BELOW_THRESHOLD
    );

    vars.isCollateralEnabled = collateralCommodity.configuration.getLiquidationThreshold() > 0 &&
      userConfig.isUsingAsCollateral(collateralCommodity.id);

    require(vars.isCollateralEnabled, Errors.COLLATERAL_CANNOT_BE_LIQUIDATED);
    require(params.totalDebt != 0, Errors.SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  }

  /**
   * @notice Validates the health factor of a user
   * @param commoditiesData The state of all the commodities
   * @param commoditiesList The addresses of all the active commodities
   * @param eModeCategories The eMode categories
   * @param userConfig The state of the user for the specific commodity
   * @param user The user address
   * @param userEModeCategory The eMode category of the user
   * @param commoditiesCount The number of available commodities
   * @param oracle The oracle address
   * @return healthFactor The health factor of the user
   * @return hasZeroLtvCollateral True if the user has zero LTV collateral
   */
  function validateHealthFactor(
    mapping(address => DataTypes.CommodityReserveData) storage commoditiesData,
    mapping(uint256 => address) storage commoditiesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap memory userConfig,
    address user,
    uint8 userEModeCategory,
    uint256 commoditiesCount,
    address oracle
  ) internal view returns (uint256, bool) {
    (, , , , uint256 healthFactor, bool hasZeroLtvCollateral) = GenericLogic
      .calculateUserAccountData(
        commoditiesData,
        commoditiesList,
        eModeCategories,
        DataTypes.CalculateUserAccountDataParams({
          userConfig: userConfig,
          commoditiesCount: commoditiesCount,
          user: user,
          oracle: oracle,
          userEModeCategory: userEModeCategory
        })
      );

    require(
      healthFactor >= GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD,
      Errors.HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD
    );

    return (healthFactor, hasZeroLtvCollateral);
  }

  /**
   * @notice Validates a transfer of cTokens
   * @param commodity The commodity
   */
  function validateTransfer(DataTypes.CommodityReserveData storage commodity) internal view {
    require(!commodity.configuration.getPaused(), Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates the action of setting an asset as collateral
   * @param commodityConfig The commodity configuration
   */
  function validateSetUseReserveAsCollateral(
    DataTypes.CommodityConfigurationMap memory commodityConfig
  ) internal pure {
    (bool isActive, , , , bool isPaused) = commodityConfig.getFlags();
    require(isActive, Errors.COMMODITY_NOT_LISTED);
    require(!isPaused, Errors.COMMODITY_PAUSED);
  }

  /**
   * @notice Validates a flashloan action
   * @param commodities The addresses of the commodities
   * @param amounts The amounts for each flashloan
   * @param modes The flashloan modes
   */
  function validateFlashloan(
    address[] memory commodities,
    uint256[] memory amounts,
    uint256[] memory modes
  ) internal pure {
    require(commodities.length == amounts.length, Errors.INCONSISTENT_FLASHLOAN_PARAMS);
    require(commodities.length == modes.length, Errors.INCONSISTENT_FLASHLOAN_PARAMS);
  }

  /**
   * @notice Validates the action of setting an asset as collateral
   * @param commodity The commodity
   */
  function validateFlashloanSimple(DataTypes.CommodityReserveData storage commodity) internal view {
    require(
      commodity.configuration.getFlashLoanEnabled(),
      Errors.FLASHLOAN_DISABLED
    );
  }

  /**
   * @notice Validates a rate swap operation
   * @param commodity The commodity reserve data
   * @param userConfig The user configuration
   * @param stableDebt The user's current stable debt
   * @param variableDebt The user's current variable debt
   * @param interestRateMode The target interest rate mode
   */
  function validateRateSwap(
    DataTypes.CommodityReserveData storage commodity,
    DataTypes.UserConfigurationMap storage userConfig,
    uint256 stableDebt,
    uint256 variableDebt,
    DataTypes.InterestRateMode interestRateMode
  ) internal view {
    (bool isActive, bool isFrozen, , , bool isPaused) = commodity.configuration.getFlags();
    
    require(isActive, Errors.COMMODITY_NOT_ACTIVE);
    require(!isPaused, Errors.COMMODITY_PAUSED);
    require(!isFrozen, Errors.COMMODITY_FROZEN);

    if (interestRateMode == DataTypes.InterestRateMode.STABLE) {
      // Swapping to stable rate
      require(variableDebt > 0, Errors.NO_DEBT_OF_SELECTED_TYPE);
      require(
        commodity.configuration.getStableRateBorrowingEnabled(),
        Errors.STABLE_BORROWING_NOT_ENABLED
      );
    } else {
      // Swapping to variable rate
      require(stableDebt > 0, Errors.NO_DEBT_OF_SELECTED_TYPE);
    }
  }

  struct ValidateLiquidationCallLocalVars {
    bool collateralActive;
    bool collateralPaused;
    bool isCollateralEnabled;
  }
}

// Dummy interface for Price Oracle Sentinel (to be implemented separately)
interface IPriceOracleSentinel {
  function isBorrowAllowed() external view returns (bool);
  function isLiquidationAllowed() external view returns (bool);
}
