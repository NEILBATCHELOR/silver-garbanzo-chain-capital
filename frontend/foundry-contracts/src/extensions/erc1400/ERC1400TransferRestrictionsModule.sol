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
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
