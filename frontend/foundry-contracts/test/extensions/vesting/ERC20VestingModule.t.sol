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
    string public constant CATEGORY = "employee";
    
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration
    );
    event TokensReleased(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount
    );
    event VestingRevoked(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 unvestedAmount
    );
    
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
        bytes32 scheduleId = module.createVestingSchedule(
            beneficiary, 
            VESTING_AMOUNT, 
            startTime, 
            cliffDuration, 
            VESTING_DURATION, 
            false,
            CATEGORY
        );
        
        IERC20VestingModule.VestingSchedule memory schedule = module.getVestingSchedule(scheduleId);
        
        assertEq(schedule.beneficiary, beneficiary, "Beneficiary should match");
        assertEq(schedule.totalAmount, VESTING_AMOUNT, "Vesting amount should match");
        assertEq(schedule.startTime, startTime, "Start time should match");
        assertEq(schedule.vestingDuration, VESTING_DURATION, "Duration should match");
        assertEq(schedule.cliffDuration, cliffDuration, "Cliff should match");
        assertEq(schedule.released, 0, "Released should be zero");
        assertFalse(schedule.revoked, "Should not be revoked");
    }
    
    function testClaimVestedTokensAfterCliff() public {
        uint256 startTime = block.timestamp;
        uint256 cliffDuration = 90 days;
        
        vm.prank(admin);
        bytes32 scheduleId = module.createVestingSchedule(
            beneficiary, 
            VESTING_AMOUNT, 
            startTime, 
            cliffDuration, 
            VESTING_DURATION, 
            false,
            CATEGORY
        );
        
        // Fast forward past cliff
        vm.warp(startTime + cliffDuration + 1 days);
        
        uint256 releasableAmount = module.getReleaseableAmount(scheduleId);
        assertTrue(releasableAmount > 0, "Should have releaseable tokens after cliff");
        
        vm.prank(beneficiary);
        uint256 released = module.release(scheduleId);
        
        assertTrue(released > 0, "Should have released tokens");
        assertEq(released, releasableAmount, "Released amount should match releaseable amount");
    }
    
    function testCannotClaimBeforeCliff() public {
        uint256 startTime = block.timestamp;
        uint256 cliffDuration = 90 days;
        
        vm.prank(admin);
        bytes32 scheduleId = module.createVestingSchedule(
            beneficiary, 
            VESTING_AMOUNT, 
            startTime, 
            cliffDuration, 
            VESTING_DURATION, 
            false,
            CATEGORY
        );
        
        // Check vested amount before cliff
        uint256 vestedAmount = module.getVestedAmount(scheduleId);
        assertEq(vestedAmount, 0, "Should have no vested tokens before cliff");
        
        uint256 releasableAmount = module.getReleaseableAmount(scheduleId);
        assertEq(releasableAmount, 0, "Should have no releaseable tokens before cliff");
    }
}
