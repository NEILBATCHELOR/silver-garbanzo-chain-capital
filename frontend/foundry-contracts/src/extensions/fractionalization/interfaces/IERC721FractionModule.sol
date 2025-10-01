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
    
    error AlreadyFractionalized(uint256 tokenId);
    error NotFractionalized(uint256 tokenId);
    error InsufficientShares();
    
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
}
