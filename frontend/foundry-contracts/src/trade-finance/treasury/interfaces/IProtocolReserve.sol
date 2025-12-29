// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IProtocolReserve
 * @notice Interface for protocol emergency reserve
 */
interface IProtocolReserve {
    
    struct EmergencyWithdrawal {
        address token;
        uint256 amount;
        address recipient;
        string reason;
        uint256 timestamp;
        bool executed;
        uint256 approvals;
    }
    
    event Deposited(address indexed token, uint256 amount, address indexed from);
    event EmergencyWithdrawalProposed(
        uint256 indexed withdrawalId,
        address indexed token,
        uint256 amount,
        address indexed recipient,
        string reason
    );
    event EmergencyWithdrawalApproved(uint256 indexed withdrawalId, address indexed guardian);
    event EmergencyWithdrawalExecuted(
        uint256 indexed withdrawalId,
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event BadDebtCovered(address indexed token, uint256 amount);
    event InsuranceClaimed(address indexed token, uint256 amount);
    
    function deposit(address token, uint256 amount) external;
    function batchDeposit(address[] calldata tokens, uint256[] calldata amounts) external;
    function proposeEmergencyWithdrawal(
        address token,
        uint256 amount,
        address recipient,
        string calldata reason
    ) external returns (uint256);
    function approveEmergencyWithdrawal(uint256 withdrawalId) external;
    function executeEmergencyWithdrawal(uint256 withdrawalId) external;
    function coverBadDebt(address token, uint256 amount, address recipient) external;
    function processInsuranceClaim(address token, uint256 amount, address claimant) external;
    function addGuardian(address guardian) external;
    function removeGuardian(address guardian) external;
    
    function getReserveBalance(address token)
        external
        view
        returns (uint256 total, uint256 allocated, uint256 available, uint256 lastUpdated);
    function getReserveMetrics(address token)
        external
        view
        returns (
            uint256 totalDeposited,
            uint256 totalWithdrawn,
            uint256 badDebtCovered,
            uint256 insuranceClaimed,
            uint256 yieldEarned
        );
    function getReserveRatio(address token) external view returns (uint256);
    function isReserveHealthy(address token) external view returns (bool);
    function getGuardians() external view returns (address[] memory);
}
