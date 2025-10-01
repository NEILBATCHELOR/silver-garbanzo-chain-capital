// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20FeeModule
 * @notice Interface for token transfer fee management
 * @dev Modular fee system for revenue generation
 */
interface IERC20FeeModule {
    // ============ Structures ============
    struct FeeConfig {
        uint256 transferFee;      // Basis points (100 = 1%)
        uint256 maxFee;            // Maximum fee cap
        address feeRecipient;      // Where fees go
        bool enabled;              // Fee collection on/off
    }
    
    struct FeeExemption {
        bool isExempt;             // Exemption status
        string reason;             // Reason for exemption
        uint256 addedAt;           // Timestamp added
    }
    
    // ============ Events ============
    event TransferFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);
    event FeeExemptionGranted(address indexed account, string reason);
    event FeeExemptionRevoked(address indexed account);
    event FeeCollected(address indexed from, address indexed to, uint256 amount);
    event MaxFeeUpdated(uint256 newMaxFee);
    
    // ============ Errors ============
    error FeeExceedsMaximum();
    error InvalidFeeRecipient();
    error InvalidFeePercentage();
    
    // ============ Fee Configuration ============
    
    /**
     * @notice Set transfer fee in basis points
     * @param basisPoints Fee percentage (100 = 1%, max 10000 = 100%)
     */
    function setTransferFee(uint256 basisPoints) external;
    
    /**
     * @notice Set maximum fee cap
     * @param maxFee Maximum fee in token units
     */
    function setMaxFee(uint256 maxFee) external;
    
    /**
     * @notice Set fee recipient address
     * @param recipient Address to receive fees
     */
    function setFeeRecipient(address recipient) external;
    
    /**
     * @notice Enable or disable fee collection
     * @param enabled Fee collection status
     */
    function setFeeEnabled(bool enabled) external;
    
    // ============ Fee Calculation ============
    
    /**
     * @notice Calculate fee for transfer amount
     * @param amount Transfer amount
     * @return uint256 Fee amount
     */
    function calculateFee(uint256 amount) external view returns (uint256);
    
    /**
     * @notice Calculate fee and net amount after fee
     * @param amount Transfer amount
     * @return feeAmount Fee to be collected
     * @return netAmount Amount after fee deduction
     */
    function calculateFeeAndNet(uint256 amount) external view returns (uint256 feeAmount, uint256 netAmount);
    
    // ============ Fee Exemptions ============
    
    /**
     * @notice Grant fee exemption to account
     * @param account Address to exempt
     * @param reason Reason for exemption
     */
    function exemptFromFees(address account, string memory reason) external;
    
    /**
     * @notice Revoke fee exemption from account
     * @param account Address to revoke exemption
     */
    function revokeExemption(address account) external;
    
    /**
     * @notice Check if account is fee exempt
     * @param account Address to check
     * @return bool Exemption status
     */
    function isExempt(address account) external view returns (bool);
    
    /**
     * @notice Get exemption details for account
     * @param account Address to check
     * @return FeeExemption Exemption details
     */
    function getExemption(address account) external view returns (FeeExemption memory);
    
    // ============ Fee Collection ============
    
    /**
     * @notice Process transfer with fee
     * @param from Sender address
     * @param to Recipient address
     * @param amount Transfer amount
     * @return feeAmount Fee collected
     * @return netAmount Amount transferred to recipient
     */
    function processTransferWithFee(
        address from,
        address to,
        uint256 amount
    ) external returns (uint256 feeAmount, uint256 netAmount);
    
    // ============ Fee Queries ============
    
    /**
     * @notice Get current fee configuration
     * @return FeeConfig Current fee settings
     */
    function getFeeConfig() external view returns (FeeConfig memory);
    
    /**
     * @notice Get total fees collected
     * @return uint256 Total fees collected to date
     */
    function getTotalFeesCollected() external view returns (uint256);
}
