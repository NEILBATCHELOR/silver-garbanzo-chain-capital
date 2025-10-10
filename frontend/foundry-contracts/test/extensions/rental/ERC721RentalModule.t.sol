// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/rental/ERC721RentalModule.sol";

contract ERC721RentalModuleTest is Test {
    using Clones for address;
    
    ERC721RentalModule public implementation;
    ERC721RentalModule public module;
    
    address public admin = address(1);
    address public rentalManager = address(2);
    address public owner = address(3);
    address public renter = address(4);
    address public nftContract = address(0x999);
    
    bytes32 public constant RENTAL_MANAGER_ROLE = keccak256("RENTAL_MANAGER_ROLE");
    
    event TokenRented(uint256 indexed tokenId, address indexed renter, uint64 expires);
    event RentalEnded(uint256 indexed tokenId);
    event RentalExtended(uint256 indexed tokenId, uint64 newExpiry);
    
    function setUp() public {
        implementation = new ERC721RentalModule();
        
        address clone = address(implementation).clone();
        module = ERC721RentalModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract);
        
        vm.prank(admin);
        module.grantRole(RENTAL_MANAGER_ROLE, rentalManager);
    }
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract);
        assertTrue(module.hasRole(RENTAL_MANAGER_ROLE, rentalManager));
    }
    
    function testSetUser() public {
        uint256 tokenId = 1;
        uint64 expires = uint64(block.timestamp + 7 days);
        
        vm.expectEmit(true, true, false, true);
        emit TokenRented(tokenId, renter, expires);
        
        vm.prank(rentalManager);
        module.setUser(tokenId, renter, expires);
        
        assertEq(module.userOf(tokenId), renter);
        assertEq(module.userExpires(tokenId), expires);
        assertTrue(module.isRented(tokenId));
    }
    
    function testSetUserRevertsForPastExpiry() public {
        uint256 tokenId = 1;
        uint64 pastExpiry = uint64(block.timestamp - 1);
        
        vm.prank(rentalManager);
        vm.expectRevert();
        module.setUser(tokenId, renter, pastExpiry);
    }
    
    function testUserOfReturnsZeroAfterExpiry() public {
        uint256 tokenId = 1;
        uint64 expires = uint64(block.timestamp + 1 days);
        
        vm.prank(rentalManager);
        module.setUser(tokenId, renter, expires);
        
        // Fast forward past expiry
        vm.warp(block.timestamp + 2 days);
        
        assertEq(module.userOf(tokenId), address(0));
        assertFalse(module.isRented(tokenId));
    }
    
    function testEndRental() public {
        uint256 tokenId = 1;
        uint64 expires = uint64(block.timestamp + 7 days);
        
        vm.prank(rentalManager);
        module.setUser(tokenId, renter, expires);
        
        vm.expectEmit(true, false, false, false);
        emit RentalEnded(tokenId);
        
        vm.prank(rentalManager);
        module.endRental(tokenId);
        
        assertEq(module.userOf(tokenId), address(0));
        assertFalse(module.isRented(tokenId));
    }
    
    function testExtendRental() public {
        uint256 tokenId = 1;
        uint64 initialExpiry = uint64(block.timestamp + 7 days);
        
        vm.prank(rentalManager);
        module.setUser(tokenId, renter, initialExpiry);
        
        uint64 newExpiry = uint64(block.timestamp + 14 days);
        
        vm.expectEmit(true, false, false, true);
        emit RentalExtended(tokenId, newExpiry);
        
        vm.prank(rentalManager);
        module.extendRental(tokenId, newExpiry);
        
        assertEq(module.userExpires(tokenId), newExpiry);
    }
    
    function testSupportsInterface() public view {
        // ERC4907 interface ID
        assertTrue(module.supportsInterface(0xad0cde));
    }
}
