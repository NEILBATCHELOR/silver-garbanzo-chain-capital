// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Exchange.sol";

/// @title Interval Fund Redemption Tracker - Database Integrated
/// @notice Tracks redemption requests and approvals on-chain
/// @dev Backend service handles actual token transfers after on-chain approval
contract IntervalFundRedemption {
    IExchangeModule public constant EXCHANGE = 
        IExchangeModule(0x0000000000000000000000000000000000000065);
    
    address public fundManager;
    address public backendService;
    
    struct RedemptionWindow {
        string windowId;        // UUID from redemption_windows table
        string fundId;          // UUID from products table
        uint256 startTime;
        uint256 endTime;
        uint256 maxRedemptionPct;  // Basis points
        uint256 currentRedemptions;
        uint256 maxRedemptions;
        uint256 navPerShare;    // NAV at window open (18 decimals)
        bool isOpen;
    }
    
    struct RedemptionRequest {
        string requestId;       // UUID from redemption_requests table
        string windowId;
        address investor;
        uint256 amount;         // Fund tokens to redeem
        uint256 timestamp;
        uint256 navPerShare;
        string status;          // pending, approved, rejected, settled
        bool onChainApproved;   // On-chain approval flag
    }
    
    mapping(string => RedemptionWindow) public windows;
    mapping(string => RedemptionRequest) public requests;
    mapping(string => string[]) public windowRequests;
    mapping(string => string) public fundTokenDenoms;
    mapping(string => string) public fundUnderlyingDenoms;
    
    event WindowOpened(string indexed windowId, string indexed fundId, uint256 startTime, uint256 endTime);
    event RedemptionRequested(string indexed requestId, string indexed windowId, address investor, uint256 amount);
    event RedemptionApproved(string indexed requestId, address approver, uint256 payout);
    event RedemptionRejected(string indexed requestId, string reason);
    event RedemptionSettled(string indexed requestId, uint256 payout);
    event FundConfigured(string indexed fundId, string tokenDenom, string underlyingDenom);
    
    constructor(address _backendService) {
        fundManager = msg.sender;
        backendService = _backendService;
    }
    
    modifier onlyFundManager() {
        require(msg.sender == fundManager, "Not fund manager");
        _;
    }
    
    modifier onlyBackendOrManager() {
        require(msg.sender == fundManager || msg.sender == backendService, "Not authorized");
        _;
    }
    
    /// @notice Configure fund denominations
    function configureFund(
        string memory fundId,
        string memory tokenDenom,
        string memory underlyingDenom
    ) external onlyBackendOrManager {
        fundTokenDenoms[fundId] = tokenDenom;
        fundUnderlyingDenoms[fundId] = underlyingDenom;
        emit FundConfigured(fundId, tokenDenom, underlyingDenom);
    }
    
    /// @notice Open redemption window
    function openRedemptionWindow(
        string memory windowId,
        string memory fundId,
        uint256 duration,
        uint256 maxPct,
        uint256 maxAmount,
        uint256 navPerShare
    ) external onlyBackendOrManager {
        require(bytes(fundTokenDenoms[fundId]).length > 0, "Fund not configured");
        
        windows[windowId] = RedemptionWindow({
            windowId: windowId,
            fundId: fundId,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            maxRedemptionPct: maxPct,
            currentRedemptions: 0,
            maxRedemptions: maxAmount,
            navPerShare: navPerShare,
            isOpen: true
        });
        
        emit WindowOpened(windowId, fundId, block.timestamp, block.timestamp + duration);
    }
    
    /// @notice Submit redemption request
    function requestRedemption(
        string memory requestId,
        string memory windowId,
        uint256 amount
    ) external {
        RedemptionWindow storage window = windows[windowId];
        require(window.isOpen, "Window not open");
        require(block.timestamp >= window.startTime && block.timestamp <= window.endTime, "Window expired");
        require(window.currentRedemptions + amount <= window.maxRedemptions, "Exceeds cap");
        
        requests[requestId] = RedemptionRequest({
            requestId: requestId,
            windowId: windowId,
            investor: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            navPerShare: window.navPerShare,
            status: "pending",
            onChainApproved: false
        });
        
        windowRequests[windowId].push(requestId);
        window.currentRedemptions += amount;
        
        emit RedemptionRequested(requestId, windowId, msg.sender, amount);
    }
    
    /// @notice Approve redemption on-chain
    function approveRedemption(
        string memory requestId,
        string memory fundSubaccountID
    ) public onlyBackendOrManager {
        RedemptionRequest storage request = requests[requestId];
        require(!request.onChainApproved, "Already approved");
        require(keccak256(bytes(request.status)) != keccak256(bytes("rejected")), "Already rejected");
        
        RedemptionWindow storage window = windows[request.windowId];
        uint256 payout = (request.amount * request.navPerShare) / 1e18;
        
        // Mark as approved on-chain (backend handles actual transfer)
        request.onChainApproved = true;
        request.status = "approved";
        
        emit RedemptionApproved(requestId, msg.sender, payout);
    }
    
    /// @notice Mark redemption as settled (after backend transfer)
    function markSettled(string memory requestId) external onlyBackendOrManager {
        RedemptionRequest storage request = requests[requestId];
        require(request.onChainApproved, "Not approved");
        
        request.status = "settled";
        uint256 payout = (request.amount * request.navPerShare) / 1e18;
        
        emit RedemptionSettled(requestId, payout);
    }
    
    /// @notice Batch approve redemptions
    function batchApproveRedemptions(
        string[] memory requestIds,
        string memory fundSubaccountID
    ) external onlyBackendOrManager {
        for (uint256 i = 0; i < requestIds.length; i++) {
            RedemptionRequest storage request = requests[requestIds[i]];
            if (!request.onChainApproved && keccak256(bytes(request.status)) != keccak256(bytes("rejected"))) {
                approveRedemption(requestIds[i], fundSubaccountID);
            }
        }
    }
    
    /// @notice Reject redemption
    function rejectRedemption(
        string memory requestId,
        string memory reason
    ) external onlyBackendOrManager {
        RedemptionRequest storage request = requests[requestId];
        require(!request.onChainApproved, "Already approved");
        
        RedemptionWindow storage window = windows[request.windowId];
        window.currentRedemptions -= request.amount;
        
        request.status = "rejected";
        emit RedemptionRejected(requestId, reason);
    }
    
    /// @notice Close window
    function closeWindow(string memory windowId) external onlyBackendOrManager {
        RedemptionWindow storage window = windows[windowId];
        require(block.timestamp > window.endTime, "Window still open");
        window.isOpen = false;
    }
    
    /// @notice Update backend service
    function updateBackendService(address newBackend) external onlyFundManager {
        backendService = newBackend;
    }
    
    /// @notice Get request details
    function getRequest(string memory requestId) 
        external 
        view 
        returns (RedemptionRequest memory) 
    {
        return requests[requestId];
    }
    
    /// @notice Get window details
    function getWindow(string memory windowId) 
        external 
        view 
        returns (RedemptionWindow memory) 
    {
        return windows[windowId];
    }
    
    /// @notice Get window requests
    function getWindowRequests(string memory windowId) 
        external 
        view 
        returns (string[] memory) 
    {
        return windowRequests[windowId];
    }
    
    /// @notice Calculate redemption payout
    function calculatePayout(string memory requestId) 
        external 
        view 
        returns (uint256) 
    {
        RedemptionRequest storage request = requests[requestId];
        return (request.amount * request.navPerShare) / 1e18;
    }
}
