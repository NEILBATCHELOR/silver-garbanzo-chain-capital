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
    event GlobalWhitelistEnabled(bool enabled);
    event GlobalBlacklistEnabled(bool enabled);
    event AddressAddedToGlobalWhitelist(address indexed investor);
    event AddressRemovedFromGlobalWhitelist(address indexed investor);
    event AddressAddedToGlobalBlacklist(address indexed investor);
    event AddressRemovedFromGlobalBlacklist(address indexed investor);
    event PartitionWhitelistEnabled(bytes32 indexed partition, bool enabled);
    event PartitionBlacklistEnabled(bytes32 indexed partition, bool enabled);
    event AddressAddedToPartitionWhitelist(bytes32 indexed partition, address indexed investor);
    event AddressRemovedFromPartitionWhitelist(bytes32 indexed partition, address indexed investor);
    event AddressAddedToPartitionBlacklist(bytes32 indexed partition, address indexed investor);
    event AddressRemovedFromPartitionBlacklist(bytes32 indexed partition, address indexed investor);
    
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
    
    // ============ Global Whitelist Management ============
    
    /**
     * @notice Enable or disable global whitelist
     * @param enabled True to enable whitelist enforcement
     */
    function setGlobalWhitelistEnabled(bool enabled) external;
    
    /**
     * @notice Check if global whitelist is enabled
     * @return bool True if enabled
     */
    function isGlobalWhitelistEnabled() external view returns (bool);
    
    /**
     * @notice Add address to global whitelist
     * @param investor Address to whitelist
     */
    function addToGlobalWhitelist(address investor) external;
    
    /**
     * @notice Remove address from global whitelist
     * @param investor Address to remove
     */
    function removeFromGlobalWhitelist(address investor) external;
    
    /**
     * @notice Check if address is on global whitelist
     * @param investor Address to check
     * @return bool True if whitelisted
     */
    function isGlobalWhitelisted(address investor) external view returns (bool);
    
    /**
     * @notice Add multiple addresses to global whitelist
     * @param investors Array of addresses to whitelist
     */
    function addBatchToGlobalWhitelist(address[] calldata investors) external;
    
    // ============ Global Blacklist Management ============
    
    /**
     * @notice Enable or disable global blacklist
     * @param enabled True to enable blacklist enforcement
     */
    function setGlobalBlacklistEnabled(bool enabled) external;
    
    /**
     * @notice Check if global blacklist is enabled
     * @return bool True if enabled
     */
    function isGlobalBlacklistEnabled() external view returns (bool);
    
    /**
     * @notice Add address to global blacklist
     * @param investor Address to blacklist
     */
    function addToGlobalBlacklist(address investor) external;
    
    /**
     * @notice Remove address from global blacklist
     * @param investor Address to remove
     */
    function removeFromGlobalBlacklist(address investor) external;
    
    /**
     * @notice Check if address is on global blacklist
     * @param investor Address to check
     * @return bool True if blacklisted
     */
    function isGlobalBlacklisted(address investor) external view returns (bool);
    
    /**
     * @notice Add multiple addresses to global blacklist
     * @param investors Array of addresses to blacklist
     */
    function addBatchToGlobalBlacklist(address[] calldata investors) external;
    
    // ============ Partition Whitelist Management ============
    
    /**
     * @notice Enable or disable whitelist for a partition
     * @param partition The partition identifier
     * @param enabled True to enable whitelist enforcement
     */
    function setPartitionWhitelistEnabled(bytes32 partition, bool enabled) external;
    
    /**
     * @notice Check if partition whitelist is enabled
     * @param partition The partition identifier
     * @return bool True if enabled
     */
    function isPartitionWhitelistEnabled(bytes32 partition) external view returns (bool);
    
    /**
     * @notice Add address to partition whitelist
     * @param partition The partition identifier
     * @param investor Address to whitelist
     */
    function addToPartitionWhitelist(bytes32 partition, address investor) external;
    
    /**
     * @notice Remove address from partition whitelist
     * @param partition The partition identifier
     * @param investor Address to remove
     */
    function removeFromPartitionWhitelist(bytes32 partition, address investor) external;
    
    /**
     * @notice Check if address is on partition whitelist
     * @param partition The partition identifier
     * @param investor Address to check
     * @return bool True if whitelisted
     */
    function isPartitionWhitelisted(bytes32 partition, address investor) external view returns (bool);
    
    /**
     * @notice Add multiple addresses to partition whitelist
     * @param partition The partition identifier
     * @param investors Array of addresses to whitelist
     */
    function addBatchToPartitionWhitelist(bytes32 partition, address[] calldata investors) external;
    
    // ============ Partition Blacklist Management ============
    
    /**
     * @notice Enable or disable blacklist for a partition
     * @param partition The partition identifier
     * @param enabled True to enable blacklist enforcement
     */
    function setPartitionBlacklistEnabled(bytes32 partition, bool enabled) external;
    
    /**
     * @notice Check if partition blacklist is enabled
     * @param partition The partition identifier
     * @return bool True if enabled
     */
    function isPartitionBlacklistEnabled(bytes32 partition) external view returns (bool);
    
    /**
     * @notice Add address to partition blacklist
     * @param partition The partition identifier
     * @param investor Address to blacklist
     */
    function addToPartitionBlacklist(bytes32 partition, address investor) external;
    
    /**
     * @notice Remove address from partition blacklist
     * @param partition The partition identifier
     * @param investor Address to remove
     */
    function removeFromPartitionBlacklist(bytes32 partition, address investor) external;
    
    /**
     * @notice Check if address is on partition blacklist
     * @param partition The partition identifier
     * @param investor Address to check
     * @return bool True if blacklisted
     */
    function isPartitionBlacklisted(bytes32 partition, address investor) external view returns (bool);
    
    /**
     * @notice Add multiple addresses to partition blacklist
     * @param partition The partition identifier
     * @param investors Array of addresses to blacklist
     */
    function addBatchToPartitionBlacklist(bytes32 partition, address[] calldata investors) external;
}
