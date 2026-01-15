// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IPolicyEngine
 * @notice Interface for on-chain policy enforcement
 * @dev Used by token masters to validate operations against defined policies
 */
interface IPolicyEngine {
    // ============ Structs ============
    
    /**
     * @notice Policy definition structure
     * @param active Whether the policy is currently active
     * @param maxAmount Maximum allowed amount per operation (0 = unlimited)
     * @param dailyLimit Daily cumulative limit (0 = unlimited)
     * @param cooldownPeriod Minimum seconds between operations (0 = none)
     * @param requiresApproval Whether the operation requires multi-sig approval
     * @param approvalThreshold Number of approvals required
     * @param activationTime When policy becomes active (0 = no restriction)
     * @param expirationTime When policy expires (0 = never expires)
     * @param hasTimeRestrictions Flag indicating if time-based validation is enabled
     * @param requiresWhitelist Whether operation requires whitelisted address
     * @param whitelistEnabled Whether whitelist checking is active
     */
    struct Policy {
        bool active;
        uint256 maxAmount;
        uint256 dailyLimit;
        uint256 cooldownPeriod;
        bool requiresApproval;
        uint8 approvalThreshold;
        uint256 activationTime;      //  Phase 2: Lock-up support
        uint256 expirationTime;      //  Phase 2: Lock-up support
        bool hasTimeRestrictions;    //  Phase 2: Lock-up support
        bool requiresWhitelist;      //  Phase 3: Whitelist support
        bool whitelistEnabled;       //  Phase 3: Whitelist support
    }
    
    /**
     * @notice Operation tracking data
     * @param lastOperationTime Timestamp of last operation
     * @param dailyTotal Daily cumulative amount
     * @param dailyResetTime When the daily total resets
     */
    struct OperationTracking {
        uint256 lastOperationTime;
        uint256 dailyTotal;
        uint256 dailyResetTime;
    }
    
    /**
     * @notice Approval request structure
     * @param requester Address that initiated the request
     * @param operationType Type of operation
     * @param amount Amount involved
     * @param target Target address (to/from)
     * @param approvals Current number of approvals
     * @param executed Whether the operation was executed
     * @param timestamp When the request was created
     */
    struct ApprovalRequest {
        address requester;
        string operationType;
        uint256 amount;
        address target;
        uint8 approvals;
        bool executed;
        uint256 timestamp;
        mapping(address => bool) hasApproved;
    }
    
    // ============ Events ============
    
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
    
    event ApprovalRequested(
        address indexed token,
        uint256 indexed requestId,
        address requester,
        string operationType,
        uint256 amount
    );
    
    event ApprovalGranted(
        address indexed token,
        uint256 indexed requestId,
        address approver
    );
    
    event PolicyViolation(
        address indexed token,
        address indexed operator,
        string operationType,
        string reason
    );
    
    event PolicyTimeRestrictionSet(
        address indexed token,
        string operationType,
        uint256 activationTime,
        uint256 expirationTime
    );
    
    event TimeRestrictionViolation(
        address indexed token,
        address indexed operator,
        string operationType,
        uint256 attemptedTime,
        string reason
    );
    
    // ✅ Phase 3: Whitelist Events
    event AddressWhitelisted(
        address indexed token,
        string operationType,
        address indexed whitelistedAddress
    );
    
    event AddressRemovedFromWhitelist(
        address indexed token,
        string operationType,
        address indexed removedAddress
    );
    
    event WhitelistRequirementEnabled(
        address indexed token,
        string operationType
    );
    
    event WhitelistViolation(
        address indexed token,
        address indexed operator,
        address indexed target,
        string operationType,
        string reason
    );
    
    // ============ Core Functions ============
    
    /**
     * @notice Validate an operation against policies
     * @param token Token address
     * @param operator Address performing the operation
     * @param operationType Type of operation (mint, burn, transfer, etc.)
     * @param amount Amount involved in the operation
     * @return approved Whether the operation is approved
     * @return reason Reason if not approved
     */
    function validateOperation(
        address token,
        address operator,
        string memory operationType,
        uint256 amount
    ) external returns (bool approved, string memory reason);
    
    /**
     * @notice Validate operation with target address
     * @param token Token address
     * @param operator Address performing the operation
     * @param target Target address (to/from)
     * @param operationType Type of operation
     * @param amount Amount involved
     * @return approved Whether the operation is approved
     * @return reason Reason if not approved
     */
    function validateOperationWithTarget(
        address token,
        address operator,
        address target,
        string memory operationType,
        uint256 amount
    ) external returns (bool approved, string memory reason);
    
    // ============ Policy Management ============
    
    /**
     * @notice Create a new policy for a token and operation type
     * @param token Token address
     * @param operationType Type of operation
     * @param maxAmount Maximum amount per operation
     * @param dailyLimit Daily cumulative limit
     * @param cooldownPeriod Cooldown period in seconds
     * @param activationTime When policy becomes active (0 = immediate)
     * @param expirationTime When policy expires (0 = never)
     */
    function createPolicy(
        address token,
        string memory operationType,
        uint256 maxAmount,
        uint256 dailyLimit,
        uint256 cooldownPeriod,
        uint256 activationTime,      //  Phase 2
        uint256 expirationTime       //  Phase 2
    ) external;
    
