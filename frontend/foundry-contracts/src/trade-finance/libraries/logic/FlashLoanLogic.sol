// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.10;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IPoolAddressesProvider} from "../../interfaces/IPoolAddressesProvider.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {Errors} from "../helpers/Errors.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {PercentageMath} from "../math/PercentageMath.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {ValidationLogic} from "./ValidationLogic.sol";
import {BorrowLogic} from "./BorrowLogic.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {ICommodityToken} from "../../tokens/CommodityReceiptToken.sol";

/**
 * @title IFlashLoanReceiver interface
 * @notice Interface for flash loan receivers
 */
interface IFlashLoanReceiver {
  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
  ) external returns (bool);
}

/**
 * @title IFlashLoanSimpleReceiver interface
 * @notice Interface for simple flash loan receivers
 */
interface IFlashLoanSimpleReceiver {
  function executeOperation(
    address asset,
    uint256 amount,
    uint256 premium,
    address initiator,
    bytes calldata params
  ) external returns (bool);
}

/**
 * @title IPool interface
 * @notice Minimal pool interface for flash loan operations
 */
interface IPool {
  function getReservesCount() external view returns (uint256);
  function getUserEMode(address user) external view returns (uint256);
}

/**
 * @title FlashLoanLogic library
 * @notice Implements the logic for flash loans in commodity trade finance
 */
