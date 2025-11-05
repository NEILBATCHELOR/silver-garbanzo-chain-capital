// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC1400TransferRestrictionsModule.sol";
import "./storage/TransferRestrictionsStorage.sol";

/**
 * @title ERC1400TransferRestrictionsModule
 * @notice Modular transfer restrictions for ERC-1400 security tokens
 * @dev Implements regulatory compliance (SEC, MiFID II)
 */
contract ERC1400TransferRestrictionsModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1400TransferRestrictionsModule,
    TransferRestrictionsStorage
{
    // ============ Roles ============
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    bytes1 private constant TRANSFER_SUCCESS = 0x01;
    bytes1 private constant TRANSFER_FAILURE = 0x00;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize transfer restrictions module
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Transfer Validation ============
    
    function canTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata /* data */
    ) external view returns (bytes1 code, bytes32 reason) {
        RestrictionData storage restriction = _restrictions[partition];
        
        // Check global blacklist first (highest priority)
        if (_globalBlacklistEnabled && (_globalBlacklist[from] || _globalBlacklist[to])) {
            return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_INVESTOR_NOT_WHITELISTED)));
        }
        
        // Check partition-specific blacklist
        if (_partitionBlacklistEnabled[partition] && 
            (_partitionBlacklist[partition][from] || _partitionBlacklist[partition][to])) {
            return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_INVESTOR_NOT_WHITELISTED)));
        }
        
        // Check global whitelist if enabled
        if (_globalWhitelistEnabled && (!_globalWhitelist[from] || !_globalWhitelist[to])) {
            return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_INVESTOR_NOT_WHITELISTED)));
        }
        
        // Check partition-specific whitelist if enabled
        if (_partitionWhitelistEnabled[partition] && 
            (!_partitionWhitelist[partition][from] || !_partitionWhitelist[partition][to])) {
            return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_INVESTOR_NOT_WHITELISTED)));
        }
        
        // Check if partition is locked
        if (restriction.isLocked && block.timestamp < restriction.lockupExpiry) {
            return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_LOCKUP_PERIOD)));
        }
        
        // Check investor limit (only for new investors)
        if (!_partitionInvestors[partition][to]) {
            if (restriction.investorLimit > 0 && 
                restriction.investorCount >= restriction.investorLimit) {
                return (TRANSFER_FAILURE, bytes32(uint256(RestrictionCode.TRANSFER_FAILURE_INVESTOR_LIMIT_EXCEEDED)));
            }
        }
        
        return (TRANSFER_SUCCESS, bytes32(uint256(RestrictionCode.TRANSFER_SUCCESS)));
    }
    
    function enforceTransfer(
        bytes32 partition,
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external view {
        (bytes1 code, bytes32 reason) = this.canTransfer(partition, from, to, value, data);
        if (code != TRANSFER_SUCCESS) {
            revert TransferRestricted(partition, RestrictionCode(uint256(reason)));
        }
    }
    
    // ============ Restriction Management ============
    
    function setTransferRestriction(bytes32 partition, bytes32 restriction)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].restriction = restriction;
        emit TransferRestrictionSet(partition, restriction);
    }
    
    function removeTransferRestriction(bytes32 partition)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].restriction = bytes32(0);
    }
    
    function getTransferRestriction(bytes32 partition) external view returns (bytes32) {
        return _restrictions[partition].restriction;
    }
    
    // ============ Lockup Period Management ============
    
    function setLockupPeriod(bytes32 partition, uint256 duration)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].lockupExpiry = block.timestamp + duration;
        _restrictions[partition].isLocked = true;
        emit LockupPeriodSet(partition, duration);
    }
    
    function lockPartition(bytes32 partition, uint256 until)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].lockupExpiry = until;
        _restrictions[partition].isLocked = true;
        emit PartitionLocked(partition, until);
    }
    
    function unlockPartition(bytes32 partition)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].isLocked = false;
        emit PartitionUnlocked(partition);
    }
    
    function isPartitionLocked(bytes32 partition) external view returns (bool) {
        RestrictionData storage restriction = _restrictions[partition];
        return restriction.isLocked && block.timestamp < restriction.lockupExpiry;
    }
    
    function getLockupExpiry(bytes32 partition) external view returns (uint256) {
        return _restrictions[partition].lockupExpiry;
    }
    
    // ============ Investor Limits ============
    
    function setInvestorLimit(bytes32 partition, uint256 limit)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _restrictions[partition].investorLimit = limit;
        emit InvestorLimitSet(partition, limit);
    }
    
    function getInvestorLimit(bytes32 partition) external view returns (uint256) {
        return _restrictions[partition].investorLimit;
    }
    
    function getInvestorCount(bytes32 partition) external view returns (uint256) {
        return _restrictions[partition].investorCount;
    }
    
    /**
     * @notice Update investor count (called by token contract)
     * @param partition The partition identifier
     * @param investor The investor address
     * @param hasTokens Whether investor has tokens in partition
     */
    function updateInvestorCount(bytes32 partition, address investor, bool hasTokens) external {
        bool wasInvestor = _partitionInvestors[partition][investor];
        
        if (hasTokens && !wasInvestor) {
            // New investor
            _partitionInvestors[partition][investor] = true;
            _investorList[partition].push(investor);
            _restrictions[partition].investorCount++;
        } else if (!hasTokens && wasInvestor) {
            // Investor left
            _partitionInvestors[partition][investor] = false;
            _restrictions[partition].investorCount--;
        }
    }
    
    // ============ Jurisdiction Restrictions ============
    
    function setJurisdictionRestriction(bytes32 jurisdiction, bool restricted)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _jurisdictionRestrictions[jurisdiction] = restricted;
        emit JurisdictionRestricted(jurisdiction, restricted);
    }
    
    function isJurisdictionRestricted(bytes32 jurisdiction) external view returns (bool) {
        return _jurisdictionRestrictions[jurisdiction];
    }
    
    // ============ Global Whitelist Management ============
    
    function setGlobalWhitelistEnabled(bool enabled)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalWhitelistEnabled = enabled;
        emit GlobalWhitelistEnabled(enabled);
    }
    
    function isGlobalWhitelistEnabled() external view returns (bool) {
        return _globalWhitelistEnabled;
    }
    
    function addToGlobalWhitelist(address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalWhitelist[investor] = true;
        emit AddressAddedToGlobalWhitelist(investor);
    }
    
    function removeFromGlobalWhitelist(address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalWhitelist[investor] = false;
        emit AddressRemovedFromGlobalWhitelist(investor);
    }
    
    function isGlobalWhitelisted(address investor) external view returns (bool) {
        return _globalWhitelist[investor];
    }
    
    function addBatchToGlobalWhitelist(address[] calldata investors)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        for (uint256 i = 0; i < investors.length; i++) {
            _globalWhitelist[investors[i]] = true;
            emit AddressAddedToGlobalWhitelist(investors[i]);
        }
    }
    
    // ============ Global Blacklist Management ============
    
    function setGlobalBlacklistEnabled(bool enabled)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalBlacklistEnabled = enabled;
        emit GlobalBlacklistEnabled(enabled);
    }
    
    function isGlobalBlacklistEnabled() external view returns (bool) {
        return _globalBlacklistEnabled;
    }
    
    function addToGlobalBlacklist(address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalBlacklist[investor] = true;
        // Remove from whitelist if present
        _globalWhitelist[investor] = false;
        emit AddressAddedToGlobalBlacklist(investor);
    }
    
    function removeFromGlobalBlacklist(address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _globalBlacklist[investor] = false;
        emit AddressRemovedFromGlobalBlacklist(investor);
    }
    
    function isGlobalBlacklisted(address investor) external view returns (bool) {
        return _globalBlacklist[investor];
    }
    
    function addBatchToGlobalBlacklist(address[] calldata investors)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        for (uint256 i = 0; i < investors.length; i++) {
            _globalBlacklist[investors[i]] = true;
            _globalWhitelist[investors[i]] = false;
            emit AddressAddedToGlobalBlacklist(investors[i]);
        }
    }
    
    // ============ Partition Whitelist Management ============
    
    function setPartitionWhitelistEnabled(bytes32 partition, bool enabled)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionWhitelistEnabled[partition] = enabled;
        emit PartitionWhitelistEnabled(partition, enabled);
    }
    
    function isPartitionWhitelistEnabled(bytes32 partition) external view returns (bool) {
        return _partitionWhitelistEnabled[partition];
    }
    
    function addToPartitionWhitelist(bytes32 partition, address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionWhitelist[partition][investor] = true;
        emit AddressAddedToPartitionWhitelist(partition, investor);
    }
    
    function removeFromPartitionWhitelist(bytes32 partition, address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionWhitelist[partition][investor] = false;
        emit AddressRemovedFromPartitionWhitelist(partition, investor);
    }
    
    function isPartitionWhitelisted(bytes32 partition, address investor) 
        external 
        view 
        returns (bool) 
    {
        return _partitionWhitelist[partition][investor];
    }
    
    function addBatchToPartitionWhitelist(bytes32 partition, address[] calldata investors)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        for (uint256 i = 0; i < investors.length; i++) {
            _partitionWhitelist[partition][investors[i]] = true;
            emit AddressAddedToPartitionWhitelist(partition, investors[i]);
        }
    }
    
    // ============ Partition Blacklist Management ============
    
    function setPartitionBlacklistEnabled(bytes32 partition, bool enabled)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionBlacklistEnabled[partition] = enabled;
        emit PartitionBlacklistEnabled(partition, enabled);
    }
    
    function isPartitionBlacklistEnabled(bytes32 partition) external view returns (bool) {
        return _partitionBlacklistEnabled[partition];
    }
    
    function addToPartitionBlacklist(bytes32 partition, address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionBlacklist[partition][investor] = true;
        // Remove from partition whitelist if present
        _partitionWhitelist[partition][investor] = false;
        emit AddressAddedToPartitionBlacklist(partition, investor);
    }
    
    function removeFromPartitionBlacklist(bytes32 partition, address investor)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _partitionBlacklist[partition][investor] = false;
        emit AddressRemovedFromPartitionBlacklist(partition, investor);
    }
    
    function isPartitionBlacklisted(bytes32 partition, address investor) 
        external 
        view 
        returns (bool) 
    {
        return _partitionBlacklist[partition][investor];
    }
    
    function addBatchToPartitionBlacklist(bytes32 partition, address[] calldata investors)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        for (uint256 i = 0; i < investors.length; i++) {
            _partitionBlacklist[partition][investors[i]] = true;
            _partitionWhitelist[partition][investors[i]] = false;
            emit AddressAddedToPartitionBlacklist(partition, investors[i]);
        }
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
