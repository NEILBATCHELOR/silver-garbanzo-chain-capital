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
    event TokenBurned(uint256 indexed tokenId, address indexed burner);
    event TokenRevoked(uint256 indexed tokenId, address indexed revoker);
    event TokenMinted(uint256 indexed tokenId, address indexed to, uint256 timestamp);
    event ConfigurationUpdated(
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    );
    
    // ============ Errors ============
    error TokenIsSoulbound(uint256 tokenId);
    error NotTokenOwner(uint256 tokenId);
    error AlreadyBound(uint256 tokenId);
    error NotBound(uint256 tokenId);
    error TransferLimitExceeded(uint256 tokenId);
    error TokenExpired(uint256 tokenId);
    error BurnNotAllowed(uint256 tokenId);
    error RevokeNotAllowed(uint256 tokenId);
    
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
    
    // ============ Burn Functions ============
    
    /**
     * @notice Burn token (owner only, if allowed)
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external;
    
    /**
     * @notice Revoke token (issuer only, if allowed)
     * @param tokenId Token ID to revoke
     */
    function revoke(uint256 tokenId) external;
    
    // ============ Expiration Functions ============
    
    /**
     * @notice Check if token is expired
     * @param tokenId Token ID
     * @return bool True if expired
     */
    function isExpired(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Get token expiration timestamp
     * @param tokenId Token ID
     * @return uint256 Expiration timestamp (0 if no expiration)
     */
    function getExpirationTime(uint256 tokenId) external view returns (uint256);
    
    /**
     * @notice Record token mint (called by NFT contract)
     * @param tokenId Token ID
     * @param to Recipient address
     */
    function recordMint(uint256 tokenId, address to) external;
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Get configuration
     */
    function getConfiguration() external view returns (
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    );
    
    /**
     * @notice Set configuration (admin only)
     */
    function setConfiguration(
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    ) external;
}
