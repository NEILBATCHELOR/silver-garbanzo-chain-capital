// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../libraries/math/WadRayMath.sol";
import "../libraries/math/PercentageMath.sol";

/**
 * @title HaircutEngine
 * @notice Statistical haircut calculation engine for commodity collateral
 * @dev Uses historical price volatility, drawdown, and correlation analysis
 * @dev Upgradeable via UUPS pattern - admin controls upgrades
 * 
 * Key Features:
 * - Flexible historical data loading (any time interval)
 * - Multiple risk metrics (volatility, VaR, max drawdown)
 * - Quality, liquidity, and age adjustments
 * - Governance-controlled parameters
 * 
 * Architecture:
 * - Off-chain: Heavy statistical calculations (TypeScript)
 * - On-chain: Storage, validation, application of haircuts
 */
contract HaircutEngine is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using WadRayMath for uint256;
    using PercentageMath for uint256;
    
    // ============ ROLES ============
    
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ TYPES ============
    
    enum CommodityType {
        PRECIOUS_METAL,     // Gold, Silver, Platinum
        BASE_METAL,         // Steel, Aluminum, Copper
        ENERGY,             // Oil, Gas, Coal
        AGRICULTURAL,       // Wheat, Soybeans, Cotton
        CARBON_CREDIT       // VCS, Gold Standard
    }
    
    /**
     * @dev Historical price data point
     * Flexible format - can be hourly, daily, weekly, etc.
     */
    struct PricePoint {
        uint256 timestamp;      // Unix timestamp
        uint256 price;          // Price in USD (18 decimals)
        uint256 volume;         // Trading volume (optional, 0 if unknown)
    }
    
    /**
     * @dev Statistical risk metrics calculated off-chain
     * Submitted by Risk Admin role after analysis
     */
    struct RiskMetrics {
        uint256 volatility;         // Annualized volatility (basis points)
        uint256 maxDrawdown;        // Maximum historical drawdown (basis points)
        uint256 valueAtRisk95;      // 95% VaR (basis points)
        uint256 valueAtRisk99;      // 99% VaR (basis points)
        uint256 sharpeRatio;        // Risk-adjusted return (scaled by 100)
        uint256 liquidityScore;     // 0-10000 (10000 = most liquid)
        uint256 dataPoints;         // Number of price points analyzed
        uint256 calculatedAt;       // Timestamp of calculation
    }
    
    /**
     * @dev Complete haircut configuration for a commodity
     */
    struct HaircutConfig {
        // Base haircuts (basis points, e.g., 500 = 5%)
        uint256 baseHaircut;            // Minimum haircut applied
        uint256 volatilityHaircut;      // Added based on volatility
        uint256 drawdownHaircut;        // Added based on max drawdown
        uint256 liquidityHaircut;       // Added for illiquid assets
        
        // Quality adjustments
        mapping(bytes32 => uint256) qualityDiscounts;  // Quality grade => discount
        
        // Age depreciation (for perishables)
        uint256 ageDepreciationRate;    // Basis points per day
        uint256 maxAgeDiscount;         // Maximum age-based discount
        
        // Dynamic parameters
        uint256 minHaircut;             // Floor (e.g., 5%)
        uint256 maxHaircut;             // Ceiling (e.g., 50%)
        
        // Last update
        uint256 lastUpdated;
        address updatedBy;
    }
    
    /**
     * @dev Haircut calculation result
     */
    struct HaircutResult {
        uint256 totalHaircut;           // Final haircut (basis points)
        uint256 adjustedValue;          // Value after haircut (18 decimals)
        uint256 baseComponent;          // Base haircut component
        uint256 volatilityComponent;    // Volatility component
        uint256 drawdownComponent;      // Drawdown component
        uint256 qualityComponent;       // Quality adjustment
        uint256 ageComponent;           // Age depreciation
        uint256 liquidityComponent;     // Liquidity adjustment
    }
    
    // ============ STATE ============
    
    // Commodity type => Risk metrics
    mapping(CommodityType => RiskMetrics) public riskMetrics;
    
    // Commodity type => Haircut configuration
    mapping(CommodityType => HaircutConfig) private haircutConfigs;
    
    // Historical price data (commodity => price history)
    mapping(CommodityType => PricePoint[]) public priceHistory;
    
    // Configuration constants
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant VOLATILITY_MULTIPLIER = 5000; // 0.5x volatility = haircut
    uint256 public constant DRAWDOWN_MULTIPLIER = 3000;   // 0.3x max drawdown = haircut
    
    // ============ STORAGE GAP ============
    // Reserve 40 slots for future variables (50 total - 10 current mappings/state)
    uint256[40] private __gap;
    
    // ============ EVENTS ============
    
    event PriceDataLoaded(
        CommodityType indexed commodityType,
        uint256 dataPoints,
        uint256 startTime,
        uint256 endTime
    );
    
    event RiskMetricsUpdated(
        CommodityType indexed commodityType,
        uint256 volatility,
        uint256 maxDrawdown,
        uint256 var95,
        uint256 calculatedAt
    );
    
    event HaircutConfigured(
        CommodityType indexed commodityType,
        uint256 baseHaircut,
        uint256 minHaircut,
        uint256 maxHaircut
    );
    
    event HaircutCalculated(
        CommodityType indexed commodityType,
        uint256 oracleValue,
        uint256 totalHaircut,
        uint256 adjustedValue
    );
    
    event Upgraded(address indexed newImplementation);
    
    // ============ ERRORS ============
    
    error NoPriceData();
    error PricesNotChronological();
    error NoDataPoints();
    error InvalidVolatility();
    error InvalidDrawdown();
    error InvalidMinMax();
    error MaxHaircutTooHigh();
    
    // ============ CONSTRUCTOR ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    // ============ INITIALIZER ============
    
    /**
     * @notice Initialize the contract (replaces constructor)
     * @param _riskAdmin Address to grant RISK_ADMIN_ROLE
     * @param _governance Address to grant GOVERNANCE_ROLE and UPGRADER_ROLE
     */
    function initialize(
        address _riskAdmin,
        address _governance
    ) public initializer {
        require(_riskAdmin != address(0), "Zero address: risk admin");
        require(_governance != address(0), "Zero address: governance");
        
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(RISK_ADMIN_ROLE, _riskAdmin);
        _grantRole(GOVERNANCE_ROLE, _governance);
        _grantRole(UPGRADER_ROLE, _governance);
        
        _initializeDefaultConfigs();
    }
    
    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Load historical price data for statistical analysis
     * @dev Flexible format - supports any time interval (hourly, daily, etc.)
     * @param commodityType Type of commodity
     * @param prices Array of price data points
     */
    function loadPriceData(
        CommodityType commodityType,
        PricePoint[] calldata prices
    ) external onlyRole(RISK_ADMIN_ROLE) {
        if (prices.length == 0) revert NoPriceData();
        
        // Validate timestamps are in order
        for (uint256 i = 1; i < prices.length; i++) {
            if (prices[i].timestamp <= prices[i-1].timestamp) {
                revert PricesNotChronological();
            }
        }
        
        // Clear existing data
        delete priceHistory[commodityType];
        
        // Load new data
        for (uint256 i = 0; i < prices.length; i++) {
            priceHistory[commodityType].push(prices[i]);
        }
        
        emit PriceDataLoaded(
            commodityType,
            prices.length,
            prices[0].timestamp,
            prices[prices.length - 1].timestamp
        );
    }
    
    /**
     * @notice Update risk metrics after off-chain statistical analysis
     * @dev Called by Risk Admin after computing volatility, VaR, etc.
     * @param commodityType Type of commodity
     * @param metrics Calculated risk metrics
     */
    function updateRiskMetrics(
        CommodityType commodityType,
        RiskMetrics calldata metrics
    ) external onlyRole(RISK_ADMIN_ROLE) {
        if (metrics.dataPoints == 0) revert NoDataPoints();
        if (metrics.volatility == 0) revert InvalidVolatility();
        if (metrics.maxDrawdown == 0) revert InvalidDrawdown();
        
        riskMetrics[commodityType] = metrics;
        
        // Automatically update haircut config based on new metrics
        _updateHaircutFromMetrics(commodityType, metrics);
        
        emit RiskMetricsUpdated(
            commodityType,
            metrics.volatility,
            metrics.maxDrawdown,
            metrics.valueAtRisk95,
            metrics.calculatedAt
        );
    }
    
    /**
     * @notice Calculate total haircut for a commodity position
     * @param commodityType Type of commodity
     * @param oracleValue Current oracle value (18 decimals)
     * @param quality Quality grade (e.g., "Grade A", "99.9%")
     * @param certificateDate Date of quality certificate
     * @return result Complete haircut calculation breakdown
     */
    function calculateHaircut(
        CommodityType commodityType,
        uint256 oracleValue,
        string memory quality,
        uint256 certificateDate
    ) external view returns (HaircutResult memory result) {
        HaircutConfig storage config = haircutConfigs[commodityType];
        RiskMetrics memory metrics = riskMetrics[commodityType];
        
        // 1. Base haircut
        result.baseComponent = config.baseHaircut;
        
        // 2. Volatility-based haircut
        result.volatilityComponent = _calculateVolatilityHaircut(
            metrics.volatility
        );
        
        // 3. Drawdown-based haircut
        result.drawdownComponent = _calculateDrawdownHaircut(
            metrics.maxDrawdown
        );
        
        // 4. Quality discount
        result.qualityComponent = _getQualityDiscount(
            commodityType,
            quality
        );
        
        // 5. Age depreciation (for perishables)
        result.ageComponent = _calculateAgeDiscount(
            commodityType,
            certificateDate
        );
        
        // 6. Liquidity adjustment
        result.liquidityComponent = _calculateLiquidityHaircut(
            metrics.liquidityScore
        );
        
        // Calculate total haircut
        result.totalHaircut = result.baseComponent
            + result.volatilityComponent
            + result.drawdownComponent
            + result.qualityComponent
            + result.ageComponent
            + result.liquidityComponent;
        
        // Apply min/max bounds
        if (result.totalHaircut < config.minHaircut) {
            result.totalHaircut = config.minHaircut;
        }
        if (result.totalHaircut > config.maxHaircut) {
            result.totalHaircut = config.maxHaircut;
        }
        
        // Calculate adjusted value
        result.adjustedValue = oracleValue.percentMul(
            BASIS_POINTS - result.totalHaircut
        );
        
        return result;
    }
    
    /**
     * @notice Get historical price data for analysis
     * @param commodityType Type of commodity
     * @return prices Array of historical prices
     */
    function getPriceHistory(
        CommodityType commodityType
    ) external view returns (PricePoint[] memory) {
        return priceHistory[commodityType];
    }
    
    /**
     * @notice Get current risk metrics for a commodity
     * @param commodityType Type of commodity
     * @return metrics Current risk metrics
     */
    function getRiskMetrics(
        CommodityType commodityType
    ) external view returns (RiskMetrics memory) {
        return riskMetrics[commodityType];
    }
    
    // ============ CONFIGURATION FUNCTIONS ============
    
    /**
     * @notice Set base haircut configuration
     * @param commodityType Type of commodity
     * @param baseHaircut Base haircut (basis points)
     * @param minHaircut Minimum haircut (basis points)
     * @param maxHaircut Maximum haircut (basis points)
     */
    function setHaircutConfig(
        CommodityType commodityType,
        uint256 baseHaircut,
        uint256 minHaircut,
        uint256 maxHaircut
    ) external onlyRole(GOVERNANCE_ROLE) {
        if (minHaircut > baseHaircut) revert InvalidMinMax();
        if (baseHaircut > maxHaircut) revert InvalidMinMax();
        if (maxHaircut > 5000) revert MaxHaircutTooHigh();
        
        HaircutConfig storage config = haircutConfigs[commodityType];
        config.baseHaircut = baseHaircut;
        config.minHaircut = minHaircut;
        config.maxHaircut = maxHaircut;
        config.lastUpdated = block.timestamp;
        config.updatedBy = msg.sender;
        
        emit HaircutConfigured(
            commodityType,
            baseHaircut,
            minHaircut,
            maxHaircut
        );
    }
    
    /**
     * @notice Set quality discount for specific grade
     * @param commodityType Type of commodity
     * @param quality Quality grade (e.g., "Grade A")
     * @param discount Discount in basis points
     */
    function setQualityDiscount(
        CommodityType commodityType,
        string memory quality,
        uint256 discount
    ) external onlyRole(RISK_ADMIN_ROLE) {
        bytes32 qualityHash = keccak256(abi.encodePacked(quality));
        haircutConfigs[commodityType].qualityDiscounts[qualityHash] = discount;
    }
    
    /**
     * @notice Set age depreciation rate for perishables
     * @param commodityType Type of commodity
     * @param ratePerDay Basis points per day
     * @param maxDiscount Maximum total discount
     */
    function setAgeDepreciation(
        CommodityType commodityType,
        uint256 ratePerDay,
        uint256 maxDiscount
    ) external onlyRole(RISK_ADMIN_ROLE) {
        if (maxDiscount > 5000) revert MaxHaircutTooHigh();
        HaircutConfig storage config = haircutConfigs[commodityType];
        config.ageDepreciationRate = ratePerDay;
        config.maxAgeDiscount = maxDiscount;
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Calculate volatility-based haircut component
     * Formula: Haircut = Volatility × Multiplier
     */
    function _calculateVolatilityHaircut(
        uint256 volatility
    ) internal pure returns (uint256) {
        // volatility is in basis points (e.g., 1500 = 15%)
        // Multiply by 0.5 to convert to haircut
        return (volatility * VOLATILITY_MULTIPLIER) / BASIS_POINTS;
    }
    
    /**
     * @dev Calculate max drawdown-based haircut component
     * Formula: Haircut = MaxDrawdown × Multiplier
     */
    function _calculateDrawdownHaircut(
        uint256 maxDrawdown
    ) internal pure returns (uint256) {
        // maxDrawdown is in basis points (e.g., 3000 = 30%)
        // Multiply by 0.3 to convert to haircut
        return (maxDrawdown * DRAWDOWN_MULTIPLIER) / BASIS_POINTS;
    }
    
    /**
     * @dev Get quality discount for specific grade
     */
    function _getQualityDiscount(
        CommodityType commodityType,
        string memory quality
    ) internal view returns (uint256) {
        bytes32 qualityHash = keccak256(abi.encodePacked(quality));
        return haircutConfigs[commodityType].qualityDiscounts[qualityHash];
    }
    
    /**
     * @dev Calculate age-based discount for perishables
     */
    function _calculateAgeDiscount(
        CommodityType commodityType,
        uint256 certificateDate
    ) internal view returns (uint256) {
        HaircutConfig storage config = haircutConfigs[commodityType];
        
        if (config.ageDepreciationRate == 0) {
            return 0; // Not a perishable commodity
        }
        
        uint256 ageInDays = (block.timestamp - certificateDate) / 1 days;
        uint256 discount = ageInDays * config.ageDepreciationRate;
        
        // Cap at maximum
        if (discount > config.maxAgeDiscount) {
            discount = config.maxAgeDiscount;
        }
        
        return discount;
    }
    
    /**
     * @dev Calculate liquidity-based haircut
     */
    function _calculateLiquidityHaircut(
        uint256 liquidityScore
    ) internal pure returns (uint256) {
        // liquidityScore: 10000 = most liquid, 0 = illiquid
        // Haircut increases as liquidity decreases
        
        if (liquidityScore >= 8000) {
            return 0; // High liquidity, no haircut
        } else if (liquidityScore >= 5000) {
            return 100; // Medium liquidity, 1% haircut
        } else if (liquidityScore >= 2000) {
            return 300; // Low liquidity, 3% haircut
        } else {
            return 500; // Very low liquidity, 5% haircut
        }
    }
    
    /**
     * @dev Update haircut configuration based on new risk metrics
     */
    function _updateHaircutFromMetrics(
        CommodityType commodityType,
        RiskMetrics memory metrics
    ) internal {
        HaircutConfig storage config = haircutConfigs[commodityType];
        
        // Update volatility component
        config.volatilityHaircut = _calculateVolatilityHaircut(
            metrics.volatility
        );
        
        // Update drawdown component
        config.drawdownHaircut = _calculateDrawdownHaircut(
            metrics.maxDrawdown
        );
        
        // Update liquidity component
        config.liquidityHaircut = _calculateLiquidityHaircut(
            metrics.liquidityScore
        );
    }
    
    /**
     * @dev Initialize default configurations for all commodity types
     */
    function _initializeDefaultConfigs() internal {
        // Precious Metals (Low Risk)
        _setDefaultConfig(
            CommodityType.PRECIOUS_METAL,
            500,   // 5% base
            500,   // 5% min
            2000   // 20% max
        );
        
        // Base Metals (Medium Risk)
        _setDefaultConfig(
            CommodityType.BASE_METAL,
            1000,  // 10% base
            1000,  // 10% min
            3000   // 30% max
        );
        
        // Energy (Medium-High Risk)
        _setDefaultConfig(
            CommodityType.ENERGY,
            1500,  // 15% base
            1500,  // 15% min
            4000   // 40% max
        );
        
        // Agricultural (High Risk - Perishable)
        _setDefaultConfig(
            CommodityType.AGRICULTURAL,
            2000,  // 20% base
            2000,  // 20% min
            5000   // 50% max
        );
        
        // Carbon Credits (Highest Risk)
        _setDefaultConfig(
            CommodityType.CARBON_CREDIT,
            3000,  // 30% base
            3000,  // 30% min
            5000   // 50% max
        );
    }
    
    /**
     * @dev Helper to set default configuration
     */
    function _setDefaultConfig(
        CommodityType commodityType,
        uint256 base,
        uint256 min,
        uint256 max
    ) internal {
        HaircutConfig storage config = haircutConfigs[commodityType];
        config.baseHaircut = base;
        config.minHaircut = min;
        config.maxHaircut = max;
        config.lastUpdated = block.timestamp;
        config.updatedBy = address(this);
    }
    
    // ============ UPGRADE AUTHORIZATION ============
    
    /**
     * @notice Authorize contract upgrades
     * @dev Only addresses with UPGRADER_ROLE can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        emit Upgraded(newImplementation);
    }
    
    /**
     * @notice Get contract version
     * @return version string
     */
    function version() external pure returns (string memory) {
        return "v1.0.0";
    }
}
