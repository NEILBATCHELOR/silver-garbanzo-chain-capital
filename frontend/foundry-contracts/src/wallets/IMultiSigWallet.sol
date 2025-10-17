// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMultiSigWallet
 * @notice Interface for multi-signature wallet with threshold approval
 * @dev Compatible with Chain Capital role-based access control system
 */
interface IMultiSigWallet {
    // ============================================================================
    // STRUCTS
    // ============================================================================

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );

    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequiredSignaturesChanged(uint256 required);
    event DepositReceived(address indexed sender, uint256 amount);

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================

    function name() external view returns (string memory);
    function owners(uint256 index) external view returns (address);
    function isOwner(address account) external view returns (bool);
    function requiredSignatures() external view returns (uint256);
    function transactionCount() external view returns (uint256);
    function getOwners() external view returns (address[] memory);
    
    function getTransaction(uint256 _txIndex)
        external
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint256 createdAt,
            uint256 expiresAt
        );

    function getConfirmationCount(uint256 _txIndex) external view returns (uint256);
    function getConfirmations(uint256 _txIndex) external view returns (address[] memory);
    function isTransactionConfirmed(uint256 _txIndex, address _owner) external view returns (bool);

    // ============================================================================
    // STATE-CHANGING FUNCTIONS
    // ============================================================================

    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        uint256 _expiryHours
    ) external returns (uint256);

    function confirmTransaction(uint256 _txIndex) external;
    function executeTransaction(uint256 _txIndex) external;
    function revokeConfirmation(uint256 _txIndex) external;
    
    function addOwner(address _owner) external;
    function removeOwner(address _owner) external;
    function changeRequiredSignatures(uint256 _required) external;
}
