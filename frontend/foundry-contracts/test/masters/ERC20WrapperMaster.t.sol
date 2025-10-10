// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../../src/masters/ERC20WrapperMaster.sol";

// Mock underlying ERC20 token for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1_000_000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ERC20WrapperMasterTest is Test {
    ERC20WrapperMaster public implementation;
    ERC20WrapperMaster public wrapper;
    MockERC20 public underlying;
    
    address public owner = address(1);
    address public pauser = address(2);
    address public upgrader = address(3);
    address public user1 = address(4);
    address public user2 = address(5);
    
    // Test parameters
    string constant WRAPPER_NAME = "Wrapped Mock Token";
    string constant WRAPPER_SYMBOL = "wMOCK";
    uint256 constant DEPOSIT_AMOUNT = 1000 * 10**18;
    
    // Events
    event TokensWrapped(address indexed account, uint256 amount);
    event TokensUnwrapped(address indexed account, uint256 amount);
    event PolicyEngineUpdated(address indexed oldEngine, address indexed newEngine);
    
    function setUp() public {
        // Deploy underlying token
        underlying = new MockERC20();
        
        // Deploy wrapper implementation
        implementation = new ERC20WrapperMaster();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC20WrapperMaster.initialize.selector,
            address(underlying),
            WRAPPER_NAME,
            WRAPPER_SYMBOL,
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        wrapper = ERC20WrapperMaster(address(proxy));
        
        // Distribute underlying tokens
        underlying.transfer(user1, 10_000 * 10**18);
        underlying.transfer(user2, 10_000 * 10**18);
    }
    
    // ============ Initialization & Setup Tests ============
    
    function testInitialize() public view {
        assertEq(wrapper.name(), WRAPPER_NAME);
        assertEq(wrapper.symbol(), WRAPPER_SYMBOL);
        assertEq(address(wrapper.underlying()), address(underlying));
    }
    
    function testInitializeRoles() public view {
        assertTrue(wrapper.hasRole(wrapper.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(wrapper.hasRole(wrapper.PAUSER_ROLE(), owner));
        assertTrue(wrapper.hasRole(wrapper.UPGRADER_ROLE(), owner));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        wrapper.initialize(address(underlying), WRAPPER_NAME, WRAPPER_SYMBOL, owner);
    }
    
    function testCannotInitializeWithZeroAddress() public {
        ERC20WrapperMaster newImpl = new ERC20WrapperMaster();
        
        bytes memory initData = abi.encodeWithSelector(
            ERC20WrapperMaster.initialize.selector,
            address(0),
            WRAPPER_NAME,
            WRAPPER_SYMBOL,
            owner
        );
        
        vm.expectRevert();
        new ERC1967Proxy(address(newImpl), initData);
    }
    
    // ============ Wrapping (Deposit) Tests ============
    
    function testDepositFor() public {
        vm.startPrank(user1);
        
        // Approve wrapper to spend underlying
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        
        // Deposit (wrap)
        vm.expectEmit(true, false, false, true);
        emit TokensWrapped(user1, DEPOSIT_AMOUNT);
        
        bool success = wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.balanceOf(user1), DEPOSIT_AMOUNT);
        assertEq(underlying.balanceOf(address(wrapper)), DEPOSIT_AMOUNT);
    }
    
    function testDepositForOtherUser() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        
        // User1 deposits for user2
        bool success = wrapper.depositFor(user2, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.balanceOf(user2), DEPOSIT_AMOUNT);
        assertEq(wrapper.balanceOf(user1), 0);
    }
    
    function testMultipleDeposits() public {
        uint256 amount1 = 1000 * 10**18;
        uint256 amount2 = 500 * 10**18;
        
        vm.startPrank(user1);
        underlying.approve(address(wrapper), amount1 + amount2);
        
        wrapper.depositFor(user1, amount1);
        wrapper.depositFor(user1, amount2);
        
        vm.stopPrank();
        
        assertEq(wrapper.balanceOf(user1), amount1 + amount2);
    }
    
    function testDepositRequiresApproval() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
    }
    
    // ============ Unwrapping (Withdraw) Tests ============
    
    function testWithdrawTo() public {
        // First wrap tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        // Then unwrap
        vm.expectEmit(true, false, false, true);
        emit TokensUnwrapped(user1, DEPOSIT_AMOUNT);
        
        bool success = wrapper.withdrawTo(user1, DEPOSIT_AMOUNT);
        
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.balanceOf(user1), 0);
        assertEq(underlying.balanceOf(user1), 10_000 * 10**18); // Original balance restored
    }
    
    function testWithdrawToOtherUser() public {
        // User1 wraps tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        // User1 unwraps to user2
        bool success = wrapper.withdrawTo(user2, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.balanceOf(user1), 0);
        assertEq(underlying.balanceOf(user2), 10_000 * 10**18 + DEPOSIT_AMOUNT);
    }
    
    function testPartialWithdraw() public {
        uint256 halfAmount = DEPOSIT_AMOUNT / 2;
        
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        wrapper.withdrawTo(user1, halfAmount);
        vm.stopPrank();
        
        assertEq(wrapper.balanceOf(user1), halfAmount);
    }
    
    function testCannotWithdrawMoreThanBalance() public {
        uint256 excessAmount = DEPOSIT_AMOUNT + 1;
        
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        vm.expectRevert();
        wrapper.withdrawTo(user1, excessAmount);
        vm.stopPrank();
    }
    
    // ============ Transfer Tests ============
    
    function testTransferWrappedTokens() public {
        uint256 transferAmount = 500 * 10**18;
        
        // User1 wraps tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        // User1 transfers wrapped tokens to user2
        wrapper.transfer(user2, transferAmount);
        vm.stopPrank();
        
        assertEq(wrapper.balanceOf(user1), DEPOSIT_AMOUNT - transferAmount);
        assertEq(wrapper.balanceOf(user2), transferAmount);
    }
    
    function testTransferFromWrappedTokens() public {
        uint256 transferAmount = 500 * 10**18;
        
        // User1 wraps tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        
        // User1 approves user2
        wrapper.approve(user2, transferAmount);
        vm.stopPrank();
        
        // User2 transfers from user1
        vm.prank(user2);
        wrapper.transferFrom(user1, user2, transferAmount);
        
        assertEq(wrapper.balanceOf(user1), DEPOSIT_AMOUNT - transferAmount);
        assertEq(wrapper.balanceOf(user2), transferAmount);
    }
    
    // ============ Pausable Tests ============
    
    function testPause() public {
        vm.prank(owner);
        wrapper.pause();
        
        assertTrue(wrapper.paused());
    }
    
    function testUnpause() public {
        vm.startPrank(owner);
        wrapper.pause();
        wrapper.unpause();
        vm.stopPrank();
        
        assertFalse(wrapper.paused());
    }
    
    function testCannotDepositWhenPaused() public {
        vm.prank(owner);
        wrapper.pause();
        
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        
        vm.expectRevert();
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        vm.stopPrank();
    }
    
    function testCannotWithdrawWhenPaused() public {
        // First wrap tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        // Pause
        vm.prank(owner);
        wrapper.pause();
        
        // Try to unwrap
        vm.prank(user1);
        vm.expectRevert();
        wrapper.withdrawTo(user1, DEPOSIT_AMOUNT);
    }
    
    function testCannotTransferWhenPaused() public {
        // Wrap tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        // Pause
        vm.prank(owner);
        wrapper.pause();
        
        // Try to transfer
        vm.prank(user1);
        vm.expectRevert();
        wrapper.transfer(user2, DEPOSIT_AMOUNT);
    }
    
    function testOnlyPauserCanPause() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.pause();
    }
    
    // ============ Policy Engine Tests ============
    
    function testSetPolicyEngine() public {
        address mockEngine = address(0x1234);
        
        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit PolicyEngineUpdated(address(0), mockEngine);
        
        wrapper.setPolicyEngine(mockEngine);
        
        assertEq(wrapper.policyEngine(), mockEngine);
    }
    
    function testSetPolicyEngineToZero() public {
        address mockEngine = address(0x1234);
        
        vm.startPrank(owner);
        wrapper.setPolicyEngine(mockEngine);
        wrapper.setPolicyEngine(address(0));
        vm.stopPrank();
        
        assertEq(wrapper.policyEngine(), address(0));
    }
    
    function testOnlyAdminCanSetPolicyEngine() public {
        vm.prank(user1);
        vm.expectRevert();
        wrapper.setPolicyEngine(address(0x1234));
    }
    
    // ============ Upgradeability Tests ============
    
    function testUpgradeToNewImplementation() public {
        ERC20WrapperMaster newImplementation = new ERC20WrapperMaster();
        
        vm.prank(owner);
        wrapper.upgradeToAndCall(address(newImplementation), "");
        
        // State should be preserved
        assertEq(wrapper.name(), WRAPPER_NAME);
        assertEq(address(wrapper.underlying()), address(underlying));
    }
    
    function testOnlyUpgraderCanUpgrade() public {
        ERC20WrapperMaster newImplementation = new ERC20WrapperMaster();
        
        vm.prank(user1);
        vm.expectRevert();
        wrapper.upgradeToAndCall(address(newImplementation), "");
    }
    
    function testUpgradePreservesBalances() public {
        // Wrap tokens
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        uint256 balanceBefore = wrapper.balanceOf(user1);
        
        // Upgrade
        ERC20WrapperMaster newImplementation = new ERC20WrapperMaster();
        vm.prank(owner);
        wrapper.upgradeToAndCall(address(newImplementation), "");
        
        // Verify balance preserved
        assertEq(wrapper.balanceOf(user1), balanceBefore);
    }
    
    // ============ Access Control Tests ============
    
    function testGrantPauserRole() public {
        bytes32 pauserRole = wrapper.PAUSER_ROLE();
        
        vm.prank(owner);
        wrapper.grantRole(pauserRole, pauser);
        
        assertTrue(wrapper.hasRole(pauserRole, pauser));
        
        // Verify pauser can pause
        vm.prank(pauser);
        wrapper.pause();
        assertTrue(wrapper.paused());
    }
    
    function testRevokePauserRole() public {
        bytes32 pauserRole = wrapper.PAUSER_ROLE();
        
        vm.startPrank(owner);
        wrapper.grantRole(pauserRole, pauser);
        wrapper.revokeRole(pauserRole, pauser);
        vm.stopPrank();
        
        assertFalse(wrapper.hasRole(pauserRole, pauser));
        
        // Verify pauser cannot pause
        vm.prank(pauser);
        vm.expectRevert();
        wrapper.pause();
    }
    
    // ============ Edge Case Tests ============
    
    function testDepositZeroAmount() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        
        bool success = wrapper.depositFor(user1, 0);
        vm.stopPrank();
        
        assertTrue(success);
        assertEq(wrapper.balanceOf(user1), 0);
    }
    
    function testDecimalsMatchUnderlying() public view {
        assertEq(wrapper.decimals(), underlying.decimals());
    }
    
    function testWrappedBalanceTracksUnderlyingHoldings() public {
        vm.startPrank(user1);
        underlying.approve(address(wrapper), DEPOSIT_AMOUNT);
        wrapper.depositFor(user1, DEPOSIT_AMOUNT);
        vm.stopPrank();
        
        assertEq(underlying.balanceOf(address(wrapper)), wrapper.totalSupply());
    }
}
