// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC1155Master.sol";

contract ERC1155MasterTest is Test {
    ERC1155Master public implementation;
    ERC1155Master public token;
    
    address public owner = address(1);
    address public minter = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    // Test parameters
    string constant NAME = "Test Multi Token";
    string constant SYMBOL = "TMT";
    string constant URI = "https://token-cdn.com/{id}.json";
    
    uint256 constant TOKEN_ID_1 = 1;
    uint256 constant TOKEN_ID_2 = 2;
    uint256 constant TOKEN_ID_3 = 3;
    
    // Events
    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC1155Master();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC1155Master.initialize.selector,
            NAME,
            SYMBOL,
            URI,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        token = ERC1155Master(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        token.initialize(NAME, SYMBOL, URI, owner);
    }
    
    function testInitializationWithURI() public view {
        string memory uri = token.uri(TOKEN_ID_1);
        assertEq(uri, URI);
    }
    
    // ============ Core ERC1155 Functions ============
    
    function testMint() public {
        uint256 amount = 100;
        
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(owner, address(0), user1, TOKEN_ID_1, amount);
        token.mint(user1, TOKEN_ID_1, amount, "");
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), amount);
        assertEq(token.totalSupply(TOKEN_ID_1), amount);
    }
    
    function testMintBatch() public {
        uint256[] memory ids = new uint256[](3);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        ids[2] = TOKEN_ID_3;
        
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100;
        amounts[1] = 200;
        amounts[2] = 300;
        
        vm.prank(owner);
        token.mintBatch(user1, ids, amounts, "");
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 100);
        assertEq(token.balanceOf(user1, TOKEN_ID_2), 200);
        assertEq(token.balanceOf(user1, TOKEN_ID_3), 300);
    }
    
    function testBurn() public {
        uint256 amount = 100;
        
        vm.prank(owner);
        token.mint(user1, TOKEN_ID_1, amount, "");
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(user1, user1, address(0), TOKEN_ID_1, amount);
        token.burn(user1, TOKEN_ID_1, amount);
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 0);
        assertEq(token.totalSupply(TOKEN_ID_1), 0);
    }
    
    function testBurnBatch() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100;
        amounts[1] = 200;
        
        vm.prank(owner);
        token.mintBatch(user1, ids, amounts, "");
        
        vm.prank(user1);
        token.burnBatch(user1, ids, amounts);
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 0);
        assertEq(token.balanceOf(user1, TOKEN_ID_2), 0);
    }
    
    function testSafeTransferFrom() public {
        uint256 amount = 100;
        
        vm.prank(owner);
        token.mint(user1, TOKEN_ID_1, amount, "");
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit TransferSingle(user1, user1, user2, TOKEN_ID_1, amount);
        token.safeTransferFrom(user1, user2, TOKEN_ID_1, amount, "");
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 0);
        assertEq(token.balanceOf(user2, TOKEN_ID_1), amount);
    }
    
    function testSafeBatchTransferFrom() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100;
        amounts[1] = 200;
        
        vm.prank(owner);
        token.mintBatch(user1, ids, amounts, "");
        
        vm.prank(user1);
        token.safeBatchTransferFrom(user1, user2, ids, amounts, "");
        
        assertEq(token.balanceOf(user2, TOKEN_ID_1), 100);
        assertEq(token.balanceOf(user2, TOKEN_ID_2), 200);
    }
    
    function testSetApprovalForAll() public {
        vm.prank(user1);
        token.setApprovalForAll(user2, true);
        
        assertTrue(token.isApprovedForAll(user1, user2));
    }
    
    function testBalanceOf() public {
        vm.prank(owner);
        token.mint(user1, TOKEN_ID_1, 100, "");
        
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 100);
        assertEq(token.balanceOf(user2, TOKEN_ID_1), 0);
    }
    
    // ============ Batch Operations ============
    
    function testBalanceOfBatch() public {
        vm.startPrank(owner);
        token.mint(user1, TOKEN_ID_1, 100, "");
        token.mint(user2, TOKEN_ID_2, 200, "");
        vm.stopPrank();
        
        address[] memory accounts = new address[](2);
        accounts[0] = user1;
        accounts[1] = user2;
        
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        
        uint256[] memory balances = token.balanceOfBatch(accounts, ids);
        assertEq(balances[0], 100);
        assertEq(balances[1], 200);
    }
    
    function testMintBatchMultipleTokens() public {
        uint256[] memory ids = new uint256[](3);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        ids[2] = TOKEN_ID_3;
        
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 50;
        amounts[1] = 100;
        amounts[2] = 150;
        
        vm.prank(owner);
        token.mintBatch(user1, ids, amounts, "");
        
        assertEq(token.totalSupply(TOKEN_ID_1), 50);
        assertEq(token.totalSupply(TOKEN_ID_2), 100);
        assertEq(token.totalSupply(TOKEN_ID_3), 150);
    }
    
    function testBurnBatchMultipleTokens() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_ID_1;
        ids[1] = TOKEN_ID_2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50;
        amounts[1] = 100;
        
        vm.prank(owner);
        token.mintBatch(user1, ids, amounts, "");
        
        vm.prank(user1);
        token.burnBatch(user1, ids, amounts);
        
        assertEq(token.totalSupply(TOKEN_ID_1), 0);
        assertEq(token.totalSupply(TOKEN_ID_2), 0);
    }
    
    // ============ URI Management ============
    
    function testSetURI() public {
        string memory newURI = "https://new-uri.com/{id}.json";
        
        vm.prank(owner);
        token.setURI(newURI);
        
        assertEq(token.uri(TOKEN_ID_1), newURI);
    }
    
    function testTokenURI() public view {
        string memory uri = token.uri(TOKEN_ID_1);
        assertEq(uri, URI);
    }
    
    function testURIAfterUpdate() public {
        string memory newURI = "https://updated.com/{id}.json";
        
        vm.prank(owner);
        token.setURI(newURI);
        
        assertEq(token.uri(TOKEN_ID_2), newURI);
    }
    
    // ============ Access Control & Security ============
    
    function testOnlyMinterCanMint() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, TOKEN_ID_1, 100, "");
    }
    
    function testGrantMinterRole() public {
        // Get role hash before pranking to avoid prank interference
        bytes32 minterRole = token.MINTER_ROLE();
        
        vm.prank(owner);
        token.grantRole(minterRole, minter);
        
        assertTrue(token.hasRole(minterRole, minter));
        
        // Verify minter can mint
        vm.prank(minter);
        token.mint(user1, TOKEN_ID_1, 100, "");
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 100);
    }
    
    function testPause() public {
        vm.prank(owner);
        token.pause();
        
        assertTrue(token.paused());
    }
    
    function testCannotTransferWhenPaused() public {
        vm.prank(owner);
        token.mint(user1, TOKEN_ID_1, 100, "");
        
        vm.prank(owner);
        token.pause();
        
        vm.prank(user1);
        vm.expectRevert();
        token.safeTransferFrom(user1, user2, TOKEN_ID_1, 50, "");
    }
    
    function testUpgrade() public {
        // Mint some tokens before upgrade
        vm.prank(owner);
        token.mint(user1, TOKEN_ID_1, 100, "");
        
        // Deploy new implementation
        ERC1155Master newImplementation = new ERC1155Master();
        
        // Upgrade
        vm.prank(owner);
        token.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state preserved
        assertEq(token.name(), NAME);
        assertEq(token.balanceOf(user1, TOKEN_ID_1), 100);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC1155Master newImplementation = new ERC1155Master();
        
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImplementation), "");
    }
    
    // ============ Max Supply Tests ============
    
    function testSetMaxSupply() public {
        uint256 maxSupplyValue = 1000;
        
        vm.prank(owner);
        token.setMaxSupply(TOKEN_ID_1, maxSupplyValue);
        
        assertEq(token.maxSupply(TOKEN_ID_1), maxSupplyValue);
    }
    
    function testCannotMintBeyondMaxSupply() public {
        uint256 maxSupplyValue = 100;
        
        vm.prank(owner);
        token.setMaxSupply(TOKEN_ID_1, maxSupplyValue);
        
        vm.prank(owner);
        vm.expectRevert();
        token.mint(user1, TOKEN_ID_1, maxSupplyValue + 1, "");
    }
    
    // ============ Module Management ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        token.setPolicyEngine(mockEngine);
        
        assertEq(token.policyEngine(), mockEngine);
    }
}
