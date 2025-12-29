// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SeasonalDataTypes} from "../types/SeasonalDataTypes.sol";

/**
 * @title CropCalendarLib
 * @notice Library containing comprehensive crop calendars for agricultural commodities
 * @dev Provides region-specific planting and harvest schedules for interest rate adjustment
 */
library CropCalendarLib {
    
    // ============ Regional Crop Calendar Constants ============
    
    // Regions
    bytes32 public constant REGION_US_MIDWEST = keccak256("US_MIDWEST");
    bytes32 public constant REGION_US_SOUTH = keccak256("US_SOUTH");
    bytes32 public constant REGION_BRAZIL = keccak256("BRAZIL");
    bytes32 public constant REGION_ARGENTINA = keccak256("ARGENTINA");
    bytes32 public constant REGION_EU_WEST = keccak256("EU_WEST");
    bytes32 public constant REGION_EU_EAST = keccak256("EU_EAST");
    bytes32 public constant REGION_AUSTRALIA = keccak256("AUSTRALIA");
    bytes32 public constant REGION_CHINA = keccak256("CHINA");
    bytes32 public constant REGION_INDIA = keccak256("INDIA");
    
    // ============ Crop Calendar Functions ============
    
    /**
     * @notice Get US Midwest corn calendar
     * @return profile Seasonal profile for US corn
     */
    function getUSCornProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // US Corn: Plant Apr-May, Pollinate Jul, Harvest Sep-Nov
        // Higher rates in spring (planting uncertainty), lower in fall (harvest)
        profile.monthlyMultipliers = [
            uint16(10500), // Jan - Winter storage
            uint16(10500), // Feb - Winter storage
            uint16(11000), // Mar - Pre-planting
            uint16(12000), // Apr - Planting begins
            uint16(12000), // May - Peak planting
            uint16(10500), // Jun - Growing
            uint16(11000), // Jul - Pollination (critical)
            uint16(10000), // Aug - Pre-harvest
            uint16(8000),  // Sep - Harvest begins
            uint16(7500),  // Oct - Peak harvest
            uint16(8500),  // Nov - Late harvest
            uint16(10000)  // Dec - Storage
        ];
        
        profile.isHarvestMonth = [
            false, false, false, false, false, false,
            false, false, true, true, true, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, true, true, false,
            false, false, false, false, false, false
        ];
    }
    
    /**
     * @notice Get Brazil soybean calendar (Southern Hemisphere)
     * @return profile Seasonal profile for Brazilian soybeans
     */
    function getBrazilSoybeanProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Brazil Soybeans: Plant Sep-Dec, Harvest Jan-May
        // Note: Southern hemisphere - seasons inverted
        profile.monthlyMultipliers = [
            uint16(8000),  // Jan - Peak harvest
            uint16(7500),  // Feb - Harvest
            uint16(8000),  // Mar - Harvest
            uint16(9000),  // Apr - Late harvest
            uint16(9500),  // May - Harvest ends
            uint16(10000), // Jun - Winter (dormant)
            uint16(10000), // Jul - Winter
            uint16(10500), // Aug - Pre-planting
            uint16(11500), // Sep - Planting begins
            uint16(12000), // Oct - Peak planting
            uint16(11500), // Nov - Planting
            uint16(10500)  // Dec - Growing
        ];
        
        profile.isHarvestMonth = [
            true, true, true, true, true, false,
            false, false, false, false, false, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, true, true, true, true
        ];
    }
    
    /**
     * @notice Get US Winter Wheat calendar
     * @return profile Seasonal profile for US winter wheat
     */
    function getUSWinterWheatProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Winter Wheat: Plant Sep-Oct, Harvest May-Jul
        profile.monthlyMultipliers = [
            uint16(11000), // Jan - Dormant
            uint16(11500), // Feb - Winter
            uint16(11000), // Mar - Spring growth
            uint16(10500), // Apr - Growing
            uint16(9000),  // May - Early harvest
            uint16(7500),  // Jun - Peak harvest
            uint16(8000),  // Jul - Late harvest
            uint16(9500),  // Aug - Post-harvest
            uint16(11500), // Sep - Planting begins
            uint16(12000), // Oct - Peak planting
            uint16(11000), // Nov - Establishment
            uint16(10500)  // Dec - Dormant
        ];
        
        profile.isHarvestMonth = [
            false, false, false, false, true, true,
            true, false, false, false, false, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, true, true, false, false
        ];
    }
    
    /**
     * @notice Get Colombian/Brazilian coffee (Arabica) calendar
     * @return profile Seasonal profile for Arabica coffee
     */
    function getCoffeeArabicaProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Brazil Arabica: Main harvest Apr-Sep, secondary Oct-Dec
        profile.monthlyMultipliers = [
            uint16(11500), // Jan - Inter-harvest peak
            uint16(12000), // Feb - Pre-harvest tension
            uint16(11500), // Mar - Pre-harvest
            uint16(9000),  // Apr - Harvest begins
            uint16(8000),  // May - Early harvest
            uint16(7500),  // Jun - Peak harvest
            uint16(7500),  // Jul - Harvest
            uint16(8000),  // Aug - Late harvest
            uint16(9000),  // Sep - Harvest ends
            uint16(10500), // Oct - Secondary harvest
            uint16(11000), // Nov - Flowering
            uint16(11500)  // Dec - Growing
        ];
        
        profile.isHarvestMonth = [
            false, false, false, true, true, true,
            true, true, true, true, false, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, false, false, true, true
        ];
    }
    
    /**
     * @notice Get sugar cane calendar (Brazil/India)
     * @return profile Seasonal profile for sugar cane
     */
    function getSugarCaneProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Brazil Sugar: Harvest Apr-Nov (crushing season)
        profile.monthlyMultipliers = [
            uint16(11500), // Jan - Off-season
            uint16(12000), // Feb - Off-season peak
            uint16(11500), // Mar - Pre-crushing
            uint16(9500),  // Apr - Crushing begins
            uint16(8500),  // May - Crushing
            uint16(8000),  // Jun - Peak crushing
            uint16(7500),  // Jul - Peak crushing
            uint16(8000),  // Aug - Crushing
            uint16(8500),  // Sep - Crushing
            uint16(9000),  // Oct - Late crushing
            uint16(10000), // Nov - Crushing ends
            uint16(11000)  // Dec - Off-season
        ];
        
        profile.isHarvestMonth = [
            false, false, false, true, true, true,
            true, true, true, true, true, false
        ];
        
        profile.isPlantingMonth = [
            true, true, true, false, false, false,
            false, false, false, false, false, false
        ];
    }
}
