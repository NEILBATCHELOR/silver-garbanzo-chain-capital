// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20ComplianceModule
 * @notice Interface for token transfer compliance checking
 * @dev Modular compliance system for regulatory requirements
 */
interface IERC20ComplianceModule {
    // ============ Events ============
    event InvestorWhitelisted(address indexed investor, bytes32 jurisdiction);
    event InvestorBlacklisted(address indexed investor);
    event JurisdictionLimitSet(bytes32 indexed jurisdiction, uint256 limit);
    event KYCStatusUpdated(address indexed investor, bool verified);
    event ComplianceCheckFailed(address indexed from, address indexed to, string reason);
    
    // ============ Errors ============
    error NotWhitelisted(address investor);
    error Blacklisted(address investor);
    error JurisdictionLimitExceeded(bytes32 jurisdiction);
    error KYCNotVerified(address investor);
    error TransferNotAllowed(string reason);
    
    // ============ Whitelist Management ============
    
    /**
     * @notice Add investor to whitelist with jurisdiction
     * @param investor Address to whitelist
     * @param jurisdiction ISO country code (e.g., keccak256("US"))
     */
    function addToWhitelist(address investor, bytes32 jurisdiction) external;
    
    /**
     * @notice Remove investor from whitelist
     * @param investor Address to remove
     */
    function removeFromWhitelist(address investor) external;
    
    /**
     * @notice Check if address is whitelisted
     * @param investor Address to check
     * @return bool True if whitelisted
     */
    function isWhitelisted(address investor) external view returns (bool);
    
    /**
     * @notice Get investor's jurisdiction
     * @param investor Address to check
     * @return bytes32 Jurisdiction code
     */
    function getJurisdiction(address investor) external view returns (bytes32);
    
    // ============ Blacklist Management ============
    
    /**
     * @notice Add address to blacklist (permanent ban)
     * @param investor Address to blacklist
     */
    function addToBlacklist(address investor) external;
    
    /**
     * @notice Remove from blacklist
     * @param investor Address to remove
     */
    function removeFromBlacklist(address investor) external;
    
    /**
     * @notice Check if address is blacklisted
     * @param investor Address to check
     * @return bool True if blacklisted
     */
    function isBlacklisted(address investor) external view returns (bool);
    
    // ============ Jurisdiction Controls ============
    
    /**
     * @notice Set maximum token limit for jurisdiction
     * @param jurisdiction ISO country code
     * @param limit Maximum tokens allowed
     */
    function setJurisdictionLimit(bytes32 jurisdiction, uint256 limit) external;
    
    /**
     * @notice Get current token holdings for jurisdiction
     * @param jurisdiction ISO country code
     * @return uint256 Total holdings
     */
    function getJurisdictionHoldings(bytes32 jurisdiction) external view returns (uint256);
    
    // ============ KYC Management ============
    
    /**
     * @notice Set KYC verification status
     * @param investor Address to verify
     * @param verified True if KYC passed
     */
    function setKYCStatus(address investor, bool verified) external;
    
    /**
     * @notice Check if KYC is required for transfers
     * @return bool True if KYC required
     */
    function isKYCRequired() external view returns (bool);
    
    /**
     * @notice Check if address has verified KYC
     * @param investor Address to check
     * @return bool True if KYC verified
     */
    function hasVerifiedKYC(address investor) external view returns (bool);
    
    // ============ Transfer Validation ============
    
    /**
     * @notice Check if transfer is compliant
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     * @return bool True if transfer allowed
     * @return string Reason if not allowed
     */
    function canTransfer(
        address from, 
        address to, 
        uint256 amount
    ) external view returns (bool, string memory);
    
    /**
     * @notice Enforce transfer compliance (reverts if not compliant)
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     */
    function enforceTransfer(address from, address to, uint256 amount) external view;
}
