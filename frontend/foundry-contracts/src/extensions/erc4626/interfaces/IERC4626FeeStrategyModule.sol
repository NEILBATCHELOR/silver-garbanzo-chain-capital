// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC4626FeeStrategyModule
 * @notice Interface for vault fee management
 * @dev Implements management fees, performance fees, and withdrawal fees
 */
interface IERC4626FeeStrategyModule {
    // ============ Events ============
    event ManagementFeeUpdated(uint256 newFeeBps);
    event PerformanceFeeUpdated(uint256 newFeeBps);
    event WithdrawalFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);
    event FeesCollected(uint256 managementFees, uint256 performanceFees, uint256 totalFees);
    event WithdrawalFeeCharged(address indexed user, uint256 amount, uint256 fee);
    
    // ============ Errors ============
    error FeeTooHigh();
    error InvalidFeeRecipient();
    error NoFeesToCollect();
    
    // ============ Fee Configuration ============
    
    /**
     * @notice Set management fee (annual % charged on total assets)
     * @param basisPoints Fee in basis points (100 = 1%)
     */
    function setManagementFee(uint256 basisPoints) external;
    
    /**
     * @notice Set performance fee (% of profits)
     * @param basisPoints Fee in basis points (2000 = 20%)
     */
    function setPerformanceFee(uint256 basisPoints) external;
    
    /**
     * @notice Set withdrawal fee
     * @param basisPoints Fee in basis points (50 = 0.5%)
     */
    function setWithdrawalFee(uint256 basisPoints) external;
    
    /**
     * @notice Set fee recipient address
     * @param recipient Address to receive fees
     */
    function setFeeRecipient(address recipient) external;
    
    // ============ Fee Calculation ============
    
    /**
     * @notice Calculate management fee since last collection
     * @return feeAmount Amount of fees owed
     */
    function calculateManagementFee() external view returns (uint256 feeAmount);
    
    /**
     * @notice Calculate performance fee based on profits
     * @return feeAmount Amount of fees owed
     */
    function calculatePerformanceFee() external view returns (uint256 feeAmount);
    
    /**
     * @notice Calculate withdrawal fee for an amount
     * @param withdrawAmount Amount being withdrawn
     * @return feeAmount Fee to be charged
     */
    function calculateWithdrawalFee(uint256 withdrawAmount) external view returns (uint256 feeAmount);
    
    // ============ Fee Collection ============
    
    /**
     * @notice Collect all pending fees
     * @return totalCollected Total fees collected
     */
    function collectFees() external returns (uint256 totalCollected);
    
    /**
     * @notice Get total uncollected fees
     * @return totalFees Total pending fees
     */
    function getPendingFees() external view returns (uint256 totalFees);
    
    // ============ View Functions ============
    
    /**
     * @notice Get current fee configuration
     * @return managementFeeBps Management fee in basis points
     * @return performanceFeeBps Performance fee in basis points
     * @return withdrawalFeeBps Withdrawal fee in basis points
     * @return feeRecipient Address receiving fees
     */
    function getFeeConfig() external view returns (
        uint256 managementFeeBps,
        uint256 performanceFeeBps,
        uint256 withdrawalFeeBps,
        address feeRecipient
    );
    
    /**
     * @notice Get high water mark for performance fee
     * @return mark Current high water mark
     */
    function getHighWaterMark() external view returns (uint256 mark);
}
