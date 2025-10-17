// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/governance/UpgradeGovernance.sol";
import "../../src/deployers/beacon/TokenBeacon.sol";
import "../../src/masters/ERC20Master.sol";

contract UpgradeGovernanceTest is Test {
    UpgradeGovernance public governance;
    TokenBeacon public beacon;
    ERC20Master public implementation;
    ERC20Master public newImplementation;
    
    address public admin = address(1);
    address public proposer1 = address(2);
    address public proposer2 = address(3);
    address public approver1 = address(4);
    address public approver2 = address(5);
    address public executor = address(6);
    address public pauser = address(7);
    
    uint256 constant TIMELOCK_DELAY = 2 days;
    uint256 constant MIN_APPROVERS = 2;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed beacon,
        address newImplementation,
        address proposer,
        uint256 executionETA
    );
    
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 approvalCount
    );
    
    function setUp() public {
        governance = new UpgradeGovernance(admin, TIMELOCK_DELAY, MIN_APPROVERS);
        implementation = new ERC20Master();
        beacon = new TokenBeacon(address(implementation), address(governance));
        newImplementation = new ERC20Master();
        
        // Grant roles
        vm.startPrank(admin);
        governance.grantRole(governance.PROPOSER_ROLE(), proposer1);
        governance.grantRole(governance.PROPOSER_ROLE(), proposer2);
        governance.grantRole(governance.APPROVER_ROLE(), approver1);
        governance.grantRole(governance.APPROVER_ROLE(), approver2);
        governance.grantRole(governance.EXECUTOR_ROLE(), executor);
        governance.grantRole(governance.PAUSER_ROLE(), pauser);
        vm.stopPrank();
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(governance.timelockDelay(), TIMELOCK_DELAY);
        assertEq(governance.minApprovers(), MIN_APPROVERS);
        assertTrue(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), admin));
    }
    
    function testRolesGranted() public view {
        assertTrue(governance.hasRole(governance.PROPOSER_ROLE(), proposer1));
        assertTrue(governance.hasRole(governance.APPROVER_ROLE(), approver1));
        assertTrue(governance.hasRole(governance.EXECUTOR_ROLE(), executor));
    }
    
    // ============ Proposal Creation Tests ============
    
    function testProposeUpgrade() public {
        vm.prank(proposer1);
        vm.expectEmit(true, false, false, false);
        emit ProposalCreated(1, address(beacon), address(newImplementation), proposer1, block.timestamp + TIMELOCK_DELAY);
        
        uint256 proposalId = governance.proposeUpgrade(
            address(beacon),
            address(newImplementation),
            "Upgrade to new implementation"
        );
        
        assertEq(proposalId, 1);
    }
    
    function testOnlyProposerCanPropose() public {
        vm.prank(address(999));
        vm.expectRevert();
        governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
    }
    
    function testCannotProposeWhenPaused() public {
        vm.prank(pauser);
        governance.pause();
        
        vm.prank(proposer1);
        vm.expectRevert();
        governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
    }
    
    // ============ Approval Tests ============
    
    function testApproveProposal() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        vm.prank(approver1);
        vm.expectEmit(true, true, false, true);
        emit ProposalApproved(proposalId, approver1, 1);
        
        governance.approveProposal(proposalId);
        
        assertTrue(governance.hasApproved(proposalId, approver1));
    }
    
    function testCannotApproveNonexistentProposal() public {
        vm.prank(approver1);
        vm.expectRevert(UpgradeGovernance.ProposalNotFound.selector);
        governance.approveProposal(999);
    }
    
    function testCannotApproveTwice() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        vm.startPrank(approver1);
        governance.approveProposal(proposalId);
        
        vm.expectRevert(UpgradeGovernance.AlreadyApproved.selector);
        governance.approveProposal(proposalId);
        vm.stopPrank();
    }
    
    // ============ Execution Tests ============
    
    function testExecuteProposal() public {
        // Create proposal
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        // Approve by multiple approvers
        vm.prank(approver1);
        governance.approveProposal(proposalId);
        
        vm.prank(approver2);
        governance.approveProposal(proposalId);
        
        // Wait for timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        // Execute
        vm.prank(executor);
        governance.executeProposal(proposalId);
        
        // Verify upgrade (would need beacon owner check in real scenario)
        (,,,,,,,, bool executed,) = governance.getProposal(proposalId);
        assertTrue(executed);
    }
    
    function testCannotExecuteWithoutEnoughApprovals() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        // Only one approval
        vm.prank(approver1);
        governance.approveProposal(proposalId);
        
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        
        vm.prank(executor);
        vm.expectRevert(UpgradeGovernance.InsufficientApprovals.selector);
        governance.executeProposal(proposalId);
    }
    
    function testCannotExecuteBeforeTimelock() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        vm.prank(approver1);
        governance.approveProposal(proposalId);
        vm.prank(approver2);
        governance.approveProposal(proposalId);
        
        vm.prank(executor);
        vm.expectRevert(UpgradeGovernance.TimelockNotMet.selector);
        governance.executeProposal(proposalId);
    }
    
    // ============ Cancellation Tests ============
    
    function testCancelProposal() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        vm.prank(admin);
        governance.cancelProposal(proposalId);
        
        (,,,,,,,,, bool cancelled) = governance.getProposal(proposalId);
        assertTrue(cancelled);
    }
    
    function testOnlyAdminCanCancel() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        vm.prank(proposer2);
        vm.expectRevert();
        governance.cancelProposal(proposalId);
    }
    
    // ============ Configuration Tests ============
    
    function testSetTimelockDelay() public {
        uint256 newDelay = 3 days;
        
        vm.prank(admin);
        governance.setTimelockDelay(newDelay);
        
        assertEq(governance.timelockDelay(), newDelay);
    }
    
    function testCannotSetTimelockBelowMinimum() public {
        vm.prank(admin);
        vm.expectRevert(UpgradeGovernance.InvalidTimelockDelay.selector);
        governance.setTimelockDelay(12 hours);
    }
    
    function testSetMinApprovers() public {
        vm.prank(admin);
        governance.setMinApprovers(3);
        
        assertEq(governance.minApprovers(), 3);
    }
    
    function testCannotSetMinApproversBelow2() public {
        vm.prank(admin);
        vm.expectRevert(UpgradeGovernance.InvalidMinApprovers.selector);
        governance.setMinApprovers(1);
    }
    
    // ============ Pause Tests ============
    
    function testPause() public {
        vm.prank(pauser);
        governance.pause();
        
        assertTrue(governance.paused());
    }
    
    function testUnpause() public {
        vm.prank(pauser);
        governance.pause();
        
        vm.prank(admin);
        governance.unpause();
        
        assertFalse(governance.paused());
    }
    
    function testOnlyAdminCanUnpause() public {
        vm.prank(pauser);
        governance.pause();
        
        vm.prank(pauser);
        vm.expectRevert();
        governance.unpause();
    }
    
    // ============ View Function Tests ============
    
    function testGetProposal() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test upgrade");
        
        (
            uint256 id,
            address beaconAddr,
            address newImpl,
            string memory description,
            address proposer,
            uint256 proposedAt,
            uint256 approvalCount,
            uint256 executionETA,
            bool executed,
            bool cancelled
        ) = governance.getProposal(proposalId);
        
        assertEq(id, proposalId);
        assertEq(beaconAddr, address(beacon));
        assertEq(newImpl, address(newImplementation));
        assertEq(description, "Test upgrade");
        assertEq(proposer, proposer1);
        assertTrue(proposedAt > 0);
        assertEq(approvalCount, 0);
        assertEq(executionETA, block.timestamp + TIMELOCK_DELAY);
        assertFalse(executed);
        assertFalse(cancelled);
    }
    
    function testCanExecute() public {
        vm.prank(proposer1);
        uint256 proposalId = governance.proposeUpgrade(address(beacon), address(newImplementation), "Test");
        
        // Not enough approvals
        (bool canExec, string memory reason) = governance.canExecute(proposalId);
        assertFalse(canExec);
        assertEq(reason, "Insufficient approvals");
        
        // Approve
        vm.prank(approver1);
        governance.approveProposal(proposalId);
        vm.prank(approver2);
        governance.approveProposal(proposalId);
        
        // Timelock not met
        (canExec, reason) = governance.canExecute(proposalId);
        assertFalse(canExec);
        assertEq(reason, "Timelock not met");
        
        // After timelock
        vm.warp(block.timestamp + TIMELOCK_DELAY + 1);
        (canExec, reason) = governance.canExecute(proposalId);
        assertTrue(canExec);
    }
}
