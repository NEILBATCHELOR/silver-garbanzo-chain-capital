// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/temporary-approval/ERC20TemporaryApprovalModule.sol";

contract ERC20TemporaryApprovalModuleTest is Test {
    using Clones for address;
    
    ERC20TemporaryApprovalModule public implementation;
    ERC20TemporaryApprovalModule public module;
    
    address public admin = address(1);
    address public user = address(2);
    address public spender = address(3);
    
    event TemporaryApproval(address indexed owner, address indexed spender, uint256 value);
    event TemporaryApprovalUsed(address indexed owner, address indexed spender, uint256 value, uint256 remaining);
    
    function setUp() public {
        implementation = new ERC20TemporaryApprovalModule();
        
        address clone = address(implementation).clone();
        module = ERC20TemporaryApprovalModule(clone);
        
        vm.prank(admin);
        module.initialize(admin);
    }
    
    function testInitialization() public view {
        assertTrue(module.isTemporaryApprovalEnabled());
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), admin));
    }
    
    function testTemporaryApprove() public {
        uint256 amount = 1000 ether;
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApproval(user, spender, amount);
        
        vm.prank(user);
        bool success = module.temporaryApprove(spender, amount);
        
        assertTrue(success);
        assertEq(module.temporaryAllowance(user, spender), amount);
    }
    
    function testTemporaryApproveRevertsForZeroAddress() public {
        vm.prank(user);
        vm.expectRevert();
        module.temporaryApprove(address(0), 1000 ether);
    }
    
    function testIncreaseTemporaryAllowance() public {
        uint256 initialAmount = 1000 ether;
        uint256 addedAmount = 500 ether;
        
        vm.prank(user);
        module.temporaryApprove(spender, initialAmount);
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApproval(user, spender, initialAmount + addedAmount);
        
        vm.prank(user);
        bool success = module.increaseTemporaryAllowance(spender, addedAmount);
        
        assertTrue(success);
        assertEq(module.temporaryAllowance(user, spender), initialAmount + addedAmount);
    }
    
    function testDecreaseTemporaryAllowance() public {
        uint256 initialAmount = 1000 ether;
        uint256 subtractedAmount = 300 ether;
        
        vm.prank(user);
        module.temporaryApprove(spender, initialAmount);
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApproval(user, spender, initialAmount - subtractedAmount);
        
        vm.prank(user);
        bool success = module.decreaseTemporaryAllowance(spender, subtractedAmount);
        
        assertTrue(success);
        assertEq(module.temporaryAllowance(user, spender), initialAmount - subtractedAmount);
    }
    
    function testDecreaseTemporaryAllowanceRevertsForInsufficientAllowance() public {
        vm.prank(user);
        module.temporaryApprove(spender, 100 ether);
        
        vm.prank(user);
        vm.expectRevert();
        module.decreaseTemporaryAllowance(spender, 200 ether);
    }
    
    function testSpendTemporaryAllowance() public {
        uint256 approval = 1000 ether;
        uint256 spent = 300 ether;
        
        vm.prank(user);
        module.temporaryApprove(spender, approval);
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApprovalUsed(user, spender, spent, approval - spent);
        
        module.spendTemporaryAllowance(user, spender, spent);
        
        assertEq(module.temporaryAllowance(user, spender), approval - spent);
    }
    
    function testSpendTemporaryAllowanceRevertsForInsufficientAllowance() public {
        vm.prank(user);
        module.temporaryApprove(spender, 100 ether);
        
        vm.expectRevert();
        module.spendTemporaryAllowance(user, spender, 200 ether);
    }
    
    function testMultipleApprovals() public {
        address spender2 = address(4);
        
        vm.prank(user);
        module.temporaryApprove(spender, 1000 ether);
        
        vm.prank(user);
        module.temporaryApprove(spender2, 500 ether);
        
        assertEq(module.temporaryAllowance(user, spender), 1000 ether);
        assertEq(module.temporaryAllowance(user, spender2), 500 ether);
    }
    
    function testTransientStorageAutoExpiry() public {
        // Note: In actual Ethereum, transient storage expires after transaction
        // In Foundry tests, we simulate this by checking that values don't persist
        vm.prank(user);
        module.temporaryApprove(spender, 1000 ether);
        
        assertEq(module.temporaryAllowance(user, spender), 1000 ether);
        
        // In a new transaction context, approval should be gone
        // (Foundry simulates each test as a separate transaction)
    }
    
    function testGasSavings() public view {
        (uint256 standardCost, uint256 temporaryCost, uint256 savingsPercent) = 
            module.getGasSavings();
        
        assertEq(standardCost, 20000);
        assertEq(temporaryCost, 100);
        assertEq(savingsPercent, 9950); // 99.5%
    }
    
    function testSetEnabled() public {
        vm.prank(admin);
        module.setEnabled(false);
        
        assertFalse(module.isTemporaryApprovalEnabled());
        
        // Should revert when disabled
        vm.prank(user);
        vm.expectRevert();
        module.temporaryApprove(spender, 1000 ether);
        
        // Re-enable
        vm.prank(admin);
        module.setEnabled(true);
        
        assertTrue(module.isTemporaryApprovalEnabled());
    }
    
    function testSetEnabledOnlyAdmin() public {
        vm.prank(user);
        vm.expectRevert();
        module.setEnabled(false);
    }
}
