// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/timelock/ERC20TimelockModule.sol";

contract ERC20TimelockModuleTest is Test {
    using Clones for address;
    
    ERC20TimelockModule public implementation;
    ERC20TimelockModule public module;
    
    address public admin = address(1);
    address public lockManager = address(2);
    address public tokenContract = address(0x999);
    address public user = address(3);
    
    bytes32 public constant LOCK_MANAGER_ROLE = keccak256("LOCK_MANAGER_ROLE");
    
    event TokensLocked(address indexed user, uint256 indexed lockId, uint256 amount, uint256 unlockTime, string reason);
    event TokensUnlocked(address indexed user, uint256 indexed lockId, uint256 amount);
    event LockExtended(address indexed user, uint256 indexed lockId, uint256 newUnlockTime);
    
    function setUp() public {
        implementation = new ERC20TimelockModule();
        
        address clone = address(implementation).clone();
        module = ERC20TimelockModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, tokenContract);
        
        vm.prank(admin);
        module.grantRole(LOCK_MANAGER_ROLE, lockManager);
    }
    
    function testInitialization() public view {
        assertEq(module.tokenContract(), tokenContract);
        assertTrue(module.hasRole(LOCK_MANAGER_ROLE, lockManager));
    }
    
    function testCreateLock() public {
        uint256 amount = 1000 ether;
        uint256 duration = 30 days;
        string memory reason = "Vesting";
        
        vm.expectEmit(true, true, false, true);
        emit TokensLocked(user, 0, amount, block.timestamp + duration, reason);
        
        vm.prank(user);
        uint256 lockId = module.createLock(amount, duration, reason);
        
        assertEq(lockId, 0);
        assertEq(module.getTotalLocked(user), amount);
        assertEq(module.getActiveLockCount(user), 1);
    }
    
    function testCreateMultipleLocks() public {
        vm.prank(user);
        uint256 lock1 = module.createLock(1000 ether, 30 days, "Lock 1");
        
        vm.prank(user);
        uint256 lock2 = module.createLock(500 ether, 60 days, "Lock 2");
        
        assertEq(lock1, 0);
        assertEq(lock2, 1);
        assertEq(module.getTotalLocked(user), 1500 ether);
        assertEq(module.getActiveLockCount(user), 2);
    }
    
    function testCreateLockRevertsForZeroAmount() public {
        vm.prank(user);
        vm.expectRevert();
        module.createLock(0, 30 days, "Test");
    }
    
    function testCreateLockRevertsForZeroDuration() public {
        vm.prank(user);
        vm.expectRevert();
        module.createLock(1000 ether, 0, "Test");
    }
    
    function testUnlockAfterExpiry() public {
        vm.prank(user);
        uint256 lockId = module.createLock(1000 ether, 30 days, "Test");
        
        // Fast forward past unlock time
        vm.warp(block.timestamp + 31 days);
        
        vm.expectEmit(true, true, false, true);
        emit TokensUnlocked(user, lockId, 1000 ether);
        
        vm.prank(user);
        module.unlock(lockId);
        
        assertEq(module.getTotalLocked(user), 0);
        assertEq(module.getActiveLockCount(user), 0);
    }
    
    function testUnlockRevertsBeforeExpiry() public {
        vm.prank(user);
        uint256 lockId = module.createLock(1000 ether, 30 days, "Test");
        
        // Try to unlock before expiry
        vm.warp(block.timestamp + 15 days);
        
        vm.prank(user);
        vm.expectRevert();
        module.unlock(lockId);
    }
    
    function testUnlockRevertsForInactiveLock() public {
        vm.prank(user);
        uint256 lockId = module.createLock(1000 ether, 30 days, "Test");
        
        vm.warp(block.timestamp + 31 days);
        
        vm.prank(user);
        module.unlock(lockId);
        
        // Try to unlock again
        vm.prank(user);
        vm.expectRevert();
        module.unlock(lockId);
    }
}
