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
    address public tokenContract = address(0x999);
    
    event TemporaryApprovalSet(address indexed owner, address indexed spender, uint256 amount);
    event TemporaryApprovalUsed(address indexed owner, address indexed spender, uint256 amount);
    event TemporaryApprovalCleared(address indexed owner, address indexed spender);
    
    function setUp() public {
        implementation = new ERC20TemporaryApprovalModule();
        
        address clone = address(implementation).clone();
        module = ERC20TemporaryApprovalModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, tokenContract);
    }
    
    function testInitialization() public view {
        assertEq(module.tokenContract(), tokenContract);
    }
    
    function testSetTemporaryApproval() public {
        uint256 amount = 1000 ether;
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApprovalSet(user, spender, amount);
        
        vm.prank(user);
        module.setTemporaryApproval(spender, amount);
        
        assertEq(module.getTemporaryAllowance(user, spender), amount);
    }
    
    function testUseTemporaryApproval() public {
        uint256 approval = 1000 ether;
        uint256 spent = 300 ether;
        
        vm.prank(user);
        module.setTemporaryApproval(spender, approval);
        
        vm.expectEmit(true, true, false, true);
        emit TemporaryApprovalUsed(user, spender, spent);
        
        module.useTemporaryApproval(user, spender, spent);
        
        assertEq(module.getTemporaryAllowance(user, spender), approval - spent);
    }
    
    function testUseTemporaryApprovalRevertsForInsufficientAllowance() public {
        vm.prank(user);
        module.setTemporaryApproval(spender, 100 ether);
        
        vm.expectRevert();
        module.useTemporaryApproval(user, spender, 200 ether);
    }
    
    function testClearTemporaryApproval() public {
        vm.prank(user);
        module.setTemporaryApproval(spender, 1000 ether);
        
        vm.expectEmit(true, true, false, false);
        emit TemporaryApprovalCleared(user, spender);
        
        vm.prank(user);
        module.clearTemporaryApproval(spender);
        
        assertEq(module.getTemporaryAllowance(user, spender), 0);
    }
    
    function testHasTemporaryApproval() public {
        assertFalse(module.hasTemporaryApproval(user, spender));
        
        vm.prank(user);
        module.setTemporaryApproval(spender, 1000 ether);
        
        assertTrue(module.hasTemporaryApproval(user, spender));
        
        vm.prank(user);
        module.clearTemporaryApproval(spender);
        
        assertFalse(module.hasTemporaryApproval(user, spender));
    }
    
    function testMultipleApprovals() public {
        address spender2 = address(4);
        
        vm.prank(user);
        module.setTemporaryApproval(spender, 1000 ether);
        
        vm.prank(user);
        module.setTemporaryApproval(spender2, 500 ether);
        
        assertEq(module.getTemporaryAllowance(user, spender), 1000 ether);
        assertEq(module.getTemporaryAllowance(user, spender2), 500 ether);
    }
}
