// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/policy/PolicyEngine.sol";
import "../../src/policy/interfaces/IPolicyEngine.sol";

contract PolicyEngineTest is Test {
    PolicyEngine public implementation;
    PolicyEngine public policyEngine;
    
    address public admin = address(1);
    address public policyAdmin = address(2);
    address public approver1 = address(3);
    address public approver2 = address(4);
    address public token = address(100);
    address public operator = address(200);
    address public target = address(300);
    
    // Test constants
    string constant OPERATION_TRANSFER = "TRANSFER";
    string constant OPERATION_MINT = "MINT";
    string constant OPERATION_BURN = "BURN";
    uint256 constant MAX_AMOUNT = 1000 * 10**18;
    uint256 constant DAILY_LIMIT = 5000 * 10**18;
    uint256 constant COOLDOWN_PERIOD = 1 hours;
    
    // Events to test
    event PolicyCreated(
        address indexed token,
        string operationType,
        uint256 maxAmount,
        uint256 dailyLimit
    );
    
    event PolicyUpdated(
        address indexed token,
        string operationType,
        bool active
    );
    
    event OperationValidated(
        address indexed token,
        address indexed operator,
        string operationType,
        uint256 amount,
        bool approved
    );
    
    event PolicyViolation(
        address indexed token,
        address indexed operator,
        string operationType,
        string reason
    );
    
    event ApprovalRequested(
        address indexed token,
        uint256 indexed requestId,
        address indexed requester,
        string operationType,
        uint256 amount
    );
    
    event ApprovalGranted(
        address indexed token,
        uint256 indexed requestId,
        address indexed approver
    );
    
    function setUp() public {
        // Deploy implementation
        implementation = new PolicyEngine();
        
        // Deploy proxy and initialize
        bytes memory initData = abi.encodeWithSelector(
            PolicyEngine.initialize.selector,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), initData);
        policyEngine = PolicyEngine(address(proxy));
        
        // Grant roles
        vm.startPrank(admin);
        policyEngine.grantRole(policyEngine.POLICY_ADMIN_ROLE(), policyAdmin);
        policyEngine.grantRole(policyEngine.APPROVER_ROLE(), approver1);
        policyEngine.grantRole(policyEngine.APPROVER_ROLE(), approver2);
        vm.stopPrank();
    }
    
    // ============ Initialization Tests ============
    
    function testInitialize() public view {
        assertTrue(policyEngine.hasRole(policyEngine.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(policyEngine.hasRole(policyEngine.POLICY_ADMIN_ROLE(), admin));
        assertTrue(policyEngine.hasRole(policyEngine.APPROVER_ROLE(), admin));
        assertTrue(policyEngine.hasRole(policyEngine.UPGRADER_ROLE(), admin));
    }
    
    function testCannotReinitialize() public {
        vm.expectRevert();
        policyEngine.initialize(admin);
    }
    
    // ============ Policy Creation Tests ============
    
    function testCreatePolicy() public {
        vm.startPrank(policyAdmin);
        
        vm.expectEmit(true, false, false, true);
        emit PolicyCreated(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT);
        
        policyEngine.createPolicy(
            token,
            OPERATION_TRANSFER,
            MAX_AMOUNT,
            DAILY_LIMIT,
            COOLDOWN_PERIOD
        );
        
        vm.stopPrank();
        
        // Verify policy was created
        IPolicyEngine.Policy memory policy = policyEngine.getPolicy(token, OPERATION_TRANSFER);
        assertTrue(policy.active);
        assertEq(policy.maxAmount, MAX_AMOUNT);
        assertEq(policy.dailyLimit, DAILY_LIMIT);
        assertEq(policy.cooldownPeriod, COOLDOWN_PERIOD);
        assertFalse(policy.requiresApproval);
    }
    
    function testCreatePolicyRequiresRole() public {
        vm.prank(operator);
        vm.expectRevert();
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
    }
    
    function testUpdatePolicy() public {
        // Create initial policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // Update policy
        uint256 newMaxAmount = 2000 * 10**18;
        uint256 newDailyLimit = 10000 * 10**18;
        
        vm.startPrank(policyAdmin);
        vm.expectEmit(true, false, false, true);
        emit PolicyUpdated(token, OPERATION_TRANSFER, true);
        
        policyEngine.updatePolicy(token, OPERATION_TRANSFER, true, newMaxAmount, newDailyLimit);
        vm.stopPrank();
        
        // Verify update
        IPolicyEngine.Policy memory policy = policyEngine.getPolicy(token, OPERATION_TRANSFER);
        assertEq(policy.maxAmount, newMaxAmount);
        assertEq(policy.dailyLimit, newDailyLimit);
    }
    
    // ============ Operation Validation Tests ============
    
    function testValidateOperationNoPolicyAllows() public {
        // No policy exists, should allow operation
        vm.prank(token);
        (bool approved, string memory reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            100 * 10**18
        );
        
        assertTrue(approved);
        assertEq(reason, "");
    }
    
    function testValidateOperationWithinLimits() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // Validate operation within limits
        vm.prank(token);
        (bool approved, string memory reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            500 * 10**18
        );
        
        assertTrue(approved);
        assertEq(reason, "");
    }
    
    function testValidateOperationExceedsMaxAmount() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // Try to exceed max amount
        vm.prank(token);
        (bool approved, string memory reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            1500 * 10**18
        );
        
        assertFalse(approved);
        assertEq(reason, "Exceeds maximum amount per operation");
    }
    
    function testValidateOperationExceedsDailyLimit() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // First operation succeeds
        vm.prank(token);
        policyEngine.validateOperation(token, operator, OPERATION_TRANSFER, 1000 * 10**18);
        
        // Second operation would exceed daily limit
        vm.prank(token);
        (bool approved, string memory reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            4500 * 10**18
        );
        
        assertFalse(approved);
        assertEq(reason, "Exceeds daily limit");
    }
    
    function testValidateOperationCooldownPeriod() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // First operation succeeds
        vm.prank(token);
        policyEngine.validateOperation(token, operator, OPERATION_TRANSFER, 100 * 10**18);
        
        // Second operation fails due to cooldown
        vm.prank(token);
        (bool approved, string memory reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            100 * 10**18
        );
        
        assertFalse(approved);
        assertEq(reason, "Operation in cooldown period");
        
        // Wait for cooldown to pass
        vm.warp(block.timestamp + COOLDOWN_PERIOD + 1);
        
        // Third operation succeeds after cooldown
        vm.prank(token);
        (approved, reason) = policyEngine.validateOperation(
            token,
            operator,
            OPERATION_TRANSFER,
            100 * 10**18
        );
        
        assertTrue(approved);
        assertEq(reason, "");
    }
    
    // ============ Approval Workflow Tests ============
    
    function testEnableApprovalRequirement() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        
        // Enable approval requirement
        vm.prank(policyAdmin);
        policyEngine.enableApprovalRequirement(token, OPERATION_TRANSFER, 2);
        
        // Verify approval is now required
        IPolicyEngine.Policy memory policy = policyEngine.getPolicy(token, OPERATION_TRANSFER);
        assertTrue(policy.requiresApproval);
        assertEq(policy.approvalThreshold, 2);
    }
    
    function testRequestApproval() public {
        // Setup policy with approval requirement
        vm.startPrank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        policyEngine.enableApprovalRequirement(token, OPERATION_TRANSFER, 2);
        vm.stopPrank();
        
        // Request approval
        vm.prank(operator);
        vm.expectEmit(true, true, false, true);
        emit ApprovalRequested(token, 0, operator, OPERATION_TRANSFER, 500 * 10**18);
        
        uint256 requestId = policyEngine.requestApproval(
            token,
            OPERATION_TRANSFER,
            500 * 10**18,
            target
        );
        
        assertEq(requestId, 0);
        
        // Verify request
        IPolicyEngine.ApprovalRequest memory request = policyEngine.getApprovalRequest(token, requestId);
        assertEq(request.requester, operator);
        assertEq(request.operationType, OPERATION_TRANSFER);
        assertEq(request.amount, 500 * 10**18);
        assertEq(request.target, target);
        assertEq(request.approvals, 0);
        assertFalse(request.executed);
    }
    
    function testApproveRequest() public {
        // Setup and create request
        vm.startPrank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        policyEngine.enableApprovalRequirement(token, OPERATION_TRANSFER, 2);
        vm.stopPrank();
        
        vm.prank(operator);
        uint256 requestId = policyEngine.requestApproval(token, OPERATION_TRANSFER, 500 * 10**18, target);
        
        // First approval
        vm.prank(approver1);
        vm.expectEmit(true, true, true, false);
        emit ApprovalGranted(token, requestId, approver1);
        policyEngine.approveRequest(token, requestId);
        
        // Verify approval count
        IPolicyEngine.ApprovalRequest memory request = policyEngine.getApprovalRequest(token, requestId);
        assertEq(request.approvals, 1);
    }
    
    function testCannotApproveRequestTwice() public {
        // Setup and create request
        vm.startPrank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        policyEngine.enableApprovalRequirement(token, OPERATION_TRANSFER, 2);
        vm.stopPrank();
        
        vm.prank(operator);
        uint256 requestId = policyEngine.requestApproval(token, OPERATION_TRANSFER, 500 * 10**18, target);
        
        // First approval
        vm.prank(approver1);
        policyEngine.approveRequest(token, requestId);
        
        // Second approval from same approver should fail
        vm.prank(approver1);
        vm.expectRevert();
        policyEngine.approveRequest(token, requestId);
    }
    
    function testIsOperationApproved() public {
        // Setup and create request
        vm.startPrank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, COOLDOWN_PERIOD);
        policyEngine.enableApprovalRequirement(token, OPERATION_TRANSFER, 2);
        vm.stopPrank();
        
        vm.prank(operator);
        uint256 requestId = policyEngine.requestApproval(token, OPERATION_TRANSFER, 500 * 10**18, target);
        
        // Not approved yet
        assertFalse(policyEngine.isOperationApproved(token, requestId));
        
        // First approval
        vm.prank(approver1);
        policyEngine.approveRequest(token, requestId);
        assertFalse(policyEngine.isOperationApproved(token, requestId));
        
        // Second approval - threshold met
        vm.prank(approver2);
        policyEngine.approveRequest(token, requestId);
        assertTrue(policyEngine.isOperationApproved(token, requestId));
    }
    
    // ============ Daily Limit Reset Tests ============
    
    function testDailyLimitResets() public {
        // Create policy
        vm.prank(policyAdmin);
        policyEngine.createPolicy(token, OPERATION_TRANSFER, MAX_AMOUNT, DAILY_LIMIT, 0);
        
        // Use some of daily limit
        vm.prank(token);
        policyEngine.validateOperation(token, operator, OPERATION_TRANSFER, 3000 * 10**18);
        
        // Try to use more - should fail
        vm.prank(token);
        (bool approved, ) = policyEngine.validateOperation(token, operator, OPERATION_TRANSFER, 3000 * 10**18);
        assertFalse(approved);
        
        // Advance time to next day
        vm.warp(block.timestamp + 1 days);
        
        // Should reset and allow operation
        vm.prank(token);
        (approved, ) = policyEngine.validateOperation(token, operator, OPERATION_TRANSFER, 3000 * 10**18);
        assertTrue(approved);
    }
    
    // ============ UUPS Upgrade Tests ============
    
    function testUpgradeAuthorization() public {
        PolicyEngine newImplementation = new PolicyEngine();
        
        // Only UPGRADER_ROLE can upgrade
        vm.prank(admin);
        policyEngine.upgradeToAndCall(address(newImplementation), "");
        
        // Non-upgrader cannot upgrade
        vm.prank(operator);
        vm.expectRevert();
        policyEngine.upgradeToAndCall(address(newImplementation), "");
    }
}
