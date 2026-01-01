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
     * @param jurisdictions Array of allowed jurisdictions (e.g., ["US", "EU"])
     * @param complianceLevel Compliance strictness level (1-5)
     * @param maxHoldersPerJurisdiction Maximum holders per jurisdiction
     * @param kycRequired Whether KYC verification is mandatory
     */
    function initialize(
        address admin,
        string[] memory jurisdictions,
        uint256 complianceLevel,
        uint256 maxHoldersPerJurisdiction,
        bool kycRequired
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        // Set KYC requirement based on parameter
        _kycRequired = kycRequired;
        
        // Set whitelist requirement based on compliance level
        // Level 1-2: No whitelist, Level 3-5: Whitelist required
        _whitelistRequired = complianceLevel >= 3;
        
        // Set accredited-only based on compliance level
        // Level 4-5: Accredited investors only
        _accreditedOnly = complianceLevel >= 4;
        
        // Initialize allowed jurisdictions
        for (uint256 i = 0; i < jurisdictions.length; i++) {
            bytes32 jurisdictionHash = keccak256(bytes(jurisdictions[i]));
            _jurisdictionAllowed[jurisdictionHash] = true;
            
            // Set max holders per jurisdiction if specified
            if (maxHoldersPerJurisdiction > 0) {
                _jurisdictionLimits[jurisdictionHash] = maxHoldersPerJurisdiction;
            }
        }
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
    
    /**
     * @notice Batch add investors to whitelist
     * @param investors Array of investor addresses
     * @param jurisdictions Array of jurisdictions (must match length)
     */
    function addToWhitelistBatch(
        address[] calldata investors,
        bytes32[] calldata jurisdictions
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(investors.length == jurisdictions.length, "Length mismatch");
        
        for (uint256 i = 0; i < investors.length; i++) {
            _investors[investors[i]].whitelisted = true;
            _investors[investors[i]].jurisdiction = jurisdictions[i];
            _investors[investors[i]].addedAt = block.timestamp;
            
            emit InvestorWhitelisted(investors[i], jurisdictions[i]);
        }
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
    
    // ============ Investor Type Management ============
    
    /**
     * @notice Set investor type (retail, accredited, institutional)
     * @param investor Investor address
     * @param investorType Type: 0=Retail, 1=Accredited, 2=Institutional
     */
    function setInvestorType(address investor, uint8 investorType)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        require(investorType <= 2, "Invalid investor type");
        _investors[investor].investorType = investorType;
    }
    
    /**
     * @notice Set whether only accredited investors can hold tokens
     * @param required True to restrict to accredited only
     */
    function setAccreditedOnly(bool required)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _accreditedOnly = required;
    }
    
    function isAccreditedOnly() external view returns (bool) {
        return _accreditedOnly;
    }
    
    function getInvestorType(address investor) external view returns (uint8) {
        return _investors[investor].investorType;
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
    
    /**
     * @notice Set jurisdiction allowed status
     * @param jurisdiction Jurisdiction code (e.g., keccak256("US"))
     * @param allowed Whether jurisdiction is allowed
     */
    function setJurisdictionAllowed(bytes32 jurisdiction, bool allowed)
        external
        onlyRole(COMPLIANCE_OFFICER_ROLE)
    {
        _jurisdictionAllowed[jurisdiction] = allowed;
    }
    
    function isJurisdictionAllowed(bytes32 jurisdiction) external view returns (bool) {
        // If not set, default to allowed
        return _jurisdictionAllowed[jurisdiction] != false;
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
    
    /**
     * @notice Batch set KYC status
     * @param investors Array of investor addresses
     * @param verified Array of verification statuses
     */
    function setKYCStatusBatch(
        address[] calldata investors,
        bool[] calldata verified
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(investors.length == verified.length, "Length mismatch");
        
        for (uint256 i = 0; i < investors.length; i++) {
            _investors[investors[i]].kycVerified = verified[i];
            emit KYCStatusUpdated(investors[i], verified[i]);
        }
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
        
        // Check accredited investor requirement
        if (_accreditedOnly) {
            // Type: 0=Retail, 1=Accredited, 2=Institutional
            if (_investors[to].investorType == 0) {
                return (false, "Recipient must be accredited investor");
            }
        }
        
        // Check jurisdiction allowed
        bytes32 toJurisdiction = _investors[to].jurisdiction;
        if (toJurisdiction != bytes32(0)) {
            if (_jurisdictionAllowed[toJurisdiction] == false) {
                return (false, "Jurisdiction not allowed");
            }
            
            // Check jurisdiction limits
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
