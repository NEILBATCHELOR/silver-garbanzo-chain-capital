// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/rental/ERC721RentalModule.sol";
import "../../../src/extensions/rental/interfaces/IERC721RentalModule.sol";

contract ERC721RentalModuleTest is Test {
    using Clones for address;
    
    ERC721RentalModule public implementation;
    ERC721RentalModule public module;
    
    address public admin = address(1);
    address public rentalManager = address(2);
    address public owner = address(3);
    address public renter = address(4);
    address public feeRecipient = address(5);
    
    uint256 public constant PLATFORM_FEE_BPS = 250; // 2.5%
    uint256 public constant PRICE_PER_DAY = 1 ether;
    uint256 public constant MAX_DURATION = 30 days;
    
    bytes32 public constant RENTAL_MANAGER_ROLE = keccak256("RENTAL_MANAGER_ROLE");
    
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
    
    function setUp() public {
        implementation = new ERC721RentalModule();
        
        address clone = address(implementation).clone();
        module = ERC721RentalModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, feeRecipient, PLATFORM_FEE_BPS);
        
        vm.prank(admin);
        module.grantRole(RENTAL_MANAGER_ROLE, rentalManager);
        
        // Give renter some ETH for rental payments
        vm.deal(renter, 100 ether);
    }
    
    function testInitialization() public view {
        assertEq(module.feeRecipient(), feeRecipient);
        assertEq(module.platformFee(), PLATFORM_FEE_BPS);
        assertTrue(module.hasRole(RENTAL_MANAGER_ROLE, rentalManager));
    }
    
    function testListForRent() public {
        uint256 tokenId = 1;
        
        vm.expectEmit(true, true, false, true);
        emit ListedForRent(tokenId, owner, PRICE_PER_DAY, MAX_DURATION);
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        assertTrue(module.isListedForRent(tokenId));
    }
    
    function testCancelListing() public {
        uint256 tokenId = 1;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        vm.expectEmit(true, false, false, false);
        emit RentalCancelled(tokenId);
        
        vm.prank(owner);
        module.cancelListing(tokenId);
        
        assertFalse(module.isListedForRent(tokenId));
    }
    
    function testRentNFT() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        // Calculate expected payment
        uint256 numDays = (duration + 86400 - 1) / 86400; // Round up
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10; // 10% security deposit
        uint256 payment = totalPrice + deposit;
        
        vm.expectEmit(true, true, false, true);
        emit RentalStarted(tokenId, renter, duration, totalPrice);
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        assertTrue(module.isRented(tokenId));
        assertEq(module.getRenter(tokenId), renter);
    }
    
    function testReturnNFT() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        // Setup and rent
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        // Return NFT
        vm.expectEmit(true, true, false, false);
        emit RentalEnded(tokenId, renter);
        
        uint256 balanceBefore = renter.balance;
        
        vm.prank(renter);
        module.returnNFT(tokenId);
        
        assertFalse(module.isRented(tokenId));
        assertEq(renter.balance, balanceBefore + deposit);
    }
    
    function testReclaimNFT() public {
        uint256 tokenId = 1;
        uint256 duration = 1 days;
        
        // Setup and rent
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = 1;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        // Fast forward past expiry
        vm.warp(block.timestamp + duration + 1);
        
        vm.expectEmit(true, true, false, false);
        emit RentalEnded(tokenId, renter);
        
        vm.prank(owner);
        module.reclaimNFT(tokenId);
        
        assertFalse(module.isRented(tokenId));
    }
    
    function testRevertWhen_CancelListingWithActiveRental() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        vm.prank(owner);
        vm.expectRevert(IERC721RentalModule.RentalActive.selector);
        module.cancelListing(tokenId);
    }
    
    function testRevertWhen_RentNotListed() public {
        uint256 tokenId = 1;
        
        vm.prank(renter);
        vm.expectRevert(IERC721RentalModule.NotListedForRent.selector);
        module.rentNFT{value: 1 ether}(tokenId, 7 days);
    }
    
    function testRevertWhen_RentAlreadyActive() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        address renter2 = address(6);
        vm.deal(renter2, 100 ether);
        
        vm.prank(renter2);
        vm.expectRevert(IERC721RentalModule.RentalActive.selector);
        module.rentNFT{value: payment}(tokenId, duration);
    }
    
    function testRevertWhen_ExceedMaxDuration() public {
        uint256 tokenId = 1;
        uint256 duration = MAX_DURATION + 1 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        vm.prank(renter);
        vm.expectRevert(IERC721RentalModule.MaxDurationExceeded.selector);
        module.rentNFT{value: 100 ether}(tokenId, duration);
    }
    
    function testRevertWhen_InvalidDuration() public {
        uint256 tokenId = 1;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        vm.prank(renter);
        vm.expectRevert(IERC721RentalModule.InvalidDuration.selector);
        module.rentNFT{value: 1 ether}(tokenId, 0);
    }
    
    function testRevertWhen_InsufficientPayment() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        vm.prank(renter);
        vm.expectRevert(IERC721RentalModule.InsufficientPayment.selector);
        module.rentNFT{value: 0.1 ether}(tokenId, duration);
    }
    
    function testRevertWhen_ReturnNotRented() public {
        uint256 tokenId = 1;
        
        vm.prank(renter);
        vm.expectRevert(IERC721RentalModule.RentalNotActive.selector);
        module.returnNFT(tokenId);
    }
    
    function testRevertWhen_ReturnNotRenter() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        address notRenter = address(7);
        vm.prank(notRenter);
        vm.expectRevert(IERC721RentalModule.NotRenter.selector);
        module.returnNFT(tokenId);
    }
    
    function testRevertWhen_ReclaimNotExpired() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        vm.prank(owner);
        vm.expectRevert(IERC721RentalModule.RentalNotExpired.selector);
        module.reclaimNFT(tokenId);
    }
    
    function testSetPlatformFee() public {
        uint256 newFee = 500; // 5%
        
        vm.prank(admin);
        module.setPlatformFee(newFee);
        
        assertEq(module.platformFee(), newFee);
    }
    
    function testSetFeeRecipient() public {
        address newRecipient = address(10);
        
        vm.prank(admin);
        module.setFeeRecipient(newRecipient);
        
        assertEq(module.feeRecipient(), newRecipient);
    }
    
    function testGetRentalInfo() public {
        uint256 tokenId = 1;
        uint256 duration = 7 days;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        (
            address rentalRenter,
            address rentalOwner,
            uint256 expiryTime,
            uint256 pricePerDay,
            uint256 rentalDeposit,
            bool active
        ) = module.getRental(tokenId);
        
        assertEq(rentalRenter, renter);
        assertTrue(expiryTime > block.timestamp);
        assertEq(pricePerDay, PRICE_PER_DAY);
        assertEq(rentalDeposit, deposit);
        assertTrue(active);
    }
    
    function testFuzzListForRent(uint256 pricePerDay, uint256 maxDuration) public {
        pricePerDay = bound(pricePerDay, 0.001 ether, 100 ether);
        maxDuration = bound(maxDuration, 1 days, 365 days);
        
        uint256 tokenId = 1;
        
        vm.prank(owner);
        module.listForRent(tokenId, pricePerDay, maxDuration);
        
        assertTrue(module.isListedForRent(tokenId));
    }
    
    function testFuzzRentNFT(uint256 duration) public {
        duration = bound(duration, 1 days, MAX_DURATION);
        
        uint256 tokenId = 1;
        
        vm.prank(owner);
        module.listForRent(tokenId, PRICE_PER_DAY, MAX_DURATION);
        
        uint256 numDays = (duration + 86400 - 1) / 86400;
        uint256 totalPrice = PRICE_PER_DAY * numDays;
        uint256 deposit = totalPrice / 10;
        uint256 payment = totalPrice + deposit;
        
        vm.prank(renter);
        module.rentNFT{value: payment}(tokenId, duration);
        
        assertTrue(module.isRented(tokenId));
    }
}
