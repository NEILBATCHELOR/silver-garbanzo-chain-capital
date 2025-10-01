// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PolicyTypes
 * @notice Common types and utilities for the policy system
 * @dev Provides reusable types and helper functions for policy operations
 */
library PolicyTypes {
    // ============ Constants ============
    
    /// @notice Operation types
    string constant MINT = "mint";
    string constant BURN = "burn";
    string constant TRANSFER = "transfer";
    string constant LOCK = "lock";
    string constant UNLOCK = "unlock";
    string constant BLOCK = "block";
    string constant UNBLOCK = "unblock";
    
    /// @notice Policy severity levels
    string constant SEVERITY_LOW = "low";
    string constant SEVERITY_MEDIUM = "medium";
    string constant SEVERITY_HIGH = "high";
    string constant SEVERITY_CRITICAL = "critical";
    
    /// @notice Time constants
    uint256 constant ONE_MINUTE = 60;
    uint256 constant ONE_HOUR = 3600;
    uint256 constant ONE_DAY = 86400;
    uint256 constant ONE_WEEK = 604800;
    
    // ============ Structs ============
    
    /**
     * @notice Validation result structure
     * @param approved Whether the operation is approved
     * @param reason Reason for approval/rejection
     * @param severity Severity level if rejected
     * @param timestamp When validation occurred
     */
    struct ValidationResult {
        bool approved;
        string reason;
        string severity;
        uint256 timestamp;
    }
    
    /**
     * @notice Operation context for validation
     * @param operator Address performing the operation
     * @param target Target address (to/from)
     * @param amount Amount involved
     * @param operationType Type of operation
     * @param metadata Additional metadata
     */
    struct OperationContext {
        address operator;
        address target;
        uint256 amount;
        string operationType;
        bytes metadata;
    }
    
    /**
     * @notice Policy violation record
     * @param token Token address
     * @param operator Address that attempted the operation
     * @param operationType Type of operation
     * @param amount Amount attempted
     * @param reason Reason for violation
     * @param timestamp When violation occurred
     * @param severity Severity level
     */
    struct PolicyViolationRecord {
        address token;
        address operator;
        string operationType;
        uint256 amount;
        string reason;
        uint256 timestamp;
        string severity;
    }
    
    // ============ Helper Functions ============
    
    /**
     * @notice Check if a string is empty
     * @param str String to check
     * @return isEmpty Whether the string is empty
     */
    function isEmpty(string memory str) internal pure returns (bool) {
        return bytes(str).length == 0;
    }
    
    /**
     * @notice Compare two strings for equality
     * @param a First string
     * @param b Second string
     * @return equal Whether the strings are equal
     */
    function stringsEqual(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
    
    /**
     * @notice Get start of current day (UTC)
     * @return timestamp Start of current day
     */
    function getStartOfDay() internal view returns (uint256) {
        return (block.timestamp / ONE_DAY) * ONE_DAY;
    }
    
    /**
     * @notice Check if current time is in a new day
     * @param lastTime Previous timestamp
     * @return isNewDay Whether it's a new day
     */
    function isNewDay(uint256 lastTime) internal view returns (bool) {
        if (lastTime == 0) {
            return true;
        }
        return (block.timestamp / ONE_DAY) > (lastTime / ONE_DAY);
    }
    
    /**
     * @notice Calculate remaining time in cooldown period
     * @param lastOperationTime Time of last operation
     * @param cooldownPeriod Cooldown period in seconds
     * @return remaining Remaining seconds (0 if not in cooldown)
     */
    function getRemainingCooldown(
        uint256 lastOperationTime,
        uint256 cooldownPeriod
    ) internal view returns (uint256) {
        if (lastOperationTime == 0) {
            return 0;
        }
        
        uint256 endTime = lastOperationTime + cooldownPeriod;
        
        if (block.timestamp >= endTime) {
            return 0;
        }
        
        return endTime - block.timestamp;
    }
    
    /**
     * @notice Check if an address is in a list
     * @param needle Address to find
     * @param haystack List of addresses
     * @return found Whether the address is in the list
     */
    function addressInList(
        address needle,
        address[] memory haystack
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < haystack.length; i++) {
            if (haystack[i] == needle) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @notice Validate operation type
     * @param operationType Operation type to validate
     * @return valid Whether the operation type is valid
     */
    function isValidOperationType(string memory operationType) internal pure returns (bool) {
        return stringsEqual(operationType, MINT) ||
               stringsEqual(operationType, BURN) ||
               stringsEqual(operationType, TRANSFER) ||
               stringsEqual(operationType, LOCK) ||
               stringsEqual(operationType, UNLOCK) ||
               stringsEqual(operationType, BLOCK) ||
               stringsEqual(operationType, UNBLOCK);
    }
    
    /**
     * @notice Create a validation result
     * @param approved Whether approved
     * @param reason Reason for result
     * @param severity Severity level
     * @return result ValidationResult structure
     */
    function createValidationResult(
        bool approved,
        string memory reason,
        string memory severity
    ) internal view returns (ValidationResult memory) {
        return ValidationResult({
            approved: approved,
            reason: reason,
            severity: severity,
            timestamp: block.timestamp
        });
    }
    
    /**
     * @notice Create a policy violation record
     * @param token Token address
     * @param operator Operator address
     * @param operationType Type of operation
     * @param amount Amount attempted
     * @param reason Reason for violation
     * @param severity Severity level
     * @return record PolicyViolationRecord structure
     */
    function createViolationRecord(
        address token,
        address operator,
        string memory operationType,
        uint256 amount,
        string memory reason,
        string memory severity
    ) internal view returns (PolicyViolationRecord memory) {
        return PolicyViolationRecord({
            token: token,
            operator: operator,
            operationType: operationType,
            amount: amount,
            reason: reason,
            timestamp: block.timestamp,
            severity: severity
        });
    }
    
    /**
     * @notice Calculate percentage of a value
     * @param value Value to calculate percentage of
     * @param percentage Percentage (in basis points, e.g., 100 = 1%)
     * @return result Calculated percentage amount
     */
    function calculatePercentage(
        uint256 value,
        uint256 percentage
    ) internal pure returns (uint256) {
        return (value * percentage) / 10000;
    }
    
    /**
     * @notice Safely subtract with underflow check
     * @param a Value to subtract from
     * @param b Value to subtract
     * @return result Result of subtraction (0 if would underflow)
     */
    function safeSub(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a < b) {
            return 0;
        }
        return a - b;
    }
}
