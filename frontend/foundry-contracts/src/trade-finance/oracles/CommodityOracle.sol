// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title CommodityOracle
 * @author Chain Capital
 * @notice Main price oracle for commodity valuations with quality and age adjustments
 * @dev Integrates with Chainlink price feeds and applies commodity-specific discounts
 * 
 * PHASE 2 UPGRADE: Converted to UUPS upgradeable pattern
 * - Owner-controlled upgrades
 * - Storage gap for future enhancements
 * - Initialize-based deployment instead of constructor
 */
contract CommodityOracle is 
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    using WadRayMath for uint256;
    using PercentageMath for uint256;

    // ============================================
    // STRUCTS & ENUMS
    // ============================================

    enum CommodityType {
        PRECIOUS_METAL,    // Gold, Silver, Platinum
        BASE_METAL,        // Steel, Aluminum, Copper
        ENERGY,            // Oil, Gas, Coal
        AGRICULTURAL,      // Wheat, Soybeans, Cotton
        CARBON_CREDIT      // VCS, Gold Standard
    }

    struct PriceFeedConfig {
        address feedAddress;        // Chainlink aggregator address
        uint8 decimals;             // Feed decimals (typically 8 for USD)
        uint256 heartbeat;          // Max seconds between updates (e.g., 3600 for 1 hour)
        bool isActive;              // Feed enabled/disabled
        CommodityType commodityType;
    }

    struct QualityGrade {
        string grade;               // e.g., "Grade A", "99.9%"
        uint256 discountBps;        // Basis points discount (e.g., 500 = 5%)
    }

    struct PriceData {
        uint256 price;              // USD price in 18 decimals
        uint256 confidence;         // Confidence score 0-10000 (100%)
        uint256 timestamp;          // Last update timestamp
        bool isValid;               // Price is within staleness threshold
    }

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Mapping of commodity token address to price feed config
    mapping(address => PriceFeedConfig) public priceFeeds;

    /// @notice Mapping of commodity type to quality grades
    mapping(CommodityType => mapping(bytes32 => uint256)) public qualityDiscounts;

    /// @notice Fallback oracle address (secondary price source)
    address public fallbackOracle;

    /// @notice Maximum age depreciation per day (basis points) for perishables
    /// @dev Default: 10 bps/day = 0.1% per day
    uint256 public maxAgeDepreciationRate;

    /// @notice Liquidity score threshold for additional discount (0-10000)
    uint256 public liquidityThreshold;

    /// @notice Additional discount for low liquidity (basis points)
    uint256 public liquidityDiscountBps;

    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Maximum total discount cap (basis points)
    uint256 public constant MAX_TOTAL_DISCOUNT = 5000; // 50% max

    // ============================================
    // STORAGE GAP
    // ============================================
    
    /// @dev Reserve 44 slots for future variables (50 total - 6 current)
    uint256[44] private __gap;

    // ============================================
    // EVENTS
    // ============================================

    event PriceFeedUpdated(
        address indexed commodity,
        address indexed feedAddress,
        CommodityType commodityType
    );

    event QualityDiscountSet(
        CommodityType indexed commodityType,
        string grade,
        uint256 discountBps
    );

    event FallbackOracleSet(address indexed oldOracle, address indexed newOracle);

    event PriceUpdated(
        address indexed commodity,
        uint256 price,
        uint256 confidence,
        uint256 timestamp
    );

    event Upgraded(address indexed newImplementation);

    // ============================================
    // ERRORS
    // ============================================

    error PriceFeedNotConfigured();
    error StalePriceData();
    error InvalidPriceData();
    error InvalidQualityGrade();
    error InvalidCommodityToken();
    error DiscountTooHigh();
    error ZeroAddress();
    error RateTooHigh();

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * @notice Initialize the CommodityOracle (replaces constructor)
     * @param owner The owner address
     */
    function initialize(address owner) external initializer {
        if (owner == address(0)) revert ZeroAddress();

        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        
        // Set default values
        maxAgeDepreciationRate = 10; // 0.1% per day
        liquidityThreshold = 5000; // 50%
        liquidityDiscountBps = 100; // 1%
    }

    // ============================================
    // UPGRADE AUTHORIZATION
    // ============================================

    /**
     * @notice Authorize contract upgrades
     * @dev Only owner can upgrade
     * @param newImplementation New implementation address
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {
        emit Upgraded(newImplementation);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set or update a Chainlink price feed for a commodity
     * @param commodity The commodity token address
     * @param feedAddress The Chainlink aggregator address
     * @param decimals The feed decimals
     * @param heartbeat Max seconds between updates
     * @param commodityType The type of commodity
     */
    function setPriceFeed(
        address commodity,
        address feedAddress,
        uint8 decimals,
        uint256 heartbeat,
        CommodityType commodityType
    ) external onlyOwner {
        if (commodity == address(0)) revert ZeroAddress();
        if (feedAddress == address(0)) revert ZeroAddress();
        
        priceFeeds[commodity] = PriceFeedConfig({
            feedAddress: feedAddress,
            decimals: decimals,
            heartbeat: heartbeat,
            isActive: true,
            commodityType: commodityType
        });

        emit PriceFeedUpdated(commodity, feedAddress, commodityType);
    }

    /**
     * @notice Disable a price feed
     * @param commodity The commodity token address
     */
    function disablePriceFeed(address commodity) external onlyOwner {
        priceFeeds[commodity].isActive = false;
    }

    /**
     * @notice Set quality discount for a commodity grade
     * @param commodityType The type of commodity
     * @param grade The quality grade (e.g., "Grade A", "99.9%")
     * @param discountBps Discount in basis points
     */
    function setQualityDiscount(
        CommodityType commodityType,
        string memory grade,
        uint256 discountBps
    ) external onlyOwner {
        if (discountBps > MAX_TOTAL_DISCOUNT) revert DiscountTooHigh();
        
        bytes32 gradeHash = keccak256(abi.encodePacked(grade));
        qualityDiscounts[commodityType][gradeHash] = discountBps;

        emit QualityDiscountSet(commodityType, grade, discountBps);
    }

    /**
     * @notice Set fallback oracle address
     * @param newFallbackOracle The fallback oracle address
     */
    function setFallbackOracle(address newFallbackOracle) external onlyOwner {
        address oldOracle = fallbackOracle;
        fallbackOracle = newFallbackOracle;
        emit FallbackOracleSet(oldOracle, newFallbackOracle);
    }

    /**
     * @notice Set age depreciation rate for perishables
     * @param ratePerDay Depreciation rate in basis points per day
     */
    function setAgeDepreciationRate(uint256 ratePerDay) external onlyOwner {
        if (ratePerDay > 100) revert RateTooHigh(); // Max 1% per day
        maxAgeDepreciationRate = ratePerDay;
    }
    // ============================================
    // VIEW FUNCTIONS - CORE PRICING
    // ============================================

    /**
     * @notice Get the USD value of a commodity token amount
     * @param commodityToken The commodity token address
     * @param amount The amount of tokens
     * @return valueUSD The value in USD (18 decimals)
     * @return confidence The confidence score (0-10000)
     */
    function getValueUSD(
        address commodityToken,
        uint256 amount
    ) external view returns (uint256 valueUSD, uint256 confidence) {
        PriceData memory priceData = _getPriceData(commodityToken);
        
        if (!priceData.isValid) revert InvalidPriceData();
        
        // Calculate value: amount * price / 10^decimals
        valueUSD = (amount * priceData.price) / 1e18;
        confidence = priceData.confidence;
        
        return (valueUSD, confidence);
    }

    /**
     * @notice Get adjusted value with quality and age discounts
     * @param commodityToken The commodity token address
     * @param amount The amount of tokens
     * @param quality The quality grade (e.g., "Grade A")
     * @param certificateDate The certificate/inspection date (unix timestamp)
     * @return adjustedValue The discounted value in USD
     * @return totalDiscountBps The total discount applied (basis points)
     */
    function getAdjustedValueUSD(
        address commodityToken,
        uint256 amount,
        string memory quality,
        uint256 certificateDate
    ) external view returns (uint256 adjustedValue, uint256 totalDiscountBps) {
        // Get base oracle value
        PriceData memory priceData = _getPriceData(commodityToken);
        if (!priceData.isValid) revert InvalidPriceData();
        
        uint256 baseValue = (amount * priceData.price) / 1e18;
        
        // Calculate total discount
        totalDiscountBps = _calculateTotalDiscount(
            commodityToken,
            quality,
            certificateDate
        );
        
        // Apply discount
        adjustedValue = baseValue.percentMul(10000 - totalDiscountBps);
        
        return (adjustedValue, totalDiscountBps);
    }

    /**
     * @notice Get raw price data from oracle
     * @param commodityToken The commodity token address
     * @return price The price in USD (18 decimals)
     * @return confidence The confidence score
     * @return timestamp The last update timestamp
     */
    function getPriceData(
        address commodityToken
    ) external view returns (uint256 price, uint256 confidence, uint256 timestamp) {
        PriceData memory data = _getPriceData(commodityToken);
        return (data.price, data.confidence, data.timestamp);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @dev Get price data from Chainlink with fallback
     * @param commodityToken The commodity token address
     * @return priceData The price data struct
     */
    function _getPriceData(
        address commodityToken
    ) internal view returns (PriceData memory priceData) {
        PriceFeedConfig memory config = priceFeeds[commodityToken];
        
        if (!config.isActive || config.feedAddress == address(0)) {
            revert PriceFeedNotConfigured();
        }

        try AggregatorV3Interface(config.feedAddress).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            // Check staleness
            require(block.timestamp - updatedAt <= config.heartbeat, "Stale price");
            require(answer > 0, "Invalid price");

            // Convert price to 18 decimals
            uint256 price18 = _scalePrice(uint256(answer), config.decimals, 18);
            
            // Calculate confidence based on staleness
            uint256 staleness = block.timestamp - updatedAt;
            uint256 confidence = _calculateConfidence(staleness, config.heartbeat);
            
            priceData = PriceData({
                price: price18,
                confidence: confidence,
                timestamp: updatedAt,
                isValid: true
            });
            
        } catch {
            // Try fallback oracle if available
            if (fallbackOracle != address(0)) {
                return _getFallbackPrice(commodityToken);
            }
            revert InvalidPriceData();
        }
    }

    /**
     * @dev Get price from fallback oracle
     * @param commodityToken The commodity token address
     * @return priceData The price data from fallback
     */
    function _getFallbackPrice(
        address commodityToken
    ) internal view returns (PriceData memory priceData) {
        // Implement fallback oracle interface
        // For now, revert as not implemented
        revert InvalidPriceData();
    }

    /**
     * @dev Calculate total discount from quality, age, and liquidity factors
     * @param commodityToken The commodity token address
     * @param quality The quality grade
     * @param certificateDate The certificate date
     * @return totalDiscountBps Total discount in basis points
     */
    function _calculateTotalDiscount(
        address commodityToken,
        string memory quality,
        uint256 certificateDate
    ) internal view returns (uint256 totalDiscountBps) {
        PriceFeedConfig memory config = priceFeeds[commodityToken];
        uint256 discount = 0;

        // 1. Quality discount
        if (bytes(quality).length > 0) {
            bytes32 gradeHash = keccak256(abi.encodePacked(quality));
            uint256 qualityDiscount = qualityDiscounts[config.commodityType][gradeHash];
            discount += qualityDiscount;
        }

        // 2. Age depreciation (only for perishables - AGRICULTURAL type)
        if (config.commodityType == CommodityType.AGRICULTURAL && certificateDate > 0) {
            uint256 ageInDays = (block.timestamp - certificateDate) / 1 days;
            uint256 ageDiscount = ageInDays * maxAgeDepreciationRate;
            
            // Cap age discount at 20% (2000 bps)
            if (ageDiscount > 2000) {
                ageDiscount = 2000;
            }
            
            discount += ageDiscount;
        }

        // 3. Liquidity discount (placeholder - would need actual market data)
        // For now, no additional liquidity discount
        
        // Cap total discount
        if (discount > MAX_TOTAL_DISCOUNT) {
            discount = MAX_TOTAL_DISCOUNT;
        }

        return discount;
    }

    /**
     * @dev Calculate confidence score based on price staleness
     * @param staleness Seconds since last update
     * @param heartbeat Maximum allowed staleness
     * @return confidence Confidence score (0-10000)
     */
    function _calculateConfidence(
        uint256 staleness,
        uint256 heartbeat
    ) internal pure returns (uint256 confidence) {
        if (staleness == 0) {
            return 10000; // 100% confidence
        }
        
        // Linear decay: confidence = 100% * (1 - staleness/heartbeat)
        uint256 decay = (staleness * 10000) / heartbeat;
        
        if (decay >= 10000) {
            return 0;
        }
        
        return 10000 - decay;
    }

    /**
     * @dev Scale price from one decimal precision to another
     * @param price The price to scale
     * @param fromDecimals Source decimals
     * @param toDecimals Target decimals
     * @return scaledPrice The scaled price
     */
    function _scalePrice(
        uint256 price,
        uint8 fromDecimals,
        uint8 toDecimals
    ) internal pure returns (uint256 scaledPrice) {
        if (fromDecimals == toDecimals) {
            return price;
        }
        
        if (fromDecimals < toDecimals) {
            // Scale up
            return price * (10 ** (toDecimals - fromDecimals));
        } else {
            // Scale down
            return price / (10 ** (fromDecimals - toDecimals));
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    /**
     * @notice Check if a price feed is configured and active
     * @param commodityToken The commodity token address
     * @return isConfigured True if configured and active
     */
    function isPriceFeedActive(address commodityToken) external view returns (bool) {
        PriceFeedConfig memory config = priceFeeds[commodityToken];
        return config.isActive && config.feedAddress != address(0);
    }

    /**
     * @notice Get the commodity type for a token
     * @param commodityToken The commodity token address
     * @return commodityType The commodity type enum
     */
    function getCommodityType(address commodityToken) external view returns (CommodityType) {
        return priceFeeds[commodityToken].commodityType;
    }

    /**
     * @notice Get the price feed configuration for a commodity
     * @param commodityToken The commodity token address
     * @return config The price feed configuration
     */
    function getPriceFeedConfig(
        address commodityToken
    ) external view returns (PriceFeedConfig memory) {
        return priceFeeds[commodityToken];
    }
}
