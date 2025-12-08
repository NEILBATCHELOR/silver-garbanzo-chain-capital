// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgriculturalPriceFeedAdapter
 * @author Chain Capital
 * @notice Adapter for agricultural commodity price feeds with grade and age adjustments
 * @dev Supports wheat, soybeans, corn, cotton with USDA grading
 */
contract AgriculturalPriceFeedAdapter is Ownable {
    
    // ============================================
    // ENUMS
    // ============================================

    enum CropType {
        WHEAT,
        SOYBEANS,
        CORN,
        COTTON
    }

    // ============================================
    // STRUCTS
    // ============================================

    struct FeedConfig {
        address feedAddress;
        uint8 decimals;
        uint256 heartbeat;
        bool isActive;
    }

    // ============================================
    // CONSTANTS
    // ============================================

    /// @notice Maximum age depreciation per day (basis points)
    /// @dev Agricultural products lose value over time
    uint256 public constant AGE_DEPRECIATION_RATE = 10; // 0.1% per day

    /// @notice Maximum total age depreciation (20%)
    uint256 public constant MAX_AGE_DEPRECIATION = 2000; // 20%

    // ============================================
    // STATE VARIABLES
    // ============================================

    /// @notice Mapping of crop type to price feed config
    mapping(CropType => FeedConfig) public priceFeeds;

    /// @notice Mapping of crop type and grade to discount (basis points)
    mapping(CropType => mapping(bytes32 => uint256)) public gradeDiscounts;

    // ============================================
    // EVENTS
    // ============================================

    event PriceFeedConfigured(CropType indexed cropType, address feedAddress);
    event GradeDiscountUpdated(CropType indexed cropType, string grade, uint256 discountBps);

    // ============================================
    // CONSTRUCTOR
    // ============================================

    constructor() Ownable(msg.sender) {
        // Initialize USDA grade discounts
        _initializeGradeDiscounts();
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Configure price feed for a crop type
     * @param cropType The crop type
     * @param feedAddress Chainlink aggregator address
     * @param decimals Feed decimals
     * @param heartbeat Maximum staleness
     */
    function configurePriceFeed(
        CropType cropType,
        address feedAddress,
        uint8 decimals,
        uint256 heartbeat
    ) external onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        
        priceFeeds[cropType] = FeedConfig({
            feedAddress: feedAddress,
            decimals: decimals,
            heartbeat: heartbeat,
            isActive: true
        });

        emit PriceFeedConfigured(cropType, feedAddress);
    }

    /**
     * @notice Set grade discount for a crop
     * @param cropType The crop type
     * @param grade The USDA grade (e.g., "Grade 1", "Grade 2")
     * @param discountBps Discount in basis points
     */
    function setGradeDiscount(
        CropType cropType,
        string memory grade,
        uint256 discountBps
    ) external onlyOwner {
        require(discountBps <= 3000, "Discount too high"); // Max 30%
        
        bytes32 gradeHash = keccak256(abi.encodePacked(grade));
        gradeDiscounts[cropType][gradeHash] = discountBps;

        emit GradeDiscountUpdated(cropType, grade, discountBps);
    }

    /**
     * @notice Disable a price feed
     * @param cropType The crop type
     */
    function disablePriceFeed(CropType cropType) external onlyOwner {
        priceFeeds[cropType].isActive = false;
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get adjusted price with grade and age discounts
     * @param cropType The crop type
     * @param grade USDA grade
     * @param inspectionDate Inspection/certificate date
     * @return price Adjusted price per unit (8 decimals)
     * @return timestamp Last oracle update
     */
    function getAdjustedPrice(
        CropType cropType,
        string memory grade,
        uint256 inspectionDate
    ) external view returns (uint256 price, uint256 timestamp) {
        // Get base price
        (uint256 basePrice, uint256 updatedAt) = getBasePrice(cropType);
        
        // Calculate grade discount
        bytes32 gradeHash = keccak256(abi.encodePacked(grade));
        uint256 gradeDiscount = gradeDiscounts[cropType][gradeHash];
        
        // Calculate age depreciation
        uint256 ageDiscount = _calculateAgeDepreciation(inspectionDate);
        
        // Apply total discount
        uint256 totalDiscount = gradeDiscount + ageDiscount;
        if (totalDiscount > 5000) { // Cap at 50%
            totalDiscount = 5000;
        }
        
        uint256 adjustedPrice = (basePrice * (10000 - totalDiscount)) / 10000;
        
        return (adjustedPrice, updatedAt);
    }

    /**
     * @notice Get base price without adjustments
     * @param cropType The crop type
     * @return price Base price per unit (8 decimals)
     * @return timestamp Last oracle update
     */
    function getBasePrice(
        CropType cropType
    ) public view returns (uint256 price, uint256 timestamp) {
        FeedConfig memory config = priceFeeds[cropType];
        require(config.isActive, "Feed not active");
        
        AggregatorV3Interface feed = AggregatorV3Interface(config.feedAddress);
        
        (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = feed.latestRoundData();

        // Validate
        require(answeredInRound >= roundId, "Stale data");
        require(answer > 0, "Invalid price");
        require(block.timestamp - updatedAt <= config.heartbeat, "Price too old");

        return (uint256(answer), updatedAt);
    }

    /**
     * @notice Check if price data is fresh
     * @param cropType The crop type
     * @return isFresh True if within heartbeat
     */
    function isFresh(CropType cropType) external view returns (bool) {
        FeedConfig memory config = priceFeeds[cropType];
        if (!config.isActive) return false;
        
        AggregatorV3Interface feed = AggregatorV3Interface(config.feedAddress);
        (, , , uint256 updatedAt, ) = feed.latestRoundData();
        
        return (block.timestamp - updatedAt <= config.heartbeat);
    }

    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================

    /**
     * @dev Initialize standard USDA grade discounts
     */
    function _initializeGradeDiscounts() internal {
        // WHEAT
        gradeDiscounts[CropType.WHEAT][keccak256("Grade 1")] = 0;      // Premium
        gradeDiscounts[CropType.WHEAT][keccak256("Grade 2")] = 500;    // 5%
        gradeDiscounts[CropType.WHEAT][keccak256("Grade 3")] = 1000;   // 10%
        gradeDiscounts[CropType.WHEAT][keccak256("Grade 4")] = 1500;   // 15%
        gradeDiscounts[CropType.WHEAT][keccak256("Grade 5")] = 2000;   // 20%

        // SOYBEANS
        gradeDiscounts[CropType.SOYBEANS][keccak256("Grade 1")] = 0;
        gradeDiscounts[CropType.SOYBEANS][keccak256("Grade 2")] = 300;
        gradeDiscounts[CropType.SOYBEANS][keccak256("Grade 3")] = 800;
        gradeDiscounts[CropType.SOYBEANS][keccak256("Grade 4")] = 1500;

        // CORN
        gradeDiscounts[CropType.CORN][keccak256("Grade 1")] = 0;
        gradeDiscounts[CropType.CORN][keccak256("Grade 2")] = 400;
        gradeDiscounts[CropType.CORN][keccak256("Grade 3")] = 1000;
        gradeDiscounts[CropType.CORN][keccak256("Grade 4")] = 1800;

        // COTTON (SLM - Strict Low Middling to Good Middling)
        gradeDiscounts[CropType.COTTON][keccak256("Good Middling")] = 0;
        gradeDiscounts[CropType.COTTON][keccak256("Strict Middling")] = 200;
        gradeDiscounts[CropType.COTTON][keccak256("Middling")] = 500;
        gradeDiscounts[CropType.COTTON][keccak256("Strict Low Middling")] = 1000;
    }

    /**
     * @dev Calculate age-based depreciation
     * @param inspectionDate Unix timestamp of inspection
     * @return ageDiscountBps Depreciation in basis points
     */
    function _calculateAgeDepreciation(
        uint256 inspectionDate
    ) internal view returns (uint256 ageDiscountBps) {
        if (inspectionDate == 0) {
            return 0;
        }

        uint256 ageInDays = (block.timestamp - inspectionDate) / 1 days;
        
        // Apply depreciation rate per day
        ageDiscountBps = ageInDays * AGE_DEPRECIATION_RATE;
        
        // Cap at maximum
        if (ageDiscountBps > MAX_AGE_DEPRECIATION) {
            ageDiscountBps = MAX_AGE_DEPRECIATION;
        }
        
        return ageDiscountBps;
    }
}
