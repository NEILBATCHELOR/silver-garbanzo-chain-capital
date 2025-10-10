// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {ERC4906MetadataModule} from "src/extensions/metadata-events/ERC4906MetadataModule.sol";
import {ERC721Master} from "src/masters/ERC721Master.sol";
import {IMetadataEvents} from "src/extensions/metadata-events/interfaces/IERC4906.sol";

contract ERC4906MetadataModuleTest is Test {
    ERC4906MetadataModule public module;
    ERC721Master public nft;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public updater = makeAddr("updater");
    address public unauthorized = makeAddr("unauthorized");
    
    // Events
    event MetadataUpdate(uint256 tokenId);
    event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId);
    event ModuleInitialized(address indexed tokenContract);
    event UpdatesEnabledChanged(bool enabled);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy NFT contract
        nft = new ERC721Master();
        nft.initialize(owner, "Test NFT", "TNFT");
        
        // Deploy and initialize metadata module
        module = new ERC4906MetadataModule();
        module.initialize(address(nft), owner);
        
        // Grant roles
        module.grantRole(module.METADATA_UPDATER_ROLE(), updater);
        
        // Mint some NFTs for testing
        nft.mint(owner, 1);
        nft.mint(owner, 2);
        nft.mint(owner, 3);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        assertEq(module.tokenContract(), address(nft));
        assertTrue(module.updatesEnabled());
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(module.hasRole(module.METADATA_UPDATER_ROLE(), address(nft)));
        assertTrue(module.hasRole(module.METADATA_UPDATER_ROLE(), owner));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        ERC4906MetadataModule newModule = new ERC4906MetadataModule();
        newModule.initialize(address(nft), owner);
        
        vm.expectRevert();
        newModule.initialize(address(nft), owner);
    }
    
    function test_RevertWhen_InvalidTokenContract() public {
        ERC4906MetadataModule newModule = new ERC4906MetadataModule();
        
        vm.expectRevert();
        newModule.initialize(address(0), owner);
    }
    
    function test_RevertWhen_InvalidAdmin() public {
        ERC4906MetadataModule newModule = new ERC4906MetadataModule();
        
        vm.expectRevert();
        newModule.initialize(address(nft), address(0));
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyMetadataUpdater_CanEmitUpdate() public {
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(1);
        
        module.emitMetadataUpdate(1);
    }
    
    function test_TokenContract_CanEmitUpdate() public {
        vm.prank(address(nft));
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(1);
        
        module.emitMetadataUpdate(1);
    }
    
    function test_RevertWhen_UnauthorizedEmitUpdate() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.emitMetadataUpdate(1);
    }
    
    function test_OnlyAdmin_CanSetUpdatesEnabled() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit UpdatesEnabledChanged(false);
        
        module.setUpdatesEnabled(false);
        assertFalse(module.updatesEnabled());
    }
    
    function test_RevertWhen_UnauthorizedSetUpdatesEnabled() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.setUpdatesEnabled(false);
    }
    
    // ===== CORE FUNCTIONALITY TESTS =====
    
    function test_EmitMetadataUpdate_Success() public {
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(1);
        
        module.emitMetadataUpdate(1);
    }
    
    function test_EmitMetadataUpdate_MultipleTokens() public {
        vm.startPrank(updater);
        
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(1);
        module.emitMetadataUpdate(1);
        
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(2);
        module.emitMetadataUpdate(2);
        
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(3);
        module.emitMetadataUpdate(3);
        
        vm.stopPrank();
    }
    
    function test_EmitBatchMetadataUpdate_Success() public {
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(1, 10);
        
        module.emitBatchMetadataUpdate(1, 10);
    }
    
    function test_EmitBatchMetadataUpdate_SingleToken() public {
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(5, 5);
        
        module.emitBatchMetadataUpdate(5, 5);
    }
    
    function test_EmitBatchMetadataUpdate_LargeRange() public {
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(1, 1000);
        
        module.emitBatchMetadataUpdate(1, 1000);
    }
    
    function test_SetUpdatesEnabled_ToggleOnOff() public {
        vm.startPrank(owner);
        
        // Disable
        module.setUpdatesEnabled(false);
        assertFalse(module.updatesEnabled());
        
        // Re-enable
        module.setUpdatesEnabled(true);
        assertTrue(module.updatesEnabled());
        
        vm.stopPrank();
    }
    
    // ===== INTEGRATION TESTS =====
    
    function test_Integration_MultipleUpdaters() public {
        address updater2 = makeAddr("updater2");
        
        vm.prank(owner);
        module.grantRole(module.METADATA_UPDATER_ROLE(), updater2);
        
        // Both updaters can emit events
        vm.prank(updater);
        module.emitMetadataUpdate(1);
        
        vm.prank(updater2);
        module.emitMetadataUpdate(2);
    }
    
    function test_Integration_MixedSingleAndBatch() public {
        vm.startPrank(updater);
        
        // Single update
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(1);
        module.emitMetadataUpdate(1);
        
        // Batch update
        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(2, 5);
        module.emitBatchMetadataUpdate(2, 5);
        
        // Another single update
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(10);
        module.emitMetadataUpdate(10);
        
        vm.stopPrank();
    }
    
    function test_Integration_WithTokenContract() public {
        // Token contract can emit updates
        vm.prank(address(nft));
        module.emitMetadataUpdate(1);
        
        // Updater can also emit
        vm.prank(updater);
        module.emitMetadataUpdate(2);
    }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_EmitUpdateWhileDisabled() public {
        vm.prank(owner);
        module.setUpdatesEnabled(false);
        
        vm.prank(updater);
        vm.expectRevert();
        module.emitMetadataUpdate(1);
    }
    
    function test_RevertWhen_EmitBatchUpdateWhileDisabled() public {
        vm.prank(owner);
        module.setUpdatesEnabled(false);
        
        vm.prank(updater);
        vm.expectRevert();
        module.emitBatchMetadataUpdate(1, 10);
    }
    
    function test_RevertWhen_InvalidBatchRange() public {
        vm.prank(updater);
        vm.expectRevert();
        module.emitBatchMetadataUpdate(10, 5); // fromTokenId > toTokenId
    }
    
    function test_RevertWhen_UnauthorizedBatchUpdate() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.emitBatchMetadataUpdate(1, 10);
    }
    
    // ===== FUZZ TESTS =====
    
    function testFuzz_EmitMetadataUpdate(uint256 tokenId) public {
        tokenId = bound(tokenId, 0, type(uint96).max);
        
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit MetadataUpdate(tokenId);
        
        module.emitMetadataUpdate(tokenId);
    }
    
    function testFuzz_EmitBatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId) public {
        fromTokenId = bound(fromTokenId, 0, type(uint96).max);
        toTokenId = bound(toTokenId, fromTokenId, type(uint96).max);
        
        vm.prank(updater);
        vm.expectEmit(true, true, true, true);
        emit BatchMetadataUpdate(fromTokenId, toTokenId);
        
        module.emitBatchMetadataUpdate(fromTokenId, toTokenId);
    }
    
    function testFuzz_MultipleUpdates(uint8 numUpdates) public {
        numUpdates = uint8(bound(numUpdates, 1, 20));
        
        vm.startPrank(updater);
        for (uint256 i = 0; i < numUpdates; i++) {
            module.emitMetadataUpdate(i);
        }
        vm.stopPrank();
    }
    
    function testFuzz_SetUpdatesEnabled(bool enabled) public {
        vm.prank(owner);
        module.setUpdatesEnabled(enabled);
        
        assertEq(module.updatesEnabled(), enabled);
    }
    
    // ===== VIEW FUNCTION TESTS =====
    
    function test_SupportsInterface() public view {
        bytes4 ierc4906Interface = type(IMetadataEvents).interfaceId;
        assertTrue(module.supportsInterface(ierc4906Interface));
    }
    
    function test_TokenContract() public view {
        assertEq(module.tokenContract(), address(nft));
    }
    
    function test_UpdatesEnabled() public {
        assertTrue(module.updatesEnabled());
        
        vm.prank(owner);
        module.setUpdatesEnabled(false);
        
        assertFalse(module.updatesEnabled());
    }
    
    // ===== ROLE MANAGEMENT TESTS =====
    
    function test_GrantMetadataUpdaterRole() public {
        address newUpdater = makeAddr("newUpdater");
        
        vm.prank(owner);
        module.grantRole(module.METADATA_UPDATER_ROLE(), newUpdater);
        
        assertTrue(module.hasRole(module.METADATA_UPDATER_ROLE(), newUpdater));
        
        // New updater can emit events
        vm.prank(newUpdater);
        module.emitMetadataUpdate(1);
    }
    
    function test_RevokeMetadataUpdaterRole() public {
        vm.prank(owner);
        module.revokeRole(module.METADATA_UPDATER_ROLE(), updater);
        
        assertFalse(module.hasRole(module.METADATA_UPDATER_ROLE(), updater));
        
        // Revoked updater cannot emit events
        vm.prank(updater);
        vm.expectRevert();
        module.emitMetadataUpdate(1);
    }
}
