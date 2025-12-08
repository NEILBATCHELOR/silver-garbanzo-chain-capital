// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IDebtToken} from "../../interfaces/IDebtToken.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {PercentageMath} from "../math/PercentageMath.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {ValidationLogic} from "./ValidationLogic.sol";
import {GenericLogic} from "./GenericLogic.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";

/**
 * @title BorrowLogic library
 * @author Chain Capital
 * @notice Implements borrow/repay logic
 * @dev Handles loan issuance and repayment against commodity collateral
 */
library BorrowLogic {
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    using SafeERC20 for IERC20;
    using ReserveLogic for DataTypes.CommodityReserveData;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    /**
     * @dev Emitted on borrow
     * @param commodityToken The address of the commodity token being borrowed against
     * @param user The address of the user borrowing
     * @param onBehalfOf The address receiving the funds
     * @param amount The amount borrowed
     * @param interestRateMode The interest rate mode (stable/variable)
     * @param borrowRate The borrow rate
     * @param referralCode The referral code used
     */
    event Borrow(
        address indexed commodityToken,
        address user,
        address indexed onBehalfOf,
        uint256 amount,
        DataTypes.InterestRateMode interestRateMode,
        uint256 borrowRate,
        uint16 indexed referralCode
    );

    /**
     * @dev Emitted on repay
     * @param commodityToken The address of the commodity token
     * @param user The address of the user repaying
     * @param repayer The address of the repayer
     * @param amount The amount repaid
     * @param useATokens Whether aTokens were used for repayment
     */
    event Repay(
        address indexed commodityToken,
        address indexed user,
        address indexed repayer,
        uint256 amount,
        bool useATokens
    );

    struct ExecuteBorrowParams {
        address asset;                      // Asset being borrowed (e.g., USDC, USDT)
        address user;
        address onBehalfOf;
        uint256 amount;
        DataTypes.InterestRateMode interestRateMode;
        uint16 referralCode;
        bool releaseUnderlying;            // Whether to transfer asset to user
        uint256 maxStableRateBorrowSizePercent;
        uint256 reservesCount;
        address oracle;
        uint8 userEModeCategory;
        address priceOracleSentinel;
    }

    struct ExecuteRepayParams {
        address asset;
        uint256 amount;
        DataTypes.InterestRateMode interestRateMode;
        address onBehalfOf;
        bool useATokens;                   // Whether to use aTokens instead of underlying
    }

    /**
     * @notice Executes borrow against commodity collateral
     * @dev Issues loan, mints debt tokens, transfers borrowed asset
     * @param reserve The reserve data of the asset being borrowed
     * @param reservesData Mapping of all reserves
     * @param reservesList Mapping of reserve IDs to addresses
     * @param eModeCategories Mapping of eMode categories
     * @param userConfig The user configuration bitmap
     * @param params The borrow execution parameters
     */
    function executeBorrow(
        DataTypes.CommodityReserveData storage reserve,
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        mapping(uint256 => address) storage reservesList,
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
        DataTypes.UserConfigurationMap storage userConfig,
        ExecuteBorrowParams memory params
    ) external {
        // Cache reserve data first
        DataTypes.CommodityCache memory reserveCache = ReserveLogic.cache(reserve);
        
        // Update reserve state with cache
        ReserveLogic.updateState(reserve, reserveCache);

        // Validate borrow using ValidateBorrowParams struct
        ValidationLogic.validateBorrow(
            reservesData,
            reservesList,
            eModeCategories,
            DataTypes.ValidateBorrowParams({
                commodityCache: reserveCache,
                userConfig: userConfig,
                commodity: params.asset,
                userAddress: params.onBehalfOf,
                amount: params.amount,
                interestRateMode: params.interestRateMode,
                maxStableLoanPercent: params.maxStableRateBorrowSizePercent,
                commoditiesCount: params.reservesCount,
                oracle: params.oracle,
                userEModeCategory: params.userEModeCategory,
                priceOracleSentinel: params.priceOracleSentinel,
                isolationModeActive: false,  // TODO: Calculate from userConfig
                isolationModeCollateralAddress: address(0),  // TODO: Get from userConfig
                isolationModeDebtCeiling: 0  // TODO: Get from reserve
            })
        );

        // Calculate amounts
        uint256 currentStableRate = 0;
        bool isFirstBorrowing = false;

        if (params.interestRateMode == DataTypes.InterestRateMode.STABLE) {
            currentStableRate = reserve.currentStableBorrowRate;
            
            isFirstBorrowing = IDebtToken(reserve.stableDebtTokenAddress)
                .balanceOf(params.onBehalfOf) == 0;
        } else {
            isFirstBorrowing = IDebtToken(reserve.variableDebtTokenAddress)
                .balanceOf(params.onBehalfOf) == 0;
        }

        // Update interest rates
        ReserveLogic.updateInterestRates(
            reserve,
            reserveCache,
            params.asset,
            0,  // No liquidity added
            params.releaseUnderlying ? params.amount : 0  // Liquidity taken
        );

        // Mint debt tokens to borrower
        if (params.interestRateMode == DataTypes.InterestRateMode.STABLE) {
            IDebtToken(reserve.stableDebtTokenAddress).mint(
                params.user,
                params.onBehalfOf,
                params.amount,
                currentStableRate
            );
        } else {
            IDebtToken(reserve.variableDebtTokenAddress).mint(
                params.user,
                params.onBehalfOf,
                params.amount,
                reserve.variableBorrowIndex
            );
        }

        // If first borrowing, set asset as borrowed in user config
        if (isFirstBorrowing) {
            userConfig.setBorrowing(reserve.id, true);
        }

        // Transfer borrowed asset to user
        if (params.releaseUnderlying) {
            IERC20(params.asset).safeTransfer(params.onBehalfOf, params.amount);
        }

        emit Borrow(
            params.asset,
            params.user,
            params.onBehalfOf,
            params.amount,
            params.interestRateMode,
            params.interestRateMode == DataTypes.InterestRateMode.STABLE 
                ? currentStableRate 
                : reserve.currentVariableBorrowRate,
            params.referralCode
        );
    }

    /**
     * @notice Executes repayment of borrowed asset
     * @dev Burns debt tokens, receives repayment, updates reserves
     * @param reserve The reserve data
     * @param userConfig The user configuration bitmap  
     * @param params The repay execution parameters
     * @return The actual amount repaid
     */
    function executeRepay(
        DataTypes.CommodityReserveData storage reserve,
        DataTypes.UserConfigurationMap storage userConfig,
        ExecuteRepayParams memory params
    ) external returns (uint256) {
        // Cache reserve data first
        DataTypes.CommodityCache memory reserveCache = ReserveLogic.cache(reserve);
        
        // Update reserve state with cache
        ReserveLogic.updateState(reserve, reserveCache);

        // Get debt amount
        uint256 stableDebt = IERC20(reserve.stableDebtTokenAddress).balanceOf(params.onBehalfOf);
        uint256 variableDebt = IERC20(reserve.variableDebtTokenAddress).balanceOf(params.onBehalfOf);

        // Calculate amount to repay
        uint256 paybackAmount = params.amount;
        
        if (params.interestRateMode == DataTypes.InterestRateMode.STABLE) {
            if (params.amount > stableDebt) {
                paybackAmount = stableDebt;
            }
        } else {
            if (params.amount > variableDebt) {
                paybackAmount = variableDebt;
            }
        }

        // Validate repayment
        ValidationLogic.validateRepay(
            reserve,
            paybackAmount,
            params.interestRateMode,
            params.onBehalfOf,
            stableDebt,
            variableDebt
        );

        // Update interest rates
        ReserveLogic.updateInterestRates(
            reserve,
            reserveCache,
            params.asset,
            paybackAmount,  // Liquidity added back
            0
        );

        // Handle payment
        if (!params.useATokens) {
            // Standard repayment - transfer underlying asset from repayer
            IERC20(params.asset).safeTransferFrom(
                msg.sender,
                address(this),
                paybackAmount
            );
        } else {
            // Repay with aTokens - burn aTokens and use underlying
            // This would require the aToken contract interface
            revert("Repay with aTokens not yet implemented");
        }

        // Burn debt tokens
        if (params.interestRateMode == DataTypes.InterestRateMode.STABLE) {
            IDebtToken(reserve.stableDebtTokenAddress).burn(
                params.onBehalfOf,
                paybackAmount
            );
        } else {
            IDebtToken(reserve.variableDebtTokenAddress).burn(
                params.onBehalfOf,
                paybackAmount,
                reserve.variableBorrowIndex
            );
        }

        // Get remaining debt after repayment
        uint256 stableDebtAfter = IERC20(reserve.stableDebtTokenAddress).balanceOf(params.onBehalfOf);
        uint256 variableDebtAfter = IERC20(reserve.variableDebtTokenAddress).balanceOf(params.onBehalfOf);

        // If no more debt, unset borrowing flag
        if (stableDebtAfter == 0 && variableDebtAfter == 0) {
            userConfig.setBorrowing(reserve.id, false);
        }

        emit Repay(
            params.asset,
            params.onBehalfOf,
            msg.sender,
            paybackAmount,
            params.useATokens
        );

        return paybackAmount;
    }

    /**
     * @notice Allows users to swap between stable and variable rate modes
     * @dev Changes debt token type for user's position
     * @param reserve The reserve data
     * @param userConfig The user configuration
     * @param asset The asset address
     * @param interestRateMode The new interest rate mode
     */
    function executeSwapRateMode(
        DataTypes.CommodityReserveData storage reserve,
        DataTypes.UserConfigurationMap storage userConfig,
        address asset,
        DataTypes.InterestRateMode interestRateMode
    ) external {
        // Cache reserve data first
        DataTypes.CommodityCache memory reserveCache = ReserveLogic.cache(reserve);
        
        // Update reserve state with cache
        ReserveLogic.updateState(reserve, reserveCache);

        uint256 stableDebt = IERC20(reserve.stableDebtTokenAddress).balanceOf(msg.sender);
        uint256 variableDebt = IERC20(reserve.variableDebtTokenAddress).balanceOf(msg.sender);

        // Validate swap
        ValidationLogic.validateRateSwap(
            reserve,
            userConfig,
            stableDebt,
            variableDebt,
            interestRateMode
        );

        if (interestRateMode == DataTypes.InterestRateMode.STABLE) {
            // Swap from variable to stable
            IDebtToken(reserve.variableDebtTokenAddress).burn(
                msg.sender,
                variableDebt,
                reserve.variableBorrowIndex
            );

            IDebtToken(reserve.stableDebtTokenAddress).mint(
                msg.sender,
                msg.sender,
                variableDebt,
                reserve.currentStableBorrowRate
            );
        } else {
            // Swap from stable to variable
            IDebtToken(reserve.stableDebtTokenAddress).burn(
                msg.sender,
                stableDebt
            );

            IDebtToken(reserve.variableDebtTokenAddress).mint(
                msg.sender,
                msg.sender,
                stableDebt,
                reserve.variableBorrowIndex
            );
        }

        // Update interest rates
        ReserveLogic.updateInterestRates(
            reserve,
            reserveCache,
            asset,
            0,
            0
        );
    }

    /**
     * @dev Caches reserve data to avoid repeated storage reads
     * @param reserve The reserve to cache
     * @return reserveCache The cached reserve data
     */
    function _cacheReserveData(
        DataTypes.CommodityReserveData storage reserve
    ) private view returns (DataTypes.CommodityCache memory reserveCache) {
        reserveCache.commodityConfiguration = reserve.configuration;
        reserveCache.cTokenAddress = reserve.cTokenAddress;
        reserveCache.stableDebtTokenAddress = reserve.stableDebtTokenAddress;
        reserveCache.variableDebtTokenAddress = reserve.variableDebtTokenAddress;
        reserveCache.commodityLastUpdateTimestamp = reserve.lastUpdateTimestamp;
        
        // Get current debt values
        reserveCache.currScaledVariableDebt = IERC20(reserve.variableDebtTokenAddress).totalSupply();
        reserveCache.currPrincipalStableDebt = IERC20(reserve.stableDebtTokenAddress).totalSupply();
        
        // Cache indices
        reserveCache.currLiquidityIndex = reserve.liquidityIndex;
        reserveCache.currVariableBorrowIndex = reserve.variableBorrowIndex;
        
        // Calculate next values (simplified - actual implementation would include interest accrual)
        reserveCache.nextScaledVariableDebt = reserveCache.currScaledVariableDebt;
        reserveCache.nextTotalStableDebt = reserveCache.currPrincipalStableDebt;
        reserveCache.nextLiquidityIndex = reserveCache.currLiquidityIndex;
        reserveCache.nextVariableBorrowIndex = reserveCache.currVariableBorrowIndex;
        
        return reserveCache;
    }
}
