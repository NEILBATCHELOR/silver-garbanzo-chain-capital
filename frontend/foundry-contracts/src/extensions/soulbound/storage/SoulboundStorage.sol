// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SoulboundStorage  
 * @notice Storage layout for soulbound NFT module (upgradeable-safe)
 */
contract SoulboundStorage {
    // ============ Storage Variables ============
    
    // tokenId => is soulbound (non-transferable)
    mapping(uint256 => bool) internal _soulbound;
    
    // tokenId => bound soul address (permanent binding)
    mapping(uint256 => address) internal _boundSouls;
    
    // tokenId => transfer count (for one-time transfer allowance)
    mapping(uint256 => uint256) internal _transferCounts;
    
    // tokenId => mint timestamp (for expiration tracking)
    mapping(uint256 => uint256) internal _mintTimestamps;
    
    // Configuration
    bool internal _allowOneTimeTransfer; // Allow one transfer for account recovery
    bool internal _burnableByOwner; // Owner can burn their tokens
    bool internal _burnableByIssuer; // Issuer can revoke tokens
    bool internal _expirationEnabled; // Enable token expiration
    uint256 internal _expirationPeriod; // Expiration period in seconds
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}
