// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DataTypes} from "../types/DataTypes.sol";
import {Errors} from "../helpers/Errors.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";

/**
 * @title EModeLogic library
 * @author Chain Capital
 * @notice Implements Efficiency Mode (E-Mode) for correlated assets
 * @dev Allows up to 90%+ LTV for same-category collateral/debt (e.g., stablecoins)
 */
library EModeLogic {
    using ReserveConfiguration for DataTypes.CommodityConfigurationMap;
    using UserConfiguration for DataTypes.UserConfigurationMap;

    /**
     * @dev Emitted when user enters E-Mode
     * @param user The address of the user
     * @param categoryId The E-Mode category ID
     */
    event UserEModeSet(address indexed user, uint8 categoryId);

    // Maximum E-Mode categories (255 categories)
    uint8 public constant MAX_EMODE_CATEGORIES = 255;
    
    // Category 0 is reserved for non-E-Mode (default)
    uint8 public constant EMODE_CATEGORY_NONE = 0;

    /**
     * @notice Sets user's E-Mode category
     * @dev User can only enter E-Mode if all borrowed assets belong to that category
     * @param reservesData Mapping of all reserves
     * @param reservesList Mapping of reserve IDs to addresses
     * @param eModeCategories Mapping of E-Mode categories
     * @param usersEModeCategory Mapping of users to categories
     * @param userConfig The user configuration bitmap
     * @param categoryId The E-Mode category to enter (0 = exit E-Mode)
     * @param reservesCount Total number of reserves
     * @param oracle Price oracle address
     */
    function executeSetUserEMode(
        mapping(address => DataTypes.CommodityReserveData) storage reservesData,
        mapping(uint256 => address) storage reservesList,
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
        mapping(address => uint8) storage usersEModeCategory,
        DataTypes.UserConfigurationMap storage userConfig,
        uint8 categoryId,
        uint256 reservesCount,
        address oracle
    ) external {
        // Validate category exists and is not category 0 unless exiting E-Mode
        if (categoryId != EMODE_CATEGORY_NONE) {
            require(
                eModeCategories[categoryId].liquidationThreshold != 0,
                Errors.EMODE_CATEGORY_DOES_NOT_EXIST
            );
        }

        // Get user's current borrowed assets
        uint256 borrowedAssets = userConfig.getBorrowedAssets();
        
        // If entering E-Mode, validate all borrowed assets are in that category
        if (categoryId != EMODE_CATEGORY_NONE && borrowedAssets != 0) {
            for (uint256 i = 0; i < reservesCount; ) {
                if (userConfig.isBorrowing(i)) {
                    DataTypes.CommodityReserveData storage reserve = reservesData[reservesList[i]];
                    
                    require(
                        categoryId == reserve.configuration.getEModeCategory(),
                        Errors.INCONSISTENT_EMODE_CATEGORY
                    );
                }
                
                unchecked { ++i; }
            }
        }
        
        // Update user's E-Mode category
        usersEModeCategory[msg.sender] = categoryId;
        
        emit UserEModeSet(msg.sender, categoryId);
    }

    /**
     * @notice Gets effective LTV and liquidation threshold for user
     * @dev Returns E-Mode values if user is in E-Mode and collateral matches category
     * @param reserveCache The reserve configuration cache
     * @param eModeUserCategory The user's E-Mode category
     * @param eModeAssetCategory The asset's E-Mode category
     * @param eModeCategories Mapping of E-Mode categories
     * @return ltv The effective loan-to-value
     * @return liquidationThreshold The effective liquidation threshold
     * @return liquidationBonus The effective liquidation bonus
     * @return priceSource The price oracle to use (if custom)
     * @return eModeAssetPrice The asset price from E-Mode oracle (if applicable)
     */
    function getEModeConfiguration(
        DataTypes.CommodityConfigurationMap memory reserveCache,
        uint8 eModeUserCategory,
        uint8 eModeAssetCategory,
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories
    ) internal view returns (
        uint256 ltv,
        uint256 liquidationThreshold,
        uint256 liquidationBonus,
        address priceSource,
        uint256 eModeAssetPrice
    ) {
        // If user is in E-Mode and asset belongs to same category
        if (eModeUserCategory != EMODE_CATEGORY_NONE && 
            eModeUserCategory == eModeAssetCategory) {
            
            DataTypes.EModeCategory storage category = eModeCategories[eModeUserCategory];
            
            // Use E-Mode values
            ltv = category.ltv;
            liquidationThreshold = category.liquidationThreshold;
            liquidationBonus = category.liquidationBonus;
            priceSource = category.priceSource;
            
            // If custom price source, get price from it
            if (priceSource != address(0)) {
                // Would call price oracle here
                eModeAssetPrice = 1e18; // Placeholder
            }
        } else {
            // Use standard reserve values
            ltv = reserveCache.getLtv();
            liquidationThreshold = reserveCache.getLiquidationThreshold();
            liquidationBonus = reserveCache.getLiquidationBonus();
            priceSource = address(0);
            eModeAssetPrice = 0;
        }
    }

    /**
     * @notice Configures a new E-Mode category
     * @dev Only callable by authorized admin (via pool configurator)
     * @param eModeCategories Mapping of E-Mode categories
     * @param categoryId The category ID to configure
     * @param ltv The loan-to-value ratio
     * @param liquidationThreshold The liquidation threshold
     * @param liquidationBonus The liquidation bonus
     * @param priceSource Optional custom price oracle
     * @param label The category label
     */
    function configureEModeCategory(
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
        uint8 categoryId,
        uint16 ltv,
        uint16 liquidationThreshold,
        uint16 liquidationBonus,
        address priceSource,
        string memory label
    ) external {
        require(categoryId != EMODE_CATEGORY_NONE, Errors.EMODE_CATEGORY_RESERVED);
        require(categoryId <= MAX_EMODE_CATEGORIES, Errors.INVALID_EMODE_CATEGORY_ID);
        
        // Validate parameters
        require(ltv <= liquidationThreshold, Errors.INVALID_EMODE_CATEGORY_PARAMS);
        require(
            liquidationThreshold <= PercentageMath.PERCENTAGE_FACTOR,
            Errors.INVALID_EMODE_CATEGORY_PARAMS
        );

        DataTypes.EModeCategory storage category = eModeCategories[categoryId];
        category.ltv = ltv;
        category.liquidationThreshold = liquidationThreshold;
        category.liquidationBonus = liquidationBonus;
        category.priceSource = priceSource;
        category.label = label;
    }

    /**
     * @notice Gets E-Mode category data
     * @param eModeCategories Mapping of E-Mode categories
     * @param categoryId The category ID
     * @return The E-Mode category configuration
     */
    function getEModeCategory(
        mapping(uint8 => DataTypes.EModeCategory) storage eModeCategories,
        uint8 categoryId
    ) external view returns (DataTypes.EModeCategory memory) {
        return eModeCategories[categoryId];
    }

    /**
     * @notice Checks if user can borrow asset in their current E-Mode
     * @dev User in E-Mode can only borrow assets from the same category
     * @param userEModeCategory The user's E-Mode category
     * @param reserveEModeCategory The asset's E-Mode category
     * @return True if borrowing is allowed
     */
    function isInEModeCategory(
        uint8 userEModeCategory,
        uint8 reserveEModeCategory
    ) internal pure returns (bool) {
        // Not in E-Mode - can borrow anything
        if (userEModeCategory == EMODE_CATEGORY_NONE) {
            return true;
        }

        // In E-Mode - can only borrow from same category
        return userEModeCategory == reserveEModeCategory;
    }

    /**
     * @notice Example E-Mode categories for commodity trade finance
     * @dev These would be configured during deployment
     * 
     * Category 1: Stablecoins
     * - LTV: 97%
     * - Liquidation Threshold: 98%
     * - Liquidation Bonus: 2%
     * - Assets: USDC, USDT, DAI (stablecoin-backed commodity receipts)
     * 
     * Category 2: Precious Metals
     * - LTV: 90%
     * - Liquidation Threshold: 93%
     * - Liquidation Bonus: 5%
     * - Assets: Gold tokens, Silver tokens, Platinum tokens
     * - Custom Oracle: Precious metals aggregator
     * 
     * Category 3: Energy (Crude Oil)
     * - LTV: 85%
     * - Liquidation Threshold: 88%
     * - Liquidation Bonus: 7%
     * - Assets: WTI tokens, Brent tokens
     * - Custom Oracle: Energy price feed
     * 
     * Category 4: Agricultural (Same Crop)
     * - LTV: 88%
     * - Liquidation Threshold: 91%
     * - Liquidation Bonus: 6%
     * - Assets: Argentine soybeans, Brazilian soybeans
     * - Custom Oracle: Soybean price aggregator
     */
}

// Helper library for percentage math (if not already imported)
library PercentageMath {
    uint256 internal constant PERCENTAGE_FACTOR = 1e4; // 100.00%
}
