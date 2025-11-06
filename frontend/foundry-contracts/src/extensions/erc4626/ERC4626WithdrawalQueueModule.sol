// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IERC4626WithdrawalQueueModule.sol";
import "./storage/WithdrawalQueueStorage.sol";

/**
 * @title ERC4626WithdrawalQueueModule
 * @notice Withdrawal queue management for illiquid vaults
 * @dev Prevents bank runs and manages orderly withdrawals
 */
contract ERC4626WithdrawalQueueModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC4626WithdrawalQueueModule,
    WithdrawalQueueStorage
{
    bytes32 public constant QUEUE_MANAGER_ROLE = keccak256("QUEUE_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    address public vault;
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        address admin,
        address vault_,
        uint256 liquidityBuffer,
        uint256 maxQueueSize,
        uint256 minWithdrawalDelay,
        uint256 minWithdrawalAmount,
        uint256 maxWithdrawalAmount,
        uint256 priorityFeeBps
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(QUEUE_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        vault = vault_;
        _liquidityBuffer = liquidityBuffer;
        _maxQueueSize = maxQueueSize;
        _minWithdrawalDelay = minWithdrawalDelay;
        _minWithdrawalAmount = minWithdrawalAmount;
        _maxWithdrawalAmount = maxWithdrawalAmount;
        _priorityFeeBps = priorityFeeBps;
        _nextRequestId = 1;
    }
    
    function requestWithdrawal(uint256 shares) external returns (uint256 requestId) {
        if (shares == 0) revert InvalidRequest();
        if (_pendingRequestsCount >= _maxQueueSize) revert QueueFull();
        
        IERC20 vaultShares = IERC20(vault);
        if (vaultShares.balanceOf(msg.sender) < shares) revert InsufficientShares();
        
        // Check min/max withdrawal amounts (if set)
        uint256 assets = _convertToAssets(shares);
        if (_minWithdrawalAmount > 0 && assets < _minWithdrawalAmount) {
            revert InvalidRequest(); // Below minimum
        }
        if (_maxWithdrawalAmount > 0 && assets > _maxWithdrawalAmount) {
            revert InvalidRequest(); // Above maximum
        }
        
        requestId = _nextRequestId++;
        
        _requests[requestId] = WithdrawalRequest({
            requester: msg.sender,
            shares: shares,
            requestedAt: block.timestamp,
            processedAt: 0,
            fulfilled: false,
            cancelled: false
        });
        
        _userRequests[msg.sender].push(requestId);
        _pendingRequestsCount++;
        _totalQueuedShares += shares;
        
        vaultShares.transferFrom(msg.sender, address(this), shares);
        
        emit WithdrawalRequested(requestId, msg.sender, shares);
    }
    
    function cancelWithdrawal(uint256 requestId) external {
        WithdrawalRequest storage request = _requests[requestId];
        
        if (request.requester != msg.sender) revert NotRequester();
        if (request.fulfilled || request.cancelled) revert RequestNotPending();
        
        request.cancelled = true;
        _pendingRequestsCount--;
        _totalQueuedShares -= request.shares;
        
        IERC20(vault).transfer(msg.sender, request.shares);
        
        emit WithdrawalCancelled(requestId);
    }
    
    function processWithdrawals(uint256 count) 
        external 
        onlyRole(QUEUE_MANAGER_ROLE) 
        returns (uint256 processed) 
    {
        uint256 availableAssets = _getAvailableAssets();
        
        for (uint256 i = 1; i <= _nextRequestId - 1 && processed < count; i++) {
            WithdrawalRequest storage request = _requests[i];
            
            if (request.fulfilled || request.cancelled) continue;
            if (block.timestamp < request.requestedAt + _minWithdrawalDelay) continue;
            
            uint256 assets = _convertToAssets(request.shares);
            if (assets > availableAssets) break;
            
            request.fulfilled = true;
            request.processedAt = block.timestamp;
            _pendingRequestsCount--;
            _totalQueuedShares -= request.shares;
            availableAssets -= assets;
            processed++;
            
            emit WithdrawalProcessed(i, assets);
        }
        
        emit QueueProcessed(processed, availableAssets);
    }
    
    function claimWithdrawal(uint256 requestId) external returns (uint256 assets) {
        WithdrawalRequest storage request = _requests[requestId];
        
        if (request.requester != msg.sender) revert NotRequester();
        if (!request.fulfilled) revert RequestNotPending();
        
        assets = _convertToAssets(request.shares);
        
        (bool success,) = vault.call(
            abi.encodeWithSignature(
                "redeem(uint256,address,address)",
                request.shares,
                msg.sender,
                address(this)
            )
        );
        require(success, "Redemption failed");
    }
    
    function getUserRequests(address user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return _userRequests[user];
    }
    
    function getPendingCount() external view returns (uint256) {
        return _pendingRequestsCount;
    }
    
    function getTotalQueuedShares() external view returns (uint256) {
        return _totalQueuedShares;
    }
    
    function isReadyToClaim(uint256 requestId) external view returns (bool) {
        WithdrawalRequest memory request = _requests[requestId];
        return request.fulfilled && !request.cancelled;
    }
    
    function getLiquidityBuffer() external view returns (uint256) {
        return _liquidityBuffer;
    }
    
    function getMinWithdrawalAmount() external view returns (uint256) {
        return _minWithdrawalAmount;
    }
    
    function getMaxWithdrawalAmount() external view returns (uint256) {
        return _maxWithdrawalAmount;
    }
    
    function getPriorityFeeBps() external view returns (uint256) {
        return _priorityFeeBps;
    }
    
    function setLiquidityBuffer(uint256 buffer) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _liquidityBuffer = buffer;
        emit LiquidityBufferUpdated(buffer);
    }
    
    function setWithdrawalLimits(
        uint256 minAmount,
        uint256 maxAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (maxAmount > 0 && minAmount > maxAmount) revert InvalidRequest();
        _minWithdrawalAmount = minAmount;
        _maxWithdrawalAmount = maxAmount;
    }
    
    function setPriorityFeeBps(uint256 feeBps)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (feeBps > 10000) revert InvalidRequest(); // Max 100%
        _priorityFeeBps = feeBps;
    }
    
    function _getAvailableAssets() internal view returns (uint256) {
        uint256 totalAssets = _getTotalAssets();
        return totalAssets > _liquidityBuffer ? totalAssets - _liquidityBuffer : 0;
    }
    
    function _getTotalAssets() internal view returns (uint256) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("totalAssets()")
        );
        require(success, "Failed to get total assets");
        return abi.decode(data, (uint256));
    }
    
    function _convertToAssets(uint256 shares) internal view returns (uint256) {
        (bool success, bytes memory data) = vault.staticcall(
            abi.encodeWithSignature("convertToAssets(uint256)", shares)
        );
        require(success, "Failed to convert");
        return abi.decode(data, (uint256));
    }
    
    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
