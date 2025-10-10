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
    address public issuer = address(2);
    address public holder = address(3);
    address public nftContract = address(0x999);
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    event TokenBound(uint256 indexed tokenId, address indexed holder);
    event TokenUnbound(uint256 indexed tokenId);
    event TokenRevoked(uint256 indexed tokenId, string reason);
    
    function setUp() public {
        implementation = new ERC721SoulboundModule();
        
        address clone = address(implementation).clone();
        module = ERC721SoulboundModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract);
        
        vm.prank(admin);
        module.grantRole(ISSUER_ROLE, issuer);
    }
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract);
        assertTrue(module.hasRole(ISSUER_ROLE, issuer));
    }
    
    function testBindToken() public {
        uint256 tokenId = 1;
        
        vm.expectEmit(true, true, false, false);
        emit TokenBound(tokenId, holder);
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        assertTrue(module.isSoulbound(tokenId));
        assertEq(module.getBoundHolder(tokenId), holder);
    }
    
    function testBindTokenRevertsIfAlreadyBound() public {
        uint256 tokenId = 1;
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        vm.prank(issuer);
        vm.expectRevert();
        module.bindToken(tokenId, holder);
    }
    
    function testBindTokenRequiresIssuerRole() public {
        vm.prank(holder);
        vm.expectRevert();
        module.bindToken(1, holder);
    }
    
    function testUnbindToken() public {
        uint256 tokenId = 1;
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        vm.expectEmit(true, false, false, false);
        emit TokenUnbound(tokenId);
        
        vm.prank(admin);
        module.unbindToken(tokenId);
        
        assertFalse(module.isSoulbound(tokenId));
    }
    
    function testUnbindTokenRequiresAdminRole() public {
        uint256 tokenId = 1;
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        vm.prank(holder);
        vm.expectRevert();
        module.unbindToken(tokenId);
    }
    
    function testRevokeToken() public {
        uint256 tokenId = 1;
        string memory reason = "Violation of terms";
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        vm.expectEmit(true, false, false, true);
        emit TokenRevoked(tokenId, reason);
        
        vm.prank(issuer);
        module.revokeToken(tokenId, reason);
        
        assertFalse(module.isSoulbound(tokenId));
    }
    
    function testCanTransferReturnsFalseForBoundToken() public {
        uint256 tokenId = 1;
        
        vm.prank(issuer);
        module.bindToken(tokenId, holder);
        
        (bool allowed, string memory reason) = module.canTransfer(holder, address(4), tokenId);
        
        assertFalse(allowed);
        assertEq(reason, "Token is soulbound");
    }
    
    function testCanTransferReturnsTrueForUnboundToken() public {
        (bool allowed, string memory reason) = module.canTransfer(holder, address(4), 1);
        
        assertTrue(allowed);
        assertEq(reason, "");
    }
}
