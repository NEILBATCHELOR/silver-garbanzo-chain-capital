// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title TransferRestrictionsStorage
 * @notice Storage layout for transfer restrictions module (upgradeable-safe)
 */
contract TransferRestrictionsStorage {
    // ============ Restriction Data ============
    
    /// @notice Restriction information for a partition
    struct RestrictionData {
        bytes32 restriction;        // Current restriction identifier
        uint256 lockupExpiry;       // Lockup expiry timestamp
        uint256 investorLimit;      // Maximum investors allowed
        uint256 investorCount;      // Current investor count
        bool isLocked;              // Whether partition is locked
    }
    
    // partition => restriction data
    mapping(bytes32 => RestrictionData) internal _restrictions;
    
    // ============ Jurisdiction Restrictions ============
    
    // jurisdiction => is restricted
    mapping(bytes32 => bool) internal _jurisdictionRestrictions;
    
    // ============ Partition Investors ============
    
    // partition => investor => has tokens
    mapping(bytes32 => mapping(address => bool)) internal _partitionInvestors;
    
    // partition => array of investors
    mapping(bytes32 => address[]) internal _investorList;
    
    // ============ Whitelist/Blacklist Management ============
    
    // Global whitelist/blacklist (applies to all partitions)
    mapping(address => bool) internal _globalWhitelist;
    mapping(address => bool) internal _globalBlacklist;
    
    // Per-partition whitelist/blacklist (partition-specific)
    // partition => investor => is whitelisted
    mapping(bytes32 => mapping(address => bool)) internal _partitionWhitelist;
    
    // partition => investor => is blacklisted
    mapping(bytes32 => mapping(address => bool)) internal _partitionBlacklist;
    
    // Whitelist/blacklist enforcement settings
    bool internal _globalWhitelistEnabled;
    bool internal _globalBlacklistEnabled;
    
    // partition => whitelist enabled for this partition
    mapping(bytes32 => bool) internal _partitionWhitelistEnabled;
    
    // partition => blacklist enabled for this partition
    mapping(bytes32 => bool) internal _partitionBlacklistEnabled;
    
    // ============ Storage Gap ============
    uint256[38] private __gap;
}
