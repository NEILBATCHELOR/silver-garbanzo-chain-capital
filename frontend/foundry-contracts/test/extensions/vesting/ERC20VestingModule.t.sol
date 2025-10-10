// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/vesting/ERC20VestingModule.sol";

contract ERC20VestingModuleTest is Test {
    using Clones for address;
    
    ERC20VestingModule public implementation;
    ERC20VestingModule public module;
    
    address public admin = address(1);
    address public beneficiary = address(2);
    address public tokenContract = address(3);
    
    uint256 public constant VESTING_AMOUNT = 1000 ether;
    uint256 public constant VESTING_DURATION = 365 days;
    
    event VestingScheduleCreated(
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 duration,
        uint256 cliffDuration
    );
    event TokensClaimed(address indexed beneficiary, uint256 amount);
    event VestingRevoked(address indexed beneficiary, uint256 unvestedAmount);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC20VestingModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC20VestingModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, tokenContract);
    }
    
    function testCreateVestingSchedule() public {
        uint256 startTime = block.timestamp;
        uint256 cliffDuration = 90 days;
        
        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit VestingScheduleCreated(beneficiary, VESTING_AMOUNT, startTime, VESTING_DURATION, cliffDuration);
        module.createVestingSchedule(beneficiary, VESTING_AMOUNT, startTime, VESTING_DURATION, cliffDuration, false);
        
        (uint256 amount, uint256 start, uint256 duration, uint256 cliff, uint256 claimed, bool revoked) = 
            module.vestingSchedules(beneficiary);
        
        assertEq(amount, VESTING_AMOUNT, "Vesting amount should match");
        assertEq(start, startTime, "Start time should match");
        assertEq(duration, VESTING_DURATION, "Duration should match");
        assertEq(cliff, cliffDuration, "Cliff should match");
        assertEq(claimed, 0, "Claimed should be zero");
        assertFalse(revoked, "Should not be revoked");
    }
    
    function testClaimVestedTokensAfterCliff() public {
        uint256 startTime = block.timestamp;
        uint256 cliffDuration = 90 days;
        
        vm.prank(admin);
        module.createVestingSchedule(beneficiary, VESTING_AMOUNT, startTime, VESTING_DURATION, cliffDuration, false);
        
        // Fast forward past cliff
        vm.warp(startTime + cliffDuration + 1 days);
        
        uint256 vestedAmount = module.getVestedAmount(beneficiary);
        assertTrue(vestedAmount > 0, "Should have vested tokens after cliff");
        
        vm.prank(beneficiary);
        vm.expectEmit(true, false, false, true);
        emit TokensClaimed(beneficiary, vestedAmount);
        module.claim();
        
        (,,,, uint256 claimed,) = module.vestingSchedules(beneficiary);
        assertEq(claimed, vestedAmount, "Claimed amount should match vested amount");
    }
    
    function testCannotClaimBeforeCliff() public {
        uint256 startTime = block.timestamp;
        uint256 cliffDuration = 90 days;
        
        vm.prank(admin);
        module.createVestingSchedule(beneficiary, VESTING_AMOUNT, startTime, VESTING_DURATION, cliffDuration, false);
        
        // Try to claim before cliff
        vm.prank(beneficiary);
        uint256 vestedAmount = module.getVestedAmount(beneficiary);
        assertEq(vestedAmount, 0, "Should have no vested tokens before cliff");
    }
}
