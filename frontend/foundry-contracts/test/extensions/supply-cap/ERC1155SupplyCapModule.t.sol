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
    address public supplyManager = address(2);
    
    bytes32 public constant SUPPLY_MANAGER_ROLE = keccak256("SUPPLY_MANAGER_ROLE");
    
    event MaxSupplySet(uint256 indexed tokenId, uint256 maxSupply);
    event SupplyIncreased(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    event SupplyDecreased(uint256 indexed tokenId, uint256 amount, uint256 newTotal);
    event GlobalCapSet(uint256 cap);
    
    function setUp() public {
        implementation = new ERC1155SupplyCapModule();
        
        address clone = address(implementation).clone();
        module = ERC1155SupplyCapModule(clone);
        
        uint256 globalCap = 1_000_000; // Set initial global cap
        
        vm.prank(admin);
        module.initialize(admin, globalCap);
        
        vm.prank(admin);
        module.grantRole(SUPPLY_MANAGER_ROLE, supplyManager);
    }
    
    function testInitialization() public view {
        assertEq(module.getGlobalCap(), 1_000_000);
        assertTrue(module.hasRole(SUPPLY_MANAGER_ROLE, supplyManager));
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), admin));
    }
    
    function testSetMaxSupply() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 10000;
        
        vm.expectEmit(true, false, false, true);
        emit MaxSupplySet(tokenId, maxSupply);
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        assertEq(module.getMaxSupply(tokenId), maxSupply);
    }
    
    function testTrackSupplyIncrease() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 10000;
        uint256 mintAmount = 100;
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        vm.expectEmit(true, false, false, true);
        emit SupplyIncreased(tokenId, mintAmount, mintAmount);
        
        module.trackSupplyIncrease(tokenId, mintAmount);
        
        assertEq(module.getCurrentSupply(tokenId), mintAmount);
        assertEq(module.getRemainingSupply(tokenId), maxSupply - mintAmount);
    }
    
    function testTrackSupplyIncreaseRevertsWhenExceedingCap() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 100;
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        vm.expectRevert();
        module.trackSupplyIncrease(tokenId, 101);
    }
    
    function testTrackSupplyDecrease() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 10000;
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        module.trackSupplyIncrease(tokenId, 100);
        
        vm.expectEmit(true, false, false, true);
        emit SupplyDecreased(tokenId, 50, 50);
        
        module.trackSupplyDecrease(tokenId, 50);
        
        assertEq(module.getCurrentSupply(tokenId), 50);
        assertEq(module.getRemainingSupply(tokenId), maxSupply - 50);
    }
    
    function testCanMint() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 100;
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        assertTrue(module.canMint(tokenId, 50));
        assertTrue(module.canMint(tokenId, 100));
        assertFalse(module.canMint(tokenId, 101));
    }
    
    function testSetGlobalCap() public {
        uint256 newGlobalCap = 2_000_000;
        
        vm.expectEmit(false, false, false, true);
        emit GlobalCapSet(newGlobalCap);
        
        vm.prank(admin);
        module.setGlobalCap(newGlobalCap);
        
        assertEq(module.getGlobalCap(), newGlobalCap);
    }
    
    function testLockSupplyCap() public {
        uint256 tokenId = 1;
        uint256 maxSupply = 10000;
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId, maxSupply);
        
        vm.prank(admin);
        module.lockSupplyCap(tokenId);
        
        assertTrue(module.isSupplyLocked(tokenId));
        
        // Should revert when trying to change locked supply
        vm.prank(supplyManager);
        vm.expectRevert();
        module.setMaxSupply(tokenId, 20000);
    }
    
    function testBatchOperations() public {
        uint256[] memory tokenIds = new uint256[](3);
        tokenIds[0] = 1;
        tokenIds[1] = 2;
        tokenIds[2] = 3;
        
        uint256[] memory maxSupplies = new uint256[](3);
        maxSupplies[0] = 1000;
        maxSupplies[1] = 2000;
        maxSupplies[2] = 3000;
        
        vm.prank(supplyManager);
        module.setBatchMaxSupplies(tokenIds, maxSupplies);
        
        assertEq(module.getMaxSupply(1), 1000);
        assertEq(module.getMaxSupply(2), 2000);
        assertEq(module.getMaxSupply(3), 3000);
        
        // Test batch info
        (uint256[] memory maxSup, uint256[] memory currentSup, uint256[] memory remaining) = 
            module.getBatchSupplyInfo(tokenIds);
        
        assertEq(maxSup[0], 1000);
        assertEq(currentSup[0], 0);
        assertEq(remaining[0], 1000);
    }
    
    function testUnlimitedSupply() public {
        uint256 tokenId = 1;
        
        // Don't set max supply (0 = unlimited)
        assertTrue(module.canMint(tokenId, type(uint256).max));
        
        // Track some supply
        module.trackSupplyIncrease(tokenId, 1000);
        assertEq(module.getCurrentSupply(tokenId), 1000);
        assertEq(module.getRemainingSupply(tokenId), 0); // 0 means unlimited
    }
    
    function testGlobalCapEnforcement() public {
        // Set a small global cap
        vm.prank(admin);
        module.setGlobalCap(500);
        
        uint256 tokenId1 = 1;
        uint256 tokenId2 = 2;
        
        // Set individual caps higher than global
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId1, 1000);
        
        vm.prank(supplyManager);
        module.setMaxSupply(tokenId2, 1000);
        
        // Mint 300 for token 1
        module.trackSupplyIncrease(tokenId1, 300);
        
        // Try to mint 300 for token 2 - should fail due to global cap
        vm.expectRevert();
        module.trackSupplyIncrease(tokenId2, 300);
        
        // But 200 should work
        module.trackSupplyIncrease(tokenId2, 200);
        assertEq(module.getTotalGlobalSupply(), 500);
    }
}
