// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/snapshot/ERC20SnapshotModule.sol";
import "../src/extensions/snapshot/interfaces/IERC20SnapshotModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC20SnapshotModuleTest is Test {
    ERC20SnapshotModule public snapshotModule;
    ERC20SnapshotModule public snapshotImplementation;
    
    address admin = address(1);
    address tokenContract = address(2);
    address user1 = address(3);
    address user2 = address(4);
    
    function setUp() public {
        // Deploy implementation
        snapshotImplementation = new ERC20SnapshotModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC20SnapshotModule.initialize.selector,
            admin,
            tokenContract
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(snapshotImplementation),
            initData
        );
        
        snapshotModule = ERC20SnapshotModule(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(snapshotModule.tokenContract(), tokenContract);
        assertEq(snapshotModule.getCurrentSnapshotId(), 0);
    }
    
    // ============ Snapshot Creation Tests ============
    
    function testCreateSnapshot() public {
        vm.prank(admin);
        uint256 snapshotId = snapshotModule.snapshot();
        
        assertEq(snapshotId, 1);
        assertTrue(snapshotModule.snapshotExists(snapshotId));
        assertEq(snapshotModule.getSnapshotTime(snapshotId), block.timestamp);
    }
    
    function testCreateMultipleSnapshots() public {
        vm.startPrank(admin);
        
        uint256 snap1 = snapshotModule.snapshot();
        vm.warp(block.timestamp + 1 days);
        uint256 snap2 = snapshotModule.snapshot();
        vm.warp(block.timestamp + 1 days);
        uint256 snap3 = snapshotModule.snapshot();
        
        vm.stopPrank();
        
        assertEq(snap1, 1);
        assertEq(snap2, 2);
        assertEq(snap3, 3);
        assertEq(snapshotModule.getCurrentSnapshotId(), 3);
    }
    
    function testCannotCreateSnapshotWithoutRole() public {
        vm.prank(user1);
        vm.expectRevert();
        snapshotModule.snapshot();
    }
    
    // ============ Scheduled Snapshot Tests ============
    
    function testScheduleSnapshot() public {
        uint256 futureTime = block.timestamp + 7 days;
        
        vm.prank(admin);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        assertEq(snapshotId, 1);
        assertFalse(snapshotModule.snapshotExists(snapshotId));
    }
    
    function testExecuteScheduledSnapshot() public {
        uint256 futureTime = block.timestamp + 7 days;
        
        vm.prank(admin);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        // Fast forward time
        vm.warp(futureTime + 1);
        
        snapshotModule.executeScheduledSnapshot(snapshotId);
        
        assertTrue(snapshotModule.snapshotExists(snapshotId));
        assertEq(snapshotModule.getSnapshotTime(snapshotId), futureTime + 1);
    }
    
    function testCannotExecuteScheduledSnapshotEarly() public {
        uint256 futureTime = block.timestamp + 7 days;
        
        vm.prank(admin);
        uint256 snapshotId = snapshotModule.scheduleSnapshot(futureTime);
        
        // Try to execute before scheduled time
        vm.expectRevert(IERC20SnapshotModule.InvalidSnapshotId.selector);
        snapshotModule.executeScheduledSnapshot(snapshotId);
    }
    
    function testCannotScheduleSnapshotInPast() public {
        uint256 pastTime = block.timestamp - 1 days;
        
        vm.prank(admin);
        vm.expectRevert(IERC20SnapshotModule.InvalidSnapshotId.selector);
        snapshotModule.scheduleSnapshot(pastTime);
    }
    
    // ============ Balance Tracking Tests ============
    
    function testUpdateAccountSnapshot() public {
        // Create first snapshot
        vm.prank(admin);
        uint256 snap1 = snapshotModule.snapshot();
        
        // Update user balance
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000 ether);
        
        // Create second snapshot
        vm.prank(admin);
        uint256 snap2 = snapshotModule.snapshot();
        
        // Update user balance again
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 2000 ether);
        
        // Check balances at different snapshots
        assertEq(snapshotModule.balanceOfAt(user1, snap1), 0);
        assertEq(snapshotModule.balanceOfAt(user1, snap2), 1000 ether);
    }
    
    function testBalanceAtMultipleSnapshots() public {
        vm.startPrank(admin);
        uint256 snap1 = snapshotModule.snapshot();
        vm.stopPrank();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000 ether);
        
        vm.startPrank(admin);
        uint256 snap2 = snapshotModule.snapshot();
        vm.stopPrank();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1500 ether);
        
        vm.startPrank(admin);
        uint256 snap3 = snapshotModule.snapshot();
        vm.stopPrank();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 500 ether);
        
        assertEq(snapshotModule.balanceOfAt(user1, snap1), 0);
        assertEq(snapshotModule.balanceOfAt(user1, snap2), 1000 ether);
        assertEq(snapshotModule.balanceOfAt(user1, snap3), 1500 ether);
    }
    
    function testOnlyTokenContractCanUpdate() public {
        vm.prank(user1);
        vm.expectRevert();
        snapshotModule.updateAccountSnapshot(user2, 1000 ether);
    }
    
    // ============ Total Supply Tracking Tests ============
    
    function testUpdateTotalSupplySnapshot() public {
        vm.prank(admin);
        uint256 snap1 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(1000000 ether);
        
        vm.prank(admin);
        uint256 snap2 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateTotalSupplySnapshot(2000000 ether);
        
        assertEq(snapshotModule.totalSupplyAt(snap1), 0);
        assertEq(snapshotModule.totalSupplyAt(snap2), 1000000 ether);
    }
    
    // ============ Query Tests ============
    
    function testGetCurrentSnapshotId() public {
        assertEq(snapshotModule.getCurrentSnapshotId(), 0);
        
        vm.startPrank(admin);
        snapshotModule.snapshot();
        assertEq(snapshotModule.getCurrentSnapshotId(), 1);
        
        snapshotModule.snapshot();
        assertEq(snapshotModule.getCurrentSnapshotId(), 2);
        vm.stopPrank();
    }
    
    function testSnapshotExists() public {
        assertFalse(snapshotModule.snapshotExists(1));
        
        vm.prank(admin);
        snapshotModule.snapshot();
        
        assertTrue(snapshotModule.snapshotExists(1));
        assertFalse(snapshotModule.snapshotExists(2));
    }
    
    function testGetSnapshotTime() public {
        uint256 timestamp = block.timestamp;
        
        vm.prank(admin);
        uint256 snapshotId = snapshotModule.snapshot();
        
        assertEq(snapshotModule.getSnapshotTime(snapshotId), timestamp);
    }
    
    function testCannotQueryNonExistentSnapshot() public {
        vm.expectRevert(IERC20SnapshotModule.SnapshotNotFound.selector);
        snapshotModule.balanceOfAt(user1, 999);
    }
    
    // ============ Complex Scenario Tests ============
    
    function testMultiUserMultiSnapshot() public {
        // Snapshot 1
        vm.prank(admin);
        uint256 snap1 = snapshotModule.snapshot();
        
        // Update balances
        vm.startPrank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000 ether);
        snapshotModule.updateAccountSnapshot(user2, 500 ether);
        vm.stopPrank();
        
        // Snapshot 2
        vm.prank(admin);
        uint256 snap2 = snapshotModule.snapshot();
        
        // Update balances again
        vm.startPrank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1500 ether);
        snapshotModule.updateAccountSnapshot(user2, 750 ether);
        vm.stopPrank();
        
        // Snapshot 3
        vm.prank(admin);
        uint256 snap3 = snapshotModule.snapshot();
        
        // Verify historical balances
        assertEq(snapshotModule.balanceOfAt(user1, snap1), 0);
        assertEq(snapshotModule.balanceOfAt(user1, snap2), 1000 ether);
        assertEq(snapshotModule.balanceOfAt(user1, snap3), 1500 ether);
        
        assertEq(snapshotModule.balanceOfAt(user2, snap1), 0);
        assertEq(snapshotModule.balanceOfAt(user2, snap2), 500 ether);
        assertEq(snapshotModule.balanceOfAt(user2, snap3), 750 ether);
    }
    
    // ============ Gas Benchmarks ============
    
    function testGasCreateSnapshot() public {
        vm.prank(admin);
        uint256 gasBefore = gasleft();
        snapshotModule.snapshot();
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for snapshot:", gasUsed);
        assertLt(gasUsed, 100000);
    }
    
    function testGasUpdateAccountSnapshot() public {
        vm.prank(admin);
        snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        uint256 gasBefore = gasleft();
        snapshotModule.updateAccountSnapshot(user1, 1000 ether);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for updateAccountSnapshot:", gasUsed);
        assertLt(gasUsed, 150000);
    }
    
    function testGasBalanceOfAt() public {
        vm.prank(admin);
        uint256 snap1 = snapshotModule.snapshot();
        
        vm.prank(tokenContract);
        snapshotModule.updateAccountSnapshot(user1, 1000 ether);
        
        vm.prank(admin);
        snapshotModule.snapshot();
        
        uint256 gasBefore = gasleft();
        snapshotModule.balanceOfAt(user1, snap1);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for balanceOfAt:", gasUsed);
        assertLt(gasUsed, 50000);
    }
}
