// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ChainlinkOracleAdapter
 * @author Chain Capital
 * @notice Unified adapter for multiple Chainlink price feeds
 * @dev Manages Chainlink oracle feeds for commodities with automatic price scaling
 */
contract ChainlinkOracleAdapter is Ownable {
    
    // ============================================
    // STRUCTS & TYPES
    // ============================================
    
    struct FeedConfig {
        address feedAddress;
        uint8 decimals;
        uint256 heartbeat;
        string description;
        bool isActive;
    }
    
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    /// @notice Mapping of symbol hash to feed configuration
    mapping(bytes32 => FeedConfig) public feeds;
    
    /// @notice Array of all registered symbol hashes
    bytes32[] public registeredFeeds;
    
    // ============================================
    // EVENTS
    // ============================================
    
    event FeedRegistered(
        string indexed symbol,
        address indexed feedAddress,
        uint256 heartbeat
    );
    
    event FeedUpdated(
        string indexed symbol,
        address indexed oldFeed,
        address indexed newFeed
    );
    
    event PriceFetched(
        string indexed symbol,
        uint256 price,
        uint256 timestamp
    );
    
    // ============================================
    // ERRORS
    // ============================================
    
    error FeedNotConfigured(string symbol);
    error InvalidFeedAddress();
    error StalePrice(string symbol, uint256 age, uint256 maxAge);
    error InvalidPrice(string symbol);
    error FeedDisabled(string symbol);
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    constructor() Ownable(msg.sender) {}
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Register a new Chainlink price feed
     * @param symbol The commodity symbol (e.g., "XAU/USD", "WTI/USD")
     * @param feedAddress The Chainlink aggregator address
     * @param decimals The feed decimals (typically 8)
     * @param heartbeat Max seconds between updates
     * @param description Human-readable description
     */
    function registerFeed(
        string memory symbol,
        address feedAddress,
        uint8 decimals,
        uint256 heartbeat,
        string memory description
    ) external onlyOwner {
        if (feedAddress == address(0)) revert InvalidFeedAddress();
        
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        
        // Check if this is a new feed
        bool isNew = feeds[feedId].feedAddress == address(0);
        
        // Store old address for event
        address oldFeed = feeds[feedId].feedAddress;
        
        feeds[feedId] = FeedConfig({
            feedAddress: feedAddress,
            decimals: decimals,
            heartbeat: heartbeat,
            description: description,
            isActive: true
        });
        
        if (isNew) {
            registeredFeeds.push(feedId);
            emit FeedRegistered(symbol, feedAddress, heartbeat);
        } else {
            emit FeedUpdated(symbol, oldFeed, feedAddress);
        }
    }
    
    /**
     * @notice Update heartbeat for an existing feed
     * @param symbol The commodity symbol
     * @param newHeartbeat New max seconds between updates
     */
    function updateHeartbeat(
        string memory symbol,
        uint256 newHeartbeat
    ) external onlyOwner {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        
        if (feeds[feedId].feedAddress == address(0)) {
            revert FeedNotConfigured(symbol);
        }
        
        feeds[feedId].heartbeat = newHeartbeat;
    }
    
    /**
     * @notice Disable a price feed
     * @param symbol The commodity symbol
     */
    function disableFeed(string memory symbol) external onlyOwner {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        
        if (feeds[feedId].feedAddress == address(0)) {
            revert FeedNotConfigured(symbol);
        }
        
        feeds[feedId].isActive = false;
        // Note: Feed disabled, no event emission needed
    }
    
    /**
     * @notice Enable a previously disabled feed
     * @param symbol The commodity symbol
     */
    function enableFeed(string memory symbol) external onlyOwner {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        
        if (feeds[feedId].feedAddress == address(0)) {
            revert FeedNotConfigured(symbol);
        }
        
        feeds[feedId].isActive = true;
    }
    
    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    
    /**
     * @notice Get latest price for a symbol
     * @param symbol The commodity symbol
     * @return price Price in 18 decimals (USD)
     * @return timestamp Last update timestamp
     * @return confidence Confidence score (0-10000, 100% = 10000)
     */
    function getLatestPrice(
        string memory symbol
    ) external view returns (
        uint256 price,
        uint256 timestamp,
        uint256 confidence
    ) {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        FeedConfig memory config = feeds[feedId];
        
        if (config.feedAddress == address(0)) {
            revert FeedNotConfigured(symbol);
        }
        
        if (!config.isActive) {
            revert FeedDisabled(symbol);
        }
        
        AggregatorV3Interface priceFeed = AggregatorV3Interface(config.feedAddress);
        
        (
            ,
            int256 answer,
            ,
            uint256 updatedAt,
            
        ) = priceFeed.latestRoundData();
        
        // Validate price
        if (answer <= 0) {
            revert InvalidPrice(symbol);
        }
        
        // Check staleness
        uint256 age = block.timestamp - updatedAt;
        if (age > config.heartbeat) {
            revert StalePrice(symbol, age, config.heartbeat);
        }
        
        // Convert to 18 decimals
        uint256 price18 = _scalePrice(uint256(answer), config.decimals, 18);
        
        // Calculate confidence based on staleness
        uint256 conf = _calculateConfidence(age, config.heartbeat);
        
        return (price18, updatedAt, conf);
    }
    
    /**
     * @notice Get latest price without reverting on stale data
     * @param symbol The commodity symbol
     * @return price Price in 18 decimals (0 if unavailable)
     * @return timestamp Last update timestamp
     * @return isValid True if price is fresh
     */
    function tryGetLatestPrice(
        string memory symbol
    ) external view returns (
        uint256 price,
        uint256 timestamp,
        bool isValid
    ) {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        FeedConfig memory config = feeds[feedId];
        
        if (config.feedAddress == address(0) || !config.isActive) {
            return (0, 0, false);
        }
        
        try AggregatorV3Interface(config.feedAddress).latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        ) {
            if (answer <= 0) {
                return (0, 0, false);
            }
            
            uint256 age = block.timestamp - updatedAt;
            bool fresh = age <= config.heartbeat;
            
            if (!fresh) {
                return (0, updatedAt, false);
            }
            
            uint256 price18 = _scalePrice(uint256(answer), config.decimals, 18);
            return (price18, updatedAt, true);
            
        } catch {
            return (0, 0, false);
        }
    }
    
    /**
     * @notice Get feed configuration for a symbol
     * @param symbol The commodity symbol
     * @return config The feed configuration
     */
    function getFeedConfig(
        string memory symbol
    ) external view returns (FeedConfig memory) {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        return feeds[feedId];
    }
    
    /**
     * @notice Check if a feed is configured and active
     * @param symbol The commodity symbol
     * @return isConfigured True if feed exists and is active
     */
    function isFeedActive(string memory symbol) external view returns (bool) {
        bytes32 feedId = keccak256(abi.encodePacked(symbol));
        FeedConfig memory config = feeds[feedId];
        return config.feedAddress != address(0) && config.isActive;
    }
    
    /**
     * @notice Get total number of registered feeds
     * @return count Number of feeds
     */
    function getRegisteredFeedCount() external view returns (uint256) {
        return registeredFeeds.length;
    }
    
    /**
     * @notice Get feed ID at index
     * @param index The index
     * @return feedId The feed identifier
     */
    function getRegisteredFeedAt(uint256 index) external view returns (bytes32) {
        require(index < registeredFeeds.length, "Index out of bounds");
        return registeredFeeds[index];
    }
    
    // ============================================
    // INTERNAL FUNCTIONS
    // ============================================
    
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
    
    /**
     * @dev Calculate confidence score based on price staleness
     * @param age Seconds since last update
     * @param heartbeat Maximum allowed staleness
     * @return confidence Confidence score (0-10000)
     */
    function _calculateConfidence(
        uint256 age,
        uint256 heartbeat
    ) internal pure returns (uint256 confidence) {
        if (age == 0) {
            return 10000; // 100% confidence
        }
        
        if (age >= heartbeat) {
            return 0; // No confidence
        }
        
        // Linear decay: confidence = 100% * (1 - age/heartbeat)
        uint256 decay = (age * 10000) / heartbeat;
        return 10000 - decay;
    }
}
