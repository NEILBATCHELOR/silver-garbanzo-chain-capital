// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IPolicyEngine.sol";

/**
 * @title PolicyEngine
 * @notice On-chain policy enforcement for token operations
 * @dev Implements UUPS upgradeable pattern for policy management
 * 
 * Features:
 * - Per-token, per-operation policy configuration
 * - Amount limits (per-operation and daily cumulative)
 * - Cooldown periods between operations
 * - Multi-signature approval requirements
 * - Comprehensive event logging for compliance
 * 
 * Integration:
 * - Token masters call validateOperation() before executing operations
 * - Policies are enforced on-chain with transparent rules
 * - Syncs with off-chain PolicyEngine.ts for hybrid enforcement
 */
contract PolicyEngine is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IPolicyEngine
{
    // ============ Roles ============
    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    
    // token => operationType => Policy
    mapping(address => mapping(string => Policy)) private policies;
    
    // token => operator => operationType => OperationTracking
    mapping(address => mapping(address => mapping(string => OperationTracking))) private operationTracking;
    
    // token => requestId => ApprovalRequest
    mapping(address => mapping(uint256 => ApprovalRequest)) private approvalRequests;
    
    // token => next request ID
    mapping(address => uint256) private nextRequestId;
    
    // token => operator => operationType => array of approvers
    mapping(address => mapping(string => address[])) private approvers;
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the policy engine
     * @param admin Address to grant admin roles
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(POLICY_ADMIN_ROLE, admin);
        _grantRole(APPROVER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Core Validation Functions ============
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function validateOperation(
        address token,
        address operator,
        string memory operationType,
        uint256 amount
    ) external override returns (bool approved, string memory reason) {
        return _validateOperation(token, operator, address(0), operationType, amount);
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function validateOperationWithTarget(
        address token,
        address operator,
        address target,
        string memory operationType,
        uint256 amount
    ) external override returns (bool approved, string memory reason) {
        return _validateOperation(token, operator, target, operationType, amount);
    }
    
    /**
     * @notice Internal validation logic
     */
    function _validateOperation(
        address token,
        address operator,
        address target,
        string memory operationType,
        uint256 amount
    ) internal returns (bool approved, string memory reason) {
        // Get policy for this token and operation
        Policy storage policy = policies[token][operationType];
        
        // If policy doesn't exist or is inactive, allow by default
        if (!policy.active) {
            emit OperationValidated(token, operator, operationType, amount, true);
            return (true, "");
        }
        
        // Check if approval is required
        if (policy.requiresApproval) {
            reason = "Operation requires multi-signature approval";
            emit PolicyViolation(token, operator, operationType, reason);
            return (false, reason);
        }
        
        // Check max amount limit
        if (policy.maxAmount > 0 && amount > policy.maxAmount) {
            reason = "Exceeds maximum amount per operation";
            emit PolicyViolation(token, operator, operationType, reason);
            return (false, reason);
        }
        
        // Get or initialize tracking data
        OperationTracking storage tracking = operationTracking[token][operator][operationType];
        
        // Check cooldown period
        if (policy.cooldownPeriod > 0) {
            if (block.timestamp < tracking.lastOperationTime + policy.cooldownPeriod) {
                reason = "Operation in cooldown period";
                emit PolicyViolation(token, operator, operationType, reason);
                return (false, reason);
            }
        }
        
        // Check daily limit
        if (policy.dailyLimit > 0) {
            // Reset daily total if it's a new day
            if (_isNewDay(tracking.dailyResetTime)) {
                tracking.dailyTotal = 0;
                tracking.dailyResetTime = _getStartOfDay();
            }
            
            // Check if this operation would exceed daily limit
            if (tracking.dailyTotal + amount > policy.dailyLimit) {
                reason = "Exceeds daily limit";
                emit PolicyViolation(token, operator, operationType, reason);
                return (false, reason);
            }
            
            // Update daily total
            tracking.dailyTotal += amount;
        }
        
        // Update last operation time
        tracking.lastOperationTime = block.timestamp;
        
        // Operation approved
        emit OperationValidated(token, operator, operationType, amount, true);
        return (true, "");
    }
    
    // ============ Policy Management Functions ============
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function createPolicy(
        address token,
        string memory operationType,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 cooldownPeriod
    ) external override onlyRole(POLICY_ADMIN_ROLE) {
        Policy storage policy = policies[token][operationType];
        
        policy.active = true;
        policy.maxAmount = maxAmount;
        policy.dailyLimit = dailyLimit;
        policy.cooldownPeriod = cooldownPeriod;
        policy.requiresApproval = false;
        policy.approvalThreshold = 0;
        
        emit PolicyCreated(token, operationType, maxAmount, dailyLimit);
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function updatePolicy(
        address token,
        string memory operationType,
        bool active,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external override onlyRole(POLICY_ADMIN_ROLE) {
        Policy storage policy = policies[token][operationType];
        
        policy.active = active;
        policy.maxAmount = maxAmount;
        policy.dailyLimit = dailyLimit;
        
        emit PolicyUpdated(token, operationType, active);
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function enableApprovalRequirement(
        address token,
        string memory operationType,
        uint8 threshold
    ) external override onlyRole(POLICY_ADMIN_ROLE) {
        require(threshold > 0, "Threshold must be greater than 0");
        
        Policy storage policy = policies[token][operationType];
        policy.requiresApproval = true;
        policy.approvalThreshold = threshold;
        
        emit PolicyUpdated(token, operationType, policy.active);
    }
    
    /**
     * @notice Add an approver for a token and operation type
     * @param token Token address
     * @param operationType Type of operation
     * @param approver Address to add as approver
     */
    function addApprover(
        address token,
        string memory operationType,
        address approver
    ) external onlyRole(POLICY_ADMIN_ROLE) {
        approvers[token][operationType].push(approver);
    }
    
    // ============ Approval Management Functions ============
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function requestApproval(
        address token,
        string memory operationType,
        uint256 amount,
        address target
    ) external override returns (uint256 requestId) {
        Policy storage policy = policies[token][operationType];
        require(policy.active, "Policy not active");
        require(policy.requiresApproval, "Approval not required");
        
        requestId = nextRequestId[token]++;
        ApprovalRequest storage request = approvalRequests[token][requestId];
        
        request.requester = msg.sender;
        request.operationType = operationType;
        request.amount = amount;
        request.target = target;
        request.approvals = 0;
        request.executed = false;
        request.timestamp = block.timestamp;
        
        emit ApprovalRequested(token, requestId, msg.sender, operationType, amount);
        
        return requestId;
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function approveRequest(
        address token,
        uint256 requestId
    ) external override onlyRole(APPROVER_ROLE) {
        ApprovalRequest storage request = approvalRequests[token][requestId];
        
        require(!request.executed, "Request already executed");
        require(!request.hasApproved[msg.sender], "Already approved");
        
        request.hasApproved[msg.sender] = true;
        request.approvals++;
        
        emit ApprovalGranted(token, requestId, msg.sender);
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function executeApprovedRequest(
        address token,
        uint256 requestId
    ) external override {
        ApprovalRequest storage request = approvalRequests[token][requestId];
        Policy storage policy = policies[token][request.operationType];
        
        require(!request.executed, "Request already executed");
        require(request.requester == msg.sender, "Only requester can execute");
        require(request.approvals >= policy.approvalThreshold, "Insufficient approvals");
        
        request.executed = true;
        
        // Note: Actual operation execution happens in the token contract
        // This just marks the request as approved and executable
    }
    
    // ============ View Functions ============
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function getPolicy(
        address token,
        string memory operationType
    ) external view override returns (Policy memory) {
        return policies[token][operationType];
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function canOperate(
        address token,
        address operator,
        string memory operationType,
        uint256 amount
    ) external view override returns (bool, string memory) {
        Policy storage policy = policies[token][operationType];
        
        if (!policy.active) {
            return (true, "");
        }
        
        if (policy.requiresApproval) {
            return (false, "Operation requires multi-signature approval");
        }
        
        if (policy.maxAmount > 0 && amount > policy.maxAmount) {
            return (false, "Exceeds maximum amount per operation");
        }
        
        OperationTracking storage tracking = operationTracking[token][operator][operationType];
        
        if (policy.cooldownPeriod > 0) {
            if (block.timestamp < tracking.lastOperationTime + policy.cooldownPeriod) {
                return (false, "Operation in cooldown period");
            }
        }
        
        if (policy.dailyLimit > 0) {
            uint256 currentTotal = tracking.dailyTotal;
            if (_isNewDay(tracking.dailyResetTime)) {
                currentTotal = 0;
            }
            
            if (currentTotal + amount > policy.dailyLimit) {
                return (false, "Exceeds daily limit");
            }
        }
        
        return (true, "");
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function getRemainingDailyLimit(
        address token,
        address operator,
        string memory operationType
    ) external view override returns (uint256 remaining) {
        Policy storage policy = policies[token][operationType];
        
        if (policy.dailyLimit == 0) {
            return type(uint256).max; // Unlimited
        }
        
        OperationTracking storage tracking = operationTracking[token][operator][operationType];
        
        if (_isNewDay(tracking.dailyResetTime)) {
            return policy.dailyLimit;
        }
        
        if (tracking.dailyTotal >= policy.dailyLimit) {
            return 0;
        }
        
        return policy.dailyLimit - tracking.dailyTotal;
    }
    
    /**
     * @inheritdoc IPolicyEngine
     */
    function getApprovalRequest(
        address token,
        uint256 requestId
    ) external view override returns (
        address requester,
        string memory operationType,
        uint256 amount,
        uint8 approvals,
        bool executed
    ) {
        ApprovalRequest storage request = approvalRequests[token][requestId];
        
        return (
            request.requester,
            request.operationType,
            request.amount,
            request.approvals,
            request.executed
        );
    }
    
    /**
     * @notice Check if an address has approved a request
     * @param token Token address
     * @param requestId Request ID
     * @param approver Address to check
     * @return Whether the address has approved
     */
    function hasApproved(
        address token,
        uint256 requestId,
        address approver
    ) external view returns (bool) {
        return approvalRequests[token][requestId].hasApproved[approver];
    }
    
    // ============ Internal Helper Functions ============
    
    /**
     * @notice Check if it's a new day since the last reset
     * @param lastResetTime Timestamp of last reset
     * @return isNew Whether it's a new day
     */
    function _isNewDay(uint256 lastResetTime) internal view returns (bool) {
        if (lastResetTime == 0) {
            return true;
        }
        return (block.timestamp / 86400) > (lastResetTime / 86400);
    }
    
    /**
     * @notice Get the start of the current day (UTC)
     * @return timestamp Start of current day
     */
    function _getStartOfDay() internal view returns (uint256) {
        return (block.timestamp / 86400) * 86400;
    }
    
    // ============ UUPS Upgrade Authorization ============
    
    /**
     * @notice Authorize contract upgrade
     * @param newImplementation Address of new implementation
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
