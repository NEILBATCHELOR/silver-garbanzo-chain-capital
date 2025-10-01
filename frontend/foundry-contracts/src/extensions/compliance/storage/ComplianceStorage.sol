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
    }
    
    // investor => data
    mapping(address => InvestorData) internal _investors;
    
    // ============ Jurisdiction Limits ============
    // jurisdiction => max tokens allowed
    mapping(bytes32 => uint256) internal _jurisdictionLimits;
    
    // jurisdiction => current holdings
    mapping(bytes32 => uint256) internal _jurisdictionHoldings;
    
    // ============ Configuration ============
    bool internal _kycRequired;
    bool internal _whitelistRequired;
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
}
