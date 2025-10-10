// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC3525Master.sol";

contract ERC3525MasterTest is Test {
    ERC3525Master public implementation;
    ERC3525Master public token;
    
    address public owner = address(1);
    address public minter = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    address public user3 = address(5);
    
    // Test parameters
    string constant NAME = "Semi-Fungible Token";
    string constant SYMBOL = "SFT";
    uint8 constant DECIMALS = 18;
    uint256 constant SLOT_GOLD = 1;
    uint256 constant SLOT_SILVER = 2;
    uint256 constant SLOT_BRONZE = 3;
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event TransferValue(uint256 indexed fromTokenId, uint256 indexed toTokenId, uint256 value);
    event ApprovalValue(uint256 indexed tokenId, address indexed operator, uint256 value);
    event SlotChanged(uint256 indexed tokenId, uint256 indexed oldSlot, uint256 indexed newSlot);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC3525Master();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC3525Master.initialize.selector,
            NAME,
            SYMBOL,
            DECIMALS,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        token = ERC3525Master(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertEq(token.decimals(), DECIMALS);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        token.initialize(NAME, SYMBOL, DECIMALS, owner);
    }
    
    function testInitializationGrantsRoles() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), owner));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), owner));
        assertTrue(token.hasRole(token.UPGRADER_ROLE(), owner));
    }
    
    // ============ Minting Tests ============
    
    function testMint() public {
        uint256 value = 1000 * 10**18;
        
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, value);
        
        assertEq(token.ownerOf(tokenId), user1);
        assertEq(token.slotOf(tokenId), SLOT_GOLD);
        assertEq(token.balanceOf(tokenId), value);
        assertEq(token.balanceOf(user1), 1);
    }
    
    function testMintMultipleTokens() public {
        uint256 value = 500 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        uint256 token2 = token.mint(user1, SLOT_SILVER, value);
        uint256 token3 = token.mint(user2, SLOT_GOLD, value * 2);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user1), 2);
        assertEq(token.balanceOf(user2), 1);
        assertEq(token.balanceOf(token1), value);
        assertEq(token.balanceOf(token3), value * 2);
    }
    
    function testOnlyMinterCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, SLOT_GOLD, 1000 * 10**18);
    }
    
    // ============ Slot Management Tests ============
    
    function testSlotOf() public {
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        
        assertEq(token.slotOf(tokenId), SLOT_GOLD);
    }
    
    function testTokensInDifferentSlots() public {
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        uint256 token2 = token.mint(user1, SLOT_SILVER, 1000 * 10**18);
        uint256 token3 = token.mint(user1, SLOT_BRONZE, 1000 * 10**18);
        vm.stopPrank();
        
        assertEq(token.slotOf(token1), SLOT_GOLD);
        assertEq(token.slotOf(token2), SLOT_SILVER);
        assertEq(token.slotOf(token3), SLOT_BRONZE);
    }
    
    // ============ Value Transfer Tests ============
    
    function testTransferValue() public {
        uint256 value = 1000 * 10**18;
        uint256 transferValue = 300 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        uint256 token2 = token.mint(user2, SLOT_GOLD, value);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit TransferValue(token1, token2, transferValue);
        token.transferValueFrom(token1, token2, transferValue);
        
        assertEq(token.balanceOf(token1), value - transferValue);
        assertEq(token.balanceOf(token2), value + transferValue);
    }
    
    function testCannotTransferValueBetweenDifferentSlots() public {
        uint256 value = 1000 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        uint256 token2 = token.mint(user2, SLOT_SILVER, value);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert(ERC3525Master.InvalidSlot.selector);
        token.transferValueFrom(token1, token2, 100 * 10**18);
    }
    
    function testCannotTransferMoreValueThanAvailable() public {
        uint256 value = 1000 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        uint256 token2 = token.mint(user2, SLOT_GOLD, value);
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert(ERC3525Master.InsufficientValue.selector);
        token.transferValueFrom(token1, token2, value + 1);
    }
    
    function testTransferValueWithApproval() public {
        uint256 value = 1000 * 10**18;
        uint256 transferValue = 300 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        uint256 token2 = token.mint(user2, SLOT_GOLD, value);
        vm.stopPrank();
        
        // User1 approves user3 to transfer value
        vm.prank(user1);
        token.approveValue(token1, user3, transferValue);
        
        // User3 transfers value on behalf of user1
        vm.prank(user3);
        token.transferValueFrom(token1, token2, transferValue);
        
        assertEq(token.balanceOf(token1), value - transferValue);
        assertEq(token.balanceOf(token2), value + transferValue);
    }
    
    // ============ Value Approval Tests ============
    
    function testApproveValue() public {
        uint256 value = 1000 * 10**18;
        uint256 approvalValue = 300 * 10**18;
        
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, value);
        
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit ApprovalValue(tokenId, user2, approvalValue);
        token.approveValue(tokenId, user2, approvalValue);
        
        // Note: No public getter for value allowances in ERC3525Master
        // The approval is stored in _valueApprovals mapping (private)
    }
    
    // ============ Token Transfer Tests ============
    
    function testTransferToken() public {
        uint256 value = 1000 * 10**18;
        
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, value);
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit Transfer(user1, user2, tokenId);
        token.transferFrom(user1, user2, tokenId);
        
        assertEq(token.ownerOf(tokenId), user2);
        assertEq(token.balanceOf(user1), 0);
        assertEq(token.balanceOf(user2), 1);
    }
    
    function testApproveAndTransfer() public {
        uint256 value = 1000 * 10**18;
        
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, value);
        
        vm.prank(user1);
        token.approve(user2, tokenId);
        
        vm.prank(user2);
        token.transferFrom(user1, user3, tokenId);
        
        assertEq(token.ownerOf(tokenId), user3);
    }
    
    function testSetApprovalForAll() public {
        vm.prank(user1);
        token.setApprovalForAll(user2, true);
        
        // Note: No public getter for operator approvals in ERC3525Master
        // The approval is stored in _operatorApprovals mapping (private)
        // We can test it works by using the approved operator
        
        // Mint token to user1
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        
        // User2 (approved operator) can transfer user1's token
        vm.prank(user2);
        token.transferFrom(user1, user3, tokenId);
        
        assertEq(token.ownerOf(tokenId), user3);
    }
    
    // ============ Balance Tests ============
    
    function testBalanceOfToken() public {
        uint256 value = 1000 * 10**18;
        
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, value);
        
        assertEq(token.balanceOf(tokenId), value);
    }
    
    function testBalanceOfAddress() public {
        vm.startPrank(owner);
        token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        token.mint(user1, SLOT_SILVER, 500 * 10**18);
        token.mint(user2, SLOT_BRONZE, 2000 * 10**18);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user1), 2);
        assertEq(token.balanceOf(user2), 1);
    }
    
    // ============ Split and Merge Operations ============
    
    function testSplitValue() public {
        uint256 value = 1000 * 10**18;
        uint256 splitValue = 400 * 10**18;
        
        vm.prank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value);
        
        // "Split" by minting a new token in the same slot and transferring value
        vm.prank(owner);
        uint256 token2 = token.mint(user1, SLOT_GOLD, 0); // mint empty token in same slot
        
        vm.prank(user1);
        token.transferValueFrom(token1, token2, splitValue); // transfer value
        
        assertEq(token.balanceOf(token1), value - splitValue);
        assertEq(token.balanceOf(token2), splitValue);
        assertEq(token.slotOf(token2), SLOT_GOLD);
        assertEq(token.ownerOf(token2), user1);
    }
    
    function testMergeValues() public {
        uint256 value1 = 1000 * 10**18;
        uint256 value2 = 500 * 10**18;
        
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, value1);
        uint256 token2 = token.mint(user1, SLOT_GOLD, value2);
        vm.stopPrank();
        
        // "Merge" by transferring all value from token2 to token1
        uint256 token2Value = token.balanceOf(token2);
        vm.prank(user1);
        token.transferValueFrom(token2, token1, token2Value);
        
        assertEq(token.balanceOf(token1), value1 + value2);
        assertEq(token.balanceOf(token2), 0); // token2 now has 0 value
        assertEq(token.balanceOf(user1), 2); // user still owns both tokens
    }
    
    function testCannotMergeTokensInDifferentSlots() public {
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        uint256 token2 = token.mint(user1, SLOT_SILVER, 500 * 10**18);
        vm.stopPrank();
        
        // Try to transfer value between different slots (should fail)
        vm.prank(user1);
        vm.expectRevert(ERC3525Master.InvalidSlot.selector);
        token.transferValueFrom(token1, token2, 100 * 10**18);
    }
    
    // ============ Metadata Tests ============
    
    function testTokenURI() public {
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        
        string memory uri = token.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
    }
    
    function testSlotURI() public {
        string memory uri = token.slotURI(SLOT_GOLD);
        assertTrue(bytes(uri).length > 0);
    }
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://new-base.com/";
        
        vm.prank(owner);
        token.setBaseURI(newBaseURI);
        
        assertEq(token.baseTokenURI(), newBaseURI);
    }
    
    function testSetSlotURI() public {
        string memory slotURI = "https://gold-slot.com/";
        
        vm.prank(owner);
        token.setSlotURI(SLOT_GOLD, slotURI);
        
        assertEq(token.slotURI(SLOT_GOLD), slotURI);
    }
    
    // ============ Access Control Tests ============
    
    function testGrantMinterRole() public {
        vm.prank(owner);
        token.grantRole(token.MINTER_ROLE(), minter);
        
        assertTrue(token.hasRole(token.MINTER_ROLE(), minter));
        
        // Verify minter can mint
        vm.prank(minter);
        token.mint(user1, SLOT_GOLD, 1000 * 10**18);
    }
    
    function testRevokeMinterRole() public {
        vm.startPrank(owner);
        token.grantRole(token.MINTER_ROLE(), minter);
        token.revokeRole(token.MINTER_ROLE(), minter);
        vm.stopPrank();
        
        assertFalse(token.hasRole(token.MINTER_ROLE(), minter));
        
        vm.prank(minter);
        vm.expectRevert();
        token.mint(user1, SLOT_GOLD, 1000 * 10**18);
    }
    
    function testOnlyAdminCanGrantRoles() public {
        vm.prank(user1);
        vm.expectRevert();
        token.grantRole(token.MINTER_ROLE(), minter);
    }
    
    // ============ Pausability Tests ============
    
    function testPause() public {
        vm.prank(owner);
        token.pause();
        
        assertTrue(token.paused());
    }
    
    function testUnpause() public {
        vm.startPrank(owner);
        token.pause();
        token.unpause();
        vm.stopPrank();
        
        assertFalse(token.paused());
    }
    
    function testCannotTransferWhenPaused() public {
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        
        vm.prank(owner);
        token.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        token.transferFrom(user1, user2, tokenId);
    }
    
    function testCannotTransferValueWhenPaused() public {
        vm.startPrank(owner);
        uint256 token1 = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        uint256 token2 = token.mint(user2, SLOT_GOLD, 1000 * 10**18);
        token.pause();
        vm.stopPrank();
        
        vm.prank(user1);
        vm.expectRevert();
        token.transferValueFrom(token1, token2, 100 * 10**18);
    }
    
    function testOnlyPauserCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        token.pause();
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgrade() public {
        // Mint some tokens before upgrade
        vm.prank(owner);
        uint256 tokenId = token.mint(user1, SLOT_GOLD, 1000 * 10**18);
        
        address ownerBefore = token.ownerOf(tokenId);
        uint256 valueBefore = token.balanceOf(tokenId);
        
        // Deploy new implementation
        ERC3525Master newImplementation = new ERC3525Master();
        
        // Upgrade
        vm.prank(owner);
        token.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state preserved
        assertEq(token.name(), NAME);
        assertEq(token.ownerOf(tokenId), ownerBefore);
        assertEq(token.balanceOf(tokenId), valueBefore);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC3525Master newImplementation = new ERC3525Master();
        
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImplementation), "");
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        token.setPolicyEngine(mockEngine);
        
        assertEq(token.policyEngine(), mockEngine);
    }
    
    function testOnlyAdminCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        token.setPolicyEngine(address(0x1234));
    }
}
