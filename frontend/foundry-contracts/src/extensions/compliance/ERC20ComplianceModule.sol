// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC20ComplianceModule.sol";
import "./storage/ComplianceStorage.sol";

/**
 * @title ERC20ComplianceModule
 * @notice Modular compliance system for ERC20 tokens
 * @dev Separate contract to avoid stack depth in master contracts
 */
contract ERC20ComplianceModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC20ComplianceModule,
    ComplianceStorage
{
    // ============ Roles ============
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ Constants ============
    bytes32 public constant JURISDICTION_US = keccak256("US");
    bytes32 public constant JURISDICTION_EU = keccak256("EU");
    bytes32 public constant JURISDICTION_UK = keccak256("UK");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize compliance module
     * @param admin Admin address
     * @param kycRequired Whether KYC is required
     * @param whitelistRequired Whether whitelist is required
     */
    function initialize(
        address admin,
        bool kycRequired,
        bool whitelistRequired
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _kycRequired = kycRequired;
        _whitelistRequired = whitelistRequired;
    }
    
    // ============ Whitelist Management ============
    
    function addToWhitelist(address investor, bytes32 jurisdiction) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _investors[investor].whitelisted = true;
        _investors[investor].jurisdiction = jurisdiction;
        _investors[investor].addedAt = block.timestamp;
        
        emit InvestorWhitelisted(investor, jurisdiction);
    }
    
    function removeFromWhitelist(address investor) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _investors[investor].whitelisted = false;
    }
    
    function isWhitelisted(address investor) external view returns (bool) {
        return _investors[investor].whitelisted;
    }
    
    function getJurisdiction(address investor) external view returns (bytes32) {
        return _investors[investor].jurisdiction;
    }
    
    // ============ Blacklist Management ============
    
    function addToBlacklist(address investor) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _investors[investor].blacklisted = true;
        _investors[investor].whitelisted = false;
        
        emit InvestorBlacklisted(investor);
    }
    
    function removeFromBlacklist(address investor) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _investors[investor].blacklisted = false;
    }
    
    function isBlacklisted(address investor) external view returns (bool) {
        return _investors[investor].blacklisted;
    }
    
    // ============ Jurisdiction Controls ============
    
    function setJurisdictionLimit(bytes32 jurisdiction, uint256 limit) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _jurisdictionLimits[jurisdiction] = limit;
        emit JurisdictionLimitSet(jurisdiction, limit);
    }
    
    function getJurisdictionHoldings(bytes32 jurisdiction) 
        external 
        view 
        returns (uint256) 
    {
        return _jurisdictionHoldings[jurisdiction];
    }
    
    /**
     * @notice Update jurisdiction holdings (called by token contract)
     * @param from Sender
     * @param to Recipient
     * @param amount Transfer amount
     */
    function updateJurisdictionHoldings(address from, address to, uint256 amount) 
        external 
    {
        bytes32 fromJurisdiction = _investors[from].jurisdiction;
        bytes32 toJurisdiction = _investors[to].jurisdiction;
        
        if (from != address(0) && fromJurisdiction != bytes32(0)) {
            _jurisdictionHoldings[fromJurisdiction] -= amount;
        }
        
        if (to != address(0) && toJurisdiction != bytes32(0)) {
            _jurisdictionHoldings[toJurisdiction] += amount;
        }
    }
    
    // ============ KYC Management ============
    
    function setKYCStatus(address investor, bool verified) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        _investors[investor].kycVerified = verified;
        emit KYCStatusUpdated(investor, verified);
    }
    
    function isKYCRequired() external view returns (bool) {
        return _kycRequired;
    }
    
    function isWhitelistRequired() external view returns (bool) {
        return _whitelistRequired;
    }
    
    function hasVerifiedKYC(address investor) external view returns (bool) {
        return _investors[investor].kycVerified;
    }
    
    // ============ Transfer Validation ============
    
    function canTransfer(
        address from,
        address to,
        uint256 amount
    ) external view returns (bool, string memory) {
        // Skip checks for minting/burning
        if (from == address(0) || to == address(0)) {
            return (true, "");
        }
        
        // Check blacklist
        if (_investors[from].blacklisted) {
            return (false, "Sender is blacklisted");
        }
        if (_investors[to].blacklisted) {
            return (false, "Recipient is blacklisted");
        }
        
        // Check whitelist if required
        if (_whitelistRequired) {
            if (!_investors[from].whitelisted) {
                return (false, "Sender not whitelisted");
            }
            if (!_investors[to].whitelisted) {
                return (false, "Recipient not whitelisted");
            }
        }
        
        // Check KYC if required
        if (_kycRequired) {
            if (!_investors[from].kycVerified) {
                return (false, "Sender KYC not verified");
            }
            if (!_investors[to].kycVerified) {
                return (false, "Recipient KYC not verified");
            }
        }
        
        // Check jurisdiction limits
        bytes32 toJurisdiction = _investors[to].jurisdiction;
        if (toJurisdiction != bytes32(0)) {
            uint256 limit = _jurisdictionLimits[toJurisdiction];
            if (limit > 0) {
                uint256 currentHoldings = _jurisdictionHoldings[toJurisdiction];
                if (currentHoldings + amount > limit) {
                    return (false, "Jurisdiction limit exceeded");
                }
            }
        }
        
        return (true, "");
    }
    
    function enforceTransfer(address from, address to, uint256 amount) 
        external 
        view 
    {
        (bool allowed, string memory reason) = this.canTransfer(from, to, amount);
        if (!allowed) {
            revert TransferNotAllowed(reason);
        }
    }
    
    // ============ Admin Functions ============
    
    function setKYCRequired(bool required) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _kycRequired = required;
    }
    
    function setWhitelistRequired(bool required) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _whitelistRequired = required;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
