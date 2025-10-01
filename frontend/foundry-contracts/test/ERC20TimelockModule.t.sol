// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/timelock/ERC20TimelockModule.sol";
import "../src/extensions/timelock/interfaces/IERC20TimelockModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC20TimelockModuleTest is Test {
    ERC20TimelockModule public timelockModule;
    ERC20TimelockModule public timelockImplementation;
    
    address admin = address(1);
    address tokenContract = address(2);
    address user1 = address(3);
    address user2 = address(4);
    
    function setUp() public {
        // Deploy implementation
        timelockImplementation = new ERC20TimelockModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC20TimelockModule.initialize.selector,
            admin,
            tokenContract
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(timelockImplementation),
            initData
        );
        
        timelockModule = ERC20TimelockModule(address(proxy));
    }
    
    // ============ Initialization Tests ============
    
    function testInitialization() public view {
        assertEq(timelockModule.tokenContract(), tokenContract);
        assertEq(timelockModule.getLockedBalance(user1), 0);
    }
    
    // ============ Lock Creation Tests ============
    
    function testCreateLock() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(
            1000 ether,
            7 days,
            "Vesting period"
        );
        
        assertEq(lockId, 0); // First lock ID
        assertEq(timelockModule.getLockedBalance(user1), 1000 ether);
        
        IERC20TimelockModule.Lock memory lock = timelockModule.getLock(user1, lockId);
        assertEq(lock.amount, 1000 ether);
        assertEq(lock.unlockTime, block.timestamp + 7 days);
        assertEq(lock.reason, "Vesting period");
        assertTrue(lock.active);
    }
    
    function testCreateMultipleLocks() public {
        vm.startPrank(user1);
        
        uint256 lock1 = timelockModule.createLock(500 ether, 7 days, "Lock 1");
        uint256 lock2 = timelockModule.createLock(300 ether, 14 days, "Lock 2");
        uint256 lock3 = timelockModule.createLock(200 ether, 30 days, "Lock 3");
        
        vm.stopPrank();
        
        assertEq(lock1, 0);
        assertEq(lock2, 1);
        assertEq(lock3, 2);
        assertEq(timelockModule.getLockedBalance(user1), 1000 ether);
    }
    
    function testCannotCreateLockWithZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert(IERC20TimelockModule.InsufficientBalance.selector);
        timelockModule.createLock(0, 7 days, "Test");
    }
    
    function testCannotCreateLockWithZeroDuration() public {
        vm.prank(user1);
        vm.expectRevert(IERC20TimelockModule.InvalidUnlockTime.selector);
        timelockModule.createLock(1000 ether, 0, "Test");
    }
    
    // ============ Unlock Tests ============
    
    function testUnlockAfterExpiry() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        // Fast forward time
        vm.warp(block.timestamp + 7 days + 1);
        
        vm.prank(user1);
        timelockModule.unlock(lockId);
        
        assertEq(timelockModule.getLockedBalance(user1), 0);
        
        IERC20TimelockModule.Lock memory lock = timelockModule.getLock(user1, lockId);
        assertFalse(lock.active);
    }
    
    function testCannotUnlockBeforeExpiry() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        // Try to unlock immediately
        vm.prank(user1);
        vm.expectRevert(IERC20TimelockModule.LockStillActive.selector);
        timelockModule.unlock(lockId);
    }
    
    function testCannotUnlockInactiveLock() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        // Unlock once
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(user1);
        timelockModule.unlock(lockId);
        
        // Try to unlock again
        vm.prank(user1);
        vm.expectRevert(IERC20TimelockModule.LockNotActive.selector);
        timelockModule.unlock(lockId);
    }
    
    // ============ Unlock Expired Tests ============
    
    function testUnlockExpired() public {
        vm.startPrank(user1);
        timelockModule.createLock(500 ether, 1 days, "Lock 1");
        timelockModule.createLock(300 ether, 2 days, "Lock 2");
        timelockModule.createLock(200 ether, 3 days, "Lock 3");
        vm.stopPrank();
        
        // Fast forward past first two locks
        vm.warp(block.timestamp + 2 days + 1);
        
        vm.prank(user1);
        uint256 unlocked = timelockModule.unlockExpired();
        
        // Should unlock first two locks (500 + 300)
        assertEq(unlocked, 800 ether);
        assertEq(timelockModule.getLockedBalance(user1), 200 ether);
    }
    
    // ============ Extend Lock Tests ============
    
    function testExtendLock() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        IERC20TimelockModule.Lock memory lockBefore = timelockModule.getLock(user1, lockId);
        uint256 originalUnlockTime = lockBefore.unlockTime;
        
        vm.prank(user1);
        timelockModule.extendLock(lockId, 7 days);
        
        IERC20TimelockModule.Lock memory lockAfter = timelockModule.getLock(user1, lockId);
        assertEq(lockAfter.unlockTime, originalUnlockTime + 7 days);
    }
    
    function testCannotExtendInactiveLock() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        // Unlock
        vm.warp(block.timestamp + 7 days + 1);
        vm.prank(user1);
        timelockModule.unlock(lockId);
        
        // Try to extend inactive lock
        vm.prank(user1);
        vm.expectRevert(IERC20TimelockModule.LockNotActive.selector);
        timelockModule.extendLock(lockId, 7 days);
    }
    
    // ============ Cancel Lock Tests ============
    
    function testCancelLockByAdmin() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        vm.prank(admin);
        timelockModule.cancelLock(user1, lockId);
        
        assertEq(timelockModule.getLockedBalance(user1), 0);
        
        IERC20TimelockModule.Lock memory lock = timelockModule.getLock(user1, lockId);
        assertFalse(lock.active);
    }
    
    function testCannotCancelLockWithoutRole() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        vm.prank(user2);
        vm.expectRevert();
        timelockModule.cancelLock(user1, lockId);
    }
    
    // ============ Query Tests ============
    
    function testGetAllLocks() public {
        vm.startPrank(user1);
        timelockModule.createLock(500 ether, 7 days, "Lock 1");
        timelockModule.createLock(300 ether, 14 days, "Lock 2");
        timelockModule.createLock(200 ether, 30 days, "Lock 3");
        vm.stopPrank();
        
        IERC20TimelockModule.Lock[] memory locks = timelockModule.getAllLocks(user1);
        assertEq(locks.length, 3);
        assertEq(locks[0].amount, 500 ether);
        assertEq(locks[1].amount, 300 ether);
        assertEq(locks[2].amount, 200 ether);
    }
    
    function testGetActiveLocks() public {
        vm.startPrank(user1);
        uint256 lock1 = timelockModule.createLock(500 ether, 1 days, "Lock 1");
        timelockModule.createLock(300 ether, 14 days, "Lock 2");
        timelockModule.createLock(200 ether, 30 days, "Lock 3");
        vm.stopPrank();
        
        // Unlock first lock
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(user1);
        timelockModule.unlock(lock1);
        
        IERC20TimelockModule.Lock[] memory activeLocks = timelockModule.getActiveLocks(user1);
        assertEq(activeLocks.length, 2);
    }
    
    function testIsLockExpired() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        assertFalse(timelockModule.isLockExpired(user1, lockId));
        
        vm.warp(block.timestamp + 7 days + 1);
        assertTrue(timelockModule.isLockExpired(user1, lockId));
    }
    
    function testGetTimeUntilUnlock() public {
        vm.prank(user1);
        uint256 lockId = timelockModule.createLock(1000 ether, 7 days, "Test");
        
        uint256 timeRemaining = timelockModule.getTimeUntilUnlock(user1, lockId);
        assertEq(timeRemaining, 7 days);
        
        vm.warp(block.timestamp + 3 days);
        timeRemaining = timelockModule.getTimeUntilUnlock(user1, lockId);
        assertEq(timeRemaining, 4 days);
    }
    
    // ============ Gas Benchmarks ============
    
    function testGasCreateLock() public {
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        timelockModule.createLock(1000 ether, 7 days, "Test");
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for createLock:", gasUsed);
        assertLt(gasUsed, 150000);
    }
    
    function testGasUnlockExpired() public {
        // Create 5 locks
        vm.startPrank(user1);
        for (uint i = 0; i < 5; i++) {
            timelockModule.createLock(100 ether, 1 days, "Test");
        }
        vm.stopPrank();
        
        vm.warp(block.timestamp + 1 days + 1);
        
        vm.prank(user1);
        uint256 gasBefore = gasleft();
        timelockModule.unlockExpired();
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for unlockExpired (5 locks):", gasUsed);
    }
}
