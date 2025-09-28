// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PolicyEngine
 * @notice On-chain policy enforcement engine for token operations
 * @dev Validates token operations against configured policies before execution
 */
contract PolicyEngine is AccessControl, Pausable, ReentrancyGuard {
    // Role definitions
    bytes32 public constant POLICY_ADMIN = keccak256("POLICY_ADMIN");
    bytes32 public constant POLICY_OPERATOR = keccak256("POLICY_OPERATOR");
    
    // Policy structure
    struct Policy {
        bool active;
        uint256 maxAmount;           // Maximum amount per operation
        uint256 dailyLimit;          // Daily limit per operator
        uint256 monthlyLimit;        // Monthly limit per operator
        uint256 cooldownPeriod;      // Cooldown between operations
        bool requiresApproval;       // Requires multi-sig approval
        uint256 approvalThreshold;   // Number of approvals needed
        address[] approvers;         // List of approvers
        mapping(address => bool) isApprover;
    }
    
    // Daily tracking structure
    struct DailyTracking {
        uint256 amount;
        uint256 lastResetTime;
        uint256 operationCount;
    }
    
    // Monthly tracking structure
    struct MonthlyTracking {
        uint256 amount;
        uint256 lastResetTime;
        uint256 operationCount;
    }
    
    // Operation approval structure
    struct OperationApproval {
        address initiator;
        address token;
        string operation;
        uint256 amount;
        address from;
        address to;
        uint256 approvalCount;
        bool executed;
        mapping(address => bool) hasApproved;
    }
    
    // Storage
    mapping(address => mapping(string => Policy)) public tokenPolicies;
    mapping(address => mapping(address => mapping(string => DailyTracking))) public dailyTracking;
    mapping(address => mapping(address => mapping(string => MonthlyTracking))) public monthlyTracking;
    mapping(address => mapping(address => uint256)) public lastOperationTime;
    mapping(bytes32 => OperationApproval) public pendingApprovals;
    
    // Whitelist/Blacklist
    mapping(address => bool) public whitelistedAddresses;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => bool) public whitelistedTokens;
    
    // Events
    event PolicyRegistered(address indexed token, string operation, uint256 maxAmount, uint256 dailyLimit);
    event PolicyUpdated(address indexed token, string operation);
    event OperationValidated(address indexed token, address indexed operator, string operation, uint256 amount);
    event OperationRejected(address indexed token, address indexed operator, string operation, string reason);
    event ApprovalRequested(bytes32 indexed approvalId, address indexed token, string operation, uint256 amount);
    event ApprovalGranted(bytes32 indexed approvalId, address indexed approver);
    event OperationExecuted(bytes32 indexed approvalId, address indexed executor);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POLICY_ADMIN, msg.sender);
        _grantRole(POLICY_OPERATOR, msg.sender);
    }
    
    /**
     * @notice Register a policy for a token operation
     * @param token Token address
     * @param operation Operation type (mint, burn, transfer, lock, unlock, block, unblock)
     * @param maxAmount Maximum amount per operation
     * @param dailyLimit Daily limit per operator
     * @param monthlyLimit Monthly limit per operator
     * @param cooldownPeriod Cooldown between operations
     */
    function registerTokenPolicy(
        address token,
        string memory operation,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint256 cooldownPeriod
    ) external onlyRole(POLICY_ADMIN) {
        Policy storage policy = tokenPolicies[token][operation];
        policy.active = true;
        policy.maxAmount = maxAmount;
        policy.dailyLimit = dailyLimit;
        policy.monthlyLimit = monthlyLimit;
        policy.cooldownPeriod = cooldownPeriod;
        
        emit PolicyRegistered(token, operation, maxAmount, dailyLimit);
    }
    
    /**
     * @notice Configure approval requirements for a policy
     * @param token Token address
     * @param operation Operation type
     * @param requiresApproval Whether approval is required
     * @param threshold Number of approvals needed
     * @param approvers List of approvers
     */
    function configureApprovals(
        address token,
        string memory operation,
        bool requiresApproval,
        uint256 threshold,
        address[] memory approvers
    ) external onlyRole(POLICY_ADMIN) {
        Policy storage policy = tokenPolicies[token][operation];
        policy.requiresApproval = requiresApproval;
        policy.approvalThreshold = threshold;
        
        // Clear existing approvers
        for (uint i = 0; i < policy.approvers.length; i++) {
            policy.isApprover[policy.approvers[i]] = false;
        }
        delete policy.approvers;
        
        // Set new approvers
        for (uint i = 0; i < approvers.length; i++) {
            policy.approvers.push(approvers[i]);
            policy.isApprover[approvers[i]] = true;
        }
        
        emit PolicyUpdated(token, operation);
    }
    
    /**
     * @notice Validate an operation against configured policies
     * @param token Token address
     * @param operator Operator address
     * @param operation Operation type
     * @param amount Operation amount
     * @return valid Whether the operation is valid
     * @return reason Rejection reason if invalid
     */
    function validateOperation(
        address token,
        address operator,
        string memory operation,
        uint256 amount
    ) external whenNotPaused nonReentrant returns (bool valid, string memory reason) {
        // Check blacklist
        if (blacklistedAddresses[operator]) {
            emit OperationRejected(token, operator, operation, "Operator blacklisted");
            return (false, "Operator blacklisted");
        }
        
        // Check if token is whitelisted (if whitelist is active)
        if (!whitelistedTokens[token] && whitelistedTokens[address(0)]) {
            emit OperationRejected(token, operator, operation, "Token not whitelisted");
            return (false, "Token not whitelisted");
        }
        
        // Skip validation for whitelisted addresses
        if (whitelistedAddresses[operator]) {
            emit OperationValidated(token, operator, operation, amount);
            return (true, "");
        }
        
        Policy storage policy = tokenPolicies[token][operation];
        
        // If no policy exists, allow operation (permissive by default)
        if (!policy.active) {
            emit OperationValidated(token, operator, operation, amount);
            return (true, "");
        }
        
        // Check max amount
        if (amount > policy.maxAmount && policy.maxAmount > 0) {
            emit OperationRejected(token, operator, operation, "Amount exceeds maximum");
            return (false, "Amount exceeds maximum");
        }
        
        // Check cooldown period
        if (block.timestamp < lastOperationTime[operator][token] + policy.cooldownPeriod) {
            emit OperationRejected(token, operator, operation, "Cooldown period active");
            return (false, "Cooldown period active");
        }
        
        // Check daily limit
        if (policy.dailyLimit > 0) {
            _updateDailyTracking(token, operator, operation);
            if (dailyTracking[token][operator][operation].amount + amount > policy.dailyLimit) {
                emit OperationRejected(token, operator, operation, "Daily limit exceeded");
                return (false, "Daily limit exceeded");
            }
        }
        
        // Check monthly limit
        if (policy.monthlyLimit > 0) {
            _updateMonthlyTracking(token, operator, operation);
            if (monthlyTracking[token][operator][operation].amount + amount > policy.monthlyLimit) {
                emit OperationRejected(token, operator, operation, "Monthly limit exceeded");
                return (false, "Monthly limit exceeded");
            }
        }
        
        // Check if approval is required
        if (policy.requiresApproval) {
            bytes32 approvalId = _createApprovalRequest(token, operator, operation, amount, address(0), address(0));
            emit ApprovalRequested(approvalId, token, operation, amount);
            return (false, "Requires approval");
        }
        
        // Update tracking
        _recordOperation(token, operator, operation, amount);
        
        emit OperationValidated(token, operator, operation, amount);
        return (true, "");
    }
    
    /**
     * @notice Validate a transfer operation with from/to addresses
     */
    function validateTransfer(
        address token,
        address from,
        address to,
        uint256 amount
    ) external whenNotPaused nonReentrant returns (bool valid, string memory reason) {
        // Check both from and to addresses
        if (blacklistedAddresses[from]) {
            return (false, "Sender blacklisted");
        }
        if (blacklistedAddresses[to]) {
            return (false, "Receiver blacklisted");
        }
        
        // Validate as normal operation for sender
        (bool senderValid, string memory senderReason) = this.validateOperation(token, from, "transfer", amount);
        if (!senderValid) {
            return (senderValid, senderReason);
        }
        
        return (true, "");
    }
    
    /**
     * @notice Create approval request for operations requiring multi-sig
     */
    function _createApprovalRequest(
        address token,
        address operator,
        string memory operation,
        uint256 amount,
        address from,
        address to
    ) private returns (bytes32) {
        bytes32 approvalId = keccak256(abi.encodePacked(token, operator, operation, amount, block.timestamp));
        
        OperationApproval storage approval = pendingApprovals[approvalId];
        approval.initiator = operator;
        approval.token = token;
        approval.operation = operation;
        approval.amount = amount;
        approval.from = from;
        approval.to = to;
        approval.approvalCount = 0;
        approval.executed = false;
        
        return approvalId;
    }
    
    /**
     * @notice Approve a pending operation
     */
    function approveOperation(bytes32 approvalId) external {
        OperationApproval storage approval = pendingApprovals[approvalId];
        require(!approval.executed, "Already executed");
        
        Policy storage policy = tokenPolicies[approval.token][approval.operation];
        require(policy.isApprover[msg.sender], "Not an approver");
        require(!approval.hasApproved[msg.sender], "Already approved");
        
        approval.hasApproved[msg.sender] = true;
        approval.approvalCount++;
        
        emit ApprovalGranted(approvalId, msg.sender);
        
        // Auto-execute if threshold reached
        if (approval.approvalCount >= policy.approvalThreshold) {
            approval.executed = true;
            _recordOperation(approval.token, approval.initiator, approval.operation, approval.amount);
            emit OperationExecuted(approvalId, msg.sender);
        }
    }
    
    /**
     * @notice Update daily tracking
     */
    function _updateDailyTracking(address token, address operator, string memory operation) private {
        DailyTracking storage tracking = dailyTracking[token][operator][operation];
        
        // Reset if a new day
        if (block.timestamp >= tracking.lastResetTime + 1 days) {
            tracking.amount = 0;
            tracking.operationCount = 0;
            tracking.lastResetTime = block.timestamp;
        }
    }
    
    /**
     * @notice Update monthly tracking
     */
    function _updateMonthlyTracking(address token, address operator, string memory operation) private {
        MonthlyTracking storage tracking = monthlyTracking[token][operator][operation];
        
        // Reset if a new month (30 days for simplicity)
        if (block.timestamp >= tracking.lastResetTime + 30 days) {
            tracking.amount = 0;
            tracking.operationCount = 0;
            tracking.lastResetTime = block.timestamp;
        }
    }
    
    /**
     * @notice Record an operation in tracking
     */
    function _recordOperation(address token, address operator, string memory operation, uint256 amount) private {
        // Update daily tracking
        DailyTracking storage daily = dailyTracking[token][operator][operation];
        daily.amount += amount;
        daily.operationCount++;
        
        // Update monthly tracking
        MonthlyTracking storage monthly = monthlyTracking[token][operator][operation];
        monthly.amount += amount;
        monthly.operationCount++;
        
        // Update last operation time
        lastOperationTime[operator][token] = block.timestamp;
    }
    
    /**
     * @notice Add address to whitelist
     */
    function whitelistAddress(address addr) external onlyRole(POLICY_ADMIN) {
        whitelistedAddresses[addr] = true;
    }
    
    /**
     * @notice Remove address from whitelist
     */
    function removeFromWhitelist(address addr) external onlyRole(POLICY_ADMIN) {
        whitelistedAddresses[addr] = false;
    }
    
    /**
     * @notice Add address to blacklist
     */
    function blacklistAddress(address addr) external onlyRole(COMPLIANCE_ROLE) {
        blacklistedAddresses[addr] = true;
    }
    
    /**
     * @notice Remove address from blacklist
     */
    function removeFromBlacklist(address addr) external onlyRole(COMPLIANCE_ROLE) {
        blacklistedAddresses[addr] = false;
    }
    
    /**
     * @notice Whitelist a token for operations
     */
    function whitelistToken(address token) external onlyRole(POLICY_ADMIN) {
        whitelistedTokens[token] = true;
    }
    
    /**
     * @notice Pause all policy validations
     */
    function pause() external onlyRole(POLICY_ADMIN) {
        _pause();
    }
    
    /**
     * @notice Unpause policy validations
     */
    function unpause() external onlyRole(POLICY_ADMIN) {
        _unpause();
    }
    
    /**
     * @notice Get policy details for a token operation
     */
    function getPolicy(address token, string memory operation) external view returns (
        bool active,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 monthlyLimit,
        uint256 cooldownPeriod,
        bool requiresApproval,
        uint256 approvalThreshold
    ) {
        Policy storage policy = tokenPolicies[token][operation];
        return (
            policy.active,
            policy.maxAmount,
            policy.dailyLimit,
            policy.monthlyLimit,
            policy.cooldownPeriod,
            policy.requiresApproval,
            policy.approvalThreshold
        );
    }
}
