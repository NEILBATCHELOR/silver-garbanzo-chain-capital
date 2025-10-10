// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../../src/extensions/erc3525/ERC3525SlotApprovableModule.sol";
import "../../../src/extensions/erc3525/interfaces/IERC3525SlotApprovable.sol";

/**
 * @title ERC3525SlotApprovableModuleTest
 * @notice Comprehensive tests for slot-level approval functionality
 */
contract ERC3525SlotApprovableModuleTest is Test {
    
    ERC3525SlotApprovableModule public slotApprovable;
    
    address public admin = address(1);
    address public owner1 = address(2);
    address public owner2 = address(3);
    address public operator1 = address(4);
    address public operator2 = address(5);
    address public operator3 = address(6);
    
    uint256 public constant SLOT_GOLD = 1;
    uint256 public constant SLOT_SILVER = 2;
    uint256 public constant SLOT_BRONZE = 3;
    
    event ApprovalForSlot(
        address indexed owner,
        uint256 indexed slot,
        address indexed operator,
        bool approved
    );
    
    function setUp() public {
        slotApprovable = new ERC3525SlotApprovableModule();
        slotApprovable.initialize(admin);
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public {
        assertTrue(slotApprovable.hasRole(slotApprovable.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(slotApprovable.hasRole(slotApprovable.UPGRADER_ROLE(), admin));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        slotApprovable.initialize(admin);
    }
    
    // ============ Approval Tests ============
    
    function testSetApprovalForSlot() public {
        vm.prank(owner1);
        vm.expectEmit(true, true, true, true);
        emit ApprovalForSlot(owner1, SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
    }
    
    function testRevokeApprovalForSlot() public {
        // First approve
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
        
        // Then revoke
        vm.expectEmit(true, true, true, true);
        emit ApprovalForSlot(owner1, SLOT_GOLD, operator1, false);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, false);
        vm.stopPrank();
        
        assertFalse(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
    }
    
    function testMultipleOperatorsPerSlot() public {
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator2, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator3, true);
        vm.stopPrank();
        
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator2));
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator3));
    }
    
    function testMultipleSlotsPerOperator() public {
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_SILVER, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_BRONZE, operator1, true);
        vm.stopPrank();
        
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_SILVER, operator1));
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_BRONZE, operator1));
    }
    
    function testApprovalIsolatedBetweenOwners() public {
        vm.prank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
        assertFalse(slotApprovable.isApprovedForSlot(owner2, SLOT_GOLD, operator1));
    }
    
    function testIdempotentApproval() public {
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true); // Should not revert
        vm.stopPrank();
        
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
    }
    
    // ============ Error Cases ============
    
    function testCannotApproveZeroSlot() public {
        vm.prank(owner1);
        vm.expectRevert(ERC3525SlotApprovableModule.InvalidSlot.selector);
        slotApprovable.setApprovalForSlot(0, operator1, true);
    }
    
    function testCannotApproveZeroAddress() public {
        vm.prank(owner1);
        vm.expectRevert(ERC3525SlotApprovableModule.InvalidOperator.selector);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, address(0), true);
    }
    
    function testCannotApproveSelf() public {
        vm.prank(owner1);
        vm.expectRevert(ERC3525SlotApprovableModule.InvalidOperator.selector);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, owner1, true);
    }
    
    // ============ Enumeration Tests ============
    
    function testGetApprovedOperatorsForSlot() public {
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator2, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator3, true);
        vm.stopPrank();
        
        address[] memory operators = slotApprovable.getApprovedOperatorsForSlot(owner1, SLOT_GOLD);
        assertEq(operators.length, 3);
        assertEq(operators[0], operator1);
        assertEq(operators[1], operator2);
        assertEq(operators[2], operator3);
    }
    
    function testGetApprovedSlotsForOperator() public {
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_SILVER, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_BRONZE, operator1, true);
        vm.stopPrank();
        
        uint256[] memory slots = slotApprovable.getApprovedSlotsForOperator(owner1, operator1);
        assertEq(slots.length, 3);
        assertEq(slots[0], SLOT_GOLD);
        assertEq(slots[1], SLOT_SILVER);
        assertEq(slots[2], SLOT_BRONZE);
    }
    
    function testEnumerationAfterRevocation() public {
        // Approve three operators
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator2, true);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator3, true);
        
        // Revoke middle operator
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator2, false);
        vm.stopPrank();
        
        address[] memory operators = slotApprovable.getApprovedOperatorsForSlot(owner1, SLOT_GOLD);
        assertEq(operators.length, 2);
        // Array should still contain operator1 and operator3
        assertTrue(operators[0] == operator1 || operators[1] == operator1);
        assertTrue(operators[0] == operator3 || operators[1] == operator3);
    }
    
    function testEnumerationEmptyByDefault() public {
        address[] memory operators = slotApprovable.getApprovedOperatorsForSlot(owner1, SLOT_GOLD);
        assertEq(operators.length, 0);
        
        uint256[] memory slots = slotApprovable.getApprovedSlotsForOperator(owner1, operator1);
        assertEq(slots.length, 0);
    }
    
    // ============ Complex Scenarios ============
    
    function testComplexApprovalScenario() public {
        // Owner1 approves operator1 for GOLD and SILVER
        vm.startPrank(owner1);
        slotApprovable.setApprovalForSlot(SLOT_GOLD, operator1, true);
        slotApprovable.setApprovalForSlot(SLOT_SILVER, operator1, true);
        vm.stopPrank();
        
        // Owner2 approves operator1 for BRONZE
        vm.prank(owner2);
        slotApprovable.setApprovalForSlot(SLOT_BRONZE, operator1, true);
        
        // Verify owner1's approvals
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_GOLD, operator1));
        assertTrue(slotApprovable.isApprovedForSlot(owner1, SLOT_SILVER, operator1));
        assertFalse(slotApprovable.isApprovedForSlot(owner1, SLOT_BRONZE, operator1));
        
        // Verify owner2's approvals
        assertFalse(slotApprovable.isApprovedForSlot(owner2, SLOT_GOLD, operator1));
        assertFalse(slotApprovable.isApprovedForSlot(owner2, SLOT_SILVER, operator1));
        assertTrue(slotApprovable.isApprovedForSlot(owner2, SLOT_BRONZE, operator1));
    }
    
    // ============ ERC-165 Tests ============
    
    function testSupportsInterface() public {
        // IERC3525SlotApprovable interface ID: 0xb688be58
        assertTrue(slotApprovable.supportsInterface(0xb688be58));
        assertTrue(slotApprovable.supportsInterface(type(IERC3525SlotApprovable).interfaceId));
    }
}
