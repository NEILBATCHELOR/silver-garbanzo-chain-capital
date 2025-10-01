// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1155SupplyCapModule
 * @notice Interface for supply cap management in ERC-1155 tokens
 * @dev Provides scarcity mechanics and over-minting prevention
 */
interface IERC1155SupplyCapModule {
    // ============ Events ============
    event MaxSupplySet(uint256 indexed tokenId, uint256 maxSupply);
    event GlobalCapSet(uint256 newGlobalCap);
    event SupplyIncreased(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    event SupplyDecreased(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    
    // ============ Errors ============
    error MaxSupplyExceeded(uint256 tokenId, uint256 requested, uint256 available);
    error InvalidMaxSupply(uint256 tokenId);
    error GlobalCapExceeded(uint256 requested, uint256 available);
    error SupplyLocked(uint256 tokenId);
    
    // ============ Supply Cap Management ============
    
    /**
     * @notice Set maximum supply for specific token ID
     * @param tokenId Token ID
     * @param maxSupply Maximum supply (0 = unlimited)
     * @dev Cannot set below current supply. Emits MaxSupplySet event
     */
    function setMaxSupply(uint256 tokenId, uint256 maxSupply) external;
    
    /**
     * @notice Get maximum supply for token ID
     * @param tokenId Token ID
     * @return uint256 Maximum supply (0 = unlimited)
     */
    function getMaxSupply(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get current supply for token ID
     * @param tokenId Token ID
     * @return uint256 Current supply
     */
    function getCurrentSupply(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Get remaining supply available for minting
     * @param tokenId Token ID
     * @return uint256 Remaining supply (0 if maxSupply = 0 = unlimited)
     */
    function getRemainingSupply(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Check if more tokens can be minted
     * @param tokenId Token ID
     * @param amount Amount to check
     * @return bool True if can mint
     */
    function canMint(uint256 tokenId, uint256 amount) external view returns (bool);
    
    // ============ Global Cap ============
    
    /**
     * @notice Set global cap for total supply across all token IDs
     * @param cap Global cap (0 = no global cap)
     * @dev Emits GlobalCapSet event
     */
    function setGlobalCap(uint256 cap) external;
    
    /**
     * @notice Get global cap
     * @return uint256 Global cap (0 = unlimited)
     */
    function getGlobalCap() external view returns (uint256);
    
    /**
     * @notice Get total supply across all token IDs
     * @return uint256 Total supply
     */
    function getTotalGlobalSupply() external view returns (uint256);
    
    // ============ Supply Tracking ============
    
    /**
     * @notice Track supply increase (called by token contract on mint)
     * @param tokenId Token ID
     * @param amount Amount minted
     */
    function trackSupplyIncrease(uint256 tokenId, uint256 amount) external;
    
    /**
     * @notice Track supply decrease (called by token contract on burn)
     * @param tokenId Token ID
     * @param amount Amount burned
     */
    function trackSupplyDecrease(uint256 tokenId, uint256 amount) external;
    
    // ============ Supply Locking ============
    
    /**
     * @notice Lock supply cap for token (prevents changes)
     * @param tokenId Token ID
     */
    function lockSupplyCap(uint256 tokenId) external;
    
    /**
     * @notice Check if supply cap is locked
     * @param tokenId Token ID
     * @return bool True if locked
     */
    function isSupplyLocked(uint256 tokenId) external view returns (bool);
    
    // ============ Batch Operations ============
    
    /**
     * @notice Set max supplies for multiple tokens
     * @param tokenIds Array of token IDs
     * @param maxSupplies Array of max supplies
     */
    function setBatchMaxSupplies(
        uint256[] memory tokenIds,
        uint256[] memory maxSupplies
    ) external;
    
    /**
     * @notice Get supply info for multiple tokens
     * @param tokenIds Array of token IDs
     * @return maxSupplies Array of max supplies
     * @return currentSupplies Array of current supplies
     * @return remainingSupplies Array of remaining supplies
     */
    function getBatchSupplyInfo(uint256[] memory tokenIds)
        external
        view
        returns (
            uint256[] memory maxSupplies,
            uint256[] memory currentSupplies,
            uint256[] memory remainingSupplies
        );
}
