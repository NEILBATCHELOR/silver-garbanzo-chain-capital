// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title WithdrawalQueueStorage
 * @notice Storage layout for withdrawal queue module (upgradeable-safe)
 */
contract WithdrawalQueueStorage {
    // ============ Request Tracking ============
    struct WithdrawalRequest {
        address requester;
        uint256 shares;
        uint256 requestedAt;
        uint256 processedAt;
        bool fulfilled;
        bool cancelled;
    }
    
    mapping(uint256 => WithdrawalRequest) internal _requests;
    mapping(address => uint256[]) internal _userRequests;
    
    uint256 internal _nextRequestId;
    uint256 internal _pendingRequestsCount;
    uint256 internal _totalQueuedShares;
    
    // ============ Queue Configuration ============
    uint256 internal _liquidityBuffer;       // Minimum assets to keep in vault
    uint256 internal _maxQueueSize;          // Maximum pending requests
    uint256 internal _minWithdrawalDelay;    // Minimum time before processing
    uint256 internal _minWithdrawalAmount;   // Minimum withdrawal amount (assets)
    uint256 internal _maxWithdrawalAmount;   // Maximum withdrawal amount (assets)
    uint256 internal _priorityFeeBps;        // Priority processing fee (basis points)
    
    // ============ Storage Gap ============
    uint256[40] private __gap;
}
