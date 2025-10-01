// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FeeStrategyStorage
 * @notice Storage layout for fee strategy module (upgradeable-safe)
 */
contract FeeStrategyStorage {
    // ============ Fee Configuration ============
    uint256 internal _managementFeeBps;      // Annual management fee (basis points)
    uint256 internal _performanceFeeBps;     // Performance fee on profits (basis points)
    uint256 internal _withdrawalFeeBps;      // Withdrawal fee (basis points)
    address internal _feeRecipient;          // Address to receive fees
    
    // ============ Fee Tracking ============
    uint256 internal _lastFeeCollection;     // Timestamp of last fee collection
    uint256 internal _highWaterMark;         // High water mark for performance fee
    uint256 internal _accumulatedFees;       // Total accumulated uncollected fees
    
    // ============ Constants ============
    uint256 internal constant MAX_MANAGEMENT_FEE = 500;    // 5% max annual
    uint256 internal constant MAX_PERFORMANCE_FEE = 2000;  // 20% max
    uint256 internal constant MAX_WITHDRAWAL_FEE = 100;    // 1% max
    uint256 internal constant BASIS_POINTS = 10000;        // 100% = 10,000 bps
    uint256 internal constant SECONDS_PER_YEAR = 365 days;
    
    // ============ Storage Gap ============
    uint256[42] private __gap;
}
