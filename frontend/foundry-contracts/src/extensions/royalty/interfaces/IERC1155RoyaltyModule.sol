// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1155RoyaltyModule
 * @notice Interface for EIP-2981 royalty management in ERC-1155 tokens
 * @dev Multi-token royalty support with per-token customization
 */
interface IERC1155RoyaltyModule {
    // ============ Events ============
    event DefaultRoyaltySet(address indexed receiver, uint96 feeNumerator);
    event TokenRoyaltySet(
        uint256 indexed tokenId, 
        address indexed receiver, 
        uint96 feeNumerator
    );
    event TokenRoyaltyReset(uint256 indexed tokenId);
    
    // ============ Errors ============
    error InvalidRoyaltyPercentage(uint96 feeNumerator);
    error InvalidReceiver();
    
    // ============ EIP-2981 Interface ============
    
    /**
     * @notice Get royalty info for token sale
     * @param tokenId Token ID
     * @param salePrice Sale price
     * @return receiver Address to receive royalty
     * @return royaltyAmount Royalty amount to pay
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount);
    
    // ============ Default Royalty Management ============
    
    /**
     * @notice Set default royalty for all tokens
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty percentage in basis points (10000 = 100%)
     * @dev Max: 10000 (100%). Typical: 250-1000 (2.5-10%)
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external;
    
    /**
     * @notice Delete default royalty (no royalties unless per-token set)
     */
    function deleteDefaultRoyalty() external;
    
    /**
     * @notice Get default royalty info
     * @return receiver Default royalty receiver
     * @return feeNumerator Default royalty percentage
     */
    function getDefaultRoyalty() 
        external 
        view 
        returns (address receiver, uint96 feeNumerator);
    
    // ============ Per-Token Royalty Management ============
    
    /**
     * @notice Set royalty for specific token ID
     * @param tokenId Token ID
     * @param receiver Address to receive royalties
     * @param feeNumerator Royalty percentage in basis points
     */
    function setTokenRoyalty(
        uint256 tokenId, 
        address receiver, 
        uint96 feeNumerator
    ) external;
    
    /**
     * @notice Reset token royalty to default
     * @param tokenId Token ID
     */
    function resetTokenRoyalty(uint256 tokenId) external;
    
    /**
     * @notice Get royalty for specific token
     * @param tokenId Token ID
     * @return receiver Royalty receiver
     * @return feeNumerator Royalty percentage
     * @return hasCustom True if token has custom royalty
     */
    function getTokenRoyalty(uint256 tokenId)
        external
        view
        returns (
            address receiver,
            uint96 feeNumerator,
            bool hasCustom
        );
    
    // ============ Batch Operations ============
    
    /**
     * @notice Set royalties for multiple tokens
     * @param tokenIds Array of token IDs
     * @param receivers Array of royalty receivers
     * @param feeNumerators Array of royalty percentages
     */
    function setBatchTokenRoyalties(
        uint256[] memory tokenIds,
        address[] memory receivers,
        uint96[] memory feeNumerators
    ) external;
    
    /**
     * @notice Get royalty info for multiple tokens
     * @param tokenIds Array of token IDs
     * @param salePrices Array of sale prices
     * @return receivers Array of royalty receivers
     * @return royaltyAmounts Array of royalty amounts
     */
    function getBatchRoyaltyInfo(
        uint256[] memory tokenIds,
        uint256[] memory salePrices
    ) external view returns (
        address[] memory receivers,
        uint256[] memory royaltyAmounts
    );
}
