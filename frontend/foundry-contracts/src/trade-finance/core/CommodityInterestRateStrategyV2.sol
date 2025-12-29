// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";
import {DataTypes} from "../libraries/types/DataTypes.sol";
import {Errors} from "../libraries/helpers/Errors.sol";
import {IReserveInterestRateStrategy} from "../interfaces/IReserveInterestRateStrategy.sol";
import {IPoolAddressesProvider} from "../interfaces/IPoolAddressesProvider.sol";

/**
 * @title CommodityInterestRateStrategyV2
 * @notice Commodity-specific interest rate strategy with seasonal adjustments
 * @dev Extends Aave V3's rate strategy with commodity market dynamics:
 *      - Seasonal rate curves for agricultural products
 *      - Contango/backwardation adjustments based on futures curves
 *      - Storage cost integration for physical commodities
 *      - Quality decay factors for perishable goods
 */
contract CommodityInterestRateStrategyV2 is IReserveInterestRateStrategy {
    using WadRayMath for uint256;
    using PercentageMath for uint256;

    // ============ Constants ============
    
    uint256 public constant MAX_BORROW_RATE = 1000_00;  // 1000% in bps
    uint256 public constant MIN_OPTIMAL_POINT = 1_00;   // 1% in bps
    uint256 public constant MAX_OPTIMAL_POINT = 99_00;  // 99% in bps
    
    // Seasonal adjustment bounds (in bps, 10000 = 100%)
    uint256 public constant MIN_SEASONAL_FACTOR = 7000;  // 70%
    uint256 public constant MAX_SEASONAL_FACTOR = 15000; // 150%
    
    // Commodity type identifiers
    uint8 public constant COMMODITY_PRECIOUS_METAL = 0;
    uint8 public constant COMMODITY_BASE_METAL = 1;
    uint8 public constant COMMODITY_ENERGY = 2;
    uint8 public constant COMMODITY_AGRICULTURAL = 3;
    uint8 public constant COMMODITY_CARBON_CREDIT = 4;

    // ============ Structs ============

    /**
     * @notice Core interest rate parameters (in bps)
     * @param optimalUsageRatio Target utilization ratio
     * @param baseVariableBorrowRate Base rate when utilization = 0
     * @param variableRateSlope1 Rate increase before optimal point
     * @param variableRateSlope2 Rate increase after optimal point (steeper)
     */
    struct InterestRateData {
        uint16 optimalUsageRatio;
        uint32 baseVariableBorrowRate;
        uint32 variableRateSlope1;
        uint32 variableRateSlope2;
    }

    /**
     * @notice Interest rate data in ray format for calculations
     */
    struct InterestRateDataRay {
        uint256 optimalUsageRatio;
        uint256 baseVariableBorrowRate;
        uint256 variableRateSlope1;
        uint256 variableRateSlope2;
    }

    /**
     * @notice Commodity-specific rate configuration
     * @param commodityType Type of commodity (precious metal, agricultural, etc.)
     * @param seasonalEnabled Whether seasonal adjustments are active
     * @param storageAdjustmentBps Storage cost adjustment in bps
     * @param qualityDecayRateBps Daily quality decay rate in bps (for perishables)
     * @param contangoAdjustmentBps Adjustment for futures curve in bps
     */
    struct CommodityRateConfig {
        uint8 commodityType;
        bool seasonalEnabled;
        uint16 storageAdjustmentBps;
        uint16 qualityDecayRateBps;
        int16 contangoAdjustmentBps;  // Can be negative for backwardation
    }

    /**
     * @notice Monthly seasonal multipliers (in bps, 10000 = 100%)
     * @dev 12 values for each month (January = index 0)
     */
    struct SeasonalMultipliers {
        uint16[12] monthlyMultipliers;
    }

    /**
     * @notice Local variables for rate calculation
     */
    struct CalcInterestRatesLocalVars {
        uint256 availableLiquidity;
        uint256 currentVariableBorrowRate;
        uint256 currentLiquidityRate;
        uint256 borrowUsageRatio;
        uint256 supplyUsageRatio;
        uint256 availableLiquidityPlusDebt;
        uint256 seasonalAdjustedRate;
        uint256 commodityAdjustedRate;
    }

    // ============ State Variables ============

    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;

    /// @dev Reserve address => base interest rate data
    mapping(address => InterestRateData) internal _interestRateData;
    
    /// @dev Reserve address => commodity configuration
    mapping(address => CommodityRateConfig) internal _commodityConfig;
    
    /// @dev Commodity type => seasonal multipliers
    mapping(uint8 => SeasonalMultipliers) internal _seasonalMultipliers;

    // ============ Events ============

    event RateDataUpdate(
        address indexed reserve,
        uint256 optimalUsageRatio,
        uint256 baseVariableBorrowRate,
        uint256 variableRateSlope1,
        uint256 variableRateSlope2
    );

    event CommodityConfigUpdate(
        address indexed reserve,
        uint8 commodityType,
        bool seasonalEnabled,
        uint16 storageAdjustmentBps,
        uint16 qualityDecayRateBps,
        int16 contangoAdjustmentBps
    );

    event SeasonalMultipliersUpdate(
        uint8 indexed commodityType,
        uint16[12] multipliers
    );

    // ============ Modifiers ============

    modifier onlyPoolConfigurator() {
        require(
            msg.sender == ADDRESSES_PROVIDER.getPoolConfigurator(),
            Errors.CALLER_NOT_POOL_CONFIGURATOR
        );
        _;
    }

    // ============ Constructor ============

    constructor(address provider) {
        require(provider != address(0), Errors.INVALID_ADDRESSES_PROVIDER);
        ADDRESSES_PROVIDER = IPoolAddressesProvider(provider);
        
        // Initialize default seasonal multipliers for agricultural commodities
        _initializeDefaultSeasonalMultipliers();
    }

    // ============ Configuration Functions ============

    /// @inheritdoc IReserveInterestRateStrategy
    function setInterestRateParams(
        address reserve,
        bytes calldata rateData
    ) external override onlyPoolConfigurator {
        _setInterestRateParams(reserve, abi.decode(rateData, (InterestRateData)));
    }

    /**
     * @notice Set interest rate parameters for a reserve
     * @param reserve The reserve address
     * @param rateData The interest rate configuration
     */
    function setInterestRateParams(
        address reserve,
        InterestRateData calldata rateData
    ) external onlyPoolConfigurator {
        _setInterestRateParams(reserve, rateData);
    }

    /**
     * @notice Set commodity-specific configuration
     * @param reserve The reserve address
     * @param config The commodity configuration
     */
    function setCommodityConfig(
        address reserve,
        CommodityRateConfig calldata config
    ) external onlyPoolConfigurator {
        require(reserve != address(0), Errors.ZERO_ADDRESS_NOT_VALID);
        require(config.commodityType <= COMMODITY_CARBON_CREDIT, Errors.INVALID_COMMODITY_TYPE);
        
        _commodityConfig[reserve] = config;
        
        emit CommodityConfigUpdate(
            reserve,
            config.commodityType,
            config.seasonalEnabled,
            config.storageAdjustmentBps,
            config.qualityDecayRateBps,
            config.contangoAdjustmentBps
        );
    }

    /**
     * @notice Set seasonal multipliers for a commodity type
     * @param commodityType The commodity type
     * @param multipliers Monthly multipliers (in bps, 10000 = 100%)
     */
    function setSeasonalMultipliers(
        uint8 commodityType,
        uint16[12] calldata multipliers
    ) external onlyPoolConfigurator {
        require(commodityType <= COMMODITY_CARBON_CREDIT, Errors.INVALID_COMMODITY_TYPE);
        
        // Validate multipliers are within bounds
        for (uint256 i = 0; i < 12; i++) {
            require(
                multipliers[i] >= MIN_SEASONAL_FACTOR && multipliers[i] <= MAX_SEASONAL_FACTOR,
                Errors.SEASONAL_RATE_ADJUSTMENT_FAILED
            );
        }
        
        _seasonalMultipliers[commodityType].monthlyMultipliers = multipliers;
        
        emit SeasonalMultipliersUpdate(commodityType, multipliers);
    }

    // ============ Core Interest Rate Calculation ============

    /// @inheritdoc IReserveInterestRateStrategy
    function calculateInterestRates(
        DataTypes.CalculateInterestRatesParams memory params
    ) external view virtual override returns (uint256, uint256) {
        InterestRateDataRay memory rateData = _rayifyRateData(_interestRateData[params.reserve]);
        CommodityRateConfig memory commodityConfig = _commodityConfig[params.reserve];

        CalcInterestRatesLocalVars memory vars;

        vars.currentLiquidityRate = 0;
        vars.currentVariableBorrowRate = rateData.baseVariableBorrowRate;

        if (params.totalDebt != 0) {
            vars.availableLiquidity =
                params.virtualUnderlyingBalance +
                params.liquidityAdded -
                params.liquidityTaken;

            vars.availableLiquidityPlusDebt = vars.availableLiquidity + params.totalDebt;
            vars.borrowUsageRatio = params.totalDebt.rayDiv(vars.availableLiquidityPlusDebt);
            vars.supplyUsageRatio = params.totalDebt.rayDiv(
                vars.availableLiquidityPlusDebt + params.unbacked
            );
        } else {
            return (0, vars.currentVariableBorrowRate);
        }

        // Calculate base variable rate using utilization curve
        if (vars.borrowUsageRatio > rateData.optimalUsageRatio) {
            uint256 excessBorrowUsageRatio = (vars.borrowUsageRatio - rateData.optimalUsageRatio).rayDiv(
                WadRayMath.RAY - rateData.optimalUsageRatio
            );

            vars.currentVariableBorrowRate +=
                rateData.variableRateSlope1 +
                rateData.variableRateSlope2.rayMul(excessBorrowUsageRatio);
        } else {
            vars.currentVariableBorrowRate += rateData
                .variableRateSlope1
                .rayMul(vars.borrowUsageRatio)
                .rayDiv(rateData.optimalUsageRatio);
        }

        // Apply commodity-specific adjustments
        vars.commodityAdjustedRate = _applyCommodityAdjustments(
            vars.currentVariableBorrowRate,
            commodityConfig
        );

        // Calculate liquidity rate
        vars.currentLiquidityRate = vars
            .commodityAdjustedRate
            .rayMul(vars.supplyUsageRatio)
            .percentMul(PercentageMath.PERCENTAGE_FACTOR - params.reserveFactor);

        return (vars.currentLiquidityRate, vars.commodityAdjustedRate);
    }

    // ============ Commodity Adjustment Functions ============

    /**
     * @notice Apply commodity-specific rate adjustments
     * @param baseRate The base variable borrow rate
     * @param config The commodity configuration
     * @return The adjusted rate
     */
    function _applyCommodityAdjustments(
        uint256 baseRate,
        CommodityRateConfig memory config
    ) internal view returns (uint256) {
        uint256 adjustedRate = baseRate;
        
        // Apply seasonal adjustment if enabled
        if (config.seasonalEnabled) {
            uint256 seasonalMultiplier = _getCurrentSeasonalMultiplier(config.commodityType);
            adjustedRate = adjustedRate.rayMul(seasonalMultiplier);
        }
        
        // Apply storage cost adjustment (always additive)
        if (config.storageAdjustmentBps > 0) {
            adjustedRate += _bpsToRay(uint256(config.storageAdjustmentBps));
        }
        
        // Apply quality decay for perishable commodities
        if (config.qualityDecayRateBps > 0) {
            adjustedRate += _bpsToRay(uint256(config.qualityDecayRateBps));
        }
        
        // Apply contango/backwardation adjustment
        if (config.contangoAdjustmentBps > 0) {
            adjustedRate += _bpsToRay(uint256(int256(config.contangoAdjustmentBps)));
        } else if (config.contangoAdjustmentBps < 0) {
            uint256 discount = _bpsToRay(uint256(int256(-config.contangoAdjustmentBps)));
            adjustedRate = adjustedRate > discount ? adjustedRate - discount : 0;
        }
        
        return adjustedRate;
    }

    /**
     * @notice Get current seasonal multiplier based on month
     * @param commodityType The commodity type
     * @return multiplier The seasonal multiplier in ray format
     */
    function _getCurrentSeasonalMultiplier(uint8 commodityType) internal view returns (uint256) {
        // Get current month (0-11)
        uint256 month = (block.timestamp / 30 days) % 12;
        
        uint16 multiplierBps = _seasonalMultipliers[commodityType].monthlyMultipliers[month];
        
        // Default to 100% if not set
        if (multiplierBps == 0) {
            return WadRayMath.RAY;
        }
        
        // Convert from bps (10000 = 100%) to ray
        return (uint256(multiplierBps) * WadRayMath.RAY) / 10000;
    }

    // ============ View Functions ============

    /**
     * @notice Get interest rate data in ray format
     */
    function getInterestRateData(address reserve) external view returns (InterestRateDataRay memory) {
        return _rayifyRateData(_interestRateData[reserve]);
    }

    /**
     * @notice Get interest rate data in bps format
     */
    function getInterestRateDataBps(address reserve) external view returns (InterestRateData memory) {
        return _interestRateData[reserve];
    }

    /**
     * @notice Get commodity configuration
     */
    function getCommodityConfig(address reserve) external view returns (CommodityRateConfig memory) {
        return _commodityConfig[reserve];
    }

    /**
     * @notice Get seasonal multipliers for a commodity type
     */
    function getSeasonalMultipliers(uint8 commodityType) external view returns (uint16[12] memory) {
        return _seasonalMultipliers[commodityType].monthlyMultipliers;
    }

    function getOptimalUsageRatio(address reserve) external view returns (uint256) {
        return _bpsToRay(uint256(_interestRateData[reserve].optimalUsageRatio));
    }

    function getVariableRateSlope1(address reserve) external view returns (uint256) {
        return _bpsToRay(uint256(_interestRateData[reserve].variableRateSlope1));
    }

    function getVariableRateSlope2(address reserve) external view returns (uint256) {
        return _bpsToRay(uint256(_interestRateData[reserve].variableRateSlope2));
    }

    function getBaseVariableBorrowRate(address reserve) external view returns (uint256) {
        return _bpsToRay(uint256(_interestRateData[reserve].baseVariableBorrowRate));
    }

    function getMaxVariableBorrowRate(address reserve) external view returns (uint256) {
        return _bpsToRay(
            uint256(
                _interestRateData[reserve].baseVariableBorrowRate +
                _interestRateData[reserve].variableRateSlope1 +
                _interestRateData[reserve].variableRateSlope2
            )
        );
    }

    /**
     * @notice Get the current seasonal multiplier for a reserve
     */
    function getCurrentSeasonalMultiplier(address reserve) external view returns (uint256) {
        CommodityRateConfig memory config = _commodityConfig[reserve];
        if (!config.seasonalEnabled) {
            return WadRayMath.RAY;
        }
        return _getCurrentSeasonalMultiplier(config.commodityType);
    }

    // ============ Internal Functions ============

    function _setInterestRateParams(address reserve, InterestRateData memory rateData) internal {
        require(reserve != address(0), Errors.ZERO_ADDRESS_NOT_VALID);

        require(
            rateData.optimalUsageRatio <= MAX_OPTIMAL_POINT &&
            rateData.optimalUsageRatio >= MIN_OPTIMAL_POINT,
            Errors.UTILIZATION_RATE_OUT_OF_BOUNDS
        );

        require(
            rateData.variableRateSlope1 <= rateData.variableRateSlope2,
            Errors.INTEREST_RATE_TOO_LOW
        );

        require(
            uint256(rateData.baseVariableBorrowRate) +
            uint256(rateData.variableRateSlope1) +
            uint256(rateData.variableRateSlope2) <= MAX_BORROW_RATE,
            Errors.INTEREST_RATE_TOO_HIGH
        );

        _interestRateData[reserve] = rateData;
        
        emit RateDataUpdate(
            reserve,
            rateData.optimalUsageRatio,
            rateData.baseVariableBorrowRate,
            rateData.variableRateSlope1,
            rateData.variableRateSlope2
        );
    }

    function _rayifyRateData(
        InterestRateData memory data
    ) internal pure returns (InterestRateDataRay memory) {
        return InterestRateDataRay({
            optimalUsageRatio: _bpsToRay(uint256(data.optimalUsageRatio)),
            baseVariableBorrowRate: _bpsToRay(uint256(data.baseVariableBorrowRate)),
            variableRateSlope1: _bpsToRay(uint256(data.variableRateSlope1)),
            variableRateSlope2: _bpsToRay(uint256(data.variableRateSlope2))
        });
    }

    function _bpsToRay(uint256 n) internal pure returns (uint256) {
        return n * 1e23;
    }

    /**
     * @notice Initialize default seasonal multipliers for common commodities
     */
    function _initializeDefaultSeasonalMultipliers() internal {
        // Wheat: Higher rates in winter (low supply), lower in summer (harvest)
        _seasonalMultipliers[COMMODITY_AGRICULTURAL].monthlyMultipliers = [
            12000, 12000, 11000, 10000, 9000, 8000, 
            7000, 8000, 9000, 10000, 11000, 12000
        ];
        
        // Energy: Higher in winter (heating), lower in spring/fall
        _seasonalMultipliers[COMMODITY_ENERGY].monthlyMultipliers = [
            13000, 12000, 10000, 9000, 9000, 10000,
            11000, 11000, 10000, 9000, 10000, 12000
        ];
        
        // Precious metals: No seasonal adjustment
        _seasonalMultipliers[COMMODITY_PRECIOUS_METAL].monthlyMultipliers = [
            10000, 10000, 10000, 10000, 10000, 10000,
            10000, 10000, 10000, 10000, 10000, 10000
        ];
        
        // Base metals: Slight industrial cycle
        _seasonalMultipliers[COMMODITY_BASE_METAL].monthlyMultipliers = [
            10500, 10500, 10000, 9500, 9500, 10000,
            10500, 10500, 10000, 9500, 9500, 10000
        ];
        
        // Carbon credits: Higher at year-end (compliance deadlines)
        _seasonalMultipliers[COMMODITY_CARBON_CREDIT].monthlyMultipliers = [
            9000, 9000, 9500, 10000, 10000, 10000,
            10000, 10500, 11000, 11500, 12000, 13000
        ];
    }
}