    /**
     * @notice Update an existing policy
     * @param token Token address
     * @param operationType Type of operation
     * @param active Whether the policy should be active
     * @param maxAmount Maximum amount per operation
     * @param dailyLimit Daily cumulative limit
     */
    function updatePolicy(
        address token,
        string memory operationType,
        bool active,
        uint256 maxAmount,
        uint256 dailyLimit
    ) external;
    
    /**
     * @notice Set time restrictions for a policy
     * @param token Token address
     * @param operationType Type of operation
     * @param activationTime When policy becomes active (0 = immediate)
     * @param expirationTime When policy expires (0 = never)
     */
    function setTimeRestrictions(
        address token,
        string memory operationType,
        uint256 activationTime,
        uint256 expirationTime
    ) external;
    
    /**
     * @notice Enable multi-sig approval requirement for an operation
     * @param token Token address
     * @param operationType Type of operation
     * @param threshold Number of approvals required
     */
    function enableApprovalRequirement(
        address token,
        string memory operationType,
        uint8 threshold
    ) external;
    
    // ============ Approval Management ============
    
    /**
     * @notice Request approval for an operation
     * @param token Token address
     * @param operationType Type of operation
     * @param amount Amount involved
     * @param target Target address
     * @return requestId ID of the approval request
     */
    function requestApproval(
        address token,
        string memory operationType,
        uint256 amount,
        address target
    ) external returns (uint256 requestId);
    
    /**
     * @notice Approve a pending request
     * @param token Token address
     * @param requestId ID of the request
     */
    function approveRequest(
        address token,
        uint256 requestId
    ) external;
    
    /**
     * @notice Execute an approved request
     * @param token Token address
     * @param requestId ID of the request
     */
    function executeApprovedRequest(
        address token,
        uint256 requestId
    ) external;
    
    // ============ Whitelist Management (Phase 3) ============
    
    /**
     * @notice Add an address to the whitelist for a token and operation
     * @param token Token address
     * @param operationType Type of operation
     * @param addressToAdd Address to whitelist
     */
    function addToWhitelist(
        address token,
        string memory operationType,
        address addressToAdd
    ) external;
    
    /**
     * @notice Add multiple addresses to whitelist (batch operation)
     * @param token Token address
     * @param operationType Type of operation
     * @param addresses Array of addresses to whitelist
     */
    function addToWhitelistBatch(
        address token,
        string memory operationType,
        address[] memory addresses
    ) external;
    
    /**
     * @notice Remove an address from the whitelist
     * @param token Token address
     * @param operationType Type of operation
     * @param addressToRemove Address to remove
     */
    function removeFromWhitelist(
        address token,
        string memory operationType,
        address addressToRemove
    ) external;
    
    /**
     * @notice Enable whitelist requirement for a policy
     * @param token Token address
     * @param operationType Type of operation
     */
    function enableWhitelistRequirement(
        address token,
        string memory operationType
    ) external;
    
    /**
     * @notice Check if an address is whitelisted
     * @param token Token address
     * @param operationType Type of operation
     * @param addr Address to check
     * @return isWhitelisted Whether the address is whitelisted
     */
    function isAddressWhitelisted(
        address token,
        string memory operationType,
        address addr
    ) external view returns (bool isWhitelisted);
    
    /**
     * @notice Get all whitelisted addresses for a token and operation
     * @param token Token address
     * @param operationType Type of operation
     * @return addresses Array of whitelisted addresses
     */
    function getWhitelistedAddresses(
        address token,
        string memory operationType
    ) external view returns (address[] memory addresses);
    
    // ============ View Functions ============
    
    /**
     * @notice Get policy for a token and operation type
     * @param token Token address
     * @param operationType Type of operation
     * @return Policy structure
     */
    function getPolicy(
        address token,
        string memory operationType
    ) external view returns (Policy memory);
    
    /**
     * @notice Check if an operator can perform an operation
     * @param token Token address
     * @param operator Address of the operator
     * @param operationType Type of operation
     * @param amount Amount involved
     * @return canOperate Whether the operation is allowed
     * @return reason Reason if not allowed
     */
    function canOperate(
        address token,
        address operator,
        string memory operationType,
        uint256 amount
    ) external view returns (bool canOperate, string memory reason);
    
    /**
     * @notice Get remaining daily limit for an operation
     * @param token Token address
     * @param operator Address of the operator
     * @param operationType Type of operation
     * @return remaining Remaining amount in daily limit
     */
    function getRemainingDailyLimit(
        address token,
        address operator,
        string memory operationType
    ) external view returns (uint256 remaining);
    
    /**
     * @notice Get approval request details
     * @param token Token address
     * @param requestId ID of the request
     * @return requester Address that made the request
     * @return operationType Type of operation
     * @return amount Amount involved
     * @return approvals Current number of approvals
     * @return executed Whether already executed
     */
    function getApprovalRequest(
        address token,
        uint256 requestId
    ) external view returns (
        address requester,
        string memory operationType,
        uint256 amount,
        uint8 approvals,
        bool executed
    );
}
