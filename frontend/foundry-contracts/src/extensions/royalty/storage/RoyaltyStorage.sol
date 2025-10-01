// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RoyaltyStorage
 * @notice Storage layout for ERC721 royalty module (upgradeable-safe)
 * @dev Follows EIP-2981 standard for NFT royalties
 */
contract RoyaltyStorage {
    // ============ Royalty Data Structure ============
    struct RoyaltyInfo {
        address receiver;  // Address to receive royalty payments
        uint96 royaltyFraction;  // Royalty percentage in basis points (10000 = 100%)
    }
    
    // ============ Storage Variables ============
    
    // Default royalty for all tokens
    RoyaltyInfo internal _defaultRoyaltyInfo;
    
    // Token-specific royalties (overrides default)
    // tokenId => RoyaltyInfo
    mapping(uint256 => RoyaltyInfo) internal _tokenRoyaltyInfo;
    
    // Maximum royalty percentage (10000 = 100%)
    uint96 internal constant _FEE_DENOMINATOR = 10000;
    
    // ============ Storage Gap ============
    // Reserve space for future upgrades (50 slots total)
    uint256[47] private __gap;
}
