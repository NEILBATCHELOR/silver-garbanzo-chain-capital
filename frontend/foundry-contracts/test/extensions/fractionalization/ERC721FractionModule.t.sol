// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import {ERC721FractionModule, FractionToken} from "src/extensions/fractionalization/ERC721FractionModule.sol";
import {ERC721Master} from "src/masters/ERC721Master.sol";

contract ERC721FractionModuleTest is Test {
    ERC721FractionModule public module;
    ERC721Master public nft;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public unauthorized = makeAddr("unauthorized");
    
    // Constants
    uint256 constant TOKEN_ID = 1;
    uint256 constant SHARES = 1000;
    string constant SHARE_NAME = "Fractional NFT";
    string constant SHARE_SYMBOL = "FNFT";
    
    // Events
    event Fractionalized(uint256 indexed tokenId, address indexed shareToken, uint256 shares, address indexed owner);
    event Redeemed(uint256 indexed tokenId, address indexed redeemer);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy NFT contract
        nft = new ERC721Master();
        nft.initialize(owner, "Test NFT", "TNFT");
        
        // Deploy and initialize fractionalization module
        module = new ERC721FractionModule();
        module.initialize(owner, address(nft));
        
        // Grant roles
        module.grantRole(module.FRACTION_MANAGER_ROLE(), admin);
        
        // Mint NFT to user1
        nft.mint(user1, TOKEN_ID);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        assertEq(module.nftContract(), address(nft));
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(module.hasRole(module.FRACTION_MANAGER_ROLE(), owner));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        ERC721FractionModule newModule = new ERC721FractionModule();
        newModule.initialize(owner, address(nft));
        
        vm.expectRevert();
        newModule.initialize(owner, address(nft));
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyAdmin_CanSetNFTContract() public {
        address newNFT = makeAddr("newNFT");
        
        vm.prank(owner);
        module.setNFTContract(newNFT);
        
        assertEq(module.nftContract(), newNFT);
    }
    
    function test_RevertWhen_UnauthorizedSetNFTContract() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.setNFTContract(makeAddr("newNFT"));
    }
    
    // ===== CORE FUNCTIONALITY TESTS =====
    
    function test_Fractionalize_Success() public {
        vm.startPrank(user1);
        
        // Approve module to transfer NFT
        nft.approve(address(module), TOKEN_ID);
        
        // Fractionalize
        vm.expectEmit(true, true, true, true);
        emit Fractionalized(TOKEN_ID, address(0), SHARES, user1);
        
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        // Verify fractionalization
        assertTrue(module.isFractionalized(TOKEN_ID));
        assertEq(module.getShareToken(TOKEN_ID), shareToken);
        assertEq(module.getTotalShares(TOKEN_ID), SHARES);
        
        // Verify NFT was transferred
        assertEq(nft.ownerOf(TOKEN_ID), address(module));
        
        // Verify share token
        FractionToken token = FractionToken(shareToken);
        assertEq(token.balanceOf(user1), SHARES);
        assertEq(token.creator(), user1);
        
        vm.stopPrank();
    }
    
    function test_Fractionalize_StateChanges() public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        
        assertFalse(module.isFractionalized(TOKEN_ID));
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        assertTrue(module.isFractionalized(TOKEN_ID));
        
        vm.stopPrank();
    }
    
    function test_Redeem_Success() public {
        // First fractionalize
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        // Redeem (user1 owns all shares)
        vm.expectEmit(true, true, true, true);
        emit Redeemed(TOKEN_ID, user1);
        
        module.redeem(TOKEN_ID);
        
        // Verify redemption
        assertFalse(module.isFractionalized(TOKEN_ID));
        assertEq(module.getShareToken(TOKEN_ID), address(0));
        assertEq(module.getTotalShares(TOKEN_ID), 0);
        
        // Verify NFT was returned
        assertEq(nft.ownerOf(TOKEN_ID), user1);
        
        // Verify shares were burned
        assertEq(FractionToken(shareToken).balanceOf(user1), 0);
        
        vm.stopPrank();
    }
    
    function test_Redeem_AfterTransfer() public {
        // Fractionalize
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        // Transfer some shares to user2
        FractionToken(shareToken).transfer(user2, 300);
        assertEq(FractionToken(shareToken).balanceOf(user1), 700);
        
        // user1 cannot redeem (doesn't own all shares)
        vm.expectRevert();
        module.redeem(TOKEN_ID);
        vm.stopPrank();
        
        // Transfer remaining shares back
        vm.prank(user2);
        FractionToken(shareToken).transfer(user1, 300);
        
        // Now user1 can redeem
        vm.prank(user1);
        module.redeem(TOKEN_ID);
        assertEq(nft.ownerOf(TOKEN_ID), user1);
    }
    
    // ===== INTEGRATION TESTS =====
    
    function test_Integration_MultipleFractionalizations() public {
        // Mint more NFTs
        vm.prank(owner);
        nft.mint(user1, 2);
        
        vm.startPrank(user1);
        
        // Fractionalize first NFT
        nft.approve(address(module), TOKEN_ID);
        address shareToken1 = module.fractionalize(TOKEN_ID, SHARES, "Fraction 1", "FNFT1");
        
        // Fractionalize second NFT
        nft.approve(address(module), 2);
        address shareToken2 = module.fractionalize(2, 500, "Fraction 2", "FNFT2");
        
        // Verify both are independent
        assertTrue(module.isFractionalized(TOKEN_ID));
        assertTrue(module.isFractionalized(2));
        assertNotEq(shareToken1, shareToken2);
        assertEq(module.getTotalShares(TOKEN_ID), SHARES);
        assertEq(module.getTotalShares(2), 500);
        
        vm.stopPrank();
    }
    
    function test_Integration_ShareTokenTransfers() public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        // Transfer shares between users
        FractionToken(shareToken).transfer(user2, 100);
        assertEq(FractionToken(shareToken).balanceOf(user1), 900);
        assertEq(FractionToken(shareToken).balanceOf(user2), 100);
        
        vm.stopPrank();
        
        // user2 can transfer shares
        vm.prank(user2);
        FractionToken(shareToken).transfer(user1, 50);
        assertEq(FractionToken(shareToken).balanceOf(user1), 950);
        assertEq(FractionToken(shareToken).balanceOf(user2), 50);
    }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_AlreadyFractionalized() public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        vm.expectRevert();
        module.fractionalize(TOKEN_ID, SHARES, "New Name", "NEW");
        vm.stopPrank();
    }
    
    function test_RevertWhen_RedeemNotFractionalized() public {
        vm.prank(user1);
        vm.expectRevert();
        module.redeem(TOKEN_ID);
    }
    
    function test_RevertWhen_InsufficientShares() public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        // Transfer some shares away
        FractionToken(shareToken).transfer(user2, 1);
        
        // Cannot redeem without all shares
        vm.expectRevert();
        module.redeem(TOKEN_ID);
        vm.stopPrank();
    }
    
    function test_RevertWhen_UnauthorizedBurn() public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        vm.stopPrank();
        
        // Only creator can burn
        vm.prank(user2);
        vm.expectRevert();
        FractionToken(shareToken).burnFrom(user1, 100);
    }
    
    // ===== FUZZ TESTS =====
    
    function testFuzz_Fractionalize(uint256 shares) public {
        shares = bound(shares, 1, 1_000_000);
        
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        
        address shareToken = module.fractionalize(TOKEN_ID, shares, SHARE_NAME, SHARE_SYMBOL);
        
        assertEq(module.getTotalShares(TOKEN_ID), shares);
        assertEq(FractionToken(shareToken).balanceOf(user1), shares);
        vm.stopPrank();
    }
    
    function testFuzz_ShareTransfer(uint256 transferAmount) public {
        vm.startPrank(user1);
        nft.approve(address(module), TOKEN_ID);
        address shareToken = module.fractionalize(TOKEN_ID, SHARES, SHARE_NAME, SHARE_SYMBOL);
        
        transferAmount = bound(transferAmount, 0, SHARES);
        FractionToken(shareToken).transfer(user2, transferAmount);
        
        assertEq(FractionToken(shareToken).balanceOf(user1), SHARES - transferAmount);
        assertEq(FractionToken(shareToken).balanceOf(user2), transferAmount);
        vm.stopPrank();
    }
    
    function testFuzz_MultipleTokens(uint8 numTokens) public {
        numTokens = uint8(bound(numTokens, 1, 10));
        
        vm.startPrank(owner);
        for (uint256 i = 2; i <= numTokens + 1; i++) {
            nft.mint(user1, i);
        }
        vm.stopPrank();
        
        vm.startPrank(user1);
        for (uint256 i = 1; i <= numTokens; i++) {
            nft.approve(address(module), i);
            module.fractionalize(i, 100 * i, SHARE_NAME, SHARE_SYMBOL);
            assertTrue(module.isFractionalized(i));
        }
        vm.stopPrank();
    }
}
