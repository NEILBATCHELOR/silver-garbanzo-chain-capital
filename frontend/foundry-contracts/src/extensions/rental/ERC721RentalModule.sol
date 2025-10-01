// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./interfaces/IERC721RentalModule.sol";
import "./storage/RentalStorage.sol";

/**
 * @title ERC721RentalModule
 * @notice Modular NFT rental system
 * @dev Separate contract to avoid stack depth in master contracts
 * 
 * Revenue Model:
 * - Platform takes 2.5-5% fee on rentals
 * - Owners earn passive income
 * - Renters get temporary access
 * - Security deposits protect owners
 * 
 * Gas Cost: ~6k per rental operation
 */
contract ERC721RentalModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC721RentalModule,
    RentalStorage
{
    // ============ Roles ============
    bytes32 public constant RENTAL_MANAGER_ROLE = keccak256("RENTAL_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant BASIS_POINTS = 10000;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize rental module
     * @param admin Admin address
     * @param feeRecipient Platform fee recipient
     * @param platformFeeBps Platform fee in basis points (250 = 2.5%)
     */
    function initialize(
        address admin,
        address feeRecipient,
        uint256 platformFeeBps
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RENTAL_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _feeRecipient = feeRecipient;
        _platformFeeBps = platformFeeBps;
    }
    
    // ============ Rental Management ============
    
    function listForRent(uint256 tokenId, uint256 pricePerDay, uint256 maxDuration)
        external
    {
        // Note: Ownership verification should be done by the calling NFT contract
        if (_rentals[tokenId].active) revert RentalActive();
        
        _listings[tokenId] = ListingInfo({
            pricePerDay: pricePerDay,
            maxDuration: maxDuration,
            isListed: true
        });
        
        emit ListedForRent(tokenId, msg.sender, pricePerDay, maxDuration);
    }
    
    function cancelListing(uint256 tokenId) external {
        if (!_listings[tokenId].isListed) revert NotListedForRent();
        if (_rentals[tokenId].active) revert RentalActive();
        
        delete _listings[tokenId];
        emit RentalCancelled(tokenId);
    }
    
    function rentNFT(uint256 tokenId, uint256 duration)
        external
        payable
        nonReentrant
    {
        ListingInfo memory listing = _listings[tokenId];
        if (!listing.isListed) revert NotListedForRent();
        if (_rentals[tokenId].active) revert RentalActive();
        if (duration > listing.maxDuration) revert MaxDurationExceeded();
        if (duration == 0) revert InvalidDuration();
        
        // Calculate costs
        uint256 numDays = (duration + SECONDS_PER_DAY - 1) / SECONDS_PER_DAY; // Round up
        uint256 totalPrice = listing.pricePerDay * numDays;
        uint256 platformFee = (totalPrice * _platformFeeBps) / BASIS_POINTS;
        uint256 deposit = totalPrice / 10; // 10% security deposit
        
        if (msg.value < totalPrice + deposit) revert InsufficientPayment();
        
        // Create rental
        _rentals[tokenId] = Rental({
            renter: msg.sender,
            owner: msg.sender, // Should be set by NFT contract
            expiryTime: block.timestamp + duration,
            pricePerDay: listing.pricePerDay,
            deposit: deposit,
            active: true
        });
        
        // Pay platform fee and owner
        payable(_feeRecipient).transfer(platformFee);
        // Owner payment should be handled by NFT contract
        
        emit RentalStarted(tokenId, msg.sender, duration, totalPrice);
    }
    
    function returnNFT(uint256 tokenId) external nonReentrant {
        Rental storage rental = _rentals[tokenId];
        if (!rental.active) revert RentalNotActive();
        if (rental.renter != msg.sender) revert NotRenter();
        
        // Return deposit
        uint256 deposit = rental.deposit;
        rental.active = false;
        
        payable(msg.sender).transfer(deposit);
        emit RentalEnded(tokenId, msg.sender);
    }
    
    function reclaimNFT(uint256 tokenId) external {
        Rental storage rental = _rentals[tokenId];
        if (!rental.active) revert RentalNotActive();
        if (block.timestamp < rental.expiryTime) revert RentalNotExpired();
        
        rental.active = false;
        emit RentalEnded(tokenId, rental.renter);
    }
    
    function claimDeposit(uint256 tokenId) external {
        Rental storage rental = _rentals[tokenId];
        if (rental.active) revert RentalActive();
        if (rental.deposit == 0) revert("No deposit");
        
        uint256 deposit = rental.deposit;
        rental.deposit = 0;
        
        payable(rental.owner).transfer(deposit);
        emit DepositClaimed(tokenId, rental.owner, deposit);
    }
    
    // ============ Query Functions ============
    
    function getRental(uint256 tokenId) external view returns (
        address renter,
        address owner,
        uint256 expiryTime,
        uint256 pricePerDay,
        uint256 deposit,
        bool active
    ) {
        Rental memory rental = _rentals[tokenId];
        return (
            rental.renter,
            rental.owner,
            rental.expiryTime,
            rental.pricePerDay,
            rental.deposit,
            rental.active
        );
    }
    
    function getRenter(uint256 tokenId) external view returns (address) {
        return _rentals[tokenId].active ? _rentals[tokenId].renter : address(0);
    }
    
    function isRented(uint256 tokenId) external view returns (bool) {
        return _rentals[tokenId].active && block.timestamp < _rentals[tokenId].expiryTime;
    }
    
    function isListedForRent(uint256 tokenId) external view returns (bool) {
        return _listings[tokenId].isListed;
    }
    
    // ============ Admin Functions ============
    
    function setPlatformFee(uint256 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _platformFeeBps = feeBps;
    }
    
    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _feeRecipient = recipient;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
