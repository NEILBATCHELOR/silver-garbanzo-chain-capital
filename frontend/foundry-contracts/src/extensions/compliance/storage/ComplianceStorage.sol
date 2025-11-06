// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ComplianceStorage
 * @notice Storage layout for compliance module (upgradeable-safe)
 */
contract ComplianceStorage {
    // ============ Investor Data ============
    struct InvestorData {
        bool whitelisted;
        bool blacklisted;
        bool kycVerified;
        bytes32 jurisdiction;
        uint256 addedAt;
        uint8 investorType; // 0=Retail, 1=Accredited, 2=Institutional
    }
    
    // investor => data
    mapping(address => InvestorData) internal _investors;
    
    // ============ Jurisdiction Limits ============
    // jurisdiction => max tokens allowed
    mapping(bytes32 => uint256) internal _jurisdictionLimits;
    
    // jurisdiction => current holdings
    mapping(bytes32 => uint256) internal _jurisdictionHoldings;
    
    // jurisdiction => is allowed
    mapping(bytes32 => bool) internal _jurisdictionAllowed;
    
    // ============ Configuration ============
    bool internal _kycRequired;
    bool internal _whitelistRequired;
    bool internal _accreditedOnly;
    
    // ============ Storage Gap ============
    uint256[43] private __gap; // Reduced by 2 for new mappings
}
