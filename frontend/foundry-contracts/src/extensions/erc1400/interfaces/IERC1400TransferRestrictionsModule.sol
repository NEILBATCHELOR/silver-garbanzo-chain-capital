// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1400TransferRestrictionsModule
 * @notice Interface for ERC-1400 security token transfer restrictions
 * @dev Implements regulatory compliance for security tokens (SEC, MiFID II)
 */
interface IERC1400TransferRestrictionsModule {
    // ============ Enums ============
    
    /// @notice Reason codes for transfer restrictions
    enum RestrictionCode {
        TRANSFER_SUCCESS,
        TRANSFER_FAILURE_INVESTOR_NOT_WHITELISTED,
        TRANSFER_FAILURE_LOCKUP_PERIOD,
        TRANSFER_FAILURE_INVESTOR_LIMIT_EXCEEDED,
        TRANSFER_FAILURE_JURISDICTION_RESTRICTED,
        TRANSFER_FAILURE_PARTITION_LOCKED,
        TRANSFER_FAILURE_INVALID_RECEIVER,
        TRANSFER_FAILURE_INSUFFICIENT_BALANCE
    }
    
    // ============ Events ============
    
    event TransferRestrictionSet(bytes32 indexed partition, bytes32 restriction);
    event LockupPeriodSet(bytes32 indexed partition, uint256 duration);
    event InvestorLimitSet(bytes32 indexed partition, uint256 limit);
    event PartitionLocked(bytes32 indexed partition, uint256 until);
    event PartitionUnlocked(bytes32 indexed partition);
    event JurisdictionRestricted(bytes32 indexed jurisdiction, bool restricted);
    
    // ============ Errors ============
    
    error TransferRestricted(bytes32 partition, RestrictionCode code);
    error InvalidPartition(bytes32 partition);
    error LockupPeriodActive(bytes32 partition, uint256 expiryTime);
    error InvestorLimitExceeded(bytes32 partition, uint256 currentCount, uint256 limit);
    error JurisdictionNotAllowed(bytes32 jurisdiction);
    
    // ============ Transfer Validation ============
    
    /**
     * @notice Check if transfer is allowed for a partition
     * @param partition The partition identifier
     * @param from Sender address
     * @param to Recipient address
     * @param value Transfer amount
     * @param data Additional transfer data
     * @return code Restriction code (0x01 = success, others = failure)
     * @return reason Human-readable reason for restriction
     */
    function canTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external view returns (bytes1 code, bytes32 reason);
    
    /**
     * @notice Enforce transfer restrictions (reverts if not allowed)
     * @param partition The partition identifier
     * @param from Sender address
     * @param to Recipient address
     * @param value Transfer amount
     * @param data Additional transfer data
     */
    function enforceTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external view;
    
    // ============ Restriction Management ============
    
    /**
     * @notice Set transfer restriction for a partition
     * @param partition The partition identifier
     * @param restriction Restriction identifier
     */
    function setTransferRestriction(bytes32 partition, bytes32 restriction) external;
    
    /**
     * @notice Remove transfer restriction from a partition
     * @param partition The partition identifier
     */
    function removeTransferRestriction(bytes32 partition) external;
    
    /**
     * @notice Get active restriction for a partition
     * @param partition The partition identifier
     * @return bytes32 Restriction identifier
     */
    function getTransferRestriction(bytes32 partition) external view returns (bytes32);
    
    // ============ Lockup Period Management ============
    
    /**
     * @notice Set lockup period for a partition
     * @param partition The partition identifier
     * @param duration Lockup duration in seconds
     */
    function setLockupPeriod(bytes32 partition, uint256 duration) external;
    
    /**
     * @notice Lock a partition until specific timestamp
     * @param partition The partition identifier
     * @param until Unix timestamp when lock expires
     */
    function lockPartition(bytes32 partition, uint256 until) external;
    
    /**
     * @notice Unlock a partition
     * @param partition The partition identifier
     */
    function unlockPartition(bytes32 partition) external;
    
    /**
     * @notice Check if partition is locked
     * @param partition The partition identifier
     * @return bool True if locked
     */
    function isPartitionLocked(bytes32 partition) external view returns (bool);
    
    /**
     * @notice Get lockup expiry time for partition
     * @param partition The partition identifier
     * @return uint256 Unix timestamp of expiry (0 if not locked)
     */
    function getLockupExpiry(bytes32 partition) external view returns (uint256);
    
    // ============ Investor Limits ============
    
    /**
     * @notice Set maximum number of investors per partition
     * @param partition The partition identifier
     * @param limit Maximum investor count
     */
    function setInvestorLimit(bytes32 partition, uint256 limit) external;
    
    /**
     * @notice Get investor limit for partition
     * @param partition The partition identifier
     * @return uint256 Maximum allowed investors
     */
    function getInvestorLimit(bytes32 partition) external view returns (uint256);
    
    /**
     * @notice Get current investor count for partition
     * @param partition The partition identifier
     * @return uint256 Current investor count
     */
    function getInvestorCount(bytes32 partition) external view returns (uint256);
    
    // ============ Jurisdiction Restrictions ============
    
    /**
     * @notice Restrict or allow a jurisdiction
     * @param jurisdiction ISO country code or jurisdiction identifier
     * @param restricted True to restrict, false to allow
     */
    function setJurisdictionRestriction(bytes32 jurisdiction, bool restricted) external;
    
    /**
     * @notice Check if jurisdiction is restricted
     * @param jurisdiction ISO country code or jurisdiction identifier
     * @return bool True if restricted
     */
    function isJurisdictionRestricted(bytes32 jurisdiction) external view returns (bool);
}
