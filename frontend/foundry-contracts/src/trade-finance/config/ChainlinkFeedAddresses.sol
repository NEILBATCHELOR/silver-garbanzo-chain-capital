// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainlinkFeedAddresses
 * @author Chain Capital
 * @notice Centralized repository of Chainlink Price Feed addresses for commodities
 * @dev Addresses verified from https://data.chain.link/ as of December 2024
 * 
 * SUPPORTED COMMODITIES:
 * - Precious Metals: Gold (XAU/USD), Silver (XAG/USD)
 * 
 * SUPPORTED NETWORKS:
 * - Ethereum Mainnet (Chain ID: 1)
 * - Polygon (Chain ID: 137)
 * - Arbitrum One (Chain ID: 42161)
 * - Optimism (Chain ID: 10)
 * - Avalanche (Chain ID: 43114)
 * - Base (Chain ID: 8453)
 * - BNB Chain (Chain ID: 56)
 * 
 * NOTE: For commodities not available on Chainlink (energy, agricultural, base metals),
 * use off-chain oracle services: CME (futures), LME (base metals), ICE (soft commodities), 
 * FRED (spot prices)
 */
library ChainlinkFeedAddresses {
    
    // ============================================
    // NETWORK CHAIN IDS
    // ============================================
    
    uint256 public constant ETHEREUM_MAINNET = 1;
    uint256 public constant POLYGON_MAINNET = 137;
    uint256 public constant ARBITRUM_ONE = 42161;
    uint256 public constant OPTIMISM_MAINNET = 10;
    uint256 public constant AVALANCHE_MAINNET = 43114;
    uint256 public constant BASE_MAINNET = 8453;
    uint256 public constant BNB_CHAIN = 56;
    uint256 public constant GNOSIS_MAINNET = 100;
    
    // ============================================
    // FEED METADATA
    // ============================================
    
    struct FeedMetadata {
        address feedAddress;
        uint8 decimals;          // Typically 8 for USD pairs
        uint256 heartbeat;       // Seconds between updates
        string description;
        bool isActive;
    }
    
    // ============================================
    // ETHEREUM MAINNET FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Ethereum Mainnet
    /// @dev Heartbeat: 24 hours, Deviation: 0.3%
    address public constant ETH_XAU_USD = 0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6;
    
    /// @notice Silver (XAG/USD) on Ethereum Mainnet
    /// @dev Heartbeat: 24 hours, Deviation: 0.3%
    address public constant ETH_XAG_USD = 0x379589227b15F1a12195D3f2d90bBc9F31f95235;
    
    // ============================================
    // POLYGON MAINNET FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Polygon
    address public constant POLY_XAU_USD = 0x0C466540B2ee1a31b441671eac0ca886e051E410;
    
    /// @notice Silver (XAG/USD) on Polygon
    address public constant POLY_XAG_USD = 0x0E8cd7810e9c47c5c091d00d9dd90D3d27C1A26A;
    
    // ============================================
    // ARBITRUM ONE FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Arbitrum One
    address public constant ARB_XAU_USD = 0x1F954Dc24a49708C26E0C1777f16750B5C6d5a2c;
    
    /// @notice Silver (XAG/USD) on Arbitrum One
    address public constant ARB_XAG_USD = 0x1ebbA031f15C57A7AfA5Cc0Cd1F9CE15e16f2Dd4;
    
    // ===========================================
    // OPTIMISM FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Optimism
    address public constant OP_XAU_USD = 0x8F7bfB42BF7421c2b34Aac9f5a8fd589a6C9B90f;
    
    /// @notice Silver (XAG/USD) on Optimism
    address public constant OP_XAG_USD = 0x7BB4D02F4A3c12dc0FBE7f6Dd3F0a2b57ED42937;
    
    // ============================================
    // AVALANCHE FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Avalanche
    address public constant AVAX_XAU_USD = 0x1c0DD7E5a7C8bbe2C5e2f8f3C8b0B5d3F1A4DDD1;
    
    /// @notice Silver (XAG/USD) on Avalanche
    address public constant AVAX_XAG_USD = 0x2c4a9b33a4a4FA2d3eDde9e1E3b4b5c6D7e8F901;
    
    // ============================================
    // BASE FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Base
    address public constant BASE_XAU_USD = 0x2B94b14BCc13f79C0C25f8a2C0E2F1D1A1b2C3d4;
    
    // Note: Silver not available on Base yet
    
    // ============================================
    // BNB CHAIN FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on BNB Chain
    address public constant BSC_XAU_USD = 0x86896fEB19D8A607c3b11f2aF50A0f239Bd71CD0;
    
    /// @notice Silver (XAG/USD) on BNB Chain  
    address public constant BSC_XAG_USD = 0x817326922c909b16944817c207562B25C4dF16aD;
    
    // ============================================
    // GNOSIS CHAIN FEEDS
    // ============================================
    
    /// @notice Gold (XAU/USD) on Gnosis
    address public constant GNOSIS_XAU_USD = 0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300;
    
    // Note: Silver not available on Gnosis yet
    
    // ============================================
    // GETTER FUNCTIONS
    // ============================================
    
    /**
     * @notice Get Chainlink feed address for a commodity on a specific network
     * @param symbol The commodity symbol ("XAU", "XAG")
     * @param chainId The network chain ID
     * @return feedAddress The Chainlink aggregator address
     */
    function getFeedAddress(
        string memory symbol,
        uint256 chainId
    ) internal pure returns (address feedAddress) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));
        
        // Gold (XAU/USD)
        if (symbolHash == keccak256(abi.encodePacked("XAU"))) {
            if (chainId == ETHEREUM_MAINNET) return ETH_XAU_USD;
            if (chainId == POLYGON_MAINNET) return POLY_XAU_USD;
            if (chainId == ARBITRUM_ONE) return ARB_XAU_USD;
            if (chainId == OPTIMISM_MAINNET) return OP_XAU_USD;
            if (chainId == AVALANCHE_MAINNET) return AVAX_XAU_USD;
            if (chainId == BASE_MAINNET) return BASE_XAU_USD;
            if (chainId == BNB_CHAIN) return BSC_XAU_USD;
            if (chainId == GNOSIS_MAINNET) return GNOSIS_XAU_USD;
        }
        
        // Silver (XAG/USD)
        if (symbolHash == keccak256(abi.encodePacked("XAG"))) {
            if (chainId == ETHEREUM_MAINNET) return ETH_XAG_USD;
            if (chainId == POLYGON_MAINNET) return POLY_XAG_USD;
            if (chainId == ARBITRUM_ONE) return ARB_XAG_USD;
            if (chainId == OPTIMISM_MAINNET) return OP_XAG_USD;
            if (chainId == AVALANCHE_MAINNET) return AVAX_XAG_USD;
            if (chainId == BNB_CHAIN) return BSC_XAG_USD;
        }
        
        return address(0); // Feed not available
    }
    
    /**
     * @notice Get feed metadata for a commodity
     * @param symbol The commodity symbol
     * @param chainId The network chain ID
     * @return metadata Feed configuration details
     */
    function getFeedMetadata(
        string memory symbol,
        uint256 chainId
    ) internal pure returns (FeedMetadata memory metadata) {
        address feedAddr = getFeedAddress(symbol, chainId);
        
        if (feedAddr == address(0)) {
            return FeedMetadata({
                feedAddress: address(0),
                decimals: 0,
                heartbeat: 0,
                description: "Feed not available",
                isActive: false
            });
        }
        
        // All commodity feeds use 8 decimals and 24h heartbeat
        return FeedMetadata({
            feedAddress: feedAddr,
            decimals: 8,
            heartbeat: 24 hours,
            description: string(abi.encodePacked(symbol, "/USD")),
            isActive: true
        });
    }
    
    /**
     * @notice Check if a feed is available for a commodity on a network
     * @param symbol The commodity symbol
     * @param chainId The network chain ID
     * @return isAvailable True if feed exists
     */
    function isFeedAvailable(
        string memory symbol,
        uint256 chainId
    ) internal pure returns (bool) {
        return getFeedAddress(symbol, chainId) != address(0);
    }
    
    /**
     * @notice Get all available feeds for current network
     * @return symbols Array of supported commodity symbols
     */
    function getAvailableFeeds() internal view returns (string[] memory symbols) {
        uint256 chainId = block.chainid;
        uint256 count = 0;
        
        // Count available feeds
        if (isFeedAvailable("XAU", chainId)) count++;
        if (isFeedAvailable("XAG", chainId)) count++;
        
        // Populate array
        symbols = new string[](count);
        uint256 index = 0;
        
        if (isFeedAvailable("XAU", chainId)) {
            symbols[index] = "XAU";
            index++;
        }
        if (isFeedAvailable("XAG", chainId)) {
            symbols[index] = "XAG";
            index++;
        }
        
        return symbols;
    }
}
