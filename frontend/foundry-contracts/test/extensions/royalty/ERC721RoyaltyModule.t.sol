// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/royalty/ERC721RoyaltyModule.sol";

contract ERC721RoyaltyModuleTest is Test {
    using Clones for address;
    
    ERC721RoyaltyModule public implementation;
    ERC721RoyaltyModule public module;
    
    address public admin = address(1);
    address public royaltyManager = address(2);
    address public creator = address(3);
    address public buyer = address(4);
    address public nftContract = address(0x999);
    
    bytes32 public constant ROYALTY_MANAGER_ROLE = keccak256("ROYALTY_MANAGER_ROLE");
    uint96 public constant DEFAULT_ROYALTY_BP = 500; // 5%
    
    event RoyaltySet(uint256 indexed tokenId, address indexed recipient, uint96 feeNumerator);
    event DefaultRoyaltySet(address indexed recipient, uint96 feeNumerator);
    
    function setUp() public {
        implementation = new ERC721RoyaltyModule();
        
        address clone = address(implementation).clone();
        module = ERC721RoyaltyModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract, creator, DEFAULT_ROYALTY_BP);
        
        vm.prank(admin);
        module.grantRole(ROYALTY_MANAGER_ROLE, royaltyManager);
    }
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract);
        assertTrue(module.hasRole(ROYALTY_MANAGER_ROLE, royaltyManager));
    }
    
    function testDefaultRoyaltyInfo() public view {
        uint256 salePrice = 1 ether;
        (address recipient, uint256 royaltyAmount) = module.royaltyInfo(1, salePrice);
        
        assertEq(recipient, creator);
        assertEq(royaltyAmount, (salePrice * DEFAULT_ROYALTY_BP) / 10000);
    }
    
    function testSetTokenRoyalty() public {
        uint256 tokenId = 1;
        uint96 royaltyBP = 1000; // 10%
        
        vm.expectEmit(true, true, false, true);
        emit RoyaltySet(tokenId, creator, royaltyBP);
        
        vm.prank(royaltyManager);
        module.setTokenRoyalty(tokenId, creator, royaltyBP);
        
        uint256 salePrice = 1 ether;
        (address recipient, uint256 royaltyAmount) = module.royaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, creator);
        assertEq(royaltyAmount, (salePrice * royaltyBP) / 10000);
    }
    
    function testSetDefaultRoyalty() public {
        address newCreator = address(5);
        uint96 newRoyaltyBP = 750; // 7.5%
        
        vm.expectEmit(true, false, false, true);
        emit DefaultRoyaltySet(newCreator, newRoyaltyBP);
        
        vm.prank(royaltyManager);
        module.setDefaultRoyalty(newCreator, newRoyaltyBP);
        
        uint256 salePrice = 1 ether;
        (address recipient, uint256 royaltyAmount) = module.royaltyInfo(999, salePrice);
        
        assertEq(recipient, newCreator);
        assertEq(royaltyAmount, (salePrice * newRoyaltyBP) / 10000);
    }
    
    function testResetTokenRoyalty() public {
        uint256 tokenId = 1;
        
        vm.prank(royaltyManager);
        module.setTokenRoyalty(tokenId, creator, 1000);
        
        vm.prank(royaltyManager);
        module.resetTokenRoyalty(tokenId);
        
        // Should fall back to default
        uint256 salePrice = 1 ether;
        (address recipient, uint256 royaltyAmount) = module.royaltyInfo(tokenId, salePrice);
        
        assertEq(recipient, creator);
        assertEq(royaltyAmount, (salePrice * DEFAULT_ROYALTY_BP) / 10000);
    }
    
    function testSetTokenRoyaltyRequiresRole() public {
        vm.prank(buyer);
        vm.expectRevert();
        module.setTokenRoyalty(1, creator, 1000);
    }
    
    function testSupportsInterface() public view {
        // ERC2981 interface ID
        assertTrue(module.supportsInterface(0x2a55205a));
    }
}
