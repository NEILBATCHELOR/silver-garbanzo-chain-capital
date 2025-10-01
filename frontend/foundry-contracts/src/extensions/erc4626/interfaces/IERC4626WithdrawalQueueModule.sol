// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC4626WithdrawalQueueModule
 * @notice Interface for withdrawal queue management
 * @dev Implements withdrawal queuing for illiquid assets
 */
interface IERC4626WithdrawalQueueModule {
    // ============ Events ============
    event WithdrawalRequested(uint256 indexed requestId, address indexed requester, uint256 shares);
    event WithdrawalProcessed(uint256 indexed requestId, uint256 assets);
    event WithdrawalCancelled(uint256 indexed requestId);
    event QueueProcessed(uint256 count, uint256 totalAssets);
    event LiquidityBufferUpdated(uint256 newBuffer);
    
    // ============ Errors ============
    error InvalidRequest();
    error RequestNotPending();
    error InsufficientShares();
    error QueueFull();
    error NotRequester();
    
    // ============ Request Management ============
    
    /**
     * @notice Request withdrawal of shares
     * @param shares Amount of shares to withdraw
     * @return requestId ID of the withdrawal request
     */
    function requestWithdrawal(uint256 shares) external returns (uint256 requestId);
    
    /**
     * @notice Cancel pending withdrawal request
     * @param requestId ID of request to cancel
     */
    function cancelWithdrawal(uint256 requestId) external;
    
    /**
     * @notice Process withdrawal requests in queue
     * @param count Number of requests to process
     * @return processed Number actually processed
     */
    function processWithdrawals(uint256 count) external returns (uint256 processed);
    
    /**
     * @notice Claim processed withdrawal
     * @param requestId ID of processed request
     * @return assets Amount of assets received
     */
    function claimWithdrawal(uint256 requestId) external returns (uint256 assets);
    
    // ============ View Functions ============
    
    /**
     * @notice Get all requests for an address
     * @param user User address
     * @return requestIds Array of request IDs
     */
    function getUserRequests(address user) external view returns (uint256[] memory requestIds);
    
    /**
     * @notice Get pending requests count
     * @return count Number of pending requests
     */
    function getPendingCount() external view returns (uint256 count);
    
    /**
     * @notice Get total shares in queue
     * @return total Total shares waiting
     */
    function getTotalQueuedShares() external view returns (uint256 total);
    
    /**
     * @notice Check if request is ready to claim
     * @param requestId Request ID
     * @return ready True if ready to claim
     */
    function isReadyToClaim(uint256 requestId) external view returns (bool ready);
    
    /**
     * @notice Get liquidity buffer
     * @return buffer Current buffer amount
     */
    function getLiquidityBuffer() external view returns (uint256 buffer);
}
