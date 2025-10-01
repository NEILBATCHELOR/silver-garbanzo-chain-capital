// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC721RoyaltyModule
 * @notice Interface for EIP-2981 NFT royalty standard
 * @dev Modular royalty system for ERC721 tokens
 * 
 * Revenue on Secondary Sales:
 * - Creators earn on every resale
 * - Standard marketplace integration
 * - Investor incentives
 * - Platform fees
 */
interface IERC721RoyaltyModule {
    // ============ Events ============
    event DefaultRoyaltySet(address indexed receiver, uint96 feeNumerator);
    event TokenRoyaltySet(uint256 indexed tokenId, address indexed receiver, uint96 feeNumerator);
    event RoyaltyDeleted(uint256 indexed tokenId);
    
    // ============ Errors ============
    error InvalidRoyaltyPercentage(uint96 feeNumerator);
    error InvalidReceiver();
    
    // ============ Royalty Management ============
    
    /**
     * @notice Set default royalty for all tokens
     * @param receiver Address to receive royalty payments
     * @param feeNumerator Royalty percentage (in basis points, e.g., 250 = 2.5%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;
    
    /**
     * @notice Set royalty for specific token
     * @param tokenId Token ID
     * @param receiver Address to receive royalty payments
     * @param feeNumerator Royalty percentage (in basis points)
     */
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external;
    
    /**
     * @notice Delete royalty for specific token (revert to default)
     * @param tokenId Token ID
     */
    function deleteTokenRoyalty(uint256 tokenId) external;
    
    /**
     * @notice Reset default royalty to zero
     */
    function deleteDefaultRoyalty() external;
    
    // ============ Royalty Query (EIP-2981 Standard) ============
    
    /**
     * @notice Get royalty info for token sale
     * @param tokenId Token ID being sold
     * @param salePrice Sale price in wei
     * @return receiver Address to receive royalty payment
     * @return royaltyAmount Amount of royalty to pay in wei
     */
    function royaltyInfo(
        uint256 tokenId,
        uint256 salePrice
    ) external view returns (address receiver, uint256 royaltyAmount);
    
    // ============ Helper Functions ============
    
    /**
     * @notice Get default royalty receiver and fee
     * @return receiver Default royalty receiver
     * @return feeNumerator Default royalty fee in basis points
     */
    function getDefaultRoyalty() external view returns (address receiver, uint96 feeNumerator);
    
    /**
     * @notice Get token-specific royalty if set
     * @param tokenId Token ID
     * @return receiver Token royalty receiver
     * @return feeNumerator Token royalty fee in basis points
     * @return isSet Whether token has specific royalty
     */
    function getTokenRoyalty(uint256 tokenId) external view returns (
        address receiver,
        uint96 feeNumerator,
        bool isSet
    );
    
    /**
     * @notice Check if interface is supported (EIP-165)
     * @param interfaceId Interface identifier
     * @return bool True if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}
