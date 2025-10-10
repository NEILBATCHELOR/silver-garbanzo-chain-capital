// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../../src/masters/ERC721WrapperMaster.sol";

// Mock underlying ERC721 for testing
contract MockERC721 is ERC721 {
    uint256 private _nextTokenId;
    
    constructor() ERC721("Mock NFT", "MNFT") {}
    
    function mint(address to) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    function mintBatch(address to, uint256 count) external returns (uint256[] memory) {
        uint256[] memory tokenIds = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            tokenIds[i] = _nextTokenId++;
            _safeMint(to, tokenIds[i]);
        }
        return tokenIds;
    }
}

contract ERC721WrapperMasterTest is Test {
    ERC721WrapperMaster public implementation;
    ERC721WrapperMaster public wrapper;
    MockERC721 public underlying;
    
    address public owner = address(1);
    address public user1 = address(2);
    address public user2 = address(3);
    
    string constant WRAPPER_NAME = "Wrapped Mock NFT";
    string constant WRAPPER_SYMBOL = "wMNFT";
    string constant BASE_URI = "https://wrapped.example.com/";
    
    uint256 tokenId1;
    uint256 tokenId2;
    uint256 tokenId3;
    
    event NFTWrapped(address indexed account, uint256 indexed tokenId);
    event NFTUnwrapped(address indexed account, uint256 indexed tokenId);
    event TransfersPaused();
    event TransfersUnpaused();
    
    function setUp() public {
        underlying = new MockERC721();
        implementation = new ERC721WrapperMaster();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC721WrapperMaster.initialize.selector,
            address(underlying),
            WRAPPER_NAME,
            WRAPPER_SYMBOL,
            BASE_URI,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        wrapper = ERC721WrapperMaster(address(proxy));
        
        // Mint test NFTs
        tokenId1 = underlying.mint(user1);
        tokenId2 = underlying.mint(user1);
        tokenId3 = underlying.mint(user2);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(wrapper.name(), WRAPPER_NAME);
        assertEq(wrapper.symbol(), WRAPPER_SYMBOL);
        assertEq(address(wrapper.underlying()), address(underlying));
        assertEq(wrapper.baseTokenURI(), BASE_URI);
    }
    
    function testInitializeOwner() public view {
        assertEq(wrapper.owner(), owner);
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        wrapper.initialize(address(underlying), WRAPPER_NAME, WRAPPER_SYMBOL, BASE_URI, owner);
    }
    
    function testCannotInitializeWithZeroAddress() public {
        ERC721WrapperMaster newImpl = new ERC721WrapperMaster();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC721WrapperMaster.initialize.selector,
            address(0),
            WRAPPER_NAME,
            WRAPPER_SYMBOL,
            BASE_URI,
            owner
        );
        
        vm.expectRevert();
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    // ============ Single NFT Wrapping Tests ============
    
    function testDepositFor() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        
        vm.expectEmit(true, true, false, true);
        emit NFTWrapped(user1, tokenId1);
        
        bool success = wrapper.depositFor(user1, tokenId1);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.ownerOf(tokenId1), user1);
        assertEq(underlying.ownerOf(tokenId1), address(wrapper));
    }
    
    function testDepositForOtherUser() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        
        bool success = wrapper.depositFor(user2, tokenId1);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.ownerOf(tokenId1), user2);
    }
    
    function testWithdrawTo() public {
        // First wrap
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        
        // Then unwrap
        vm.expectEmit(true, true, false, true);
        emit NFTUnwrapped(user1, tokenId1);
        
        bool success = wrapper.withdrawTo(user1, tokenId1);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(underlying.ownerOf(tokenId1), user1);
        vm.expectRevert();
        wrapper.ownerOf(tokenId1); // Should not exist in wrapper anymore
    }
    
    function testWithdrawToOtherUser() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        
        wrapper.withdrawTo(user2, tokenId1);
        vm.stopPrank();
        
        assertEq(underlying.ownerOf(tokenId1), user2);
    }
    
    // ============ Batch Wrapping Tests ============
    
    function testDepositForBatch() public {
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = tokenId1;
        tokenIds[1] = tokenId2;
        
        vm.startPrank(user1);
        underlying.setApprovalForAll(address(wrapper), true);
        
        bool success = wrapper.depositFor(user1, tokenIds);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.ownerOf(tokenId1), user1);
        assertEq(wrapper.ownerOf(tokenId2), user1);
    }
    
    function testWithdrawToBatch() public {
        uint256[] memory tokenIds = new uint256[](2);
        tokenIds[0] = tokenId1;
        tokenIds[1] = tokenId2;
        
        vm.startPrank(user1);
        underlying.setApprovalForAll(address(wrapper), true);
        wrapper.depositFor(user1, tokenIds);
        
        bool success = wrapper.withdrawTo(user1, tokenIds);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(underlying.ownerOf(tokenId1), user1);
        assertEq(underlying.ownerOf(tokenId2), user1);
    }
    
    // ============ Transfer Tests ============
    
    function testTransferWrappedNFT() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        
        wrapper.transferFrom(user1, user2, tokenId1);
        vm.stopPrank();
        
        assertEq(wrapper.ownerOf(tokenId1), user2);
    }
    
    function testSafeTransferFrom() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        
        wrapper.safeTransferFrom(user1, user2, tokenId1);
        vm.stopPrank();
        
        assertEq(wrapper.ownerOf(tokenId1), user2);
    }
    
    // ============ Pausable Tests ============
    
    function testPauseTransfers() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit TransfersPaused();
        
        wrapper.pauseTransfers();
        
        assertTrue(wrapper.transfersPaused());
    }
    
    function testUnpauseTransfers() public {
        vm.startPrank(owner);
        wrapper.pauseTransfers();
        
        vm.expectEmit(false, false, false, true);
        emit TransfersUnpaused();
        
        wrapper.unpauseTransfers();
        vm.stopPrank();
        
        assertFalse(wrapper.transfersPaused());
    }
    
    function testCannotTransferWhenPaused() public {
        // Wrap NFT
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        vm.stopPrank();
        
        // Pause
        vm.prank(owner);
        wrapper.pauseTransfers();
        
        // Try to transfer
        vm.prank(user1);
        vm.expectRevert(ERC721WrapperMaster.TransfersPausedError.selector);
        wrapper.transferFrom(user1, user2, tokenId1);
    }
    
    function testCanDepositWhenPaused() public {
        vm.prank(owner);
        wrapper.pauseTransfers();
        
        // Wrapping should still work
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        vm.stopPrank();
        
        assertEq(wrapper.ownerOf(tokenId1), user1);
    }
    
    function testOnlyOwnerCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.pauseTransfers();
    }
    
    // ============ URI Management Tests ============
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://new.example.com/";
        
        vm.prank(owner);
        wrapper.setBaseURI(newBaseURI);
        
        assertEq(wrapper.baseTokenURI(), newBaseURI);
    }
    
    function testSetTokenURI() public {
        string memory customURI = "https://custom.example.com/special";
        
        vm.startPrank(owner);
        // Need to wrap first
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        vm.stopPrank();
        
        vm.prank(owner);
        wrapper.setTokenURI(tokenId1, customURI);
        
        assertEq(wrapper.tokenURI(tokenId1), customURI);
    }
    
    function testOnlyOwnerCanSetBaseURI() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.setBaseURI("https://new.example.com/");
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        wrapper.setPolicyEngine(mockEngine);
        
        assertEq(wrapper.policyEngine(), mockEngine);
    }
    
    function testOnlyOwnerCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.setPolicyEngine(address(0x1234));
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        ERC721WrapperMaster newImpl = new ERC721WrapperMaster();
        
        vm.prank(owner);
        wrapper.upgradeToAndCall(address(newImpl), "");
        
        assertEq(wrapper.name(), WRAPPER_NAME);
    }
    
    function testOnlyOwnerCanUpgrade() public {
        ERC721WrapperMaster newImpl = new ERC721WrapperMaster();
        
        vm.prank(user1);
        vm.expectRevert();
        wrapper.upgradeToAndCall(address(newImpl), "");
    }
    
    // ============ Edge Cases ============
    
    function testDepositNonExistentToken() public {
        uint256 nonExistentTokenId = 999;
        
        vm.startPrank(user1);
        underlying.approve(address(wrapper), nonExistentTokenId);
        
        vm.expectRevert();
        wrapper.depositFor(user1, nonExistentTokenId);
        vm.stopPrank();
    }
    
    function testCannotWithdrawUnownedToken() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), tokenId1);
        wrapper.depositFor(user1, tokenId1);
        vm.stopPrank();
        
        vm.prank(user2);
        vm.expectRevert();
        wrapper.withdrawTo(user2, tokenId1);
    }
    
    function testSupportsInterface() public view {
        // ERC721
        assertTrue(wrapper.supportsInterface(0x80ac58cd));
        // ERC721Metadata
        assertTrue(wrapper.supportsInterface(0x5b5e139f));
    }
}
