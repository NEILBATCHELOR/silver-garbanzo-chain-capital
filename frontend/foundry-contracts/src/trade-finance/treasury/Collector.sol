// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IACLManager} from "../interfaces/IACLManager.sol";

/**
 * @title Collector
 * @notice Collects and manages protocol fees and revenue
 * @dev Handles fee collection from multiple sources and distribution
 * 
 * Revenue Sources:
 * - Interest rate spreads
 * - Flash loan fees (0.09% default)
 * - Liquidation bonuses (protocol share)
 * - Oracle data subscription fees
 * - Position management fees
 * 
 * Key Features:
 * - Multi-token fee collection
 * - Streaming payment capability (Sablier-style)
 * - Revenue distribution to stakeholders
 * - Emergency withdrawal functionality
 * - Fee sweeping optimization
 */
contract Collector is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Constants ============
    
    address public constant ETH_MOCK_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    
    // ============ Immutable Variables ============
    
    IACLManager public immutable ACL_MANAGER;
    
    // ============ Structs ============
    
    struct Stream {
        address sender;
        address recipient;
        uint256 deposit;
        address tokenAddress;
        uint256 startTime;
        uint256 stopTime;
        uint256 remainingBalance;
        uint256 ratePerSecond;
        bool isEntity;
    }
    
    struct FeeAccumulation {
        uint256 amount;
        uint256 lastCollected;
        uint256 totalCollected;
    }
    
    // ============ State Variables ============
    
    // Token => accumulated fees
    mapping(address => FeeAccumulation) public feeAccumulations;
    
    // Stream ID => stream data
    mapping(uint256 => Stream) private _streams;
    
    // Next stream ID
    uint256 private _nextStreamId;
    
    // Revenue recipients (treasury, team, insurance fund, etc.)
    mapping(bytes32 => address) public revenueRecipients;
    
    // Fee shares per recipient (in basis points)
    mapping(bytes32 => uint256) public feeShares;
    
    // Total fee shares (should equal 10000 = 100%)
    uint256 public totalFeeShares;
    
    // ============ Events ============
    
    event FeeCollected(
        address indexed token,
        uint256 amount,
        uint256 timestamp
    );
    
    event FeeDistributed(
        address indexed token,
        address indexed recipient,
        uint256 amount
    );
    
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    );
    
    event StreamWithdrawn(
        uint256 indexed streamId,
        address indexed recipient,
        uint256 amount
    );
    
    event StreamCanceled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );
    
    event RecipientUpdated(
        bytes32 indexed recipientId,
        address indexed oldAddress,
        address indexed newAddress
    );
    
    event FeeShareUpdated(
        bytes32 indexed recipientId,
        uint256 oldShare,
        uint256 newShare
    );
    
    // ============ Errors ============
    
    error OnlyAdmin();
    error InvalidShares();
    error StreamDoesNotExist();
    error OnlyRecipient();
    error InsufficientBalance();
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        if (!ACL_MANAGER.isPoolAdmin(msg.sender)) revert OnlyAdmin();
        _;
    }
    
    modifier streamExists(uint256 streamId) {
        if (!_streams[streamId].isEntity) revert StreamDoesNotExist();
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address aclManager) {
        ACL_MANAGER = IACLManager(aclManager);
        _nextStreamId = 1;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Set revenue recipient address
     */
    function setRevenueRecipient(
        bytes32 recipientId,
        address recipient
    ) external onlyAdmin {
        address oldRecipient = revenueRecipients[recipientId];
        revenueRecipients[recipientId] = recipient;
        emit RecipientUpdated(recipientId, oldRecipient, recipient);
    }
    
    /**
     * @notice Set fee share for recipient
     */
    function setFeeShare(
        bytes32 recipientId,
        uint256 share
    ) external onlyAdmin {
        uint256 oldShare = feeShares[recipientId];
        
        // Update total shares
        totalFeeShares = totalFeeShares - oldShare + share;
        
        if (totalFeeShares > 10000) revert InvalidShares();
        
        feeShares[recipientId] = share;
        emit FeeShareUpdated(recipientId, oldShare, share);
    }
    
    /**
     * @notice Initialize default revenue distribution
     */
    function initializeDistribution(
        bytes32[] calldata recipientIds,
        address[] calldata recipients,
        uint256[] calldata shares
    ) external onlyAdmin {
        require(
            recipientIds.length == recipients.length && 
            recipients.length == shares.length,
            "Length mismatch"
        );
        
        uint256 totalShares = 0;
        for (uint256 i = 0; i < recipientIds.length; i++) {
            revenueRecipients[recipientIds[i]] = recipients[i];
            feeShares[recipientIds[i]] = shares[i];
            totalShares += shares[i];
        }
        
        if (totalShares != 10000) revert InvalidShares();
        totalFeeShares = totalShares;
    }
    
    // ============ Fee Collection Functions ============
    
    /**
     * @notice Collect fees from protocol
     */
    function collectFees(
        address token,
        uint256 amount
    ) external nonReentrant {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        feeAccumulations[token].amount += amount;
        feeAccumulations[token].lastCollected = block.timestamp;
        feeAccumulations[token].totalCollected += amount;
        
        emit FeeCollected(token, amount, block.timestamp);
    }
    
    /**
     * @notice Distribute collected fees to recipients
     */
    function distributeFees(
        address token,
        bytes32[] calldata recipientIds
    ) external nonReentrant onlyAdmin {
        uint256 totalAmount = feeAccumulations[token].amount;
        require(totalAmount > 0, "No fees to distribute");
        
        for (uint256 i = 0; i < recipientIds.length; i++) {
            bytes32 recipientId = recipientIds[i];
            address recipient = revenueRecipients[recipientId];
            uint256 share = feeShares[recipientId];
            
            if (recipient == address(0) || share == 0) continue;
            
            uint256 amount = (totalAmount * share) / 10000;
            
            if (amount > 0) {
                IERC20(token).safeTransfer(recipient, amount);
                emit FeeDistributed(token, recipient, amount);
            }
        }
        
        // Reset accumulated fees
        feeAccumulations[token].amount = 0;
    }
    
    /**
     * @notice Sweep multiple tokens to treasury
     */
    function sweepTokens(
        address[] calldata tokens,
        address treasury
    ) external nonReentrant onlyAdmin {
        for (uint256 i = 0; i < tokens.length; i++) {
            address token = tokens[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            
            if (balance > 0) {
                IERC20(token).safeTransfer(treasury, balance);
            }
        }
    }
    
    // ============ Streaming Functions ============
    
    /**
     * @notice Create payment stream
     */
    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) external nonReentrant onlyAdmin returns (uint256) {
        require(recipient != address(0), "Invalid recipient");
        require(deposit > 0, "Deposit must be positive");
        require(startTime >= block.timestamp, "Start time too early");
        require(stopTime > startTime, "Stop time must be after start");
        
        uint256 duration = stopTime - startTime;
        require(deposit >= duration, "Deposit too small");
        
        // Transfer tokens to contract
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), deposit);
        
        uint256 streamId = _nextStreamId++;
        uint256 ratePerSecond = deposit / duration;
        
        _streams[streamId] = Stream({
            sender: msg.sender,
            recipient: recipient,
            deposit: deposit,
            tokenAddress: tokenAddress,
            startTime: startTime,
            stopTime: stopTime,
            remainingBalance: deposit,
            ratePerSecond: ratePerSecond,
            isEntity: true
        });
        
        emit StreamCreated(
            streamId,
            msg.sender,
            recipient,
            deposit,
            tokenAddress,
            startTime,
            stopTime
        );
        
        return streamId;
    }
    
    /**
     * @notice Withdraw from stream
     */
    function withdrawFromStream(
        uint256 streamId,
        uint256 amount
    ) external nonReentrant streamExists(streamId) returns (bool) {
        Stream storage stream = _streams[streamId];
        
        if (msg.sender != stream.recipient) revert OnlyRecipient();
        
        uint256 balance = _balanceOf(streamId, stream.recipient);
        if (balance < amount) revert InsufficientBalance();
        
        stream.remainingBalance -= amount;
        
        IERC20(stream.tokenAddress).safeTransfer(stream.recipient, amount);
        
        emit StreamWithdrawn(streamId, stream.recipient, amount);
        
        return true;
    }
    
    /**
     * @notice Cancel stream
     */
    function cancelStream(uint256 streamId) 
        external 
        nonReentrant 
        streamExists(streamId) 
        returns (bool) 
    {
        Stream storage stream = _streams[streamId];
        
        require(
            msg.sender == stream.sender || 
            msg.sender == stream.recipient ||
            ACL_MANAGER.isPoolAdmin(msg.sender),
            "Not authorized"
        );
        
        uint256 senderBalance = _balanceOf(streamId, stream.sender);
        uint256 recipientBalance = _balanceOf(streamId, stream.recipient);
        
        delete _streams[streamId];
        
        if (recipientBalance > 0) {
            IERC20(stream.tokenAddress).safeTransfer(
                stream.recipient,
                recipientBalance
            );
        }
        
        if (senderBalance > 0) {
            IERC20(stream.tokenAddress).safeTransfer(
                stream.sender,
                senderBalance
            );
        }
        
        emit StreamCanceled(
            streamId,
            stream.sender,
            stream.recipient,
            senderBalance,
            recipientBalance
        );
        
        return true;
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get stream details
     */
    function getStream(uint256 streamId)
        external
        view
        streamExists(streamId)
        returns (
            address sender,
            address recipient,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 remainingBalance,
            uint256 ratePerSecond
        )
    {
        Stream storage stream = _streams[streamId];
        return (
            stream.sender,
            stream.recipient,
            stream.deposit,
            stream.tokenAddress,
            stream.startTime,
            stream.stopTime,
            stream.remainingBalance,
            stream.ratePerSecond
        );
    }
    
    /**
     * @notice Get withdrawable balance
     */
    function balanceOf(
        uint256 streamId,
        address who
    ) external view streamExists(streamId) returns (uint256) {
        return _balanceOf(streamId, who);
    }
    
    function _balanceOf(
        uint256 streamId,
        address who
    ) internal view returns (uint256) {
        Stream storage stream = _streams[streamId];
        
        uint256 delta = _deltaOf(streamId);
        uint256 recipientBalance = delta * stream.ratePerSecond;
        
        if (who == stream.recipient) {
            return recipientBalance;
        }
        
        if (who == stream.sender) {
            return stream.remainingBalance - recipientBalance;
        }
        
        return 0;
    }
    
    function _deltaOf(uint256 streamId) internal view returns (uint256) {
        Stream storage stream = _streams[streamId];
        
        if (block.timestamp <= stream.startTime) return 0;
        if (block.timestamp < stream.stopTime) {
            return block.timestamp - stream.startTime;
        }
        return stream.stopTime - stream.startTime;
    }
    
    /**
     * @notice Get next stream ID
     */
    function getNextStreamId() external view returns (uint256) {
        return _nextStreamId;
    }
    
    /**
     * @notice Get fee accumulation for token
     */
    function getFeeAccumulation(address token) 
        external 
        view 
        returns (
            uint256 amount,
            uint256 lastCollected,
            uint256 totalCollected
        ) 
    {
        FeeAccumulation memory acc = feeAccumulations[token];
        return (acc.amount, acc.lastCollected, acc.totalCollected);
    }
}
