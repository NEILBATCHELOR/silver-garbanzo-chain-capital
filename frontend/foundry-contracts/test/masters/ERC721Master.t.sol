// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC721Master.sol";

contract ERC721MasterTest is Test {
    ERC721Master public implementation;
    ERC721Master public nft;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    address public user3 = address(4);
    
    // Test parameters
    string constant NAME = "Test NFT";
    string constant SYMBOL = "TNFT";
    string constant BASE_URI = "ipfs://test/";
    uint256 constant MAX_SUPPLY = 10000;
    bool constant MINTING_ENABLED = true;
    bool constant BURNING_ENABLED = true;
    
    // Events
    event NFTMinted(address indexed to, uint256 indexed tokenId, string uri);
    event NFTBurned(uint256 indexed tokenId);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC721Master();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            NAME,
            SYMBOL,
            BASE_URI,
            MAX_SUPPLY,
            owner,
            MINTING_ENABLED,
            BURNING_ENABLED
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        nft = ERC721Master(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(nft.name(), NAME);
        assertEq(nft.symbol(), SYMBOL);
        assertEq(nft.baseTokenURI(), BASE_URI);
        assertEq(nft.maxSupply(), MAX_SUPPLY);
        assertEq(nft.owner(), owner);
        assertTrue(nft.mintingEnabled());
        assertTrue(nft.burningEnabled());
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        nft.initialize(NAME, SYMBOL, BASE_URI, MAX_SUPPLY, owner, true, true);
    }
    
    function testInitializationWithBaseURI() public view {
        assertEq(nft.baseTokenURI(), BASE_URI);
    }
    
    // ============ Core ERC721 Functions ============
    
    function testMint() public {
        string memory tokenURI = "ipfs://QmTest123";
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit NFTMinted(user1, 1, tokenURI);
        nft.mint(user1, tokenURI);
        
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.balanceOf(user1), 1);
        assertEq(nft.totalSupply(), 1);
    }
    
    function testMintWithEmptyURI() public {
        vm.prank(owner);
        nft.mint(user1, "");
        
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.balanceOf(user1), 1);
    }
    
    function testBurn() public {
        // Mint token first
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest123");
        
        // User1 burns their token
        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit NFTBurned(1);
        nft.burn(1);
        
        assertEq(nft.balanceOf(user1), 0);
        assertEq(nft.totalSupply(), 0);
    }
    
    function testTransferFrom() public {
        // Mint to user1
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest1");
        
        // Transfer to user2
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Transfer(user1, user2, 1);
        nft.transferFrom(user1, user2, 1);
        
        assertEq(nft.ownerOf(1), user2);
        assertEq(nft.balanceOf(user1), 0);
        assertEq(nft.balanceOf(user2), 1);
    }
    
    function testSafeTransferFrom() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest2");
        
        vm.prank(user1);
        nft.safeTransferFrom(user1, user2, 1);
        
        assertEq(nft.ownerOf(1), user2);
    }
    
    function testApprove() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest3");
        
        vm.prank(user1);
        nft.approve(user2, 1);
        
        assertEq(nft.getApproved(1), user2);
    }
    
    function testSetApprovalForAll() public {
        vm.prank(user1);
        nft.setApprovalForAll(user2, true);
        
        assertTrue(nft.isApprovedForAll(user1, user2));
    }
    
    function testOwnerOf() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest4");
        
        assertEq(nft.ownerOf(1), user1);
    }
    
    // ============ Metadata Tests ============
    
    function testTokenURI() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest5");
        
        string memory uri = nft.tokenURI(1);
        // Base URI + tokenId
        assertTrue(bytes(uri).length > 0);
    }
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://new-uri.com/";
        
        vm.prank(owner);
        nft.setBaseURI(newBaseURI);
        
        assertEq(nft.baseTokenURI(), newBaseURI);
    }
    
    function testTokenURIAfterBaseURIChange() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest6");
        
        string memory newBaseURI = "https://changed.com/";
        vm.prank(owner);
        nft.setBaseURI(newBaseURI);
        
        string memory uri = nft.tokenURI(1);
        assertTrue(bytes(uri).length > 0);
    }
    
    // ============ Enumeration Tests ============
    
    function testTotalSupply() public {
        vm.startPrank(owner);
        nft.mint(user1, "ipfs://QmTest7");
        nft.mint(user2, "ipfs://QmTest8");
        nft.mint(user3, "ipfs://QmTest9");
        vm.stopPrank();
        
        assertEq(nft.totalSupply(), 3);
    }
    
    function testTokenOfOwnerByIndex() public {
        vm.startPrank(owner);
        nft.mint(user1, "ipfs://QmTest10");
        nft.mint(user1, "ipfs://QmTest11");
        vm.stopPrank();
        
        assertEq(nft.tokenOfOwnerByIndex(user1, 0), 1);
        assertEq(nft.tokenOfOwnerByIndex(user1, 1), 2);
    }
    
    function testTokenByIndex() public {
        vm.startPrank(owner);
        nft.mint(user1, "ipfs://QmTest12");
        nft.mint(user2, "ipfs://QmTest13");
        vm.stopPrank();
        
        assertEq(nft.tokenByIndex(0), 1);
        assertEq(nft.tokenByIndex(1), 2);
    }
    
    function testBalanceOf() public {
        vm.startPrank(owner);
        nft.mint(user1, "ipfs://QmTest14");
        nft.mint(user1, "ipfs://QmTest15");
        nft.mint(user2, "ipfs://QmTest16");
        vm.stopPrank();
        
        assertEq(nft.balanceOf(user1), 2);
        assertEq(nft.balanceOf(user2), 1);
        assertEq(nft.balanceOf(user3), 0);
    }
    
    // ============ Access Control & Roles ============
    
    function testOnlyOwnerCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.mint(user2, "ipfs://QmTest17");
    }
    
    function testOnlyOwnerCanSetBaseURI() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.setBaseURI("https://unauthorized.com/");
    }
    
    function testOnlyOwnerCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.pauseTransfers();
    }
    
    // ============ Pausability Tests ============
    
    function testPause() public {
        vm.prank(owner);
        nft.pauseTransfers();
        
        assertTrue(nft.transfersPaused());
    }
    
    function testCannotTransferWhenPaused() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest18");
        
        vm.prank(owner);
        nft.pauseTransfers();
        
        vm.prank(user1);
        vm.expectRevert(ERC721Master.TransfersPaused.selector);
        nft.transferFrom(user1, user2, 1);
    }
    
    function testUnpause() public {
        vm.startPrank(owner);
        nft.pauseTransfers();
        nft.unpauseTransfers();
        vm.stopPrank();
        
        assertFalse(nft.transfersPaused());
    }
    
    // ============ Lock/Unlock Tests ============
    
    function testLockToken() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest19");
        
        uint256 lockDuration = 1 days;
        vm.prank(user1);
        nft.lockNFT(1, lockDuration);
        
        assertTrue(nft.lockedTokens(1));
    }
    
    function testCannotTransferLockedToken() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest20");
        
        vm.prank(user1);
        nft.lockNFT(1, 1 days);
        
        vm.prank(user1);
        vm.expectRevert(ERC721Master.TokenLocked.selector);
        nft.transferFrom(user1, user2, 1);
    }
    
    function testUnlockToken() public {
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest21");
        
        vm.prank(user1);
        nft.lockNFT(1, 1 days);
        
        // Warp time forward
        vm.warp(block.timestamp + 2 days);
        
        vm.prank(user1);
        nft.unlockNFT(1);
        
        assertFalse(nft.lockedTokens(1));
    }
    
    // ============ Max Supply Tests ============
    
    function testCannotMintBeyondMaxSupply() public {
        // Deploy new NFT with max supply of 2
        ERC721Master newImpl = new ERC721Master();
        bytes memory initData = abi.encodeWithSelector(
            ERC721Master.initialize.selector,
            "Limited NFT",
            "LIM",
            BASE_URI,
            2, // Max supply of 2
            owner,
            true,
            true
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(newImpl), initData);
        ERC721Master limitedNFT = ERC721Master(address(proxy));
        
        vm.startPrank(owner);
        limitedNFT.mint(user1, "ipfs://QmTest22");
        limitedNFT.mint(user2, "ipfs://QmTest23");
        
        // Third mint should fail
        vm.expectRevert(ERC721Master.MaxSupplyExceeded.selector);
        limitedNFT.mint(user3, "ipfs://QmTest24");
        vm.stopPrank();
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        // Mint a token before upgrade
        vm.prank(owner);
        nft.mint(user1, "ipfs://QmTest25");
        
        // Deploy new implementation
        ERC721Master newImplementation = new ERC721Master();
        
        // Upgrade
        vm.prank(owner);
        nft.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state preserved
        assertEq(nft.name(), NAME);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.totalSupply(), 1);
    }
    
    function testOnlyOwnerCanUpgrade() public {
        ERC721Master newImplementation = new ERC721Master();
        
        vm.prank(user1);
        vm.expectRevert();
        nft.upgradeToAndCall(address(newImplementation), "");
    }
    
    function testUpgradePreservesState() public {
        // Mint multiple tokens
        vm.startPrank(owner);
        nft.mint(user1, "ipfs://QmTest26");
        nft.mint(user2, "ipfs://QmTest27");
        vm.stopPrank();
        
        uint256 supplyBefore = nft.totalSupply();
        
        // Upgrade
        ERC721Master newImplementation = new ERC721Master();
        vm.prank(owner);
        nft.upgradeToAndCall(address(newImplementation), "");
        
        // Verify all state preserved
        assertEq(nft.totalSupply(), supplyBefore);
        assertEq(nft.ownerOf(1), user1);
        assertEq(nft.ownerOf(2), user2);
    }

    
    // ============ Module Management Tests ============
    
    function testSetRoyaltyModule() public {
        address mockModule = address(0x1234);
        
        vm.prank(owner);
        nft.setRoyaltyModule(mockModule);
        
        assertEq(nft.royaltyModule(), mockModule);
    }
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1235);
        
        vm.prank(owner);
        nft.setPolicyEngine(mockEngine);
        
        assertEq(nft.policyEngine(), mockEngine);
    }
}
