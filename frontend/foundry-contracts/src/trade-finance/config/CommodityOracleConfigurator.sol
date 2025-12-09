// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WadRayMath} from "../libraries/math/WadRayMath.sol";
import {PercentageMath} from "../libraries/math/PercentageMath.sol";
import {Errors} from "../libraries/helpers/Errors.sol";
import {ChainlinkFeedAddresses} from "../config/ChainlinkFeedAddresses.sol";

/**
 * @title CommodityOracleConfigurator
 * @author Chain Capital
 * @notice Helper contract to auto-configure CommodityOracle with Chainlink feeds
 * @dev Uses ChainlinkFeedAddresses library for network-specific feed addresses
 * 
 * USAGE:
 * 1. Deploy CommodityOracle
 * 2. Call configurePreciousMetals() to auto-setup Gold & Silver feeds
 * 3. Feeds are configured based on current network (chainid)
 */
contract CommodityOracleConfigurator {
    using ChainlinkFeedAddresses for string;
    
    // Reference to CommodityOracle contract
    address public commodityOracle;
    
    // Commodity symbol mapping
    enum CommoditySymbol {
        GOLD,    // XAU/USD
        SILVER   // XAG/USD
    }
    
    event FeedConfigured(
        string indexed symbol,
        address indexed feedAddress,
        uint256 indexed chainId
    );
    
    error FeedNotAvailable(string symbol, uint256 chainId);
    error InvalidOracleAddress();
    
    constructor(address _commodityOracle) {
        if (_commodityOracle == address(0)) revert InvalidOracleAddress();
        commodityOracle = _commodityOracle;
    }
    
    /**
     * @notice Auto-configure Chainlink feeds for precious metals on current network
     * @dev Configures Gold (XAU) and Silver (XAG) if available
     */
    function configurePreciousMetals() external {
        uint256 chainId = block.chainid;
        
        // Configure Gold (XAU/USD)
        _configureFeed("XAU", chainId);
        
        // Configure Silver (XAG/USD)  
        _configureFeed("XAG", chainId);
    }
    
    /**
     * @notice Configure a specific commodity feed
     * @param symbol The commodity symbol ("XAU", "XAG")
     * @param chainId The network chain ID
     */
    function _configureFeed(
        string memory symbol,
        uint256 chainId
    ) internal {
        // Get feed metadata from ChainlinkFeedAddresses library
        ChainlinkFeedAddresses.FeedMetadata memory metadata = 
            ChainlinkFeedAddresses.getFeedMetadata(symbol, chainId);
        
        if (!metadata.isActive) {
            revert FeedNotAvailable(symbol, chainId);
        }
        
        // Get CommodityType enum value
        // For now, all supported feeds are PRECIOUS_METAL
        uint8 commodityType = 0; // CommodityType.PRECIOUS_METAL
        
        // Call CommodityOracle.setPriceFeed()
        (bool success,) = commodityOracle.call(
            abi.encodeWithSignature(
                "setPriceFeed(address,address,uint8,uint256,uint8)",
                metadata.feedAddress,  // commodity token (placeholder)
                metadata.feedAddress,  // Chainlink aggregator
                metadata.decimals,     // 8
                metadata.heartbeat,    // 24 hours
                commodityType          // PRECIOUS_METAL
            )
        );
        
        require(success, "Feed configuration failed");
        
        emit FeedConfigured(symbol, metadata.feedAddress, chainId);
    }
    
    /**
     * @notice Get list of available feeds on current network
     * @return symbols Array of supported commodity symbols
     */
    function getAvailableFeeds() external view returns (string[] memory) {
        return ChainlinkFeedAddresses.getAvailableFeeds();
    }
    
    /**
     * @notice Check if a feed is available on current network
     * @param symbol The commodity symbol
     * @return isAvailable True if feed exists
     */
    function isFeedAvailable(string memory symbol) external view returns (bool) {
        return ChainlinkFeedAddresses.isFeedAvailable(symbol, block.chainid);
    }
    
    /**
     * @notice Get feed address for a commodity
     * @param symbol The commodity symbol
     * @return feedAddress The Chainlink aggregator address
     */
    function getFeedAddress(string memory symbol) external view returns (address) {
        return ChainlinkFeedAddresses.getFeedAddress(symbol, block.chainid);
    }
}