library FlashLoanLogic {
  using ReserveLogic for DataTypes.ReserveCache;
  using ReserveLogic for DataTypes.CommodityReserveData;
  using SafeERC20 for IERC20;
  using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using SafeCast for uint256;

  event FlashLoan(
    address indexed target,
    address initiator,
    address indexed asset,
    uint256 amount,
    DataTypes.InterestRateMode interestRateMode,
    uint256 premium,
    uint16 indexed referralCode
  );

  // Helper struct to avoid stack too deep errors
  struct FlashLoanLocalVars {
    IFlashLoanReceiver receiver;
    uint256 i;  // Loop counter stored in struct (Chain Capital V3 pattern)
    address currentAsset;
    uint256 currentAmount;
    uint256[] totalPremiums;
    uint256 flashloanPremiumTotal;
    uint256 flashloanPremiumToProtocol;
  }

  /**
   * @notice Implements the flashloan feature for commodity-backed assets
   * @param reservesData The state of all the reserves
   * @param reservesList The addresses of all the active reserves
   * @param eModeCategories The configuration of all the efficiency mode categories
   * @param userConfig The user configuration mapping
   * @param params The flashloan parameters
   */
  function executeFlashLoan(
    mapping(address => DataTypes.CommodityReserveData) storage reservesData,
    mapping(uint256 => address) storage reservesList,
    mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
    DataTypes.UserConfigurationMap storage userConfig,
    DataTypes.FlashloanParams memory params
  ) external {
    ValidationLogic.validateFlashloan(reservesData, params.assets, params.amounts);

    FlashLoanLocalVars memory vars;
    vars.totalPremiums = new uint256[](params.assets.length);
    vars.receiver = IFlashLoanReceiver(params.receiverAddress);
    
    (vars.flashloanPremiumTotal, vars.flashloanPremiumToProtocol) = params.isAuthorizedFlashBorrower
      ? (0, 0)
      : (params.flashLoanPremiumTotal, params.flashLoanPremiumToProtocol);

    // Transfer assets to receiver - use vars.i for loop counter
    for (vars.i = 0; vars.i < params.assets.length; ) {
      vars.currentAmount = params.amounts[vars.i];
      vars.totalPremiums[vars.i] = DataTypes.InterestRateMode(params.interestRateModes[vars.i]) ==
        DataTypes.InterestRateMode.NONE
        ? vars.currentAmount.percentMul(vars.flashloanPremiumTotal)
        : 0;

      if (reservesData[params.assets[vars.i]].configuration.getIsVirtualAccActive()) {
        reservesData[params.assets[vars.i]].virtualUnderlyingBalance -= vars.currentAmount.toUint128();
      }

      ICommodityToken(reservesData[params.assets[vars.i]].cTokenAddress).transferUnderlyingTo(
        params.receiverAddress,
        vars.currentAmount
      );
      
      unchecked { ++vars.i; }
    }

    // Execute user operation
    require(
      vars.receiver.executeOperation(
        params.assets,
        params.amounts,
        vars.totalPremiums,
        msg.sender,
        params.params
      ),
      Errors.INVALID_FLASHLOAN_EXECUTOR_RETURN
    );

    // Handle repayment or conversion to debt - use vars.i
    for (vars.i = 0; vars.i < params.assets.length; ) {
      vars.currentAsset = params.assets[vars.i];
      vars.currentAmount = params.amounts[vars.i];

      if (DataTypes.InterestRateMode(params.interestRateModes[vars.i]) == DataTypes.InterestRateMode.NONE) {
        _handleFlashLoanRepayment(
          reservesData[vars.currentAsset],
          DataTypes.FlashLoanRepaymentParams({
            asset: vars.currentAsset,
            receiverAddress: params.receiverAddress,
            amount: vars.currentAmount,
            totalPremium: vars.totalPremiums[vars.i],
            flashLoanPremiumToProtocol: vars.flashloanPremiumToProtocol,
            referralCode: params.referralCode
          })
        );
      } else {
        // Convert to debt position - inline struct construction (Chain Capital V3 pattern)
        BorrowLogic.executeBorrow(
          reservesData,
          reservesList,
          eModeCategories,
          userConfig,
          DataTypes.ExecuteBorrowParams({
            asset: vars.currentAsset,
            user: msg.sender,
            onBehalfOf: params.onBehalfOf,
            amount: vars.currentAmount,
            interestRateMode: DataTypes.InterestRateMode(params.interestRateModes[vars.i]),
            referralCode: params.referralCode,
            releaseUnderlying: false,
            maxStableRateBorrowSizePercent: 0,
            reservesCount: IPool(params.pool).getReservesCount(),
            oracle: IPoolAddressesProvider(params.addressesProvider).getPriceOracle(),
            userEModeCategory: IPool(params.pool).getUserEMode(params.onBehalfOf).toUint8(),
            priceOracleSentinel: IPoolAddressesProvider(params.addressesProvider).getPriceOracleSentinel()
          })
        );
        
        emit FlashLoan(
          params.receiverAddress,
          msg.sender,
          vars.currentAsset,
          vars.currentAmount,
          DataTypes.InterestRateMode(params.interestRateModes[vars.i]),
          0,
          params.referralCode
        );
      }
      
      unchecked { ++vars.i; }
    }
  }


  /**
   * @notice Implements the simple flashloan feature for a single commodity
   * @param reserve The state of the flashloaned reserve
   * @param params The flashloan parameters
   */
  function executeFlashLoanSimple(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.FlashloanSimpleParams memory params
  ) external {
    ValidationLogic.validateFlashloanSimple(reserve, params.amount);

    IFlashLoanSimpleReceiver receiver = IFlashLoanSimpleReceiver(params.receiverAddress);
    uint256 totalPremium = params.amount.percentMul(params.flashLoanPremiumTotal);

    if (reserve.configuration.getIsVirtualAccActive()) {
      reserve.virtualUnderlyingBalance -= params.amount.toUint128();
    }

    ICommodityToken(reserve.cTokenAddress).transferUnderlyingTo(params.receiverAddress, params.amount);

    require(
      receiver.executeOperation(
        params.asset,
        params.amount,
        totalPremium,
        msg.sender,
        params.params
      ),
      Errors.INVALID_FLASHLOAN_EXECUTOR_RETURN
    );

    _handleFlashLoanRepayment(
      reserve,
      DataTypes.FlashLoanRepaymentParams({
        asset: params.asset,
        receiverAddress: params.receiverAddress,
        amount: params.amount,
        totalPremium: totalPremium,
        flashLoanPremiumToProtocol: params.flashLoanPremiumToProtocol,
        referralCode: params.referralCode
      })
    );
  }

  /**
   * @notice Handles repayment of flashloaned assets plus premium
   * @param reserve The state of the flashloaned reserve
   * @param params The repayment parameters
   */
  function _handleFlashLoanRepayment(
    DataTypes.CommodityReserveData storage reserve,
    DataTypes.FlashLoanRepaymentParams memory params
  ) internal {
    uint256 premiumToProtocol = params.totalPremium.percentMul(params.flashLoanPremiumToProtocol);
    uint256 premiumToLP = params.totalPremium - premiumToProtocol;
    uint256 amountPlusPremium = params.amount + params.totalPremium;

    DataTypes.ReserveCache memory reserveCache = reserve.cache();
    reserve.updateState(reserveCache);
    
    reserveCache.nextLiquidityIndex = reserve.cumulateToLiquidityIndex(
      IERC20(reserveCache.cTokenAddress).totalSupply() +
        uint256(reserve.accruedToTreasury).rayMul(reserveCache.nextLiquidityIndex),
      premiumToLP
    );

    reserve.accruedToTreasury += premiumToProtocol
      .rayDiv(reserveCache.nextLiquidityIndex)
      .toUint128();

    reserve.updateInterestRatesAndVirtualBalance(reserveCache, params.asset, amountPlusPremium, 0);

    IERC20(params.asset).safeTransferFrom(
      params.receiverAddress,
      reserveCache.cTokenAddress,
      amountPlusPremium
    );

    ICommodityToken(reserveCache.cTokenAddress).handleRepayment(
      params.receiverAddress,
      params.receiverAddress,
      amountPlusPremium
    );

    emit FlashLoan(
      params.receiverAddress,
      msg.sender,
      params.asset,
      params.amount,
      DataTypes.InterestRateMode.NONE,
      params.totalPremium,
      params.referralCode
    );
  }
}
