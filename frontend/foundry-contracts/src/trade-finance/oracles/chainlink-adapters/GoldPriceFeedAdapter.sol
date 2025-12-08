// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GoldPriceFeedAdapter
 * @author Chain Capital
 * @notice Adapter for Chainlink XAU/USD (Gold) price feed with quality adjustments
 * @dev Converts troy ounce prices to gram prices with purity adjustments
 */
contract GoldPriceFeedAdapter is Ownable {
    
    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Troy ounces per gram
    uint256 public constant TROY_OZ_PER_GRAM = 31103477; // 31.103477 (8 decimals)
    uint256 public constant TROY_OZ_DECIMALS = 1e6;

    /// @notice Chainlink price feed decimals (typically 8 for USD pairs)
    uint8 public constant FEED_DECIMALS = 8;

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Chainlink XAU/USD aggregator
    AggregatorV3Interface public immutable XAU_USD_FEED;

    /// @notice Mapping of purity level to discount (basis points)
    /// @dev Example: 999 (99.9%) -> 0 bps, 995 (99.5%) -> 100 bps
    mapping(uint256 => uint256) public purityDiscounts;

    /// @notice Maximum allowed staleness (seconds)
    uint256 public heartbeat;

    // ============================================
    // EVENTS
    // ============================================

    event PurityDiscountUpdated(uint256 indexed purity, uint256 discountBps);
    event HeartbeatUpdated(uint256 newHeartbeat);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    /**
     * @notice Constructor
     * @param xauUsdFeed The Chainlink XAU/USD aggregator address
     * @param initialHeartbeat Maximum staleness in seconds (e.g., 3600 for 1 hour)
     */
    constructor(
        address xauUsdFeed,
        uint256 initialHeartbeat
    ) Ownable(msg.sender) {
        require(xauUsdFeed != address(0), "Invalid feed address");
        XAU_USD_FEED = AggregatorV3Interface(xauUsdFeed);
        heartbeat = initialHeartbeat;

        // Initialize standard purity discounts
        _initializePurityDiscounts();
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set purity discount for a specific purity level
     * @param purity Purity in basis points (e.g., 999 for 99.9%, 995 for 99.5%)
     * @param discountBps Discount in basis points (e.g., 100 = 1%)
     */
    function setPurityDiscount(uint256 purity, uint256 discountBps) external onlyOwner {
        require(purity >= 900 && purity <= 999, "Invalid purity");
        require(discountBps <= 1000, "Discount too high"); // Max 10%
        
        purityDiscounts[purity] = discountBps;
        emit PurityDiscountUpdated(purity, discountBps);
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
     * @notice Get current gold price per gram in USD
     * @param purity Gold purity in basis points (e.g., 999 for 99.9%)
     * @return price Price per gram in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getPricePerGram(
        uint256 purity
    ) external view returns (uint256 price, uint256 timestamp) {
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = XAU_USD_FEED.latestRoundData();

        // Validate data
        require(answeredInRound >= roundId, "Stale data");
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= heartbeat, "Price too old");

        // Convert troy ounce price to gram price
        // Price per gram = (Price per oz * 1e6) / 31.103477e6
        uint256 pricePerGram = (uint256(answer) * TROY_OZ_DECIMALS) / TROY_OZ_PER_GRAM;

        // Apply purity adjustment
        uint256 purityAdjustedPrice = _applyPurityDiscount(pricePerGram, purity);

        return (purityAdjustedPrice, updatedAt);
    }

    /**
     * @notice Get price per troy ounce (standard Chainlink format)
     * @return price Price per troy ounce in USD (8 decimals)
     * @return timestamp Last update timestamp
     */
    function getPricePerOunce() external view returns (uint256 price, uint256 timestamp) {
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,
            
        ) = XAU_USD_FEED.latestRoundData();

        require(answer > 0, "Invalid price");
        return (uint256(answer), updatedAt);
    }

    /**
     * @notice Check if price data is fresh
     * @return isFresh True if within heartbeat
     */
    function isFresh() external view returns (bool) {
        (, , , uint256 updatedAt, ) = XAU_USD_FEED.latestRoundData();
        return (block.timestamp - updatedAt <= heartbeat);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @dev Initialize standard purity discounts
     */
    function _initializePurityDiscounts() internal {
        // 99.99% (Four Nines) - No discount (best purity)
        purityDiscounts[9999] = 0;
        
        // 99.9% (Three Nines) - London Good Delivery standard
        purityDiscounts[999] = 0;
        
        // 99.5% - Slight discount
        purityDiscounts[995] = 50; // 0.5%
        
        // 99.0% - Small discount
        purityDiscounts[990] = 100; // 1%
        
        // 95.0% - Moderate discount
        purityDiscounts[950] = 300; // 3%
        
        // 90.0% - Higher discount
        purityDiscounts[900] = 500; // 5%
    }

    /**
     * @dev Apply purity-based discount to price
     * @param basePrice The base price per gram
     * @param purity The purity in basis points (999 = 99.9%)
     * @return adjustedPrice Price after purity discount
     */
    function _applyPurityDiscount(
        uint256 basePrice,
        uint256 purity
    ) internal view returns (uint256 adjustedPrice) {
        // Get discount for this purity level
        uint256 discountBps = purityDiscounts[purity];
        
        // If no discount configured, calculate proportionally
        if (discountBps == 0 && purity < 999) {
            // Linear discount: 999 = 0%, 900 = 10%
            // Each 1 bps purity below 999 = 0.1% discount
            uint256 purityDeficit = 999 - purity;
            discountBps = purityDeficit; // 1:1 mapping for simplicity
            
            // Cap at 10%
            if (discountBps > 1000) {
                discountBps = 1000;
            }
        }
        
        // Apply discount: price * (10000 - discountBps) / 10000
        adjustedPrice = (basePrice * (10000 - discountBps)) / 10000;
        
        return adjustedPrice;
    }

    // ============================================
    // CONVERSION HELPERS
    // ============================================

    /**
     * @notice Convert grams to troy ounces
     * @param grams Amount in grams
     * @return ounces Amount in troy ounces (with 6 decimals precision)
     */
    function gramsToOunces(uint256 grams) external pure returns (uint256 ounces) {
        return (grams * TROY_OZ_DECIMALS) / TROY_OZ_PER_GRAM;
    }

    /**
     * @notice Convert troy ounces to grams
     * @param ounces Amount in troy ounces (with 6 decimals)
     * @return grams Amount in grams
     */
    function ouncesToGrams(uint256 ounces) external pure returns (uint256 grams) {
        return (ounces * TROY_OZ_PER_GRAM) / TROY_OZ_DECIMALS;
    }
}
