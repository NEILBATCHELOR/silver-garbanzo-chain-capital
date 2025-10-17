// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/soulbound/ERC721SoulboundModule.sol";

contract ERC721SoulboundModuleTest is Test {
    using Clones for address;
    
    ERC721SoulboundModule public implementation;
    ERC721SoulboundModule public module;
    
    address public admin = address(1);
    address public manager = address(2);
    address public holder = address(3);
    
    bytes32 public constant SOULBOUND_MANAGER_ROLE = keccak256("SOULBOUND_MANAGER_ROLE");
    
    event TokenBound(uint256 indexed tokenId, address indexed holder);
    event TokenUnbound(uint256 indexed tokenId);
    event SoulboundStatusSet(uint256 indexed tokenId, bool isSoulbound);
    
    function setUp() public {
        implementation = new ERC721SoulboundModule();
        
        address clone = address(implementation).clone();
        module = ERC721SoulboundModule(clone);
        
        vm.prank(admin);
        module.initialize(admin);
        
        vm.prank(admin);
        module.grantRole(SOULBOUND_MANAGER_ROLE, manager);
    }
    
    function testInitialization() public view {
        assertTrue(module.hasRole(SOULBOUND_MANAGER_ROLE, manager));
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), admin));
    }
    
    function testBindToken() public {
        uint256 tokenId = 1;
        
        // First mark as soulbound by manager
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        // Then bind to soul (called by holder)
        vm.expectEmit(true, true, false, false);
        emit TokenBound(tokenId, holder);
        
        vm.prank(holder);
        module.bindToSoul(tokenId);
        
        assertTrue(module.isSoulbound(tokenId));
        assertTrue(module.isBound(tokenId));
        assertEq(module.getSoul(tokenId), holder);
    }
    
    function testBindTokenRevertsIfAlreadyBound() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        vm.prank(holder);
        module.bindToSoul(tokenId);
        
        vm.prank(holder);
        vm.expectRevert();
        module.bindToSoul(tokenId);
    }
    
    function testMarkAsSoulboundRequiresManagerRole() public {
        vm.prank(holder);
        vm.expectRevert();
        module.markAsSoulbound(1);
    }
    
    function testUnbindToken() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        vm.prank(holder);
        module.bindToSoul(tokenId);
        
        vm.expectEmit(true, false, false, false);
        emit TokenUnbound(tokenId);
        
        vm.prank(admin);
        module.unbindToken(tokenId);
        
        assertFalse(module.isSoulbound(tokenId));
        assertFalse(module.isBound(tokenId));
    }
    
    function testUnbindTokenRequiresAdminRole() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        vm.prank(holder);
        module.bindToSoul(tokenId);
        
        vm.prank(holder);
        vm.expectRevert();
        module.unbindToken(tokenId);
    }
    
    function testRemoveSoulbound() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        vm.expectEmit(true, false, false, true);
        emit SoulboundStatusSet(tokenId, false);
        
        vm.prank(manager);
        module.removeSoulbound(tokenId);
        
        assertFalse(module.isSoulbound(tokenId));
    }
    
    function testCanTransferReturnsFalseForSoulboundToken() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        vm.prank(holder);
        module.bindToSoul(tokenId);
        
        bool allowed = module.canTransfer(tokenId, holder, address(4));
        
        assertFalse(allowed);
    }
    
    function testCanTransferReturnsTrueForNonSoulboundToken() public {
        bool allowed = module.canTransfer(1, holder, address(4));
        
        assertTrue(allowed);
    }
    
    function testCanTransferReturnsTrueForMinting() public {
        uint256 tokenId = 1;
        
        vm.prank(manager);
        module.markAsSoulbound(tokenId);
        
        // Minting (from == address(0)) should be allowed
        bool allowed = module.canTransfer(tokenId, address(0), holder);
        
        assertTrue(allowed);
    }
}
