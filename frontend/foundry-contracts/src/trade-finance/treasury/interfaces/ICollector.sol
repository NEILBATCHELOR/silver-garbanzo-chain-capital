// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ICollector
 * @notice Interface for protocol fee collector
 */
interface ICollector {
    
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
    
    event FeeCollected(address indexed token, uint256 amount, uint256 timestamp);
    event FeeDistributed(address indexed token, address indexed recipient, uint256 amount);
    event StreamCreated(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    );
    event StreamWithdrawn(uint256 indexed streamId, address indexed recipient, uint256 amount);
    event StreamCanceled(
        uint256 indexed streamId,
        address indexed sender,
        address indexed recipient,
        uint256 senderBalance,
        uint256 recipientBalance
    );
    
    function collectFees(address token, uint256 amount) external;
    function distributeFees(address token, bytes32[] calldata recipientIds) external;
    function createStream(
        address recipient,
        uint256 deposit,
        address tokenAddress,
        uint256 startTime,
        uint256 stopTime
    ) external returns (uint256);
    function withdrawFromStream(uint256 streamId, uint256 amount) external returns (bool);
    function cancelStream(uint256 streamId) external returns (bool);
    function getStream(uint256 streamId)
        external
        view
        returns (
            address sender,
            address recipient,
            uint256 deposit,
            address tokenAddress,
            uint256 startTime,
            uint256 stopTime,
            uint256 remainingBalance,
            uint256 ratePerSecond
        );
    function balanceOf(uint256 streamId, address who) external view returns (uint256);
    function getNextStreamId() external view returns (uint256);
    function getFeeAccumulation(address token)
        external
        view
        returns (uint256 amount, uint256 lastCollected, uint256 totalCollected);
}
