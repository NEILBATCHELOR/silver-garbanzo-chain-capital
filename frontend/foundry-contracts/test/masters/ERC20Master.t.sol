// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/masters/ERC20Master.sol";

contract ERC20MasterTest is Test {
    ERC20Master public implementation;
    ERC20Master public token;
    
    address public owner = address(1);
    address public minter = address(2);
    address public pauser = address(3);
    address public upgrader = address(4);
    address public user1 = address(5);
    address public user2 = address(6);
    
    // Test parameters
    string constant NAME = "Test Token";
    string constant SYMBOL = "TEST";
    uint256 constant MAX_SUPPLY = 1_000_000 * 10**18;
    uint256 constant INITIAL_SUPPLY = 100_000 * 10**18;
    
    // Events
    event MaxSupplyUpdated(uint256 newMaxSupply);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC20Master();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            NAME,
            SYMBOL,
            MAX_SUPPLY,
            INITIAL_SUPPLY,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        token = ERC20Master(address(proxy));
    }
    
    // ============ Initialization & Setup Tests ============
    
    function testInitialize() public view {
        assertEq(token.name(), NAME);
        assertEq(token.symbol(), SYMBOL);
        assertEq(token.maxSupply(), MAX_SUPPLY);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        token.initialize(NAME, SYMBOL, MAX_SUPPLY, INITIAL_SUPPLY, owner);
    }
    
    function testInitializationParameters() public view {
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), owner));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), owner));
        assertTrue(token.hasRole(token.UPGRADER_ROLE(), owner));
    }
    
    function testInitialSupply() public view {
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
    }
    
    function testInitializeWithZeroSupply() public {
        // Deploy new token with zero initial supply
        ERC20Master newImpl = new ERC20Master();
        bytes memory initData = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Zero Token",
            "ZERO",
            MAX_SUPPLY,
            0,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(newImpl), initData);
        ERC20Master newToken = ERC20Master(address(proxy));
        
        assertEq(newToken.totalSupply(), 0);
        assertEq(newToken.balanceOf(owner), 0);
    }
    
    // ============ Core ERC20 Functions ============
    
    function testTransfer() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user1, amount);
        bool success = token.transfer(user1, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - amount);
    }
    
    function testTransferFrom() public {
        uint256 amount = 1000 * 10**18;
        
        // Owner approves user1
        vm.prank(owner);
        token.approve(user1, amount);
        
        // User1 transfers from owner to user2
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, user2, amount);
        bool success = token.transferFrom(owner, user2, amount);
        
        assertTrue(success);
        assertEq(token.balanceOf(user2), amount);
        assertEq(token.allowance(owner, user1), 0);
    }
    
    function testApprove() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Approval(owner, user1, amount);
        bool success = token.approve(user1, amount);
        
        assertTrue(success);
        assertEq(token.allowance(owner, user1), amount);
    }
    
    function testBalanceOf() public view {
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY);
        assertEq(token.balanceOf(user1), 0);
    }
    
    function testAllowance() public {
        uint256 amount = 1000 * 10**18;
        
        vm.prank(owner);
        token.approve(user1, amount);
        
        assertEq(token.allowance(owner, user1), amount);
    }
    
    // ============ Minting & Burning ============
    
    function testMint() public {
        uint256 mintAmount = 10_000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(address(0), user1, mintAmount);
        token.mint(user1, mintAmount);
        
        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + mintAmount);
    }
    
    function testMintToMultipleAddresses() public {
        uint256 mintAmount = 5_000 * 10**18;
        
        vm.startPrank(owner);
        token.mint(user1, mintAmount);
        token.mint(user2, mintAmount);
        vm.stopPrank();
        
        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.balanceOf(user2), mintAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY + (mintAmount * 2));
    }
    
    function testBurn() public {
        uint256 burnAmount = 1000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, address(0), burnAmount);
        token.burn(burnAmount);
        
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - burnAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY - burnAmount);
    }
    
    function testBurnFrom() public {
        uint256 burnAmount = 1000 * 10**18;
        
        // Owner approves user1 to burn
        vm.prank(owner);
        token.approve(user1, burnAmount);
        
        // User1 burns from owner
        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit Transfer(owner, address(0), burnAmount);
        token.burnFrom(owner, burnAmount);
        
        assertEq(token.balanceOf(owner), INITIAL_SUPPLY - burnAmount);
        assertEq(token.totalSupply(), INITIAL_SUPPLY - burnAmount);
        assertEq(token.allowance(owner, user1), 0);
    }
    
    function testOnlyMinterCanMint() public {
        uint256 mintAmount = 1000 * 10**18;
        
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, mintAmount);
    }
    
    function testCannotMintBeyondMaxSupply() public {
        uint256 excessAmount = MAX_SUPPLY - INITIAL_SUPPLY + 1;
        
        vm.prank(owner);
        vm.expectRevert(ERC20Master.MaxSupplyExceeded.selector);
        token.mint(user1, excessAmount);
    }
    
    // ============ Access Control ============
    
    function testGrantMinterRole() public {
        // Get role hash before pranking to avoid prank interference
        bytes32 minterRole = token.MINTER_ROLE();
        
        vm.prank(owner);
        token.grantRole(minterRole, minter);
        
        assertTrue(token.hasRole(minterRole, minter));
        
        // Verify minter can mint
        vm.prank(minter);
        token.mint(user1, 1000 * 10**18);
        assertEq(token.balanceOf(user1), 1000 * 10**18);
    }
    
    function testRevokeMinterRole() public {
        // Get role hash before pranking to avoid prank interference
        bytes32 minterRole = token.MINTER_ROLE();
        
        vm.startPrank(owner);
        token.grantRole(minterRole, minter);
        token.revokeRole(minterRole, minter);
        vm.stopPrank();
        
        assertFalse(token.hasRole(minterRole, minter));
        
        // Verify minter cannot mint after revocation
        vm.prank(minter);
        vm.expectRevert();
        token.mint(user1, 1000 * 10**18);
    }
    
    function testOnlyAdminCanGrantRoles() public {
        // Get role hash before pranking to avoid prank interference
        bytes32 minterRole = token.MINTER_ROLE();
        
        vm.prank(user1);
        vm.expectRevert();
        token.grantRole(minterRole, minter);
    }
    
    function testRoleHierarchy() public view {
        // Owner should have all roles
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), owner));
        assertTrue(token.hasRole(token.PAUSER_ROLE(), owner));
        assertTrue(token.hasRole(token.UPGRADER_ROLE(), owner));
    }
    
    // ============ Pausability ============
    
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
        token.pause();
        
        vm.prank(owner);
        vm.expectRevert();
        token.transfer(user1, 1000 * 10**18);
    }
    
    function testOnlyPauserCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        token.pause();
    }
    
    function testCannotMintWhenPaused() public {
        vm.startPrank(owner);
        token.pause();
        
        vm.expectRevert();
        token.mint(user1, 1000 * 10**18);
        vm.stopPrank();
    }
    
    // ============ Upgradeability ============
    
    function testUpgradeToNewImplementation() public {
        // Deploy new implementation
        ERC20Master newImplementation = new ERC20Master();
        
        vm.prank(owner);
        token.upgradeToAndCall(address(newImplementation), "");
        
        // Verify state is preserved
        assertEq(token.name(), NAME);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC20Master newImplementation = new ERC20Master();
        
        vm.prank(user1);
        vm.expectRevert();
        token.upgradeToAndCall(address(newImplementation), "");
    }
    
    function testUpgradePreservesState() public {
        // Transfer some tokens before upgrade
        vm.prank(owner);
        token.transfer(user1, 1000 * 10**18);
        
        uint256 balanceBefore = token.balanceOf(user1);
        
        // Upgrade
        ERC20Master newImplementation = new ERC20Master();
        vm.prank(owner);
        token.upgradeToAndCall(address(newImplementation), "");
        
        // Verify balances preserved
        assertEq(token.balanceOf(user1), balanceBefore);
    }
    
    // ============ Max Supply Management ============
    
    function testUpdateMaxSupply() public {
        uint256 newMaxSupply = 2_000_000 * 10**18;
        
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MaxSupplyUpdated(newMaxSupply);
        token.updateMaxSupply(newMaxSupply);
        
        assertEq(token.maxSupply(), newMaxSupply);
    }
    
    function testCannotUpdateMaxSupplyBelowTotalSupply() public {
        uint256 newMaxSupply = INITIAL_SUPPLY - 1;
        
        vm.prank(owner);
        vm.expectRevert(ERC20Master.InvalidMaxSupply.selector);
        token.updateMaxSupply(newMaxSupply);
    }
    
    function testOnlyAdminCanUpdateMaxSupply() public {
        vm.prank(user1);
        vm.expectRevert();
        token.updateMaxSupply(2_000_000 * 10**18);
    }
    
    // ============ Module Management ============
    
    function testSetComplianceModule() public {
        address mockModule = address(0x1234);
        
        vm.prank(owner);
        token.setComplianceModule(mockModule);
        
        assertEq(token.complianceModule(), mockModule);
    }
    
    function testSetVestingModule() public {
        address mockModule = address(0x1235);
        
        vm.prank(owner);
        token.setVestingModule(mockModule);
        
        assertEq(token.vestingModule(), mockModule);
    }
    
    function testSetFeesModule() public {
        address mockModule = address(0x1236);
        
        vm.prank(owner);
        token.setFeesModule(mockModule);
        
        assertEq(token.feesModule(), mockModule);
    }
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1237);
        
        vm.prank(owner);
        token.setPolicyEngine(mockEngine);
        
        assertEq(token.policyEngine(), mockEngine);
    }
}
