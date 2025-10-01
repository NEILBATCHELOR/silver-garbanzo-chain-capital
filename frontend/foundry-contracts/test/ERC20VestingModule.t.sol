// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/extensions/vesting/ERC20VestingModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract ERC20VestingModuleTest is Test {
    ERC20VestingModule public vesting;
    MockToken public token;
    
    address admin = address(1);
    address beneficiary1 = address(2);
    address beneficiary2 = address(3);
    
    uint256 constant YEAR = 365 days;
    uint256 constant MONTH = 30 days;
    uint256 constant START_TIME = 1; // Fixed start time to avoid Foundry vm.warp bug
    
    function setUp() public {
        // Deploy mock token
        vm.prank(admin);
        token = new MockToken();
        
        // Deploy vesting module
        ERC20VestingModule vestingImpl = new ERC20VestingModule();
        bytes memory initData = abi.encodeWithSelector(
            ERC20VestingModule.initialize.selector,
            admin,
            address(token)
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(vestingImpl), initData);
        vesting = ERC20VestingModule(address(proxy));
        
        // Approve vesting module to spend admin's tokens
        vm.prank(admin);
        token.approve(address(vesting), type(uint256).max);
    }
    
    function testCreateVestingSchedule() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18, // 100k tokens
            block.timestamp,
            YEAR,            // 1 year cliff
            3 * YEAR,        // 3 year vesting
            true,            // revocable
            "employee"
        );
        
        assertTrue(scheduleId != bytes32(0), "Schedule ID should be non-zero");
        
        bytes32[] memory schedules = vesting.getSchedulesForBeneficiary(beneficiary1);
        assertEq(schedules.length, 1, "Should have 1 schedule");
        assertEq(schedules[0], scheduleId, "Schedule ID should match");
        
        IERC20VestingModule.VestingSchedule memory schedule = 
            vesting.getVestingSchedule(scheduleId);
        
        assertEq(schedule.beneficiary, beneficiary1);
        assertEq(schedule.totalAmount, 100000 * 10**18);
        assertEq(schedule.cliffDuration, YEAR);
        assertEq(schedule.vestingDuration, 3 * YEAR);
        assertTrue(schedule.revocable);
        assertFalse(schedule.revoked);
        assertEq(schedule.category, "employee");
    }
    
    function testCliffPreventsEarlyRelease() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            YEAR,
            3 * YEAR,
            true,
            "employee"
        );
        
        // Try to release before cliff
        vm.warp(block.timestamp + 6 * MONTH);
        
        uint256 releasable = vesting.getReleaseableAmount(scheduleId);
        assertEq(releasable, 0, "Tokens should not be releasable before cliff");
        
        uint256 vested = vesting.getVestedAmount(scheduleId);
        assertEq(vested, 0, "Tokens should not be vested before cliff");
    }
    
    function testLinearVestingAfterCliff() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            120000 * 10**18, // 120k tokens for easy math
            START_TIME,      // Use constant start time
            YEAR,            // 1 year cliff
            3 * YEAR,        // 3 year vesting duration (TOTAL time from start)
            true,
            "employee"
        );
        
        // At cliff (1 year from start) - vesting starts
        // Vesting is 1/3 complete (1 year of 3 year duration)
        vm.warp(START_TIME + YEAR);
        uint256 vested = vesting.getVestedAmount(scheduleId);
        assertApproxEqRel(vested, 40000 * 10**18, 0.01e18, "Should be ~40k (1/3 of 120k)");
        
        // At 2 years from start (cliff + 1 year)
        // Vesting is 2/3 complete (2 years of 3 year duration)
        vm.warp(START_TIME + (2 * YEAR));
        vested = vesting.getVestedAmount(scheduleId);
        assertApproxEqRel(vested, 80000 * 10**18, 0.01e18, "Should be ~80k (2/3 of 120k)");
        
        // After full vesting (3 years from start)
        // Vesting is 3/3 complete (end of vesting duration)
        vm.warp(START_TIME + (3 * YEAR));
        vested = vesting.getVestedAmount(scheduleId);
        assertEq(vested, 120000 * 10**18, "All tokens should be vested");
    }
    
    function testReleaseTokens() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            0,           // no cliff
            YEAR,        // 1 year vesting
            true,
            "employee"
        );
        
        // Warp to halfway point
        vm.warp(block.timestamp + YEAR / 2);
        
        uint256 balanceBefore = token.balanceOf(beneficiary1);
        
        vm.prank(beneficiary1);
        uint256 released = vesting.release(scheduleId);
        
        // Should release ~50k tokens
        assertApproxEqRel(released, 50000 * 10**18, 0.01e18);
        assertEq(token.balanceOf(beneficiary1) - balanceBefore, released);
        
        // Check schedule updated
        IERC20VestingModule.VestingSchedule memory schedule = 
            vesting.getVestingSchedule(scheduleId);
        assertEq(schedule.released, released);
    }
    
    function testCannotReleaseTwiceImmediately() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            0,
            YEAR,
            true,
            "employee"
        );
        
        vm.warp(block.timestamp + YEAR / 2);
        
        // First release should work
        vm.prank(beneficiary1);
        vesting.release(scheduleId);
        
        // Immediate second release should fail (nothing new vested)
        vm.prank(beneficiary1);
        vm.expectRevert(IERC20VestingModule.NothingToRelease.selector);
        vesting.release(scheduleId);
    }
    
    function testMultipleReleasesOverTime() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            0,
            YEAR,
            true,
            "employee"
        );
        
        uint256 totalReleased = 0;
        
        // Release at 25%
        vm.warp(block.timestamp + YEAR / 4);
        vm.prank(beneficiary1);
        totalReleased += vesting.release(scheduleId);
        
        // Release at 50%
        vm.warp(block.timestamp + YEAR / 2);
        vm.prank(beneficiary1);
        totalReleased += vesting.release(scheduleId);
        
        // Release at 100%
        vm.warp(block.timestamp + YEAR);
        vm.prank(beneficiary1);
        totalReleased += vesting.release(scheduleId);
        
        // Should have released ~100k total
        assertApproxEqRel(totalReleased, 100000 * 10**18, 0.01e18);
        assertEq(token.balanceOf(beneficiary1), totalReleased);
    }
    
    function testBatchVestingSchedules() public {
        address[] memory beneficiaries = new address[](3);
        beneficiaries[0] = beneficiary1;
        beneficiaries[1] = beneficiary2;
        beneficiaries[2] = address(4);
        
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 50000 * 10**18;
        amounts[1] = 75000 * 10**18;
        amounts[2] = 100000 * 10**18;
        
        vm.prank(admin);
        bytes32[] memory scheduleIds = vesting.createVestingSchedules(
            beneficiaries,
            amounts,
            block.timestamp,
            YEAR,      // cliff
            3 * YEAR,  // vesting duration
            true,      // revocable
            "investors"
        );
        
        assertEq(scheduleIds.length, 3);
        
        // Verify each schedule
        for (uint256 i = 0; i < 3; i++) {
            IERC20VestingModule.VestingSchedule memory schedule = 
                vesting.getVestingSchedule(scheduleIds[i]);
            
            assertEq(schedule.beneficiary, beneficiaries[i]);
            assertEq(schedule.totalAmount, amounts[i]);
            assertEq(schedule.category, "investors");
        }
        
        // Verify beneficiary schedules
        bytes32[] memory b1Schedules = vesting.getSchedulesForBeneficiary(beneficiary1);
        assertEq(b1Schedules.length, 1);
    }
    
    function testRevokeVestingSchedule() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            YEAR,
            3 * YEAR,
            true, // revocable
            "employee"
        );
        
        uint256 startTime = block.timestamp;
        
        // Warp past cliff to vest some tokens
        vm.warp(startTime + YEAR + YEAR); // 2 years (66% of vesting)
        
        uint256 vestedBefore = vesting.getVestedAmount(scheduleId);
        assertTrue(vestedBefore > 0, "Should have vested tokens");
        
        uint256 adminBalanceBefore = token.balanceOf(admin);
        
        // Revoke schedule
        vm.prank(admin);
        vesting.revoke(scheduleId);
        
        // Check schedule is revoked
        IERC20VestingModule.VestingSchedule memory schedule = 
            vesting.getVestingSchedule(scheduleId);
        assertTrue(schedule.revoked);
        
        // Admin should receive unvested tokens back
        uint256 adminBalanceAfter = token.balanceOf(admin);
        assertTrue(adminBalanceAfter > adminBalanceBefore, "Admin should receive unvested tokens");
        
        // Cannot release from revoked schedule
        vm.prank(beneficiary1);
        vm.expectRevert(IERC20VestingModule.AlreadyRevoked.selector);
        vesting.release(scheduleId);
    }
    
    function testCannotRevokeNonRevocable() public {
        vm.prank(admin);
        bytes32 scheduleId = vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            0,
            YEAR,
            false, // NOT revocable
            "employee"
        );
        
        vm.prank(admin);
        vm.expectRevert(IERC20VestingModule.NotRevocable.selector);
        vesting.revoke(scheduleId);
    }
    
    function testGetLockedAmount() public {
        // Create multiple schedules for same beneficiary
        vm.startPrank(admin);
        
        vesting.createVestingSchedule(
            beneficiary1, 50000 * 10**18, block.timestamp, 0, YEAR, true, "employee"
        );
        
        vesting.createVestingSchedule(
            beneficiary1, 30000 * 10**18, block.timestamp, 0, YEAR, true, "bonus"
        );
        
        vm.stopPrank();
        
        // Check locked amount (all locked initially)
        uint256 locked = vesting.getLockedAmount(beneficiary1);
        assertEq(locked, 80000 * 10**18);
        
        // After 50% vesting
        vm.warp(block.timestamp + YEAR / 2);
        locked = vesting.getLockedAmount(beneficiary1);
        assertApproxEqRel(locked, 40000 * 10**18, 0.01e18); // ~50% still locked
        
        // After full vesting
        vm.warp(block.timestamp + YEAR);
        locked = vesting.getLockedAmount(beneficiary1);
        assertEq(locked, 0, "Nothing should be locked after full vesting");
    }
    
    function testTotalStatistics() public {
        vm.startPrank(admin);
        
        vesting.createVestingSchedule(
            beneficiary1, 50000 * 10**18, block.timestamp, 0, YEAR, true, "employee"
        );
        
        vesting.createVestingSchedule(
            beneficiary2, 30000 * 10**18, block.timestamp, 0, YEAR, true, "employee"
        );
        
        vm.stopPrank();
        
        assertEq(vesting.getTotalSchedulesCount(), 2);
        assertEq(vesting.getTotalLocked(), 80000 * 10**18);
        assertEq(vesting.getTotalReleased(), 0);
    }
    
    function testUnauthorizedCannotCreateSchedule() public {
        vm.prank(beneficiary1); // not admin
        vm.expectRevert();
        vesting.createVestingSchedule(
            beneficiary2,
            100000 * 10**18,
            block.timestamp,
            YEAR,
            3 * YEAR,
            true,
            "employee"
        );
    }
    
    function testInvalidBeneficiary() public {
        vm.prank(admin);
        vm.expectRevert(IERC20VestingModule.InvalidBeneficiary.selector);
        vesting.createVestingSchedule(
            address(0),
            100000 * 10**18,
            block.timestamp,
            0,
            YEAR,
            true,
            "employee"
        );
    }
    
    function testInvalidAmount() public {
        vm.prank(admin);
        vm.expectRevert(IERC20VestingModule.InvalidAmount.selector);
        vesting.createVestingSchedule(
            beneficiary1,
            0, // zero amount
            block.timestamp,
            0,
            YEAR,
            true,
            "employee"
        );
    }
    
    function testInvalidDuration() public {
        vm.prank(admin);
        vm.expectRevert(IERC20VestingModule.InvalidDuration.selector);
        vesting.createVestingSchedule(
            beneficiary1,
            100000 * 10**18,
            block.timestamp,
            0,
            0, // zero duration
            true,
            "employee"
        );
    }
}
