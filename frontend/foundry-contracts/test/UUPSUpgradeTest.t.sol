// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/governance/UpgradeGovernor.sol";
import "../src/registry/TokenRegistry.sol";
import "../src/masters/ERC20Master.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title UUPSUpgradeTest
 * @notice Comprehensive tests for Stage 2: UUPS upgradeable pattern
 * @dev Tests multi-sig governance, storage preservation, and registry tracking
 */
contract UUPSUpgradeTest is Test {
    // Contracts
    UpgradeGovernor public governor;
    TokenRegistry public registry;
    ERC20Master public tokenImpl;
    ERC20Master public token;
    
    // Actors
    address public deployer = address(1);
    address public upgrader1 = address(2);
    address public upgrader2 = address(3);
    address public user = address(4);
    
    // Events for testing
    event ProposalCreated(uint256 indexed proposalId, address indexed target, address indexed newImplementation, address proposer, string description);
    event ProposalApproved(uint256 indexed proposalId, address indexed approver, uint256 totalApprovals);
    event ProposalExecuted(uint256 indexed proposalId, address indexed target, address indexed newImplementation);
    event TokenUpgraded(address indexed proxy, address indexed oldImplementation, address indexed newImplementation, address upgradedBy, string reason);
    
    function setUp() public {
        vm.deal(deployer, 100 ether);
        vm.deal(upgrader1, 100 ether);
        vm.deal(upgrader2, 100 ether);
        
        vm.startPrank(deployer);
        
        // Deploy UpgradeGovernor
        address[] memory upgraders = new address[](3);
        upgraders[0] = deployer;
        upgraders[1] = upgrader1;
        upgraders[2] = upgrader2;
        
        governor = new UpgradeGovernor(upgraders, 2, 0); // 2-of-3, no time lock
        
        // Deploy TokenRegistry
        TokenRegistry registryImpl = new TokenRegistry();
        bytes memory registryInitData = abi.encodeWithSelector(
            TokenRegistry.initialize.selector,
            deployer
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(address(registryImpl), registryInitData);
        registry = TokenRegistry(address(registryProxy));
        
        // Grant roles
        registry.grantRole(registry.UPGRADER_ROLE(), address(governor));
        registry.grantRole(registry.REGISTRAR_ROLE(), deployer);
        
        // Deploy sample token
        tokenImpl = new ERC20Master();
        bytes memory tokenInitData = abi.encodeWithSelector(
            ERC20Master.initialize.selector,
            "Test Token",
            "TEST",
            1000000 * 10**18,
            100000 * 10**18,
            deployer
        );
        ERC1967Proxy tokenProxy = new ERC1967Proxy(address(tokenImpl), tokenInitData);
        token = ERC20Master(address(tokenProxy));
        
        // Grant UPGRADER_ROLE to UpgradeGovernor on token contract
        token.grantRole(token.UPGRADER_ROLE(), address(governor));
        
        // Register token
        registry.registerToken(
            address(token),
            address(tokenImpl),
            deployer,
            "ERC20",
            "Test Token",
            "TEST"
        );
        
        vm.stopPrank();
    }

    
    // ============ Test: Multi-Sig Proposal Creation ============
    
    function testProposalCreation() public {
        vm.startPrank(deployer);
        
        ERC20Master newImpl = new ERC20Master();
        
        vm.expectEmit(true, true, true, false);
        emit ProposalCreated(0, address(token), address(newImpl), deployer, "Upgrade to v2");
        
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Upgrade to v2"
        );
        
        assertEq(proposalId, 0, "First proposal should have ID 0");
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.target, address(token), "Target mismatch");
        assertEq(proposal.newImplementation, address(newImpl), "Implementation mismatch");
        assertEq(proposal.approvals, 1, "Should have 1 approval from proposer");
        assertFalse(proposal.executed, "Should not be executed yet");
        
        vm.stopPrank();
    }
    
    // ============ Test: Multi-Sig Approval Process ============
    
    function testMultiSigApproval() public {
        // Create proposal
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Upgrade to v2"
        );
        vm.stopPrank();
        
        // First approval (upgrader1)
        vm.startPrank(upgrader1);
        vm.expectEmit(true, true, false, false);
        emit ProposalApproved(proposalId, upgrader1, 2);
        
        governor.approveProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertEq(proposal.approvals, 2, "Should have 2 approvals");
        assertTrue(proposal.executed, "Should auto-execute with 2 approvals");
        
        vm.stopPrank();
    }
    
    // ============ Test: Storage Preservation During Upgrade ============
    
    function testStoragePreservation() public {
        // Set state before upgrade
        vm.startPrank(deployer);
        token.mint(user, 1000 * 10**18);
        vm.stopPrank();
        
        uint256 balanceBefore = token.balanceOf(user);
        uint256 totalSupplyBefore = token.totalSupply();
        string memory nameBefore = token.name();
        
        // Propose upgrade
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Storage preservation test"
        );
        vm.stopPrank();
        
        // Approve and execute
        vm.prank(upgrader1);
        governor.approveProposal(proposalId);
        
        // Verify storage preserved
        uint256 balanceAfter = token.balanceOf(user);
        uint256 totalSupplyAfter = token.totalSupply();
        string memory nameAfter = token.name();
        
        assertEq(balanceBefore, balanceAfter, "Balance not preserved");
        assertEq(totalSupplyBefore, totalSupplyAfter, "Total supply not preserved");
        assertEq(nameBefore, nameAfter, "Name not preserved");
    }

    
    // ============ Test: Registry Tracking ============
    
    function testRegistryTracking() public {
        address oldImpl = address(tokenImpl);
        
        // Create and execute upgrade
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Registry tracking test"
        );
        vm.stopPrank();
        
        vm.prank(upgrader1);
        governor.approveProposal(proposalId);
        
        // Record upgrade in registry
        vm.prank(address(governor));
        registry.recordUpgrade(address(token), address(newImpl), "Registry tracking test");
        
        // Verify registry updated
        TokenRegistry.TokenInfo memory info = registry.getToken(address(token));
        assertEq(info.implementation, address(newImpl), "Implementation not updated");
        assertEq(info.upgradeCount, 1, "Upgrade count not incremented");
        assertTrue(info.lastUpgrade > 0, "Last upgrade timestamp not set");
        
        // Check upgrade history
        TokenRegistry.UpgradeHistory[] memory history = registry.getUpgradeHistory(address(token));
        assertEq(history.length, 1, "History length incorrect");
        assertEq(history[0].oldImplementation, oldImpl, "Old implementation incorrect");
        assertEq(history[0].newImplementation, address(newImpl), "New implementation incorrect");
    }
    
    // ============ Test: Insufficient Approvals ============
    
    function testInsufficientApprovals() public {
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Insufficient approvals test"
        );
        vm.stopPrank();
        
        // Try to execute with only 1 approval (need 2)
        vm.prank(deployer);
        vm.expectRevert();
        governor.executeProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertFalse(proposal.executed, "Should not be executed");
    }
    
    // ============ Test: Cannot Approve Twice ============
    
    function testCannotApproveTwice() public {
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Double approval test"
        );
        
        // Try to approve again
        vm.expectRevert();
        governor.approveProposal(proposalId);
        
        vm.stopPrank();
    }
    
    // ============ Test: Gas Cost Comparison ============
    
    function testUpgradeGasCost() public {
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Gas test"
        );
        vm.stopPrank();
        
        // Measure gas for approval + execution
        vm.prank(upgrader1);
        uint256 gasBefore = gasleft();
        governor.approveProposal(proposalId);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Gas used for UUPS upgrade:", gasUsed);
        
        // Should be significantly less than transparent proxy upgrade
        assertLt(gasUsed, 100000, "Gas cost too high");
    }

    
    // ============ Test: Proposal Cancellation ============
    
    function testProposalCancellation() public {
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(
            address(token),
            address(newImpl),
            "",
            "Cancellation test"
        );
        
        // Cancel proposal
        governor.cancelProposal(proposalId);
        
        UpgradeGovernor.UpgradeProposal memory proposal = governor.getProposal(proposalId);
        assertTrue(proposal.executed, "Cancelled proposals marked as executed");
        
        vm.stopPrank();
    }
    
    // ============ Test: Update Required Approvals ============
    
    function testUpdateRequiredApprovals() public {
        vm.prank(deployer);
        governor.setRequiredApprovals(3);
        
        assertEq(governor.requiredApprovals(), 3, "Required approvals not updated");
    }
    
    // ============ Test: Registry Statistics ============
    
    function testRegistryStatistics() public {
        (uint256 totalTokens, uint256 totalUpgrades, uint256 activeTokens) = registry.getStatistics();
        
        assertEq(totalTokens, 1, "Total tokens incorrect");
        assertEq(totalUpgrades, 0, "Total upgrades should be 0");
        assertEq(activeTokens, 1, "Active tokens incorrect");
        
        // Perform upgrade
        vm.startPrank(deployer);
        ERC20Master newImpl = new ERC20Master();
        uint256 proposalId = governor.proposeUpgrade(address(token), address(newImpl), "", "Stats test");
        vm.stopPrank();
        
        vm.prank(upgrader1);
        governor.approveProposal(proposalId);
        
        vm.prank(address(governor));
        registry.recordUpgrade(address(token), address(newImpl), "Stats test");
        
        (totalTokens, totalUpgrades, activeTokens) = registry.getStatistics();
        assertEq(totalUpgrades, 1, "Total upgrades should be 1");
    }
    
    // ============ Test: Token Deactivation ============
    
    function testTokenDeactivation() public {
        vm.startPrank(deployer);
        
        registry.deactivateToken(address(token), "Testing deactivation");
        
        TokenRegistry.TokenInfo memory info = registry.getToken(address(token));
        assertFalse(info.isActive, "Token should be deactivated");
        
        // Reactivate
        registry.reactivateToken(address(token));
        
        info = registry.getToken(address(token));
        assertTrue(info.isActive, "Token should be reactivated");
        
        vm.stopPrank();
    }
    
    // ============ Test: Query Functions ============
    
    function testQueryFunctions() public {
        // Get tokens by deployer
        address[] memory deployerTokens = registry.getTokensByDeployer(deployer);
        assertEq(deployerTokens.length, 1, "Deployer should have 1 token");
        assertEq(deployerTokens[0], address(token), "Token address mismatch");
        
        // Get tokens by standard
        address[] memory erc20Tokens = registry.getTokensByStandard("ERC20");
        assertEq(erc20Tokens.length, 1, "Should have 1 ERC20 token");
        
        // Get all tokens
        address[] memory allTokens = registry.getAllTokens();
        assertEq(allTokens.length, 1, "Should have 1 total token");
    }
}
