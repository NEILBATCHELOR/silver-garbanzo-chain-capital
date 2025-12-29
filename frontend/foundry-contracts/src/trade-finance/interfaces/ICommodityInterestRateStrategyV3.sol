// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ICommodityInterestRateStrategyV2} from "./ICommodityInterestRateStrategyV2.sol";
import {SeasonalDataTypes} from "../libraries/types/SeasonalDataTypes.sol";
import {IFuturesCurveOracle} from "./IFuturesCurveOracle.sol";

/**
 * @title ICommodityInterestRateStrategyV3
 * @notice Interface for enhanced commodity interest rate strategy with futures curve integration
 * @dev Extends V2 with sub-commodity support, futures curve, and weather events
 */
interface ICommodityInterestRateStrategyV3 is ICommodityInterestRateStrategyV2 {
    
    // ============ Structs ============
    
    struct ExtendedCommodityConfig {
        uint16 subCommodityId;
        uint8 hemisphere;
        uint8 harvestStartMonth;
        uint8 harvestEndMonth;
        uint8 peakDemandMonth;
        uint8 weatherSensitivity;
        bool useFuturesCurve;
        bool useRegionalBasis;
        bytes32 primaryRegion;
    }
    
    // ============ Events ============
    
    event FuturesCurveOracleUpdated(
        address indexed oldOracle,
        address indexed newOracle
    );
    
    event ExtendedConfigUpdated(
        address indexed reserve,
        uint16 subCommodityId,
        bool useFuturesCurve,
        bool useRegionalBasis
    );
    
    event SubCommodityProfileUpdated(
        uint16 indexed subCommodityId,
        uint16[12] monthlyMultipliers
    );
    
    event WeatherEventUpdated(
        address indexed reserve,
        uint8 eventType,
        uint16 impactMultiplierBps,
        uint16 duration
    );
    
    // ============ View Functions ============
    
    /**
     * @notice Get the futures curve oracle address
     * @return The oracle address
     */
    function getFuturesCurveOracle() external view returns (address);
    
    /**
     * @notice Get extended configuration for a reserve
     * @param reserve The reserve address
     * @return config The extended configuration
     */
    function getExtendedConfig(
        address reserve
    ) external view returns (ExtendedCommodityConfig memory config);
    
    /**
     * @notice Get seasonal profile for a sub-commodity
     * @param subCommodityId The sub-commodity identifier
     * @return profile The seasonal profile
     */
    function getSubCommodityProfile(
        uint16 subCommodityId
    ) external view returns (SeasonalDataTypes.SeasonalProfile memory profile);
    
    /**
     * @notice Get active weather event for a reserve
     * @param reserve The reserve address
     * @return weatherEvent The active weather event
     */
    function getActiveWeatherEvent(
        address reserve
    ) external view returns (SeasonalDataTypes.WeatherEvent memory weatherEvent);
    
    /**
     * @notice Check if a weather event is currently active
     * @param reserve The reserve address
     * @return True if weather event is active
     */
    function hasActiveWeatherEvent(address reserve) external view returns (bool);
    
    /**
     * @notice Calculate current adjusted rate for a reserve
     * @param reserve The reserve address
     * @param utilization Current utilization ratio in ray
     * @return adjustedRate The current adjusted borrow rate
     */
    function getAdjustedRateForUtilization(
        address reserve,
        uint256 utilization
    ) external view returns (uint256 adjustedRate);
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set futures curve oracle address
     * @param oracle The futures curve oracle address
     */
    function setFuturesCurveOracle(address oracle) external;
    
    /**
     * @notice Set extended commodity configuration
     * @param reserve The reserve address
     * @param config The extended configuration
     */
    function setExtendedConfig(
        address reserve,
        ExtendedCommodityConfig calldata config
    ) external;
    
    /**
     * @notice Set seasonal profile for a sub-commodity
     * @param subCommodityId The sub-commodity identifier
     * @param profile The seasonal profile
     */
    function setSubCommodityProfile(
        uint16 subCommodityId,
        SeasonalDataTypes.SeasonalProfile calldata profile
    ) external;
    
    /**
     * @notice Set active weather event for a reserve
     * @param reserve The reserve address
     * @param eventType Weather event type
     * @param impactMultiplierBps Impact in basis points
     * @param durationDays Duration in days
     */
    function setWeatherEvent(
        address reserve,
        uint8 eventType,
        uint16 impactMultiplierBps,
        uint16 durationDays
    ) external;
    
    /**
     * @notice Clear weather event for a reserve
     * @param reserve The reserve address
     */
    function clearWeatherEvent(address reserve) external;
}
