// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/royalty/ERC1155RoyaltyModule.sol";

contract ERC1155RoyaltyModuleTest is Test {
    using Clones for address;
    
    ERC1155RoyaltyModule public implementation;
    ERC1155RoyaltyModule public module;
    
    address public admin = address(1);
    address public royaltyManager = address(2);
    address public creator = address(3);
    address public nftContract = address(0x999);
    
    bytes32 public constant ROYALTY_MANAGER_ROLE = keccak256("ROYALTY_MANAGER_ROLE");
    uint96 public constant DEFAULT_ROYALTY_BP = 500; // 5%
    
    function setUp() public {
        implementation = new ERC1155RoyaltyModule();
        
        address clone = address(implementation).clone();
        module = ERC1155RoyaltyModule(clone);
        
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
        
        vm.prank(royaltyManager);
        module.setDefaultRoyalty(newCreator, newRoyaltyBP);
        
        uint256 salePrice = 1 ether;
        (address recipient, uint256 royaltyAmount) = module.royaltyInfo(999, salePrice);
        
        assertEq(recipient, newCreator);
        assertEq(royaltyAmount, (salePrice * newRoyaltyBP) / 10000);
    }
}
