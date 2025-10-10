// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @notice Request status for async operations
 */
enum RequestStatus {
    PENDING,      // Request created, awaiting fulfillment
    FULFILLED,    // Request fulfilled by operator, ready to claim
    CLAIMED,      // User has claimed their shares/assets
    CANCELLED     // Request cancelled by user before fulfillment
}

/**
 * @title IERC7540AsyncVault
 * @notice Interface for ERC-7540 Async Vault extension
 * @dev Extends ERC-4626 with async deposit/redeem functionality
 * 
 * Async Flow:
 * 1. User requests deposit/redeem (assets locked)
 * 2. Operator fulfills request when ready (shares/assets calculated)
 * 3. User claims their shares/assets
 * 
 * Use Cases:
 * - Real estate tokenization (property sales take days/weeks)
 * - Liquid staking (unbonding periods: 7-28 days)
 * - Private equity funds (capital calls)
 * - Cross-chain deposits (bridge delays)
 */
interface IERC7540AsyncVault {
    // ============ Events ============
    
    event DepositRequested(
        uint256 indexed requestId,
        address indexed controller,
        address indexed owner,
        uint256 assets
    );
    
    event DepositFulfilled(
        uint256 indexed requestId,
        address indexed controller,
        uint256 assets,
        uint256 shares
    );
    
    event DepositClaimed(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 shares
    );
    
    event DepositCancelled(
        uint256 indexed requestId,
        address indexed controller
    );
    
    event RedeemRequested(
        uint256 indexed requestId,
        address indexed controller,
        address indexed owner,
        uint256 shares
    );
    
    event RedeemFulfilled(
        uint256 indexed requestId,
        address indexed controller,
        uint256 shares,
        uint256 assets
    );
    
    event RedeemClaimed(
        uint256 indexed requestId,
        address indexed receiver,
        uint256 assets
    );
    
    event RedeemCancelled(
        uint256 indexed requestId,
        address indexed controller
    );
    
    event MinimumFulfillmentDelayUpdated(uint256 newDelay);
    event MaxPendingRequestsUpdated(uint256 newMax);
    
    // ============ Errors ============
    
    error InvalidRequestId();
    error RequestNotPending();
    error RequestNotFulfilled();
    error UnauthorizedController();
    error FulfillmentDelayNotMet();
    error TooManyPendingRequests();
    error InsufficientAssets();
    error InsufficientShares();
    
    // ============ Deposit Request Functions ============
    
    /**
     * @notice Request an async deposit
     * @param assets Amount of assets to deposit
     * @param controller Address that can manage this request
     * @param owner Address that will own the shares
     * @return requestId The ID of the created request
     */
    function requestDeposit(
        uint256 assets,
        address controller,
        address owner
    ) external returns (uint256 requestId);
    
    /**
     * @notice Fulfill a pending deposit request (operator only)
     * @param requestId The request to fulfill
     */
    function fulfillDepositRequest(uint256 requestId) external;
    
    /**
     * @notice Claim shares from fulfilled deposit
     * @param requestId The request to claim
     * @param receiver Address to receive the shares
     * @return shares Amount of shares received
     */
    function claimDeposit(
        uint256 requestId,
        address receiver
    ) external returns (uint256 shares);
    
    /**
     * @notice Cancel a pending deposit request
     * @param requestId The request to cancel
     */
    function cancelDepositRequest(uint256 requestId) external;
    
    // ============ Redeem Request Functions ============
    
    /**
     * @notice Request an async redeem
     * @param shares Amount of shares to redeem
     * @param controller Address that can manage this request
     * @param owner Address that owns the shares
     * @return requestId The ID of the created request
     */
    function requestRedeem(
        uint256 shares,
        address controller,
        address owner
    ) external returns (uint256 requestId);
    
    /**
     * @notice Fulfill a pending redeem request (operator only)
     * @param requestId The request to fulfill
     */
    function fulfillRedeemRequest(uint256 requestId) external;
    
    /**
     * @notice Claim assets from fulfilled redeem
     * @param requestId The request to claim
     * @param receiver Address to receive the assets
     * @return assets Amount of assets received
     */
    function claimRedeem(
        uint256 requestId,
        address receiver
    ) external returns (uint256 assets);
    
    /**
     * @notice Cancel a pending redeem request
     * @param requestId The request to cancel
     */
    function cancelRedeemRequest(uint256 requestId) external;
    
    // ============ View Functions ============
    
    /**
     * @notice Get deposit request details
     */
    function getDepositRequest(uint256 requestId) external view returns (
        address controller,
        address owner,
        uint256 assets,
        uint256 shares,
        RequestStatus status,
        uint256 requestedAt,
        uint256 fulfilledAt
    );
    
    /**
     * @notice Get redeem request details
     */
    function getRedeemRequest(uint256 requestId) external view returns (
        address controller,
        address owner,
        uint256 shares,
        uint256 assets,
        RequestStatus status,
        uint256 requestedAt,
        uint256 fulfilledAt
    );
    
    /**
     * @notice Check if deposit request is ready to claim
     */
    function isDepositClaimable(uint256 requestId) external view returns (bool);
    
    /**
     * @notice Check if redeem request is ready to claim
     */
    function isRedeemClaimable(uint256 requestId) external view returns (bool);
    
    /**
     * @notice Get all deposit requests for a user
     */
    function getUserDepositRequests(address user) external view returns (uint256[] memory);
    
    /**
     * @notice Get all redeem requests for a user
     */
    function getUserRedeemRequests(address user) external view returns (uint256[] memory);
    
    /**
     * @notice Get total pending deposit assets
     */
    function pendingDepositAssets() external view returns (uint256);
    
    /**
     * @notice Get total pending redeem shares
     */
    function pendingRedeemShares() external view returns (uint256);
    
    /**
     * @notice Get minimum fulfillment delay
     */
    function minimumFulfillmentDelay() external view returns (uint256);
    
    /**
     * @notice Get maximum pending requests per user
     */
    function maxPendingRequestsPerUser() external view returns (uint256);
}
