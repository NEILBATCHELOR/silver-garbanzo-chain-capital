// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC721SoulboundModule
 * @notice Interface for non-transferable (soulbound) NFTs
 * @dev Modular soulbound system for credentials and identity
 * 
 * Use Cases:
 * - KYC verification badges
 * - Accredited investor credentials
 * - Membership proofs
 * - Reputation tokens
 * - Educational certificates
 */
interface IERC721SoulboundModule {
    // ============ Events ============
    event TokenBound(uint256 indexed tokenId, address indexed soul);
    event TokenUnbound(uint256 indexed tokenId);
    event SoulboundStatusSet(uint256 indexed tokenId, bool isSoulbound);
    
    // ============ Errors ============
    error TokenIsSoulbound(uint256 tokenId);
    error NotTokenOwner(uint256 tokenId);
    error AlreadyBound(uint256 tokenId);
    error NotBound(uint256 tokenId);
    
    // ============ Soulbound Management ============
    
    /**
     * @notice Mark token as soulbound (non-transferable)
     * @param tokenId Token ID to make soulbound
     */
    function markAsSoulbound(uint256 tokenId) external;
    
    /**
     * @notice Remove soulbound status (make transferable again)
     * @param tokenId Token ID to make transferable
     */
    function removeSoulbound(uint256 tokenId) external;
    
    /**
     * @notice Bind token permanently to current owner's address
     * @param tokenId Token ID to bind
     */
    function bindToSoul(uint256 tokenId) external;
    
    /**
     * @notice Unbind token (admin only, for exceptional cases)
     * @param tokenId Token ID to unbind
     */
    function unbindToken(uint256 tokenId) external;
    
    // ============ Query Functions ============
    
    /**
     * @notice Check if token is soulbound
     * @param tokenId Token ID
     * @return bool True if soulbound
     */
    function isSoulbound(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Check if token is permanently bound to address
     * @param tokenId Token ID
     * @return bool True if bound
     */
    function isBound(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Get soul (bound address) for token
     * @param tokenId Token ID
     * @return soul Bound address (address(0) if not bound)
     */
    function getSoul(uint256 tokenId) external view returns (address soul);
    
    /**
     * @notice Check if transfer is allowed
     * @param tokenId Token ID
     * @param from From address
     * @param to To address
     * @return bool True if transfer allowed
     */
    function canTransfer(uint256 tokenId, address from, address to) external view returns (bool);
}
