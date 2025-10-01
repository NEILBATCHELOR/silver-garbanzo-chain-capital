// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title RentalStorage
 * @notice Storage layout for ERC721 rental module (upgradeable-safe)
 */
contract RentalStorage {
    // ============ Rental Data Structure ============
    struct Rental {
        address renter;          // Current renter
        address owner;           // Original owner
        uint256 expiryTime;      // Rental expiry timestamp
        uint256 pricePerDay;     // Daily rental price in wei
        uint256 deposit;         // Security deposit
        bool active;             // Rental status
    }
    
    struct ListingInfo {
        uint256 pricePerDay;     // Daily rental price
        uint256 maxDuration;     // Maximum rental duration
        bool isListed;           // Whether token is listed
    }
    
    // ============ Storage Variables ============
    
    // tokenId => Rental info
    mapping(uint256 => Rental) internal _rentals;
    
    // tokenId => Listing info
    mapping(uint256 => ListingInfo) internal _listings;
    
    // Platform fee percentage (in basis points, e.g., 250 = 2.5%)
    uint256 internal _platformFeeBps;
    
    // Platform fee recipient
    address internal _feeRecipient;
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
}
