// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC721FractionModule
 * @notice Interface for NFT fractionalization
 * @dev Enables partial ownership of high-value NFTs
 * 
 * Use Cases:
 * - Real estate tokenization
 * - High-value art ownership
 * - Investment DAOs
 * - Liquidity for illiquid assets
 */
interface IERC721FractionModule {
    event Fractionalized(
        uint256 indexed tokenId,
        address indexed shareToken,
        uint256 shares,
        address owner
    );
    event Redeemed(uint256 indexed tokenId, address indexed redeemer);
    event BuyoutInitiated(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event BuyoutCompleted(uint256 indexed tokenId, address indexed buyer);
    event ConfigurationUpdated(
        uint256 minFractions, 
        uint256 maxFractions, 
        uint256 buyoutMultiplier, 
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    );
    event FractionPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TradingStatusUpdated(bool enabled);
    
    error AlreadyFractionalized(uint256 tokenId);
    error NotFractionalized(uint256 tokenId);
    error InsufficientShares();
    error InvalidFractionCount(uint256 shares);
    error RedemptionDisabled();
    error InsufficientBuyoutPrice(uint256 provided, uint256 required);
    
    /**
     * @notice Fractionalize NFT into ERC20 shares
     * @param tokenId Token to fractionalize
     * @param shares Number of shares to create
     * @param shareName Share token name
     * @param shareSymbol Share token symbol
     * @return shareToken Address of created share token
     */
    function fractionalize(
        uint256 tokenId,
        uint256 shares,
        string memory shareName,
        string memory shareSymbol
    ) external returns (address shareToken);
    
    /**
     * @notice Redeem NFT by burning all shares
     * @param tokenId Token to redeem
     */
    function redeem(uint256 tokenId) external;
    
    /**
     * @notice Get share token for fractionalized NFT
     * @param tokenId Token ID
     * @return shareToken Share token address
     */
    function getShareToken(uint256 tokenId) external view returns (address shareToken);
    
    /**
     * @notice Check if NFT is fractionalized
     * @param tokenId Token ID
     * @return bool True if fractionalized
     */
    function isFractionalized(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Initiate buyout of fractionalized NFT
     * @param tokenId Token to buy out
     */
    function initiateBuyout(uint256 tokenId) external payable;
    
    /**
     * @notice Get configuration parameters
     * @return minFractions Minimum fractions allowed
     * @return maxFractions Maximum fractions allowed (0 = unlimited)
     * @return buyoutMultiplier Buyout multiplier in basis points
     * @return redemptionEnabled Whether redemption is allowed
     * @return fractionPrice Price per fraction in wei
     * @return tradingEnabled Whether fraction trading is enabled
     */
    function getConfiguration() external view returns (
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplier,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    );
    
    /**
     * @notice Set configuration parameters (admin only)
     * @param minFractions Minimum fractions allowed
     * @param maxFractions Maximum fractions allowed (0 = unlimited)
     * @param buyoutMultiplierBps Buyout multiplier in basis points (e.g., 150 = 1.5x)
     * @param redemptionEnabled Whether redemption is allowed
     * @param fractionPrice Price per fraction in wei
     * @param tradingEnabled Whether fraction trading is enabled
     */
    function setConfiguration(
        uint256 minFractions,
        uint256 maxFractions,
        uint256 buyoutMultiplierBps,
        bool redemptionEnabled,
        uint256 fractionPrice,
        bool tradingEnabled
    ) external;
}
