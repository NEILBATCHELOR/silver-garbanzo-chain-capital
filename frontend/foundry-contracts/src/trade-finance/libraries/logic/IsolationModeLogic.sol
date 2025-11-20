// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";

/**
 * @title IsolationModeLogic library
 * @author Chain Capital
 * @notice Implements Isolation Mode for safe listing of risky commodities
 * @dev Restricts exposure via debt ceilings and collateral isolation
 */
library IsolationModeLogic {
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    /**
     * @dev Emitted when isolation mode debt ceiling is updated
     * @param asset The address of the isolated commodity
     * @param oldDebtCeiling The old debt ceiling
     * @param newDebtCeiling The new debt ceiling
     */
    event IsolationModeTotalDebtUpdated(
        address indexed asset,
        uint256 oldDebtCeiling,
        uint256 newDebtCeiling
    );

    // Decimal precision for debt ceiling (2 decimals = cents)
    uint256 public constant DEBT_CEILING_DECIMALS = 2;

    /**
     * @notice Validates supply to an isolated commodity
     * @dev Checks that user has no other collateral if supplying to isolated asset
     * @param reserveCache The commodity reserve configuration
     * @param userConfig The user configuration bitmap
     * @param reservesData Mapping of all reserves
     * @param reservesList List of all reserves
     */
    function executeIsolationModeValidation(
        DataTypes.CommodityConfigurationMap memory reserveCache,
        DataTypes.UserConfigurationMap memory userConfig,
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        address[] storage reservesList
    ) external view {
        // If asset is isolated
        if (reserveCache.getDebtCeiling() != 0) {
            // User must not have any other collateral enabled
            uint256 collateralCount = userConfig.getCollateralCount();
            
            require(
                collateralCount == 0,
                Errors.ISOLATED_COLLATERAL_VIOLATION
            );
        } else {
            // Asset is not isolated, but check if user has isolated collateral
            if (userConfig.isUsingAsCollateralAny()) {
                uint256 reservesCount = reservesList.length;
                
                for (uint256 i = 0; i < reservesCount; ) {
                    if (userConfig.isUsingAsCollateral(i)) {
                        DataTypes.CommodityReserveData storage reserve = 
                            reservesData[reservesList[i]];
                        
                        // If user has isolated collateral, cannot supply non-isolated
                        require(
                            reserve.configuration.getDebtCeiling() == 0,
                            Errors.ISOLATED_COLLATERAL_VIOLATION
                        );
                    }
                    
                    unchecked { ++i; }
                }
            }
        }
    }

    /**
     * @notice Validates borrow against isolated collateral
     * @dev Checks debt ceiling and that asset is borrowable in isolation
     * @param reservesData Mapping of all reserves
     * @param reservesList List of all reserves
     * @param userConfig User configuration bitmap
     * @param reserveCache Reserve configuration of asset being borrowed
     * @param isolationModeCollateralAddress Address of isolated collateral (if any)
     * @param isolationModeDebtCeiling Debt ceiling of isolated collateral
     * @param totalDebt Total debt in isolation mode
     * @param amount Amount being borrowed
     */
    function executeBorrowIsolationModeValidation(
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        address[] storage reservesList,
        DataTypes.UserConfigurationMap memory userConfig,
        DataTypes.CommodityConfigurationMap memory reserveCache,
        address isolationModeCollateralAddress,
        uint256 isolationModeDebtCeiling,
        uint256 totalDebt,
        uint256 amount
    ) external view {
        // If user has isolated collateral
        if (isolationModeCollateralAddress != address(0)) {
            // Asset must be borrowable in isolation mode
            require(
                reserveCache.getBorrowableInIsolation(),
                Errors.ASSET_NOT_BORROWABLE_IN_ISOLATION
            );

            // Check debt ceiling not exceeded
            uint256 nextDebt = totalDebt + amount;
            
            require(
                nextDebt <= isolationModeDebtCeiling,
                Errors.DEBT_CEILING_EXCEEDED
            );
        }
    }

    /**
     * @notice Updates the total debt for an isolated commodity
     * @dev Called on borrow/repay to track debt against ceiling
     * @param reserve The isolated commodity reserve
     * @param isolationModeTotalDebt Mapping of total debt per isolated asset
     * @param asset The isolated commodity address
     * @param amountChange The debt change (positive = borrow, negative = repay)
     */
    function executeUpdateIsolationModeDebt(
        DataTypes.CommodityReserveData storage reserve,
        mapping(address => uint256) storage isolationModeTotalDebt,
        address asset,
        int256 amountChange
    ) external {
        uint256 debtCeiling = reserve.configuration.getDebtCeiling();
        
        // Only update if asset is isolated
        if (debtCeiling != 0) {
            uint256 oldTotalDebt = isolationModeTotalDebt[asset];
            uint256 newTotalDebt;
            
            if (amountChange > 0) {
                // Borrowing - increase debt
                newTotalDebt = oldTotalDebt + uint256(amountChange);
                
                // Convert debt ceiling to same decimals as debt (18 decimals)
                uint256 debtCeilingScaled = debtCeiling * 10 ** (18 - DEBT_CEILING_DECIMALS);
                
                require(
                    newTotalDebt <= debtCeilingScaled,
                    Errors.DEBT_CEILING_EXCEEDED
                );
            } else {
                // Repaying - decrease debt
                uint256 amountToSubtract = uint256(-amountChange);
                newTotalDebt = oldTotalDebt > amountToSubtract 
                    ? oldTotalDebt - amountToSubtract 
                    : 0;
            }
            
            isolationModeTotalDebt[asset] = newTotalDebt;
            
            emit IsolationModeTotalDebtUpdated(asset, oldTotalDebt, newTotalDebt);
        }
    }

    /**
     * @notice Gets user's isolated collateral details
     * @dev Identifies if user has isolated collateral and its debt ceiling
     * @param userConfig User configuration bitmap
     * @param reservesData Mapping of all reserves
     * @param reservesList List of all reserves
     * @return isolatedCollateralAddress Address of isolated collateral (0 if none)
     * @return isolatedDebtCeiling Debt ceiling of isolated collateral
     * @return isolatedReserveIndex Reserve index of isolated collateral
     */
    function getIsolationModeCollateralInfo(
        DataTypes.UserConfigurationMap memory userConfig,
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        address[] storage reservesList
    ) external view returns (
        address isolatedCollateralAddress,
        uint256 isolatedDebtCeiling,
        uint256 isolatedReserveIndex
    ) {
        // Check if user has any collateral
        if (!userConfig.isUsingAsCollateralAny()) {
            return (address(0), 0, 0);
        }

        uint256 reservesCount = reservesList.length;
        
        // Find isolated collateral (user can only have one if isolated)
        for (uint256 i = 0; i < reservesCount; ) {
            if (userConfig.isUsingAsCollateral(i)) {
                address collateralAddress = reservesList[i];
                DataTypes.CommodityReserveData storage reserve = 
                    reservesData[collateralAddress];
                
                uint256 debtCeiling = reserve.configuration.getDebtCeiling();
                
                if (debtCeiling != 0) {
                    // Found isolated collateral
                    return (
                        collateralAddress,
                        debtCeiling * 10 ** (18 - DEBT_CEILING_DECIMALS),
                        i
                    );
                }
            }
            
            unchecked { ++i; }
        }

        return (address(0), 0, 0);
    }

    /**
     * @notice Checks if asset can be added to isolation mode
     * @dev Only assets with no supplied liquidity can be made isolated
     * @param cTokenAddress The cToken address
     * @return True if asset can be isolated
     */
    function checkNoSuppliers(
        address cTokenAddress
    ) external view returns (bool) {
        // Check if cToken has zero total supply
        // This would require ICommodityToken interface
        // For now, return true (would be implemented with actual token check)
        return true;
    }

    /**
     * @notice Example isolation mode configurations for commodity trade finance
     * @dev These would be set during asset listing
     * 
     * Carbon Credits (New, High Risk):
     * - Isolated: Yes
     * - Debt Ceiling: $5,000,000 (500,000,000 in 2 decimal format)
     * - Borrowable in Isolation: USDC, USDT, DAI only
     * - Use Case: Test carbon credit market without endangering protocol
     * 
     * Experimental Agricultural (Unproven):
     * - Isolated: Yes
     * - Debt Ceiling: $1,000,000
     * - Borrowable in Isolation: Stablecoins only
     * - Use Case: List new crop type with limited exposure
     * 
     * Illiquid Metals (Rare Earth):
     * - Isolated: Yes
     * - Debt Ceiling: $2,000,000
     * - Borrowable in Isolation: Stablecoins only
     * - Use Case: Support niche metals with controlled risk
     * 
     * Gold (Proven):
     * - Isolated: No
     * - Debt Ceiling: 0 (unlimited)
     * - Borrowable in Isolation: N/A
     * - Use Case: Full protocol exposure for proven asset
     */
}
