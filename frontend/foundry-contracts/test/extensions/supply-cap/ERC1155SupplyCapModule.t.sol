// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/supply-cap/ERC1155SupplyCapModule.sol";

contract ERC1155SupplyCapModuleTest is Test {
    using Clones for address;
    
    ERC1155SupplyCapModule public implementation;
    ERC1155SupplyCapModule public module;
    
    address public admin = address(1);
    address public capManager = address(2);
    address public nftContract = address(0x999);
    
    bytes32 public constant CAP_MANAGER_ROLE = keccak256("CAP_MANAGER_ROLE");
    
    event SupplyCapSet(uint256 indexed tokenId, uint256 cap);
    event SupplyMinted(uint256 indexed tokenId, uint256 amount, uint256 totalSupply);
    event SupplyBurned(uint256 indexed tokenId, uint256 amount, uint256 totalSupply);
    
    function setUp() public {
        implementation = new ERC1155SupplyCapModule();
        
        address clone = address(implementation).clone();
        module = ERC1155SupplyCapModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract);
        
        vm.prank(admin);
        module.grantRole(CAP_MANAGER_ROLE, capManager);
    }
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract);
        assertTrue(module.hasRole(CAP_MANAGER_ROLE, capManager));
    }
    
    function testSetSupplyCap() public {
        uint256 tokenId = 1;
        uint256 cap = 10000;
        
        vm.expectEmit(true, false, false, true);
        emit SupplyCapSet(tokenId, cap);
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, cap);
        
        assertEq(module.getSupplyCap(tokenId), cap);
        assertTrue(module.hasSupplyCap(tokenId));
    }
    
    function testTrackMint() public {
        uint256 tokenId = 1;
        uint256 cap = 10000;
        uint256 mintAmount = 100;
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, cap);
        
        vm.expectEmit(true, false, false, true);
        emit SupplyMinted(tokenId, mintAmount, mintAmount);
        
        module.trackMint(tokenId, mintAmount);
        
        assertEq(module.totalSupply(tokenId), mintAmount);
        assertEq(module.getRemainingSupply(tokenId), cap - mintAmount);
    }
    
    function testTrackMintRevertsWhenExceedingCap() public {
        uint256 tokenId = 1;
        uint256 cap = 100;
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, cap);
        
        vm.expectRevert();
        module.trackMint(tokenId, 101);
    }
    
    function testTrackBurn() public {
        uint256 tokenId = 1;
        uint256 cap = 10000;
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, cap);
        
        module.trackMint(tokenId, 100);
        
        vm.expectEmit(true, false, false, true);
        emit SupplyBurned(tokenId, 50, 50);
        
        module.trackBurn(tokenId, 50);
        
        assertEq(module.totalSupply(tokenId), 50);
        assertEq(module.getRemainingSupply(tokenId), cap - 50);
    }
    
    function testCanMint() public {
        uint256 tokenId = 1;
        uint256 cap = 100;
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, cap);
        
        assertTrue(module.canMint(tokenId, 50));
        assertTrue(module.canMint(tokenId, 100));
        assertFalse(module.canMint(tokenId, 101));
    }
    
    function testRemoveSupplyCap() public {
        uint256 tokenId = 1;
        
        vm.prank(capManager);
        module.setSupplyCap(tokenId, 1000);
        
        vm.prank(capManager);
        module.removeSupplyCap(tokenId);
        
        assertFalse(module.hasSupplyCap(tokenId));
        assertEq(module.getSupplyCap(tokenId), 0);
    }
}
