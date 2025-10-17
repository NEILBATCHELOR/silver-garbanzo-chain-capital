// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ERC5216GranularApprovalModule} from "src/extensions/granular-approval/ERC5216GranularApprovalModule.sol";
import {ERC1155Master} from "src/masters/ERC1155Master.sol";

contract ERC5216GranularApprovalModuleTest is Test {
    ERC5216GranularApprovalModule public implementation;
    ERC5216GranularApprovalModule public module;
    ERC1155Master public token;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public admin = makeAddr("admin");
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public spender = makeAddr("spender");
    address public unauthorized = makeAddr("unauthorized");
    
    // Constants
    uint256 constant TOKEN_ID_1 = 1;
    uint256 constant TOKEN_ID_2 = 2;
    uint256 constant AMOUNT = 1000;
    
    // Events
    event ApprovalValue(address indexed owner, address indexed spender, uint256 indexed id, uint256 value);
    event ApprovalDecreased(
        address indexed owner,
        address indexed spender,
        uint256 indexed id,
        uint256 previousAmount,
        uint256 newAmount
    );
    event ApprovalsEnabledChanged(bool enabled);
    event ModuleInitialized(address indexed tokenContract);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy ERC1155 token
        token = new ERC1155Master();
        token.initialize(
            "Test Token",                                    // name
            "TEST",                                          // symbol
            "https://api.example.com/token/{id}.json",      // uri
            owner                                            // owner
        );
        
        // Deploy implementation
        implementation = new ERC5216GranularApprovalModule();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            ERC5216GranularApprovalModule.initialize.selector,
            address(token),
            owner
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        module = ERC5216GranularApprovalModule(address(proxy));
        
        // Grant roles
        module.grantRole(module.UPGRADER_ROLE(), admin);
        
        // Mint tokens to test users
        token.mint(user1, TOKEN_ID_1, AMOUNT, "");
        token.mint(user1, TOKEN_ID_2, AMOUNT, "");
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        assertEq(module.getTokenContract(), address(token));
        assertTrue(module.isEnabled());
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(module.hasRole(module.UPGRADER_ROLE(), owner));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        ERC5216GranularApprovalModule newModule = new ERC5216GranularApprovalModule();
        newModule.initialize(address(token), owner);
        
        vm.expectRevert();
        newModule.initialize(address(token), owner);
    }
    
    function test_RevertWhen_InvalidTokenContract() public {
        ERC5216GranularApprovalModule newModule = new ERC5216GranularApprovalModule();
        
        vm.expectRevert();
        newModule.initialize(address(0), owner);
    }
    
    function test_RevertWhen_InvalidAdmin() public {
        ERC5216GranularApprovalModule newModule = new ERC5216GranularApprovalModule();
        
        vm.expectRevert();
        newModule.initialize(address(token), address(0));
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyAdmin_CanSetApprovalsEnabled() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit ApprovalsEnabledChanged(false);
        module.setApprovalsEnabled(false);
        
        assertFalse(module.isEnabled());
    }
    
    function test_RevertWhen_UnauthorizedSetApprovalsEnabled() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.setApprovalsEnabled(false);
    }
    
    // ===== CORE FUNCTIONALITY TESTS =====
    
    function test_Approve_Success() public {
        uint256 approvalAmount = 100;
        
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit ApprovalValue(user1, spender, TOKEN_ID_1, approvalAmount);
        
        module.approve(spender, TOKEN_ID_1, approvalAmount);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), approvalAmount);
    }
    
    function test_Approve_MultipleTokens() public {
        vm.startPrank(user1);
        
        module.approve(spender, TOKEN_ID_1, 100);
        module.approve(spender, TOKEN_ID_2, 200);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 100);
        assertEq(module.allowance(user1, spender, TOKEN_ID_2), 200);
        
        vm.stopPrank();
    }
    
    function test_Approve_ZeroAmount() public {
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 0);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 0);
    }
    
    function test_IncreaseAllowance_Success() public {
        vm.startPrank(user1);
        
        // Initial approval
        module.approve(spender, TOKEN_ID_1, 100);
        
        // Increase allowance
        vm.expectEmit(true, true, true, true);
        emit ApprovalValue(user1, spender, TOKEN_ID_1, 250);
        
        module.increaseAllowance(spender, TOKEN_ID_1, 150);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 250);
        
        vm.stopPrank();
    }
    
    function test_DecreaseAllowance_Success() public {
        vm.startPrank(user1);
        
        // Initial approval
        module.approve(spender, TOKEN_ID_1, 200);
        
        // Decrease allowance
        vm.expectEmit(true, true, true, true);
        emit ApprovalDecreased(user1, spender, TOKEN_ID_1, 200, 100);
        
        module.decreaseAllowance(spender, TOKEN_ID_1, 100);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 100);
        
        vm.stopPrank();
    }
    
    function test_ConsumeAllowance_Success() public {
        // Setup approval
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 100);
        
        // Consume allowance (called by token contract)
        vm.prank(address(token));
        (bool success, uint256 remaining) = module.consumeAllowance(user1, spender, TOKEN_ID_1, 30);
        
        assertTrue(success);
        assertEq(remaining, 70);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 70);
    }
    
    function test_ConsumeAllowance_NoAllowance() public {
        // No prior approval
        vm.prank(address(token));
        (bool success, uint256 remaining) = module.consumeAllowance(user1, spender, TOKEN_ID_1, 30);
        
        assertFalse(success);
        assertEq(remaining, 0);
    }
    
    function test_ConsumeAllowance_InsufficientAllowance() public {
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 50);
        
        vm.prank(address(token));
        (bool success, uint256 remaining) = module.consumeAllowance(user1, spender, TOKEN_ID_1, 100);
        
        assertFalse(success);
        assertEq(remaining, 50);
    }
    
    // ===== INTEGRATION TESTS =====
    
    function test_Integration_MultipleApprovals() public {
        vm.startPrank(user1);
        
        // Approve different spenders for same token
        module.approve(spender, TOKEN_ID_1, 100);
        module.approve(user2, TOKEN_ID_1, 200);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 100);
        assertEq(module.allowance(user1, user2, TOKEN_ID_1), 200);
        
        // Approve same spender for different tokens
        module.approve(spender, TOKEN_ID_2, 300);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 100);
        assertEq(module.allowance(user1, spender, TOKEN_ID_2), 300);
        
        vm.stopPrank();
    }
    
    function test_Integration_ApproveConsumeWorkflow() public {
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 500);
        
        // Consume in multiple steps
        vm.startPrank(address(token));
        module.consumeAllowance(user1, spender, TOKEN_ID_1, 100);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 400);
        
        module.consumeAllowance(user1, spender, TOKEN_ID_1, 200);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 200);
        
        module.consumeAllowance(user1, spender, TOKEN_ID_1, 200);
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), 0);
        vm.stopPrank();
    }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_ApproveWhileDisabled() public {
        vm.prank(owner);
        module.setApprovalsEnabled(false);
        
        vm.prank(user1);
        vm.expectRevert();
        module.approve(spender, TOKEN_ID_1, 100);
    }
    
    function test_RevertWhen_ApproveInvalidSpender() public {
        vm.prank(user1);
        vm.expectRevert();
        module.approve(address(0), TOKEN_ID_1, 100);
    }
    
    function test_RevertWhen_ApproveSelf() public {
        vm.prank(user1);
        vm.expectRevert();
        module.approve(user1, TOKEN_ID_1, 100);
    }
    
    function test_RevertWhen_DecreaseAllowance_InsufficientAllowance() public {
        vm.startPrank(user1);
        module.approve(spender, TOKEN_ID_1, 50);
        
        vm.expectRevert();
        module.decreaseAllowance(spender, TOKEN_ID_1, 100);
        vm.stopPrank();
    }
    
    function test_RevertWhen_ConsumeAllowance_NotTokenContract() public {
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 100);
        
        vm.prank(unauthorized);
        vm.expectRevert();
        module.consumeAllowance(user1, spender, TOKEN_ID_1, 50);
    }
    
    function test_RevertWhen_ConsumeAllowance_Disabled() public {
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, 100);
        
        vm.prank(owner);
        module.setApprovalsEnabled(false);
        
        vm.prank(address(token));
        vm.expectRevert();
        module.consumeAllowance(user1, spender, TOKEN_ID_1, 50);
    }
    
    // ===== FUZZ TESTS =====
    
    function testFuzz_Approve(uint256 amount) public {
        amount = bound(amount, 0, type(uint128).max);
        
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, amount);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), amount);
    }
    
    function testFuzz_IncreaseAllowance(uint256 initial, uint256 increase) public {
        initial = bound(initial, 0, type(uint128).max);
        increase = bound(increase, 0, type(uint128).max - initial);
        
        vm.startPrank(user1);
        module.approve(spender, TOKEN_ID_1, initial);
        module.increaseAllowance(spender, TOKEN_ID_1, increase);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), initial + increase);
        vm.stopPrank();
    }
    
    function testFuzz_DecreaseAllowance(uint256 initial, uint256 decrease) public {
        initial = bound(initial, 1, type(uint128).max);
        decrease = bound(decrease, 0, initial);
        
        vm.startPrank(user1);
        module.approve(spender, TOKEN_ID_1, initial);
        module.decreaseAllowance(spender, TOKEN_ID_1, decrease);
        
        assertEq(module.allowance(user1, spender, TOKEN_ID_1), initial - decrease);
        vm.stopPrank();
    }
    
    function testFuzz_ConsumeAllowance(uint256 allowanceAmount, uint256 consumeAmount) public {
        allowanceAmount = bound(allowanceAmount, 1, type(uint128).max);
        consumeAmount = bound(consumeAmount, 1, allowanceAmount);
        
        vm.prank(user1);
        module.approve(spender, TOKEN_ID_1, allowanceAmount);
        
        vm.prank(address(token));
        (bool success, uint256 remaining) = module.consumeAllowance(user1, spender, TOKEN_ID_1, consumeAmount);
        
        assertTrue(success);
        assertEq(remaining, allowanceAmount - consumeAmount);
    }
    
    function testFuzz_MultipleTokenApprovals(uint8 numTokens) public {
        numTokens = uint8(bound(numTokens, 1, 10));
        
        vm.startPrank(owner);
        for (uint256 i = 3; i <= numTokens + 2; i++) {
            token.mint(user1, i, AMOUNT, "");
        }
        vm.stopPrank();
        
        vm.startPrank(user1);
        for (uint256 i = 1; i <= numTokens; i++) {
            module.approve(spender, i, 100 * i);
            assertEq(module.allowance(user1, spender, i), 100 * i);
        }
        vm.stopPrank();
    }
    
    // ===== VIEW FUNCTION TESTS =====
    
    function test_SupportsInterface() public view {
        bytes4 ierc5216Interface = type(IERC5216).interfaceId;
        assertTrue(module.supportsInterface(ierc5216Interface));
    }
    
    function test_GetTokenContract() public view {
        assertEq(module.getTokenContract(), address(token));
    }
    
    function test_IsEnabled() public {
        assertTrue(module.isEnabled());
        
        vm.prank(owner);
        module.setApprovalsEnabled(false);
        
        assertFalse(module.isEnabled());
    }
}

// Import interface for testing
import {IERC5216} from "src/extensions/granular-approval/interfaces/IERC5216.sol";
