// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {CommodityInterestRateStrategyV2} from "./CommodityInterestRateStrategyV2.sol";
import {IFuturesCurveOracle} from "../interfaces/IFuturesCurveOracle.sol";
import {SeasonalDataTypes} from "../libraries/types/SeasonalDataTypes.sol";
import {SubCommoditySeasonalLib} from "../libraries/seasonal/SubCommoditySeasonalLib.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title CommodityInterestRateStrategyV3
 * @notice Enhanced commodity interest rate strategy with futures curve and sub-commodity support
 * @dev Extends V2 with:
 *      - Dynamic futures curve integration for real-time contango/backwardation
 *      - Sub-commodity type granularity (wheat vs corn vs soybeans)
 *      - Regional basis adjustments (LME vs COMEX vs SHFE)
 *      - Weather event impact integration
 *      - Harvest calendar awareness
 */
contract CommodityInterestRateStrategyV3 is CommodityInterestRateStrategyV2 {
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    using SubCommoditySeasonalLib for SeasonalDataTypes.SubCommodityConfig;
    
    // ============ Constants ============
    
    // Maximum futures curve adjustment (10% annualized)
    int256 public constant MAX_FUTURES_ADJUSTMENT_BPS = 1000;

    
    // Maximum regional basis adjustment (5%)
    int256 public constant MAX_REGIONAL_ADJUSTMENT_BPS = 500;
    
    // Maximum weather impact (30%)
    uint16 public constant MAX_WEATHER_IMPACT_BPS = 3000;
    
    // Futures data staleness threshold (4 hours)
    uint256 public constant FUTURES_STALENESS_THRESHOLD = 4 hours;
    
    // ============ Structs ============
    
    /**
     * @notice Extended commodity configuration with sub-commodity support
     * @param subCommodityId Sub-commodity identifier
     * @param hemisphere Primary production hemisphere
     * @param harvestStartMonth Start of harvest (1-12)
     * @param harvestEndMonth End of harvest (1-12)
     * @param peakDemandMonth Peak demand month (1-12)
     * @param weatherSensitivity Weather sensitivity (0-100)
     * @param useFuturesCurve Whether to use futures curve for rate adjustment
     * @param useRegionalBasis Whether to apply regional basis adjustments
     * @param primaryRegion Primary trading region
     */
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

    
    // ============ State Variables ============
    
    /// @dev Futures curve oracle
    IFuturesCurveOracle public futuresCurveOracle;
    
    /// @dev Reserve address => extended configuration
    mapping(address => ExtendedCommodityConfig) internal _extendedConfig;
    
    /// @dev Sub-commodity ID => seasonal profile
    mapping(uint16 => SeasonalDataTypes.SeasonalProfile) internal _subCommodityProfiles;
    
    /// @dev Reserve address => active weather event
    mapping(address => SeasonalDataTypes.WeatherEvent) internal _activeWeatherEvents;
    
    // ============ Events ============
    
    event FuturesCurveOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
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

    
    // ============ Constructor ============
    
    constructor(
        address provider,
        address _futuresCurveOracle
    ) CommodityInterestRateStrategyV2(provider) {
        if (_futuresCurveOracle != address(0)) {
            futuresCurveOracle = IFuturesCurveOracle(_futuresCurveOracle);
        }
        _initializeDefaultSubCommodityProfiles();
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Set futures curve oracle address
     * @param oracle The futures curve oracle address
     */
    function setFuturesCurveOracle(address oracle) external onlyPoolConfigurator {
        address oldOracle = address(futuresCurveOracle);
        futuresCurveOracle = IFuturesCurveOracle(oracle);
        emit FuturesCurveOracleUpdated(oldOracle, oracle);
    }
    
    /**
     * @notice Set extended commodity configuration
     * @param reserve The reserve address
     * @param config The extended configuration
     */
    function setExtendedConfig(
        address reserve,
        ExtendedCommodityConfig calldata config
    ) external onlyPoolConfigurator {
        require(reserve != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        _extendedConfig[reserve] = config;

        
        emit ExtendedConfigUpdated(
            reserve,
            config.subCommodityId,
            config.useFuturesCurve,
            config.useRegionalBasis
        );
    }
    
    /**
     * @notice Set seasonal profile for a sub-commodity
     * @param subCommodityId The sub-commodity identifier
     * @param profile The seasonal profile
     */
    function setSubCommodityProfile(
        uint16 subCommodityId,
        SeasonalDataTypes.SeasonalProfile calldata profile
    ) external onlyPoolConfigurator {
        _subCommodityProfiles[subCommodityId] = profile;
        emit SubCommodityProfileUpdated(subCommodityId, profile.monthlyMultipliers);
    }
    
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
    ) external onlyPoolConfigurator {
        require(reserve != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        require(impactMultiplierBps <= MAX_WEATHER_IMPACT_BPS, "Impact too high");

        
        _activeWeatherEvents[reserve] = SeasonalDataTypes.WeatherEvent({
            eventType: eventType,
            impactMultiplierBps: impactMultiplierBps,
            duration: durationDays,
            startTimestamp: block.timestamp
        });
        
        emit WeatherEventUpdated(reserve, eventType, impactMultiplierBps, durationDays);
    }
    
    /**
     * @notice Clear weather event for a reserve
     * @param reserve The reserve address
     */
    function clearWeatherEvent(address reserve) external onlyPoolConfigurator {
        delete _activeWeatherEvents[reserve];
        emit WeatherEventUpdated(reserve, 0, 0, 0);
    }
    
    // ============ Enhanced Rate Calculation ============
    
    /**
     * @notice Calculate interest rates with full commodity market integration
     * @dev Overrides V2 to add futures curve, sub-commodity, and weather adjustments
     * @param params Standard rate calculation parameters
     * @return liquidityRate The liquidity rate in ray
     * @return variableBorrowRate The variable borrow rate in ray
     */
    function calculateInterestRates(
        DataTypes.CalculateInterestRatesParams memory params
    ) external view override returns (uint256, uint256) {
        // Get base rates from V2 calculation
        (uint256 baseLiquidityRate, uint256 baseVariableBorrowRate) = 
            _calculateBaseRates(params);

        
        ExtendedCommodityConfig memory extConfig = _extendedConfig[params.reserve];
        
        // Apply enhanced adjustments
        uint256 adjustedBorrowRate = baseVariableBorrowRate;
        
        // 1. Apply sub-commodity seasonal adjustment (if configured)
        if (extConfig.subCommodityId > 0) {
            adjustedBorrowRate = _applySubCommoditySeasonal(
                adjustedBorrowRate,
                extConfig
            );
        }
        
        // 2. Apply futures curve adjustment (if enabled and oracle available)
        if (extConfig.useFuturesCurve && address(futuresCurveOracle) != address(0)) {
            adjustedBorrowRate = _applyFuturesCurveAdjustment(
                adjustedBorrowRate,
                params.reserve
            );
        }
        
        // 3. Apply regional basis adjustment (if enabled)
        if (extConfig.useRegionalBasis && extConfig.primaryRegion != bytes32(0)) {
            adjustedBorrowRate = _applyRegionalBasisAdjustment(
                adjustedBorrowRate,
                params.reserve,
                extConfig.primaryRegion
            );
        }
        
        // 4. Apply weather event adjustment (if active)
        adjustedBorrowRate = _applyWeatherAdjustment(adjustedBorrowRate, params.reserve);

        
        // Recalculate liquidity rate based on adjusted borrow rate
        uint256 adjustedLiquidityRate = _calculateLiquidityRate(
            adjustedBorrowRate,
            params
        );
        
        return (adjustedLiquidityRate, adjustedBorrowRate);
    }
    
    // ============ Internal Calculation Functions ============
    
    /**
     * @notice Calculate base rates using V2 logic
     */
    function _calculateBaseRates(
        DataTypes.CalculateInterestRatesParams memory params
    ) internal view returns (uint256 liquidityRate, uint256 variableBorrowRate) {
        InterestRateDataRay memory rateData = _rayifyRateData(_interestRateData[params.reserve]);
        CommodityRateConfig memory commodityConfig = _commodityConfig[params.reserve];

        uint256 currentLiquidityRate = 0;
        uint256 currentVariableBorrowRate = rateData.baseVariableBorrowRate;

        if (params.totalDebt != 0) {
            uint256 availableLiquidity = params.virtualUnderlyingBalance +
                params.liquidityAdded - params.liquidityTaken;

            uint256 availableLiquidityPlusDebt = availableLiquidity + params.totalDebt;
            uint256 borrowUsageRatio = params.totalDebt.rayDiv(availableLiquidityPlusDebt);
            uint256 supplyUsageRatio = params.totalDebt.rayDiv(
                availableLiquidityPlusDebt + params.unbacked
            );


            // Calculate utilization-based rate
            if (borrowUsageRatio > rateData.optimalUsageRatio) {
                uint256 excessBorrowUsageRatio = (borrowUsageRatio - rateData.optimalUsageRatio).rayDiv(
                    WadRayMath.RAY - rateData.optimalUsageRatio
                );
                currentVariableBorrowRate +=
                    rateData.variableRateSlope1 +
                    rateData.variableRateSlope2.rayMul(excessBorrowUsageRatio);
            } else {
                currentVariableBorrowRate += rateData
                    .variableRateSlope1
                    .rayMul(borrowUsageRatio)
                    .rayDiv(rateData.optimalUsageRatio);
            }

            // Apply base commodity adjustments from V2
            currentVariableBorrowRate = _applyCommodityAdjustments(
                currentVariableBorrowRate,
                commodityConfig
            );

            currentLiquidityRate = currentVariableBorrowRate
                .rayMul(supplyUsageRatio)
                .percentMul(PercentageMath.PERCENTAGE_FACTOR - params.reserveFactor);
        }

        return (currentLiquidityRate, currentVariableBorrowRate);
    }


    /**
     * @notice Apply sub-commodity seasonal adjustment
     */
    function _applySubCommoditySeasonal(
        uint256 baseRate,
        ExtendedCommodityConfig memory config
    ) internal view returns (uint256) {
        SeasonalDataTypes.SeasonalProfile memory profile = 
            _subCommodityProfiles[config.subCommodityId];
        
        // Get current month
        uint8 currentMonth = SubCommoditySeasonalLib.getCurrentMonth(block.timestamp);
        
        // Build sub-commodity config for library
        SeasonalDataTypes.SubCommodityConfig memory subConfig = SeasonalDataTypes.SubCommodityConfig({
            subCommodityId: config.subCommodityId,
            commodityType: 0, // Will be set from parent
            hemisphere: config.hemisphere,
            harvestStartMonth: config.harvestStartMonth,
            harvestEndMonth: config.harvestEndMonth,
            peakDemandMonth: config.peakDemandMonth,
            storageDecayPerDay: 0,
            weatherSensitivity: config.weatherSensitivity
        });
        
        // Calculate seasonal multiplier
        uint256 seasonalMultiplier = SubCommoditySeasonalLib.calculateSeasonalMultiplier(
            subConfig,
            profile,
            currentMonth
        );
        
        return baseRate.rayMul(seasonalMultiplier);
    }


    /**
     * @notice Apply futures curve adjustment (contango/backwardation)
     */
    function _applyFuturesCurveAdjustment(
        uint256 baseRate,
        address reserve
    ) internal view returns (uint256) {
        // Check if futures data is fresh
        if (!futuresCurveOracle.isFresh(reserve, FUTURES_STALENESS_THRESHOLD)) {
            return baseRate; // Return base rate if data is stale
        }
        
        int256 annualizedBasis = futuresCurveOracle.getAnnualizedBasis(reserve);
        
        // Cap the adjustment
        if (annualizedBasis > MAX_FUTURES_ADJUSTMENT_BPS) {
            annualizedBasis = MAX_FUTURES_ADJUSTMENT_BPS;
        } else if (annualizedBasis < -MAX_FUTURES_ADJUSTMENT_BPS) {
            annualizedBasis = -MAX_FUTURES_ADJUSTMENT_BPS;
        }
        
        // Apply adjustment
        // Contango (positive basis): Higher rates (carrying cost reflected in futures)
        // Backwardation (negative basis): Lower rates (immediate delivery premium)
        if (annualizedBasis > 0) {
            uint256 adjustment = _bpsToRay(uint256(annualizedBasis));
            return baseRate + adjustment;
        } else if (annualizedBasis < 0) {
            uint256 discount = _bpsToRay(uint256(-annualizedBasis));
            return baseRate > discount ? baseRate - discount : 0;
        }
        
        return baseRate;
    }


    /**
     * @notice Apply regional basis adjustment
     */
    function _applyRegionalBasisAdjustment(
        uint256 baseRate,
        address reserve,
        bytes32 region
    ) internal view returns (uint256) {
        int256 regionalBasis = futuresCurveOracle.getRegionalBasis(reserve, region);
        
        // Cap the adjustment
        if (regionalBasis > MAX_REGIONAL_ADJUSTMENT_BPS) {
            regionalBasis = MAX_REGIONAL_ADJUSTMENT_BPS;
        } else if (regionalBasis < -MAX_REGIONAL_ADJUSTMENT_BPS) {
            regionalBasis = -MAX_REGIONAL_ADJUSTMENT_BPS;
        }
        
        if (regionalBasis > 0) {
            uint256 premium = _bpsToRay(uint256(regionalBasis));
            return baseRate + premium;
        } else if (regionalBasis < 0) {
            uint256 discount = _bpsToRay(uint256(-regionalBasis));
            return baseRate > discount ? baseRate - discount : 0;
        }
        
        return baseRate;
    }

    /**
     * @notice Apply weather event adjustment
     */
    function _applyWeatherAdjustment(
        uint256 baseRate,
        address reserve
    ) internal view returns (uint256) {
        SeasonalDataTypes.WeatherEvent memory weatherEvent = _activeWeatherEvents[reserve];

        
        // Check if weather event is still active
        if (weatherEvent.eventType == SeasonalDataTypes.WEATHER_NORMAL ||
            block.timestamp > weatherEvent.startTimestamp + (uint256(weatherEvent.duration) * 1 days)) {
            return baseRate;
        }
        
        ExtendedCommodityConfig memory config = _extendedConfig[reserve];
        
        // Calculate scaled impact based on weather sensitivity
        uint256 scaledImpact = (uint256(weatherEvent.impactMultiplierBps) * config.weatherSensitivity) / 100;
        
        // Apply as a premium (weather events typically increase uncertainty/rates)
        uint256 adjustment = _bpsToRay(scaledImpact);
        return baseRate + adjustment;
    }

    /**
     * @notice Recalculate liquidity rate from adjusted borrow rate
     */
    function _calculateLiquidityRate(
        uint256 adjustedBorrowRate,
        DataTypes.CalculateInterestRatesParams memory params
    ) internal pure returns (uint256) {
        if (params.totalDebt == 0) {
            return 0;
        }
        
        uint256 availableLiquidity = params.virtualUnderlyingBalance +
            params.liquidityAdded - params.liquidityTaken;
        uint256 totalAssets = availableLiquidity + params.totalDebt + params.unbacked;
        
        if (totalAssets == 0) return 0;
        
        uint256 supplyUsageRatio = params.totalDebt.rayDiv(totalAssets);
        
        return adjustedBorrowRate
            .rayMul(supplyUsageRatio)
            .percentMul(PercentageMath.PERCENTAGE_FACTOR - params.reserveFactor);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get extended configuration for a reserve
     * @param reserve The reserve address
     * @return config The extended configuration
     */
    function getExtendedConfig(
        address reserve
    ) external view returns (ExtendedCommodityConfig memory) {
        return _extendedConfig[reserve];
    }
    
    /**
     * @notice Get seasonal profile for a sub-commodity
     * @param subCommodityId The sub-commodity identifier
     * @return profile The seasonal profile
     */
    function getSubCommodityProfile(
        uint16 subCommodityId
    ) external view returns (SeasonalDataTypes.SeasonalProfile memory) {
        return _subCommodityProfiles[subCommodityId];
    }
    
    /**
     * @notice Get active weather event for a reserve
     * @param reserve The reserve address
     * @return weatherEvent The active weather event
     */
    function getActiveWeatherEvent(
        address reserve
    ) external view returns (SeasonalDataTypes.WeatherEvent memory) {
        return _activeWeatherEvents[reserve];
    }
    
    /**
     * @notice Check if a weather event is currently active
     * @param reserve The reserve address
     * @return True if weather event is active
     */
    function hasActiveWeatherEvent(address reserve) external view returns (bool) {
        SeasonalDataTypes.WeatherEvent memory event_ = _activeWeatherEvents[reserve];
        if (event_.eventType == SeasonalDataTypes.WEATHER_NORMAL) {
            return false;
        }
        return block.timestamp <= event_.startTimestamp + (uint256(event_.duration) * 1 days);
    }
    
    /**
     * @notice Get the futures curve oracle address
     * @return The oracle address
     */
    function getFuturesCurveOracle() external view returns (address) {
        return address(futuresCurveOracle);
    }
    
    /**
     * @notice Calculate current adjusted rate for a reserve (view function for UI)
     * @param reserve The reserve address
     * @param utilization Current utilization ratio in ray
     * @return adjustedRate The current adjusted borrow rate
     */
    function getAdjustedRateForUtilization(
        address reserve,
        uint256 utilization
    ) external view returns (uint256 adjustedRate) {
        InterestRateDataRay memory rateData = _rayifyRateData(_interestRateData[reserve]);
        CommodityRateConfig memory commodityConfig = _commodityConfig[reserve];
        ExtendedCommodityConfig memory extConfig = _extendedConfig[reserve];
        
        // Calculate base rate
        adjustedRate = rateData.baseVariableBorrowRate;
        
        if (utilization > rateData.optimalUsageRatio) {
            uint256 excessRatio = (utilization - rateData.optimalUsageRatio).rayDiv(
                WadRayMath.RAY - rateData.optimalUsageRatio
            );
            adjustedRate += rateData.variableRateSlope1 + 
                rateData.variableRateSlope2.rayMul(excessRatio);
        } else {
            adjustedRate += rateData.variableRateSlope1
                .rayMul(utilization)
                .rayDiv(rateData.optimalUsageRatio);
        }
        
        // Apply V2 commodity adjustments
        adjustedRate = _applyCommodityAdjustments(adjustedRate, commodityConfig);
        
        // Apply V3 enhanced adjustments
        if (extConfig.subCommodityId > 0) {
            SeasonalDataTypes.SeasonalProfile memory profile = 
                _subCommodityProfiles[extConfig.subCommodityId];
            uint8 currentMonth = SubCommoditySeasonalLib.getCurrentMonth(block.timestamp);
            
            SeasonalDataTypes.SubCommodityConfig memory subConfig = SeasonalDataTypes.SubCommodityConfig({
                subCommodityId: extConfig.subCommodityId,
                commodityType: 0,
                hemisphere: extConfig.hemisphere,
                harvestStartMonth: extConfig.harvestStartMonth,
                harvestEndMonth: extConfig.harvestEndMonth,
                peakDemandMonth: extConfig.peakDemandMonth,
                storageDecayPerDay: 0,
                weatherSensitivity: extConfig.weatherSensitivity
            });
            
            uint256 seasonalMultiplier = SubCommoditySeasonalLib.calculateSeasonalMultiplier(
                subConfig,
                profile,
                currentMonth
            );
            adjustedRate = adjustedRate.rayMul(seasonalMultiplier);
        }
        
        // Apply weather adjustment
        adjustedRate = _applyWeatherAdjustment(adjustedRate, reserve);
        
        return adjustedRate;
    }
    
    // ============ Internal Initialization ============
    
    /**
     * @notice Initialize default seasonal profiles for common sub-commodities
     */
    function _initializeDefaultSubCommodityProfiles() internal {
        // Wheat profiles
        _subCommodityProfiles[SeasonalDataTypes.WHEAT_WINTER] = SubCommoditySeasonalLib.getWheatProfile();
        _subCommodityProfiles[SeasonalDataTypes.WHEAT_SPRING] = SubCommoditySeasonalLib.getWheatProfile();
        
        // Corn profile
        _subCommodityProfiles[SeasonalDataTypes.CORN] = SubCommoditySeasonalLib.getCornProfile();
        
        // Soybeans (similar to corn)
        _subCommodityProfiles[SeasonalDataTypes.SOYBEANS] = SubCommoditySeasonalLib.getCornProfile();
        
        // Coffee profiles
        _subCommodityProfiles[SeasonalDataTypes.COFFEE_ARABICA] = SubCommoditySeasonalLib.getCoffeeProfile();
        _subCommodityProfiles[SeasonalDataTypes.COFFEE_ROBUSTA] = SubCommoditySeasonalLib.getCoffeeProfile();
        
        // Natural gas
        _subCommodityProfiles[SeasonalDataTypes.NATURAL_GAS] = SubCommoditySeasonalLib.getNaturalGasProfile();
        
        // Heating oil (similar to natural gas)
        _subCommodityProfiles[SeasonalDataTypes.HEATING_OIL] = SubCommoditySeasonalLib.getNaturalGasProfile();
        
        // Initialize flat profiles for non-seasonal commodities
        SeasonalDataTypes.SeasonalProfile memory flatProfile;
        flatProfile.monthlyMultipliers = [
            uint16(10000), uint16(10000), uint16(10000), uint16(10000),
            uint16(10000), uint16(10000), uint16(10000), uint16(10000),
            uint16(10000), uint16(10000), uint16(10000), uint16(10000)
        ];
        
        // Precious metals - no seasonality
        _subCommodityProfiles[SeasonalDataTypes.GOLD] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.SILVER] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.PLATINUM] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.PALLADIUM] = flatProfile;
        
        // Base metals - minimal seasonality
        _subCommodityProfiles[SeasonalDataTypes.COPPER] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.ALUMINUM] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.ZINC] = flatProfile;
        _subCommodityProfiles[SeasonalDataTypes.NICKEL] = flatProfile;
        
        // Crude oil - slight seasonality (driving season)
        SeasonalDataTypes.SeasonalProfile memory crudeProfile;
        crudeProfile.monthlyMultipliers = [
            uint16(10000), uint16(10000), uint16(10500), uint16(11000),
            uint16(11500), uint16(11500), uint16(11000), uint16(10500),
            uint16(10000), uint16(10000), uint16(10000), uint16(10000)
        ];
        _subCommodityProfiles[SeasonalDataTypes.CRUDE_WTI] = crudeProfile;
        _subCommodityProfiles[SeasonalDataTypes.CRUDE_BRENT] = crudeProfile;
        _subCommodityProfiles[SeasonalDataTypes.GASOLINE_RBOB] = crudeProfile;
        
        // Carbon credits - year-end compliance
        SeasonalDataTypes.SeasonalProfile memory carbonProfile;
        carbonProfile.monthlyMultipliers = [
            uint16(9000), uint16(9000), uint16(9500), uint16(10000),
            uint16(10000), uint16(10000), uint16(10000), uint16(10500),
            uint16(11000), uint16(11500), uint16(12000), uint16(13000)
        ];
        _subCommodityProfiles[SeasonalDataTypes.EUA] = carbonProfile;
        _subCommodityProfiles[SeasonalDataTypes.CCA] = carbonProfile;
        _subCommodityProfiles[SeasonalDataTypes.RGGI] = carbonProfile;
        _subCommodityProfiles[SeasonalDataTypes.VCU] = carbonProfile;
    }
}
