// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SeasonalDataTypes} from "../types/SeasonalDataTypes.sol";
import {WadRayMath} from "../math/WadRayMath.sol";

/**
 * @title SubCommoditySeasonalLib
 * @notice Library for sub-commodity seasonal rate calculations
 * @dev Provides harvest-aware seasonal multipliers with hemisphere adjustments
 */
library SubCommoditySeasonalLib {
    using WadRayMath for uint256;
    
    // ============ Constants ============
    
    uint256 internal constant BPS_BASE = 10000;
    uint256 internal constant RAY = 1e27;
    
    // Default seasonal multiplier (100%)
    uint16 internal constant DEFAULT_MULTIPLIER = 10000;
    
    // Harvest discount (lower rates during abundance)
    uint16 internal constant HARVEST_DISCOUNT = 7500;  // 75%
    
    // Planting premium (higher rates during uncertainty)
    uint16 internal constant PLANTING_PREMIUM = 11500; // 115%
    
    // Peak demand premium
    uint16 internal constant PEAK_DEMAND_PREMIUM = 12000; // 120%

    
    // ============ Core Functions ============
    
    /**
     * @notice Calculate seasonal multiplier for a sub-commodity
     * @param config The sub-commodity configuration
     * @param profile The seasonal profile
     * @param currentMonth Current month (1-12)
     * @return multiplierRay Seasonal multiplier in ray format
     */
    function calculateSeasonalMultiplier(
        SeasonalDataTypes.SubCommodityConfig memory config,
        SeasonalDataTypes.SeasonalProfile memory profile,
        uint8 currentMonth
    ) internal pure returns (uint256 multiplierRay) {
        require(currentMonth >= 1 && currentMonth <= 12, "Invalid month");
        
        uint8 effectiveMonth = currentMonth;
        
        // Apply hemisphere adjustment for southern hemisphere
        if (config.hemisphere == SeasonalDataTypes.HEMISPHERE_SOUTHERN) {
            effectiveMonth = _getOppositeMonth(currentMonth);
        }
        
        uint8 monthIndex = effectiveMonth - 1;
        
        // Get base multiplier from profile
        uint16 baseMultiplier = profile.monthlyMultipliers[monthIndex];
        if (baseMultiplier == 0) {
            baseMultiplier = DEFAULT_MULTIPLIER;
        }

        
        // Apply harvest/planting adjustments
        if (profile.isHarvestMonth[monthIndex]) {
            baseMultiplier = _applyDiscount(baseMultiplier, HARVEST_DISCOUNT);
        } else if (profile.isPlantingMonth[monthIndex]) {
            baseMultiplier = _applyPremium(baseMultiplier, PLANTING_PREMIUM);
        }
        
        // Apply peak demand adjustment
        if (effectiveMonth == config.peakDemandMonth) {
            baseMultiplier = _applyPremium(baseMultiplier, PEAK_DEMAND_PREMIUM);
        }
        
        // Convert to ray
        return (uint256(baseMultiplier) * RAY) / BPS_BASE;
    }
    
    /**
     * @notice Check if current period is harvest season
     * @param config The sub-commodity configuration
     * @param currentMonth Current month (1-12)
     * @return True if in harvest season
     */
    function isHarvestSeason(
        SeasonalDataTypes.SubCommodityConfig memory config,
        uint8 currentMonth
    ) internal pure returns (bool) {
        uint8 effectiveMonth = currentMonth;
        if (config.hemisphere == SeasonalDataTypes.HEMISPHERE_SOUTHERN) {
            effectiveMonth = _getOppositeMonth(currentMonth);
        }

        
        // Handle wrap-around for harvest spanning year end
        if (config.harvestStartMonth <= config.harvestEndMonth) {
            return effectiveMonth >= config.harvestStartMonth && 
                   effectiveMonth <= config.harvestEndMonth;
        } else {
            // Harvest wraps around year end
            return effectiveMonth >= config.harvestStartMonth || 
                   effectiveMonth <= config.harvestEndMonth;
        }
    }
    
    /**
     * @notice Calculate weather-adjusted multiplier
     * @param baseMultiplier Base seasonal multiplier in bps
     * @param weatherEvent Active weather event data
     * @param weatherSensitivity Commodity's sensitivity to weather (0-100)
     * @return adjustedMultiplier Weather-adjusted multiplier in bps
     */
    function applyWeatherAdjustment(
        uint16 baseMultiplier,
        SeasonalDataTypes.WeatherEvent memory weatherEvent,
        uint8 weatherSensitivity
    ) internal view returns (uint16 adjustedMultiplier) {
        // Check if weather event is still active
        if (weatherEvent.eventType == SeasonalDataTypes.WEATHER_NORMAL ||
            block.timestamp > weatherEvent.startTimestamp + (uint256(weatherEvent.duration) * 1 days)) {
            return baseMultiplier;
        }

        
        // Calculate weather impact scaled by sensitivity
        // Impact = weatherImpact * (sensitivity / 100)
        uint256 scaledImpact = (uint256(weatherEvent.impactMultiplierBps) * weatherSensitivity) / 100;
        
        // Apply impact to base multiplier
        uint256 adjusted = (uint256(baseMultiplier) * (BPS_BASE + scaledImpact)) / BPS_BASE;
        
        // Cap at 200% maximum
        if (adjusted > 20000) {
            adjusted = 20000;
        }
        
        return uint16(adjusted);
    }
    
    // ============ Default Profile Generators ============
    
    /**
     * @notice Get default seasonal profile for wheat
     * @return profile Seasonal profile for wheat
     */
    function getWheatProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Northern hemisphere wheat: Plant Oct-Nov, Harvest Jun-Aug
        profile.monthlyMultipliers = [
            uint16(11000), // Jan - Winter, storage costs
            uint16(11500), // Feb - Winter peak
            uint16(11000), // Mar - Early spring
            uint16(10500), // Apr - Growing season starts
            uint16(10000), // May - Pre-harvest
            uint16(8500),  // Jun - Early harvest
            uint16(7500),  // Jul - Peak harvest
            uint16(8000),  // Aug - Late harvest
            uint16(9500),  // Sep - Post-harvest
            uint16(10500), // Oct - Planting
            uint16(11000), // Nov - Planting ends
            uint16(11000)  // Dec - Winter storage
        ];

        
        profile.isHarvestMonth = [
            false, false, false, false, false, true,  // Jun
            true,  true,  false, false, false, false  // Jul, Aug harvest
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, false, true,  true,  false  // Oct, Nov planting
        ];
    }
    
    /**
     * @notice Get default seasonal profile for corn
     * @return profile Seasonal profile for corn
     */
    function getCornProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Corn: Plant Apr-May, Harvest Sep-Nov
        profile.monthlyMultipliers = [
            uint16(10500), // Jan
            uint16(10500), // Feb
            uint16(11000), // Mar - Pre-planting
            uint16(11500), // Apr - Planting starts
            uint16(11500), // May - Planting peak
            uint16(10500), // Jun - Growing
            uint16(10000), // Jul - Pollination
            uint16(9500),  // Aug - Pre-harvest
            uint16(8000),  // Sep - Harvest starts
            uint16(7500),  // Oct - Peak harvest
            uint16(8500),  // Nov - Late harvest
            uint16(10000)  // Dec
        ];

        
        profile.isHarvestMonth = [
            false, false, false, false, false, false,
            false, false, true,  true,  true,  false  // Sep-Nov harvest
        ];
        
        profile.isPlantingMonth = [
            false, false, false, true,  true,  false,  // Apr-May planting
            false, false, false, false, false, false
        ];
    }
    
    /**
     * @notice Get default seasonal profile for coffee
     * @return profile Seasonal profile for coffee
     */
    function getCoffeeProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Brazilian coffee: Main harvest Apr-Sep
        profile.monthlyMultipliers = [
            uint16(11500), // Jan - Inter-harvest
            uint16(12000), // Feb - Pre-harvest tension
            uint16(11500), // Mar - Pre-harvest
            uint16(9000),  // Apr - Harvest starts
            uint16(8000),  // May - Peak harvest
            uint16(7500),  // Jun - Peak harvest
            uint16(8000),  // Jul - Harvest
            uint16(8500),  // Aug - Late harvest
            uint16(9500),  // Sep - Harvest ends
            uint16(10500), // Oct - Post-harvest
            uint16(11000), // Nov - Flowering
            uint16(11500)  // Dec - Growing
        ];

        
        profile.isHarvestMonth = [
            false, false, false, true,  true,  true,
            true,  true,  true,  false, false, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, false, false, true,  true  // Nov-Dec flowering/planting
        ];
    }
    
    /**
     * @notice Get default seasonal profile for natural gas
     * @return profile Seasonal profile for natural gas
     */
    function getNaturalGasProfile() internal pure returns (SeasonalDataTypes.SeasonalProfile memory profile) {
        // Higher rates in winter (heating), lower in shoulder months
        profile.monthlyMultipliers = [
            uint16(14000), // Jan - Peak winter
            uint16(13000), // Feb - Winter
            uint16(10500), // Mar - Shoulder
            uint16(9000),  // Apr - Injection season
            uint16(8500),  // May - Low demand
            uint16(9500),  // Jun - Cooling starts
            uint16(11000), // Jul - Summer peak
            uint16(11000), // Aug - Summer
            uint16(9500),  // Sep - Shoulder
            uint16(10500), // Oct - Heating prep
            uint16(12000), // Nov - Heating starts
            uint16(13500)  // Dec - Winter
        ];

        
        // No harvest/planting for energy
        profile.isHarvestMonth = [
            false, false, false, false, false, false,
            false, false, false, false, false, false
        ];
        
        profile.isPlantingMonth = [
            false, false, false, false, false, false,
            false, false, false, false, false, false
        ];
    }
    
    // ============ Internal Helper Functions ============
    
    /**
     * @notice Get the opposite month for hemisphere adjustment
     * @param month Current month (1-12)
     * @return opposite Opposite month (1-12)
     */
    function _getOppositeMonth(uint8 month) private pure returns (uint8) {
        // Add 6 months, wrap around
        uint8 opposite = ((month - 1 + 6) % 12) + 1;
        return opposite;
    }
    
    /**
     * @notice Apply a discount to a base multiplier
     * @param base Base multiplier in bps
     * @param discountBps Discount factor in bps (e.g., 7500 = 75%)
     * @return result Discounted multiplier
     */
    function _applyDiscount(uint16 base, uint16 discountBps) private pure returns (uint16) {
        return uint16((uint256(base) * discountBps) / BPS_BASE);
    }

    
    /**
     * @notice Apply a premium to a base multiplier
     * @param base Base multiplier in bps
     * @param premiumBps Premium factor in bps (e.g., 11500 = 115%)
     * @return result Premium-adjusted multiplier
     */
    function _applyPremium(uint16 base, uint16 premiumBps) private pure returns (uint16) {
        uint256 result = (uint256(base) * premiumBps) / BPS_BASE;
        // Cap at maximum allowed
        if (result > 20000) {
            result = 20000;
        }
        return uint16(result);
    }
    
    /**
     * @notice Get current month from timestamp
     * @param timestamp Unix timestamp
     * @return month Current month (1-12)
     */
    function getCurrentMonth(uint256 timestamp) internal pure returns (uint8) {
        // Approximate month calculation
        // More accurate calculation would require full date parsing
        uint256 daysSinceEpoch = timestamp / 1 days;
        uint256 monthsSinceEpoch = daysSinceEpoch / 30;
        return uint8((monthsSinceEpoch % 12) + 1);
    }
}
