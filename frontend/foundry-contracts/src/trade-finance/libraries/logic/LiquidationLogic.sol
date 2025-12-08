// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ICommodityToken} from "../../interfaces/ICommodityToken.sol";
import {IDebtToken} from "../../interfaces/IDebtToken.sol";
import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {PercentageMath} from "../math/PercentageMath.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";
import {GenericLogic} from "./GenericLogic.sol";
import {ValidationLogic} from "./ValidationLogic.sol";

/**
 * @title LiquidationLogic library
 * @author Chain Capital
 * @notice Implements liquidation logic for undercollateralized positions
 * @dev Handles position liquidations with variable close factors based on health
 */
library LiquidationLogic {
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    using SafeERC20 for IERC20;
    using ReserveLogic for DataTypes.CommodityReserveData;
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    /**
     * @dev Emitted when a borrower's position is liquidated
     * @param collateralAsset The address of the collateral commodity token
     * @param debtAsset The address of the debt asset
     * @param user The address of the borrower being liquidated
     * @param debtToCover The amount of debt covered by the liquidation
     * @param liquidatedCollateralAmount The amount of collateral seized
     * @param liquidator The address executing the liquidation
     * @param receiveAToken Whether the liquidator receives aTokens or underlying
     */
    event LiquidationCall(
        address indexed collateralAsset,
        address indexed debtAsset,
        address indexed user,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        address liquidator,
        bool receiveAToken
    );

    // Health factor threshold for full liquidation (0.95 = 95%)
    uint256 public constant CLOSE_FACTOR_HF_THRESHOLD = 0.95e18;
    
    // Maximum liquidation close factor (50% when HF >= threshold)
    uint256 public constant DEFAULT_LIQUIDATION_CLOSE_FACTOR = 0.5e18;
    
    // Liquidation protocol fee (percentage of liquidation bonus going to protocol)
    uint256 public constant LIQUIDATION_PROTOCOL_FEE = 0.05e4; // 5% in basis points

    struct LiquidationCallParams {
        uint256 reservesCount;
        uint256 debtToCover;
        address collateralAsset;
        address debtAsset;
        address user;
        bool receiveAToken;
        address priceOracle;
        uint8 userEModeCategory;
        address priceOracleSentinel;
    }

    struct LiquidationCallLocalVars {
        uint256 userCollateralBalance;
        uint256 userVariableDebt;
        uint256 userTotalDebt;
        uint256 actualDebtToLiquidate;
        uint256 actualCollateralToLiquidate;
        uint256 liquidationBonus;
        uint256 healthFactor;
        uint256 liquidationProtocolFeeAmount;
        address collateralPriceSource;
        address debtPriceSource;
        uint256 collateralPrice;
        uint256 debtPrice;
        bool isCollateralEnabled;
        DataTypes.InterestRateMode borrowRateMode;
    }

    /**
     * @notice Executes liquidation of an undercollateralized position
     * @dev Repays debt, seizes collateral with bonus, sends protocol fee
     * @param collateralReserve The collateral commodity reserve data
     * @param debtReserve The debt asset reserve data
     * @param reservesData Mapping of all reserves
     * @param reservesList List of all reserve addresses
     * @param eModeCategories E-Mode category configurations
     * @param userConfig The user configuration bitmap
     * @param params The liquidation parameters
     */
    function executeLiquidationCall(
        DataTypes.CommodityReserveData storage collateralReserve,
        DataTypes.CommodityReserveData storage debtReserve,
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        mapping(uint256 => address) storage reservesList,
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
        DataTypes.UserConfigurationMap storage userConfig,
        LiquidationCallParams memory params
    ) external {
        LiquidationCallLocalVars memory vars;

        // Create caches for both reserves
        DataTypes.CommodityCache memory debtCache = ReserveLogic.cache(debtReserve);
        DataTypes.CommodityCache memory collateralCache = ReserveLogic.cache(collateralReserve);

        // Update both reserve states with caches
        ReserveLogic.updateState(debtReserve, debtCache);
        ReserveLogic.updateState(collateralReserve, collateralCache);

        // Get user debt
        vars.userVariableDebt = IERC20(debtReserve.variableDebtTokenAddress).balanceOf(params.user);
        vars.userTotalDebt = vars.userVariableDebt + 
                            IERC20(debtReserve.stableDebtTokenAddress).balanceOf(params.user);

        // Get user collateral balance
        vars.userCollateralBalance = IERC20(collateralReserve.cTokenAddress).balanceOf(params.user);

        // Calculate health factor
        (
            ,
            ,
            ,
            ,
            vars.healthFactor,
        ) = GenericLogic.calculateUserAccountData(
            reservesData,
            reservesList,
            eModeCategories,
            DataTypes.CalculateUserAccountDataParams({
                userConfig: userConfig,
                commoditiesCount: params.reservesCount,
                user: params.user,
                oracle: params.priceOracle,
                userEModeCategory: params.userEModeCategory
            })
        );

        // Get liquidation bonus from collateral reserve configuration
        vars.liquidationBonus = collateralReserve.configuration.getLiquidationBonus();

        // Validate liquidation is allowed
        ValidationLogic.validateLiquidationCall(
            userConfig,
            collateralReserve,
            DataTypes.ValidateLiquidationCallParams({
                debtCommodityCache: DataTypes.CommodityCache({
                    currScaledVariableDebt: 0,
                    nextScaledVariableDebt: 0,
                    currPrincipalStableDebt: 0,
                    currAvgStableBorrowRate: 0,
                    currTotalStableDebt: 0,
                    nextAvgStableBorrowRate: 0,
                    nextTotalStableDebt: 0,
                    currLiquidityIndex: debtReserve.liquidityIndex,
                    nextLiquidityIndex: debtReserve.liquidityIndex,
                    currVariableBorrowIndex: debtReserve.variableBorrowIndex,
                    nextVariableBorrowIndex: debtReserve.variableBorrowIndex,
                    currLiquidityRate: debtReserve.currentLiquidityRate,
                    currVariableBorrowRate: debtReserve.currentVariableBorrowRate,
                    reserveFactor: 0,
                    commodityConfiguration: debtReserve.configuration,
                    cTokenAddress: debtReserve.cTokenAddress,
                    stableDebtTokenAddress: debtReserve.stableDebtTokenAddress,
                    variableDebtTokenAddress: debtReserve.variableDebtTokenAddress,
                    commodityLastUpdateTimestamp: debtReserve.lastUpdateTimestamp,
                    stableDebtLastUpdateTimestamp: 0
                }),
                totalDebt: vars.userTotalDebt,
                healthFactor: vars.healthFactor,
                priceOracleSentinel: params.priceOracleSentinel
            })
        );

        // Calculate actual debt to liquidate based on health factor
        if (vars.healthFactor < CLOSE_FACTOR_HF_THRESHOLD) {
            // Full liquidation allowed (100%)
            vars.actualDebtToLiquidate = vars.userTotalDebt;
        } else {
            // Partial liquidation (50% max)
            vars.actualDebtToLiquidate = vars.userTotalDebt.percentMul(DEFAULT_LIQUIDATION_CLOSE_FACTOR);
        }

        // Cap debt to cover to actual liquidatable amount
        if (params.debtToCover > vars.actualDebtToLiquidate) {
            params.debtToCover = vars.actualDebtToLiquidate;
        }

        // Burn debt tokens
        if (vars.userVariableDebt > 0) {
            vars.borrowRateMode = DataTypes.InterestRateMode.VARIABLE;
            
            IDebtToken(debtReserve.variableDebtTokenAddress).burn(
                params.user,
                params.debtToCover,
                debtReserve.variableBorrowIndex
            );
        } else {
            vars.borrowRateMode = DataTypes.InterestRateMode.STABLE;
            
            IDebtToken(debtReserve.stableDebtTokenAddress).burn(
                params.user,
                params.debtToCover
            );
        }

        // Update debt reserve interest rates
        ReserveLogic.updateInterestRates(
            debtReserve,
            debtCache,
            params.debtAsset,
            params.debtToCover,  // Liquidity added back
            0
        );

        // Calculate collateral to seize (with liquidation bonus)
        vars.actualCollateralToLiquidate = _calculateAvailableCollateralToLiquidate(
            collateralReserve,
            debtReserve,
            params.debtToCover,
            vars.userCollateralBalance,
            vars.liquidationBonus,
            params.priceOracle
        );

        // Calculate protocol liquidation fee
        vars.liquidationProtocolFeeAmount = vars.actualCollateralToLiquidate.percentMul(
            LIQUIDATION_PROTOCOL_FEE
        );

        // Transfer collateral to liquidator (minus protocol fee)
        if (params.receiveAToken) {
            // Transfer cTokens to liquidator
            ICommodityToken(collateralReserve.cTokenAddress).transferOnLiquidation(
                params.user,
                msg.sender,
                vars.actualCollateralToLiquidate - vars.liquidationProtocolFeeAmount
            );

            // Transfer protocol fee to treasury
            if (vars.liquidationProtocolFeeAmount > 0) {
                ICommodityToken(collateralReserve.cTokenAddress).transferOnLiquidation(
                    params.user,
                    address(this), // Treasury address would be configured
                    vars.liquidationProtocolFeeAmount
                );
            }
        } else {
            // Burn cTokens and transfer underlying commodity
            ICommodityToken(collateralReserve.cTokenAddress).burn(
                params.user,
                msg.sender,
                vars.actualCollateralToLiquidate - vars.liquidationProtocolFeeAmount,
                collateralReserve.liquidityIndex
            );

            // Transfer underlying to liquidator
            IERC20(params.collateralAsset).safeTransfer(
                msg.sender,
                vars.actualCollateralToLiquidate - vars.liquidationProtocolFeeAmount
            );

            // Handle protocol fee
            if (vars.liquidationProtocolFeeAmount > 0) {
                ICommodityToken(collateralReserve.cTokenAddress).burn(
                    params.user,
                    address(this),
                    vars.liquidationProtocolFeeAmount,
                    collateralReserve.liquidityIndex
                );
            }
        }

        // Update collateral reserve interest rates
        if (!params.receiveAToken) {
            ReserveLogic.updateInterestRates(
                collateralReserve,
                collateralCache,
                params.collateralAsset,
                0,
                vars.actualCollateralToLiquidate
            );
        }

        // Transfer debt asset from liquidator to pool
        IERC20(params.debtAsset).safeTransferFrom(
            msg.sender,
            address(this),
            params.debtToCover
        );

        // If user has no more collateral of this type, disable it
        if (IERC20(collateralReserve.cTokenAddress).balanceOf(params.user) == 0) {
            userConfig.setUsingAsCollateral(collateralReserve.id, false);
        }

        // If user has no more debt of this type, disable borrowing flag
        uint256 stableDebtAfter = IERC20(debtReserve.stableDebtTokenAddress).balanceOf(params.user);
        uint256 variableDebtAfter = IERC20(debtReserve.variableDebtTokenAddress).balanceOf(params.user);
        
        if (stableDebtAfter == 0 && variableDebtAfter == 0) {
            userConfig.setBorrowing(debtReserve.id, false);
        }

        emit LiquidationCall(
            params.collateralAsset,
            params.debtAsset,
            params.user,
            params.debtToCover,
            vars.actualCollateralToLiquidate,
            msg.sender,
            params.receiveAToken
        );
    }

    /**
     * @notice Calculates how much collateral can be liquidated
     * @dev Factors in debt amount, collateral value, and liquidation bonus
     * @param collateralReserve The collateral reserve data
     * @param debtReserve The debt reserve data
     * @param debtToCover The debt amount to cover
     * @param collateralBalance The borrower's collateral balance
     * @param liquidationBonus The liquidation bonus percentage
     * @param priceOracle The price oracle address
     * @return The amount of collateral to liquidate
     */
    function _calculateAvailableCollateralToLiquidate(
        DataTypes.CommodityReserveData storage collateralReserve,
        DataTypes.CommodityReserveData storage debtReserve,
        uint256 debtToCover,
        uint256 collateralBalance,
        uint256 liquidationBonus,
        address priceOracle
    ) internal view returns (uint256) {
        uint256 collateralPrice = 1e18; // Get from price oracle
        uint256 debtAssetPrice = 1e18;  // Get from price oracle

        // Calculate base collateral amount needed (without bonus)
        uint256 baseCollateral = debtToCover
            .wadMul(debtAssetPrice)
            .wadDiv(collateralPrice);

        // Add liquidation bonus
        uint256 maxCollateralToLiquidate = baseCollateral.percentMul(liquidationBonus);

        // Cap at user's actual collateral balance
        if (maxCollateralToLiquidate > collateralBalance) {
            return collateralBalance;
        }

        return maxCollateralToLiquidate;
    }
}
