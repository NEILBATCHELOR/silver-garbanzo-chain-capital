// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {RequestStatus} from "../interfaces/IERC7540AsyncVault.sol";

/**
 * @title AsyncVaultStorage
 * @notice Storage layout for ERC-7540 Async Vault functionality
 * @dev Uses struct storage pattern with storage gaps for upgradeability
 */
abstract contract AsyncVaultStorage {
    // ============ Structs ============
    
    struct DepositRequest {
        address controller;      // Address that controls the request
        address owner;           // Original depositor
        uint256 assets;          // Amount of assets to deposit
        uint256 shares;          // Shares to receive (calculated on fulfillment)
        RequestStatus status;    // Current status of the request
        uint256 requestedAt;     // Timestamp when request was created
        uint256 fulfilledAt;     // Timestamp when request was fulfilled
    }
    
    struct RedeemRequest {
        address controller;      // Address that controls the request
        address owner;           // Original redeemer
        uint256 shares;          // Amount of shares to redeem
        uint256 assets;          // Assets to receive (calculated on fulfillment)
        RequestStatus status;    // Current status of the request
        uint256 requestedAt;     // Timestamp when request was created
        uint256 fulfilledAt;     // Timestamp when request was fulfilled
    }
    
    // ============ State Variables ============
    
    /// @notice Mapping of request ID to deposit request
    mapping(uint256 => DepositRequest) internal _depositRequests;
    
    /// @notice Mapping of request ID to redeem request
    mapping(uint256 => RedeemRequest) internal _redeemRequests;
    
    /// @notice Next request ID to be issued
    uint256 internal _nextRequestId;
    
    /// @notice Mapping of user address to their request IDs
    mapping(address => uint256[]) internal _userDepositRequests;
    mapping(address => uint256[]) internal _userRedeemRequests;
    
    /// @notice Total pending deposit assets
    uint256 internal _pendingDepositAssets;
    
    /// @notice Total pending redeem shares
    uint256 internal _pendingRedeemShares;
    
    /// @notice Minimum fulfillment delay (seconds)
    uint256 internal _minimumFulfillmentDelay;
    
    /// @notice Maximum pending requests per user
    uint256 internal _maxPendingRequestsPerUser;
    
    // ============ Storage Gap ============
    
    /**
     * @dev Storage gap to allow for future storage layout changes
     * This gap ensures that storage slots aren't accidentally reused during upgrades
     */
    uint256[42] private __gap;
}
