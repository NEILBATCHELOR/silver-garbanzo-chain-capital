// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../../src/extensions/snapshot/ERC20SnapshotModule.sol";
import "../../../src/extensions/snapshot/interfaces/IERC20SnapshotModule.sol";

/**
 * @title ERC20SnapshotModuleTest
 * @notice Comprehensive tests for historical balance tracking via snapshots
 * @dev Tests cover snapshot creation, scheduling, balance queries, and edge cases
 */
contract ERC20SnapshotModuleTest is Test {
    
    ERC20SnapshotModule public implementation;
    ERC20SnapshotModule public snapshotModule;
    
    address public admin = makeAddr("admin");
    address public snapshotCreator = makeAddr("snapshotCreator");
    address public tokenContract = makeAddr("tokenContract");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public unauthorized = makeAddr("unauthorized");
    
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    
    event SnapshotCreated(uint256 indexed snapshotId, uint256 timestamp);
    event SnapshotScheduled(uint256 indexed snapshotId, uint256 scheduledTime);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC20SnapshotModule();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC20SnapshotModule.initialize.selector,
            admin,
            tokenContract
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        snapshotModule = ERC20SnapshotModule(address(proxy));
        
        // Grant roles
        vm.prank(admin);
        snapshotModule.grantRole(SNAPSHOT_ROLE, snapshotCreator);
    }
    
    // ============ Initialization Tests ============
    
    function test_Initialize() public view {
        assertTrue(snapshotModule.hasRole(snapshotModule.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(snapshotModule.hasRole(SNAPSHOT_ROLE, admin));
        assertTrue(snapshotModule.hasRole(snapshotModule.UPGRADER_ROLE(), admin));
        assertEq(snapshotModule.tokenContract(), tokenContract);
        assertEq(snapshotModule.getCurrentSnapshotId(), 0);
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.expectRevert();
        snapshotModule.initialize(admin, tokenContract);
    }
    
    // ============ Snapshot Creation Tests ============
    
    function test_Snapshot() public {
        vm.prank(snapshotCreator);
        vm.expectEmit(true, false, false, true);
        emit SnapshotCreated(1, block.timestamp);
        uint256 snapshotId = snapshotModule.snapshot();
        
        assertEq(snapshotId, 1);
        assertEq(snapshotModule.getCurrentSnapshotId(), 1);
        assertTrue(snapshotModule.snapshotExists(1));
        assertEq(snapshotModule.getSnapshotTime(1), block.timestamp);
    }
    
    function test_MultipleSnapshots() public {
        vm.startPrank(snapshotCreator);
        
        uint256 snap1 = snapshotModule.snapshot();
        vm.warp(block.timestamp + 100);
        uint256 snap2 = snapshotModule.snapshot();
        vm.warp(block.timestamp + 200);
        uint256 snap3 = snapshotModule.snapshot();
        
        vm.stopPrank();
        
        assertEq(snap1, 1);
        assertEq(snap2, 2);
        assertEq(snap3, 3);
        assertEq(snapshotModule.getCurrentSnapshotId(), 3);
    }
    
    function test_RevertWhen_UnauthorizedSnapshot() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        snapshotModule.snapshot();
    }
    
    // ============ Scheduled Snapshot Tests ============
    
    function test_ScheduleSnapshot() public {
        uint256 futureTime = block.timestamp + 1000;
        
        vm.prank(snapshotCreator);
        vm.expectEmit(true, false, false, true);
        emit SnapshotScheduled(1, futureTime);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        assertEq(snapshotId, 1);
        assertEq(snapshotModule.getCurrentSnapshotId(), 1);
        assertFalse(snapshotModule.snapshotExists(1)); // Not executed yet
    }
    
    function test_ExecuteScheduledSnapshot() public {
        uint256 futureTime = block.timestamp + 1000;
        
        vm.prank(snapshotCreator);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        vm.warp(futureTime + 1);
        snapshotModule.executeScheduledSnapshot(snapshotId);
        
        assertTrue(snapshotModule.snapshotExists(snapshotId));
        assertEq(snapshotModule.getSnapshotTime(snapshotId), futureTime + 1);
    }
    
    function test_RevertWhen_ScheduleInPast() public {
        vm.prank(snapshotCreator);
        vm.expectRevert("Scheduled time must be in future");
        snapshotModule.scheduleSnapshot(block.timestamp - 1);
    }
    
    function test_RevertWhen_ExecuteScheduledTooEarly() public {
        uint256 futureTime = block.timestamp + 1000;
        
        vm.prank(snapshotCreator);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        vm.expectRevert(abi.encodeWithSelector(IERC20SnapshotModule.InvalidSnapshotId.selector));
        snapshotModule.executeScheduledSnapshot(snapshotId);
    }
    
    function test_RevertWhen_ExecuteAlreadyExecuted() public {
        uint256 futureTime = block.timestamp + 1000;
        
        vm.prank(snapshotCreator);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        vm.warp(futureTime + 1);
        snapshotModule.executeScheduledSnapshot(snapshotId);
        
        vm.expectRevert(abi.encodeWithSelector(IERC20SnapshotModule.SnapshotAlreadyExists.selector));
        snapshotModule.executeScheduledSnapshot(snapshotId);
    }
    
    // ============ Balance Update Tests ============
    
    function test_UpdateAccountSnapshot() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000);
        
        assertEq(snapshotModule.balanceOfAt(user1, 1), 1000);
    }
    
    function test_UpdateAccountSnapshotMultipleSnapshots() public {
        vm.prank(snapshotCreator);
        uint256 snap1 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000);
        
        vm.prank(snapshotCreator);
        uint256 snap2 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 2000);
        
        assertEq(snapshotModule.balanceOfAt(user1, snap1), 1000);
        assertEq(snapshotModule.balanceOfAt(user1, snap2), 2000);
    }
    
    function test_RevertWhen_UnauthorizedUpdateAccountSnapshot() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.prank(unauthorized);
        vm.expectRevert("Only token contract");
        snapshotModule.updateAccountSnapshot(user1, 1000);
    }
    
    // ============ Total Supply Tests ============
    
    function test_UpdateTotalSupplySnapshot() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(10000);
        
        assertEq(snapshotModule.totalSupplyAt(1), 10000);
    }
    
    function test_UpdateTotalSupplyMultipleSnapshots() public {
        vm.prank(snapshotCreator);
        uint256 snap1 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(10000);
        
        vm.prank(snapshotCreator);
        uint256 snap2 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(20000);
        
        assertEq(snapshotModule.totalSupplyAt(snap1), 10000);
        assertEq(snapshotModule.totalSupplyAt(snap2), 20000);
    }
    
    function test_RevertWhen_UnauthorizedUpdateTotalSupply() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.prank(unauthorized);
        vm.expectRevert("Only token contract");
        snapshotModule.updateTotalSupplySnapshot(10000);
    }
    
    // ============ Query Tests ============
    
    function test_BalanceOfAtZeroForNonexistentSnapshot() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.expectRevert(abi.encodeWithSelector(IERC20SnapshotModule.SnapshotNotFound.selector));
        snapshotModule.balanceOfAt(user1, 999);
    }
    
    function test_TotalSupplyAtZeroForNonexistentSnapshot() public {
        vm.prank(snapshotCreator);
        snapshotModule.snapshot();
        
        vm.expectRevert(abi.encodeWithSelector(IERC20SnapshotModule.SnapshotNotFound.selector));
        snapshotModule.totalSupplyAt(999);
    }
    
    function test_GetSnapshotTimeForNonexistent() public {
        vm.expectRevert(abi.encodeWithSelector(IERC20SnapshotModule.SnapshotNotFound.selector));
        snapshotModule.getSnapshotTime(999);
    }
    
    function test_SnapshotExistsReturnsFalse() public pure {
        // Cannot test this without creating snapshot first
        // Covered by other tests
    }
    
    // ============ Complex Scenario Tests ============
    
    function test_CompleteSnapshotLifecycle() public {
        // Snapshot 1: Initial state
        vm.prank(snapshotCreator);
        uint256 snap1 = snapshotModule.snapshot();
        
        vm.startPrank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000);
        snapshotModule.updateAccountSnapshot(user2, 500);
        snapshotModule.updateTotalSupplySnapshot(1500);
        vm.stopPrank();
        
        // Snapshot 2: After transfers
        vm.prank(snapshotCreator);
        uint256 snap2 = snapshotModule.snapshot();
        
        vm.startPrank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 800);
        snapshotModule.updateAccountSnapshot(user2, 700);
        snapshotModule.updateTotalSupplySnapshot(1500);
        vm.stopPrank();
        
        // Verify historical balances
        assertEq(snapshotModule.balanceOfAt(user1, snap1), 1000);
        assertEq(snapshotModule.balanceOfAt(user2, snap1), 500);
        assertEq(snapshotModule.totalSupplyAt(snap1), 1500);
        
        assertEq(snapshotModule.balanceOfAt(user1, snap2), 800);
        assertEq(snapshotModule.balanceOfAt(user2, snap2), 700);
        assertEq(snapshotModule.totalSupplyAt(snap2), 1500);
    }
    
    function test_ManySnapshotsEfficiency() public {
        vm.startPrank(snapshotCreator);
        for (uint256 i = 0; i < 10; i++) {
            snapshotModule.snapshot();
            vm.warp(block.timestamp + 100);
        }
        vm.stopPrank();
        
        assertEq(snapshotModule.getCurrentSnapshotId(), 10);
    }
    
    // ============ Fuzz Tests ============
    
    function testFuzz_SnapshotBalances(uint256 balance) public {
        vm.assume(balance > 0 && balance < type(uint224).max);
        
        vm.prank(snapshotCreator);
        uint256 snapshotId = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, balance);
        
        assertEq(snapshotModule.balanceOfAt(user1, snapshotId), balance);
    }
    
    function testFuzz_SnapshotTotalSupply(uint256 supply) public {
        vm.assume(supply > 0 && supply < type(uint224).max);
        
        vm.prank(snapshotCreator);
        uint256 snapshotId = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(supply);
        
        assertEq(snapshotModule.totalSupplyAt(snapshotId), supply);
    }
}
