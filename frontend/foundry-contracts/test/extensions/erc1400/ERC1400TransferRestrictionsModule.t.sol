// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/erc1400/ERC1400TransferRestrictionsModule.sol";

contract ERC1400TransferRestrictionsModuleTest is Test {
    using Clones for address;
    
    ERC1400TransferRestrictionsModule public implementation;
    ERC1400TransferRestrictionsModule public module;
    
    address public owner = address(1);
    address public complianceOfficer = address(2);
    address public user1 = address(3);
    address public user2 = address(4);
    
    bytes32 public partition1 = bytes32("A");
    bytes32 public partition2 = bytes32("B");
    bytes32 public restriction1 = keccak256("restriction1");
    bytes32 public jurisdiction1 = keccak256("US");
    bytes32 public jurisdiction2 = keccak256("CN");
    
    event TransferRestrictionSet(bytes32 indexed partition, bytes32 restriction);
    event LockupPeriodSet(bytes32 indexed partition, uint256 duration);
    event PartitionLocked(bytes32 indexed partition, uint256 until);
    event PartitionUnlocked(bytes32 indexed partition);
    event InvestorLimitSet(bytes32 indexed partition, uint256 limit);
    event JurisdictionRestricted(bytes32 indexed jurisdiction, bool restricted);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC1400TransferRestrictionsModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC1400TransferRestrictionsModule(clone);
        
        vm.startPrank(owner);
        module.initialize(owner);
        
        // Grant compliance officer role
        module.grantRole(module.COMPLIANCE_OFFICER_ROLE(), complianceOfficer);
        vm.stopPrank();
    }
    
    // ============ Transfer Validation Tests ============
    
    function testCanTransfer() public view {
        (bytes1 code,) = module.canTransfer(partition1, owner, user1, 100, "");
        assertEq(code, bytes1(0x01), "Transfer should succeed");
    }
    
    function testCannotTransferWhenLocked() public {
        // Lock partition for 1 hour
        vm.prank(complianceOfficer);
        module.lockPartition(partition1, block.timestamp + 1 hours);
        
        (bytes1 code,) = module.canTransfer(partition1, owner, user1, 100, "");
        assertEq(code, bytes1(0x00), "Transfer should fail when locked");
    }
    
    function testCanTransferAfterLockupExpires() public {
        // Lock partition for 1 hour
        vm.prank(complianceOfficer);
        module.lockPartition(partition1, block.timestamp + 1 hours);
        
        // Warp past lockup period
        vm.warp(block.timestamp + 2 hours);
        
        (bytes1 code,) = module.canTransfer(partition1, owner, user1, 100, "");
        assertEq(code, bytes1(0x01), "Transfer should succeed after lockup expires");
    }
    
    // ============ Restriction Management Tests ============
    
    function testSetTransferRestriction() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit TransferRestrictionSet(partition1, restriction1);
        module.setTransferRestriction(partition1, restriction1);
        
        bytes32 retrieved = module.getTransferRestriction(partition1);
        assertEq(retrieved, restriction1, "Restriction should match");
    }
    
    function testRemoveTransferRestriction() public {
        vm.startPrank(complianceOfficer);
        module.setTransferRestriction(partition1, restriction1);
        module.removeTransferRestriction(partition1);
        vm.stopPrank();
        
        bytes32 retrieved = module.getTransferRestriction(partition1);
        assertEq(retrieved, bytes32(0), "Restriction should be removed");
    }
    
    function testOnlyComplianceOfficerCanSetRestriction() public {
        vm.prank(user1);
        vm.expectRevert();
        module.setTransferRestriction(partition1, restriction1);
    }
    
    // ============ Lockup Period Tests ============
    
    function testSetLockupPeriod() public {
        uint256 duration = 30 days;
        
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit LockupPeriodSet(partition1, duration);
        module.setLockupPeriod(partition1, duration);
        
        assertTrue(module.isPartitionLocked(partition1), "Partition should be locked");
        assertEq(module.getLockupExpiry(partition1), block.timestamp + duration, "Expiry should match");
    }
    
    function testLockPartition() public {
        uint256 until = block.timestamp + 1 days;
        
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit PartitionLocked(partition1, until);
        module.lockPartition(partition1, until);
        
        assertTrue(module.isPartitionLocked(partition1), "Partition should be locked");
    }
    
    function testUnlockPartition() public {
        // Lock first
        vm.startPrank(complianceOfficer);
        module.lockPartition(partition1, block.timestamp + 1 days);
        
        // Then unlock
        vm.expectEmit(true, false, false, false);
        emit PartitionUnlocked(partition1);
        module.unlockPartition(partition1);
        vm.stopPrank();
        
        assertFalse(module.isPartitionLocked(partition1), "Partition should be unlocked");
    }
    
    // ============ Investor Limit Tests ============
    
    function testSetInvestorLimit() public {
        uint256 limit = 100;
        
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit InvestorLimitSet(partition1, limit);
        module.setInvestorLimit(partition1, limit);
        
        assertEq(module.getInvestorLimit(partition1), limit, "Limit should match");
    }
    
    function testCannotTransferWhenInvestorLimitReached() public {
        // Set investor limit to 1
        vm.prank(complianceOfficer);
        module.setInvestorLimit(partition1, 1);
        
        // Update investor count to 1
        module.updateInvestorCount(partition1, user1, true);
        
        // Should fail for new investor (user2)
        (bytes1 code,) = module.canTransfer(partition1, owner, user2, 100, "");
        assertEq(code, bytes1(0x00), "Transfer should fail when investor limit reached");
    }
    
    function testUpdateInvestorCount() public {
        assertEq(module.getInvestorCount(partition1), 0, "Initial count should be 0");
        
        // Add investor
        module.updateInvestorCount(partition1, user1, true);
        assertEq(module.getInvestorCount(partition1), 1, "Count should be 1");
        
        // Add another investor
        module.updateInvestorCount(partition1, user2, true);
        assertEq(module.getInvestorCount(partition1), 2, "Count should be 2");
        
        // Remove investor
        module.updateInvestorCount(partition1, user1, false);
        assertEq(module.getInvestorCount(partition1), 1, "Count should be 1 after removal");
    }
    
    // ============ Jurisdiction Tests ============
    
    function testSetJurisdictionRestriction() public {
        vm.prank(complianceOfficer);
        vm.expectEmit(true, false, false, true);
        emit JurisdictionRestricted(jurisdiction1, true);
        module.setJurisdictionRestriction(jurisdiction1, true);
        
        assertTrue(module.isJurisdictionRestricted(jurisdiction1), "Jurisdiction should be restricted");
    }
    
    function testRemoveJurisdictionRestriction() public {
        vm.startPrank(complianceOfficer);
        module.setJurisdictionRestriction(jurisdiction1, true);
        module.setJurisdictionRestriction(jurisdiction1, false);
        vm.stopPrank();
        
        assertFalse(module.isJurisdictionRestricted(jurisdiction1), "Jurisdiction should not be restricted");
    }
}
