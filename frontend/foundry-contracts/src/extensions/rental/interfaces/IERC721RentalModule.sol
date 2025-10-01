// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC721RentalModule
 * @notice Interface for NFT rental system
 * @dev Modular rental system for ERC721 tokens
 * 
 * Revenue Model:
 * - New income stream without selling NFTs
 * - Gaming/metaverse use cases
 * - Fractional access
 * - Collateral for loans
 * 
 * Note: Rental struct is defined in RentalStorage.sol
 */
interface IERC721RentalModule {
    
    // ============ Events ============
    event ListedForRent(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 pricePerDay,
        uint256 maxDuration
    );
    event RentalStarted(
        uint256 indexed tokenId,
        address indexed renter,
        uint256 duration,
        uint256 totalPrice
    );
    event RentalEnded(uint256 indexed tokenId, address indexed renter);
    event RentalCancelled(uint256 indexed tokenId);
    event DepositClaimed(uint256 indexed tokenId, address indexed owner, uint256 amount);
    
    // ============ Errors ============
    error NotOwner();
    error NotRenter();
    error RentalActive();
    error RentalNotActive();
    error RentalNotExpired();
    error NotListedForRent();
    error InvalidDuration();
    error InsufficientPayment();
    error MaxDurationExceeded();
    
    // ============ Rental Management ============
    
    /**
     * @notice List NFT for rent
     * @param tokenId Token ID to list
     * @param pricePerDay Daily rental price in wei
     * @param maxDuration Maximum rental duration in seconds
     */
    function listForRent(uint256 tokenId, uint256 pricePerDay, uint256 maxDuration) external;
    
    /**
     * @notice Cancel rental listing
     * @param tokenId Token ID to delist
     */
    function cancelListing(uint256 tokenId) external;
    
    /**
     * @notice Rent an NFT
     * @param tokenId Token ID to rent
     * @param duration Rental duration in seconds
     */
    function rentNFT(uint256 tokenId, uint256 duration) external payable;
    
    /**
     * @notice Return rented NFT before expiry
     * @param tokenId Token ID to return
     */
    function returnNFT(uint256 tokenId) external;
    
    /**
     * @notice Claim NFT after rental expires
     * @param tokenId Token ID to reclaim
     */
    function reclaimNFT(uint256 tokenId) external;
    
    /**
     * @notice Claim security deposit after rental
     * @param tokenId Token ID
     */
    function claimDeposit(uint256 tokenId) external;
    
    // ============ Query Functions ============
    
    /**
     * @notice Get rental info for token
     * @param tokenId Token ID
     * @return renter Current renter address
     * @return owner Original owner address
     * @return expiryTime Rental expiry timestamp
     * @return pricePerDay Daily rental price
     * @return deposit Security deposit
     * @return active Whether rental is active
     */
    function getRental(uint256 tokenId) external view returns (
        address renter,
        address owner,
        uint256 expiryTime,
        uint256 pricePerDay,
        uint256 deposit,
        bool active
    );
    
    /**
     * @notice Get current renter
     * @param tokenId Token ID
     * @return renter Current renter address (address(0) if not rented)
     */
    function getRenter(uint256 tokenId) external view returns (address renter);
    
    /**
     * @notice Check if token is currently rented
     * @param tokenId Token ID
     * @return bool True if rented
     */
    function isRented(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Check if token is listed for rent
     * @param tokenId Token ID
     * @return bool True if listed
     */
    function isListedForRent(uint256 tokenId) external view returns (bool);
}
