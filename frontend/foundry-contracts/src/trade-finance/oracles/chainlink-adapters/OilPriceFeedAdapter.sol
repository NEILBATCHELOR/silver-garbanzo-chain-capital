// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title OilPriceFeedAdapter
 * @author Chain Capital
 * @notice Adapter for Chainlink WTI and Brent crude oil price feeds
 * @dev Supports both WTI and Brent with API gravity adjustments
 */
contract OilPriceFeedAdapter is Ownable {
    
    // ============================================
    // ENUMS
    // ============================================

    enum OilType {
        WTI,    // West Texas Intermediate
        BRENT   // Brent Crude
    }

    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Chainlink price feed decimals (typically 8 for USD pairs)
    uint8 public constant FEED_DECIMALS = 8;

    /// @notice Standard API gravity for light sweet crude
    uint256 public constant STANDARD_API_GRAVITY = 40; // 40° API

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Chainlink WTI/USD aggregator
    AggregatorV3Interface public immutable WTI_USD_FEED;

    /// @notice Chainlink Brent/USD aggregator
    AggregatorV3Interface public immutable BRENT_USD_FEED;

    /// @notice Maximum allowed staleness (seconds)
    uint256 public heartbeat;

    /// @notice Mapping of API gravity ranges to discounts (basis points)
    mapping(uint256 => uint256) public apiGravityDiscounts;

    // ============================================
    // EVENTS
    // ============================================

    event ApiGravityDiscountUpdated(uint256 indexed apiGravity, uint256 discountBps);
    event HeartbeatUpdated(uint256 newHeartbeat);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Constructor
     * @param wtiUsdFeed The Chainlink WTI/USD aggregator address
     * @param brentUsdFeed The Chainlink Brent/USD aggregator address
     * @param initialHeartbeat Maximum staleness in seconds
     */
    constructor(
        address wtiUsdFeed,
        address brentUsdFeed,
        uint256 initialHeartbeat
    ) Ownable(msg.sender) {
        require(wtiUsdFeed != address(0), "Invalid WTI feed");
        require(brentUsdFeed != address(0), "Invalid Brent feed");
        
        WTI_USD_FEED = AggregatorV3Interface(wtiUsdFeed);
        BRENT_USD_FEED = AggregatorV3Interface(brentUsdFeed);
        heartbeat = initialHeartbeat;

        // Initialize API gravity discounts
        _initializeApiGravityDiscounts();
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set API gravity discount
     * @param apiGravity API gravity degree
     * @param discountBps Discount in basis points
     */
    function setApiGravityDiscount(uint256 apiGravity, uint256 discountBps) external onlyOwner {
        require(apiGravity >= 10 && apiGravity <= 50, "Invalid API gravity");
        require(discountBps <= 2000, "Discount too high"); // Max 20%
        
        apiGravityDiscounts[apiGravity] = discountBps;
        emit ApiGravityDiscountUpdated(apiGravity, discountBps);
    }

    /**
     * @notice Update heartbeat
     * @param newHeartbeat New heartbeat in seconds
     */
    function setHeartbeat(uint256 newHeartbeat) external onlyOwner {
        require(newHeartbeat > 0, "Invalid heartbeat");
        heartbeat = newHeartbeat;
        emit HeartbeatUpdated(newHeartbeat);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get oil price per barrel with API gravity adjustment
     * @param oilType WTI or Brent
     * @param apiGravity API gravity in degrees (e.g., 39.6)
     * @return price Price per barrel in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getPricePerBarrel(
        OilType oilType,
        uint256 apiGravity
    ) external view returns (uint256 price, uint256 timestamp) {
        // Get base price from appropriate feed
        AggregatorV3Interface feed = oilType == OilType.WTI ? WTI_USD_FEED : BRENT_USD_FEED;
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        // Validate data
        require(answeredInRound >= roundId, "Stale data");
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= heartbeat, "Price too old");

        // Apply API gravity adjustment
        uint256 adjustedPrice = _applyApiGravityDiscount(uint256(answer), apiGravity);

        return (adjustedPrice, updatedAt);
    }

    /**
     * @notice Get base price per barrel (no adjustments)
     * @param oilType WTI or Brent
     * @return price Base price per barrel in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getBasePrice(
        OilType oilType
    ) external view returns (uint256 price, uint256 timestamp) {
        AggregatorV3Interface feed = oilType == OilType.WTI ? WTI_USD_FEED : BRENT_USD_FEED;
        
        (, int256 answer, , uint256 updatedAt, ) = feed.latestRoundData();
        require(answer > 0, "Invalid price");
        
        return (uint256(answer), updatedAt);
    }

    /**
     * @notice Check if price data is fresh
     * @param oilType WTI or Brent
     * @return isFresh True if within heartbeat
     */
    function isFresh(OilType oilType) external view returns (bool) {
        AggregatorV3Interface feed = oilType == OilType.WTI ? WTI_USD_FEED : BRENT_USD_FEED;
        (, , , uint256 updatedAt, ) = feed.latestRoundData();
        return (block.timestamp - updatedAt <= heartbeat);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @dev Initialize standard API gravity discounts
     * API Gravity Scale:
     * - >40°: Light sweet crude (premium)
     * - 30-40°: Medium crude (standard)
     * - <30°: Heavy crude (discount)
     */
    function _initializeApiGravityDiscounts() internal {
        // Light sweet crude (40°+): No discount
        apiGravityDiscounts[45] = 0;      // Extra light
        apiGravityDiscounts[40] = 0;      // Light sweet (WTI standard)
        
        // Medium crude (30-40°): Small discount
        apiGravityDiscounts[35] = 200;    // 2%
        apiGravityDiscounts[30] = 400;    // 4%
        
        // Heavy crude (<30°): Larger discount
        apiGravityDiscounts[25] = 800;    // 8%
        apiGravityDiscounts[20] = 1200;   // 12%
        apiGravityDiscounts[15] = 1600;   // 16%
        apiGravityDiscounts[10] = 2000;   // 20%
    }

    /**
     * @dev Apply API gravity-based discount
     * @param basePrice Base price per barrel
     * @param apiGravity API gravity in degrees
     * @return adjustedPrice Price after API gravity adjustment
     */
    function _applyApiGravityDiscount(
        uint256 basePrice,
        uint256 apiGravity
    ) internal view returns (uint256 adjustedPrice) {
        // Get discount for this API gravity
        uint256 discountBps = apiGravityDiscounts[apiGravity];
        
        // If no exact match, interpolate based on nearest values
        if (discountBps == 0 && apiGravity < STANDARD_API_GRAVITY) {
            // Calculate proportional discount
            // Each degree below 40° adds ~0.5% discount (50 bps)
            uint256 deficit = STANDARD_API_GRAVITY - apiGravity;
            discountBps = deficit * 50; // 0.5% per degree
            
            // Cap at 20%
            if (discountBps > 2000) {
                discountBps = 2000;
            }
        }
        
        // Apply discount
        adjustedPrice = (basePrice * (10000 - discountBps)) / 10000;
        
        return adjustedPrice;
    }
}
