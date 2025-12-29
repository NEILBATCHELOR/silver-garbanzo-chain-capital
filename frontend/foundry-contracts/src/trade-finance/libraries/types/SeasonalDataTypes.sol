// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SeasonalDataTypes
 * @notice Data structures for commodity seasonal adjustments
 * @dev Supports sub-commodity type granularity and hemisphere-aware calculations
 */
library SeasonalDataTypes {
    
    // ============ Sub-Commodity Identifiers ============
    
    // Agricultural - Grains
    uint16 public constant WHEAT_WINTER = 100;
    uint16 public constant WHEAT_SPRING = 101;
    uint16 public constant CORN = 102;
    uint16 public constant SOYBEANS = 103;
    uint16 public constant RICE = 104;
    uint16 public constant OATS = 105;
    uint16 public constant BARLEY = 106;
    
    // Agricultural - Softs
    uint16 public constant COFFEE_ARABICA = 200;
    uint16 public constant COFFEE_ROBUSTA = 201;
    uint16 public constant COCOA = 202;
    uint16 public constant SUGAR_RAW = 203;
    uint16 public constant SUGAR_WHITE = 204;
    uint16 public constant COTTON = 205;
    uint16 public constant ORANGE_JUICE = 206;
    
    // Agricultural - Livestock
    uint16 public constant CATTLE_LIVE = 300;
    uint16 public constant CATTLE_FEEDER = 301;
    uint16 public constant HOGS_LEAN = 302;
    
    // Energy
    uint16 public constant CRUDE_WTI = 400;
    uint16 public constant CRUDE_BRENT = 401;
    uint16 public constant NATURAL_GAS = 402;
    uint16 public constant HEATING_OIL = 403;
    uint16 public constant GASOLINE_RBOB = 404;
    
    // Precious Metals
    uint16 public constant GOLD = 500;
    uint16 public constant SILVER = 501;
    uint16 public constant PLATINUM = 502;
    uint16 public constant PALLADIUM = 503;
    
    // Base Metals
    uint16 public constant COPPER = 600;
    uint16 public constant ALUMINUM = 601;
    uint16 public constant ZINC = 602;
    uint16 public constant NICKEL = 603;
    uint16 public constant LEAD = 604;
    uint16 public constant TIN = 605;
    
    // Carbon Credits
    uint16 public constant EUA = 700;           // EU Allowances
    uint16 public constant CCA = 701;           // California Carbon Allowances
    uint16 public constant RGGI = 702;          // Regional Greenhouse Gas Initiative
    uint16 public constant VCU = 703;           // Verified Carbon Units
    
    // ============ Hemisphere ============
    
    uint8 public constant HEMISPHERE_NORTHERN = 0;
    uint8 public constant HEMISPHERE_SOUTHERN = 1;
    uint8 public constant HEMISPHERE_GLOBAL = 2;  // No hemisphere adjustment
    
    // ============ Structs ============
    
    /**
     * @notice Sub-commodity configuration
     * @param subCommodityId Unique identifier for sub-commodity
     * @param commodityType Parent commodity type (0-4)
     * @param hemisphere Primary production hemisphere
     * @param harvestStartMonth Start of harvest season (1-12)
     * @param harvestEndMonth End of harvest season (1-12)
     * @param peakDemandMonth Peak demand month (1-12)
     * @param storageDecayPerDay Daily storage decay in bps
     * @param weatherSensitivity Sensitivity to weather events (0-100)
     */
    struct SubCommodityConfig {
        uint16 subCommodityId;
        uint8 commodityType;
        uint8 hemisphere;
        uint8 harvestStartMonth;
        uint8 harvestEndMonth;
        uint8 peakDemandMonth;
        uint16 storageDecayPerDay;
        uint8 weatherSensitivity;
    }
    
    /**
     * @notice Monthly seasonal profile
     * @param monthlyMultipliers 12 values in bps (10000 = 100%)
     * @param isHarvestMonth Boolean for each month indicating harvest
     * @param isPlantingMonth Boolean for each month indicating planting
     */
    struct SeasonalProfile {
        uint16[12] monthlyMultipliers;
        bool[12] isHarvestMonth;
        bool[12] isPlantingMonth;
    }
    
    /**
     * @notice Weather event impact data
     * @param eventType Type of weather event
     * @param impactMultiplierBps Rate adjustment in bps
     * @param duration Expected duration in days
     * @param startTimestamp When event started
     */
    struct WeatherEvent {
        uint8 eventType;
        uint16 impactMultiplierBps;
        uint16 duration;
        uint256 startTimestamp;
    }
    
    // Weather event types
    uint8 public constant WEATHER_DROUGHT = 1;
    uint8 public constant WEATHER_FLOOD = 2;
    uint8 public constant WEATHER_FROST = 3;
    uint8 public constant WEATHER_HEAT_WAVE = 4;
    uint8 public constant WEATHER_HURRICANE = 5;
    uint8 public constant WEATHER_NORMAL = 0;
}
