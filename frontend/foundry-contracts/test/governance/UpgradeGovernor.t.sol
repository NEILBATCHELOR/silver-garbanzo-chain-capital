// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/governance/UpgradeGovernor.sol";
import "../../src/masters/ERC20Master.sol";

contract UpgradeGovernorTest is Test {
    UpgradeGovernor public governor;
    ERC20Master public tokenImpl;
    ERC20Master public token;
    ERC20Master public newImpl;
    
    address public admin = address(1);
    address public upgrader1 = address(2);
    address public upgrader2 = address(3);
    address public upgrader3 = address(4);
    address public user = address(5);
    
    uint256 constant REQUIRED_APPROVALS = 2;
    uint256 constant TIMELOCK_DURATION = 2 days;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed target,
        address indexed newImplementation,
        address proposer,
        string description
    );
    
    event ProposalApproved(
        uint256 indexed proposalId,
        address indexed approver,
        uint256 totalApprovals
    );
    
    function setUp() public {
        // Deploy token
        tokenImpl = new ERC20Master();
        bytes memory initData = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            1_000_000 * 10**18,
            100_000 * 10**18,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(tokenImpl), initData);
        token = ERC20Master(address(proxy));
        
        // Deploy new implementation
        newImpl = new ERC20Master();
        
        // Deploy governor
        address[] memory upgraders = new address[](3);
        upgraders[0] = upgrader1;
        upgraders[1] = upgrader2;
        upgraders[2] = upgrader3;
        
        governor = new UpgradeGovernor(upgraders, REQUIRED_APPROVALS, TIMELOCK_DURATION);
        
        // Grant DEFAULT_ADMIN_ROLE to admin for role management
        governor.grantRole(governor.DEFAULT_ADMIN_ROLE(), admin);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertEq(governor.requiredApprovals(), REQUIRED_APPROVALS);
        assertEq(governor.timeLockDuration(), TIMELOCK_DURATION);
        assertEq(governor.proposalCount(), 0);
    }
    
    function testUpgradersHaveRole() public view {
        assertTrue(governor.hasRole(governor.UPGRADER_ROLE(), upgrader1));
        assertTrue(governor.hasRole(governor.UPGRADER_ROLE(), upgrader2));
        assertTrue(governor.hasRole(governor.UPGRADER_ROLE(), upgrader3));
    }
    
    // ============ Proposal Creation Tests ============
    
    function testProposeUpgrade() public {
        vm.prank(upgrader1);
        vm.expectEmit(true, true, true, false);
        emit ProposalCreated(0, address(token), address(newImpl), upgrader1, "Test upgrade");
        
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Test upgrade"
        );
        
        assertEq(proposalId, 0);
        assertEq(governor.proposalCount(), 1);
    }
    
    function testProposeUpgradeAutoApproves() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Test"
        );
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.approvals, 1);
        assertTrue(governor.hasApprovedProposal(proposalId, upgrader1));
    }
    
    function testOnlyUpgraderCanPropose() public {
        vm.prank(user);
        vm.expectRevert();
        governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
    }
    
    // ============ Approval Tests ============
    
    function testApproveProposal() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.prank(upgrader2);
        vm.expectEmit(true, true, false, true);
        emit ProposalApproved(proposalId, upgrader2, 2);
        
        governor.approveProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.approvals, 2);
    }
    
    function testCannotApproveTwice() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.prank(upgrader1);
        vm.expectRevert();
        governor.approveProposal(proposalId);
    }
    
    function testCannotApproveNonexistentProposal() public {
        vm.prank(upgrader1);
        vm.expectRevert();
        governor.approveProposal(999);
    }
    
    // ============ Execution Tests ============
    
    function testExecuteProposalWithTimelock() public {
        // Grant governor upgrader role on token
        vm.prank(admin);
        token.grantRole(token.UPGRADER_ROLE(), address(governor));
        
        // Create and approve proposal
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Upgrade");
        
        vm.prank(upgrader2);
        governor.approveProposal(proposalId);
        
        // Wait for timelock
        vm.warp(block.timestamp + TIMELOCK_DURATION + 1);
        
        // Execute
        vm.prank(upgrader1);
        governor.executeProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertTrue(proposal.executed);
    }
    
    function testCannotExecuteWithoutEnoughApprovals() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.warp(block.timestamp + TIMELOCK_DURATION + 1);
        
        vm.prank(upgrader1);
        vm.expectRevert();
        governor.executeProposal(proposalId);
    }
    
    function testCannotExecuteBeforeTimelock() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.prank(upgrader2);
        governor.approveProposal(proposalId);
        
        vm.prank(upgrader1);
        vm.expectRevert();
        governor.executeProposal(proposalId);
    }
    
    // ============ Cancellation Tests ============
    
    function testCancelProposal() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.prank(admin);
        governor.cancelProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertTrue(proposal.executed); // Cancelled proposals marked as executed
    }
    
    function testOnlyAdminCanCancel() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        vm.prank(upgrader2);
        vm.expectRevert();
        governor.cancelProposal(proposalId);
    }
    
    // ============ Configuration Tests ============
    
    function testSetRequiredApprovals() public {
        vm.prank(admin);
        governor.setRequiredApprovals(3);
        
        assertEq(governor.requiredApprovals(), 3);
    }
    
    function testCannotSetRequiredApprovalsToZero() public {
        vm.prank(admin);
        vm.expectRevert();
        governor.setRequiredApprovals(0);
    }
    
    function testSetTimeLockDuration() public {
        vm.prank(admin);
        governor.setTimeLockDuration(3 days);
        
        assertEq(governor.timeLockDuration(), 3 days);
    }
    
    // ============ View Function Tests ============
    
    function testCanExecuteProposal() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Test");
        
        // Not enough approvals
        (bool canExec, string memory reason) = governor.canExecuteProposal(proposalId);
        assertFalse(canExec);
        assertEq(reason, "Insufficient approvals");
        
        // Approve
        vm.prank(upgrader2);
        governor.approveProposal(proposalId);
        
        // Timelock not met
        (canExec, reason) = governor.canExecuteProposal(proposalId);
        assertFalse(canExec);
        assertEq(reason, "Time lock active");
        
        // After timelock
        vm.warp(block.timestamp + TIMELOCK_DURATION + 1);
        (canExec, reason) = governor.canExecuteProposal(proposalId);
        assertTrue(canExec);
    }
    
    function testGetProposal() public {
        vm.prank(upgrader1);
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Test upgrade"
        );
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        
        assertEq(proposal.target, address(token));
        assertEq(proposal.newImplementation, address(newImpl));
        assertEq(proposal.data.length, 0);
        assertEq(proposal.approvals, 1);
        assertTrue(proposal.proposedAt > 0);
        assertFalse(proposal.executed);
        assertEq(proposal.description, "Test upgrade");
    }
    
    // ============ Multiple Proposal Tests ============
    
    function testMultipleProposals() public {
        vm.startPrank(upgrader1);
        
        uint256 id1 = governor.proposeUpgrade(address(token), address(newImpl), "", "Upgrade 1");
        uint256 id2 = governor.proposeUpgrade(address(token), address(newImpl), "", "Upgrade 2");
        
        vm.stopPrank();
        
        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(governor.proposalCount(), 2);
    }
}
