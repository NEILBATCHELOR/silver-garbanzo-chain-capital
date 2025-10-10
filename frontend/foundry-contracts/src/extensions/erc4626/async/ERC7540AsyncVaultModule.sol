// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "./interfaces/IERC7540AsyncVault.sol";
import "./storage/AsyncVaultStorage.sol";

/**
 * @title ERC7540AsyncVaultModule
 * @notice ERC-7540 implementation for async deposits/redeems
 * @dev Enables vaults with settlement delays for RWA, liquid staking, cross-chain
 * 
 * Key Features:
 * - Request-based deposit/redeem workflow
 * - Operator-controlled fulfillment
 * - Configurable fulfillment delays
 * - User cancellation before fulfillment
 * - FIFO processing order
 * 
 * Use Cases:
 * - Real Estate Vaults: Property sales take days/weeks
 * - Liquid Staking: Unbonding periods (7-28 days)
 * - Private Equity: Capital calls with delays
 * - Cross-Chain: Bridge settlement delays
 * 
 * Architecture:
 * 1. User requests deposit/redeem (assets/shares locked)
 * 2. Operator fulfills when ready (shares/assets calculated)
 * 3. User claims their shares/assets
 */
contract ERC7540AsyncVaultModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC7540AsyncVault,
    AsyncVaultStorage
{
    using SafeERC20 for IERC20;
    
    // ============ Roles ============
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    // ============ State Variables ============
    IERC4626 public vault;
    IERC20 public asset;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize async vault module
     * @param admin Admin address
     * @param vault_ The ERC-4626 vault address
     * @param minimumFulfillmentDelay_ Minimum delay before fulfillment (seconds)
     * @param maxPendingRequestsPerUser_ Max pending requests per user
     */
    function initialize(
        address admin,
        address vault_,
        uint256 minimumFulfillmentDelay_,
        uint256 maxPendingRequestsPerUser_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        vault = IERC4626(vault_);
        asset = IERC20(vault.asset());
        _minimumFulfillmentDelay = minimumFulfillmentDelay_;
        _maxPendingRequestsPerUser = maxPendingRequestsPerUser_;
        _nextRequestId = 1; // Start from 1 (0 is invalid)
    }
    
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
    ) external override returns (uint256 requestId) {
        // Check maximum pending requests
        if (_userDepositRequests[owner].length >= _maxPendingRequestsPerUser) {
            revert TooManyPendingRequests();
        }
        
        // Transfer assets from user to this module
        asset.safeTransferFrom(msg.sender, address(this), assets);
        
        // Create request
        requestId = _nextRequestId++;
        _depositRequests[requestId] = DepositRequest({
            controller: controller,
            owner: owner,
            assets: assets,
            shares: 0, // Calculated on fulfillment
            status: RequestStatus.PENDING,
            requestedAt: block.timestamp,
            fulfilledAt: 0
        });
        
        // Track user request
        _userDepositRequests[owner].push(requestId);
        
        // Update pending totals
        _pendingDepositAssets += assets;
        
        emit DepositRequested(requestId, controller, owner, assets);
    }
    
    /**
     * @notice Fulfill a pending deposit request (operator only)
     * @param requestId The request to fulfill
     */
    function fulfillDepositRequest(uint256 requestId) external override onlyRole(OPERATOR_ROLE) {
        DepositRequest storage request = _depositRequests[requestId];
        
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();
        if (block.timestamp < request.requestedAt + _minimumFulfillmentDelay) {
            revert FulfillmentDelayNotMet();
        }
        
        // Calculate shares at current vault exchange rate
        uint256 shares = vault.previewDeposit(request.assets);
        request.shares = shares;
        
        // Approve and deposit assets into vault
        asset.approve(address(vault), request.assets);
        uint256 actualShares = vault.deposit(request.assets, address(this));
        
        // Update request status
        request.status = RequestStatus.FULFILLED;
        request.fulfilledAt = block.timestamp;
        
        // Update pending totals
        _pendingDepositAssets -= request.assets;
        
        emit DepositFulfilled(requestId, request.controller, request.assets, actualShares);
    }
    
    /**
     * @notice Claim shares from fulfilled deposit
     * @param requestId The request to claim
     * @param receiver Address to receive the shares
     * @return shares Amount of shares received
     */
    function claimDeposit(
        uint256 requestId,
        address receiver
    ) external override returns (uint256 shares) {
        DepositRequest storage request = _depositRequests[requestId];
        
        if (request.status != RequestStatus.FULFILLED) revert RequestNotFulfilled();
        if (msg.sender != request.controller && msg.sender != request.owner) {
            revert UnauthorizedController();
        }
        
        shares = request.shares;
        request.status = RequestStatus.CLAIMED;
        
        // Transfer shares to receiver
        IERC20(address(vault)).safeTransfer(receiver, shares);
        
        emit DepositClaimed(requestId, receiver, shares);
    }
    
    /**
     * @notice Cancel a pending deposit request
     * @param requestId The request to cancel
     */
    function cancelDepositRequest(uint256 requestId) external override {
        DepositRequest storage request = _depositRequests[requestId];
        
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();
        if (msg.sender != request.controller && msg.sender != request.owner) {
            revert UnauthorizedController();
        }
        
        request.status = RequestStatus.CANCELLED;
        
        // Return assets to owner
        asset.safeTransfer(request.owner, request.assets);
        
        // Update pending totals
        _pendingDepositAssets -= request.assets;
        
        emit DepositCancelled(requestId, request.controller);
    }
    
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
    ) external override returns (uint256 requestId) {
        // Check maximum pending requests
        if (_userRedeemRequests[owner].length >= _maxPendingRequestsPerUser) {
            revert TooManyPendingRequests();
        }
        
        // Transfer shares from user to this module
        IERC20(address(vault)).safeTransferFrom(msg.sender, address(this), shares);
        
        // Create request
        requestId = _nextRequestId++;
        _redeemRequests[requestId] = RedeemRequest({
            controller: controller,
            owner: owner,
            shares: shares,
            assets: 0, // Calculated on fulfillment
            status: RequestStatus.PENDING,
            requestedAt: block.timestamp,
            fulfilledAt: 0
        });
        
        // Track user request
        _userRedeemRequests[owner].push(requestId);
        
        // Update pending totals
        _pendingRedeemShares += shares;
        
        emit RedeemRequested(requestId, controller, owner, shares);
    }
    
    /**
     * @notice Fulfill a pending redeem request (operator only)
     * @param requestId The request to fulfill
     */
    function fulfillRedeemRequest(uint256 requestId) external override onlyRole(OPERATOR_ROLE) {
        RedeemRequest storage request = _redeemRequests[requestId];
        
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();
        if (block.timestamp < request.requestedAt + _minimumFulfillmentDelay) {
            revert FulfillmentDelayNotMet();
        }
        
        // Calculate assets at current vault exchange rate
        uint256 assets = vault.previewRedeem(request.shares);
        request.assets = assets;
        
        // Redeem from vault
        uint256 actualAssets = vault.redeem(request.shares, address(this), address(this));
        
        // Update request status
        request.status = RequestStatus.FULFILLED;
        request.fulfilledAt = block.timestamp;
        
        // Update pending totals
        _pendingRedeemShares -= request.shares;
        
        emit RedeemFulfilled(requestId, request.controller, request.shares, actualAssets);
    }
    
    /**
     * @notice Claim assets from fulfilled redeem
     * @param requestId The request to claim
     * @param receiver Address to receive the assets
     * @return assets Amount of assets received
     */
    function claimRedeem(
        uint256 requestId,
        address receiver
    ) external override returns (uint256 assets) {
        RedeemRequest storage request = _redeemRequests[requestId];
        
        if (request.status != RequestStatus.FULFILLED) revert RequestNotFulfilled();
        if (msg.sender != request.controller && msg.sender != request.owner) {
            revert UnauthorizedController();
        }
        
        assets = request.assets;
        request.status = RequestStatus.CLAIMED;
        
        // Transfer assets to receiver
        asset.safeTransfer(receiver, assets);
        
        emit RedeemClaimed(requestId, receiver, assets);
    }
    
    /**
     * @notice Cancel a pending redeem request
     * @param requestId The request to cancel
     */
    function cancelRedeemRequest(uint256 requestId) external override {
        RedeemRequest storage request = _redeemRequests[requestId];
        
        if (request.status != RequestStatus.PENDING) revert RequestNotPending();
        if (msg.sender != request.controller && msg.sender != request.owner) {
            revert UnauthorizedController();
        }
        
        request.status = RequestStatus.CANCELLED;
        
        // Return shares to owner
        IERC20(address(vault)).safeTransfer(request.owner, request.shares);
        
        // Update pending totals
        _pendingRedeemShares -= request.shares;
        
        emit RedeemCancelled(requestId, request.controller);
    }
    
    // ============ View Functions ============
    
    function getDepositRequest(uint256 requestId) external view override returns (
        address controller,
        address owner,
        uint256 assets,
        uint256 shares,
        RequestStatus status,
        uint256 requestedAt,
        uint256 fulfilledAt
    ) {
        DepositRequest memory request = _depositRequests[requestId];
        return (
            request.controller,
            request.owner,
            request.assets,
            request.shares,
            request.status,
            request.requestedAt,
            request.fulfilledAt
        );
    }
    
    function getRedeemRequest(uint256 requestId) external view override returns (
        address controller,
        address owner,
        uint256 shares,
        uint256 assets,
        RequestStatus status,
        uint256 requestedAt,
        uint256 fulfilledAt
    ) {
        RedeemRequest memory request = _redeemRequests[requestId];
        return (
            request.controller,
            request.owner,
            request.shares,
            request.assets,
            request.status,
            request.requestedAt,
            request.fulfilledAt
        );
    }
    
    function isDepositClaimable(uint256 requestId) external view override returns (bool) {
        return _depositRequests[requestId].status == RequestStatus.FULFILLED;
    }
    
    function isRedeemClaimable(uint256 requestId) external view override returns (bool) {
        return _redeemRequests[requestId].status == RequestStatus.FULFILLED;
    }
    
    function getUserDepositRequests(address user) external view override returns (uint256[] memory) {
        return _userDepositRequests[user];
    }
    
    function getUserRedeemRequests(address user) external view override returns (uint256[] memory) {
        return _userRedeemRequests[user];
    }
    
    function pendingDepositAssets() external view override returns (uint256) {
        return _pendingDepositAssets;
    }
    
    function pendingRedeemShares() external view override returns (uint256) {
        return _pendingRedeemShares;
    }
    
    function minimumFulfillmentDelay() external view override returns (uint256) {
        return _minimumFulfillmentDelay;
    }
    
    function maxPendingRequestsPerUser() external view override returns (uint256) {
        return _maxPendingRequestsPerUser;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update minimum fulfillment delay
     */
    function setMinimumFulfillmentDelay(uint256 newDelay) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _minimumFulfillmentDelay = newDelay;
        emit MinimumFulfillmentDelayUpdated(newDelay);
    }
    
    /**
     * @notice Update max pending requests per user
     */
    function setMaxPendingRequestsPerUser(uint256 newMax) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _maxPendingRequestsPerUser = newMax;
        emit MaxPendingRequestsUpdated(newMax);
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
