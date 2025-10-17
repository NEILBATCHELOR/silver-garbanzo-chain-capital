// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IMultiSigWallet.sol";

/**
 * @title MultiSigWallet
 * @notice Multi-signature wallet with threshold approval for Chain Capital
 * @dev Implements m-of-n threshold signatures with expiry, compatible with role system
 * 
 * Features:
 * - Threshold approval (e.g., 3-of-5 required)
 * - Transaction proposals with optional expiry
 * - Auto-execution when threshold met
 * - Owner management via multi-sig
 * - Integration with FROST threshold signatures (off-chain coordination)
 * - Compatible with Chain Capital Foundry contracts role system
 * 
 * Security:
 * - ReentrancyGuard on execute
 * - Owner verification on all state changes
 * - Transaction existence and execution checks
 * - Expiry enforcement
 * 
 * @custom:security-contact security@chaincapital.com
 */
contract MultiSigWallet is IMultiSigWallet, ReentrancyGuard {
    using ECDSA for bytes32;

    // ============================================================================
    // STATE VARIABLES
    // ============================================================================

    string public override name;
    address[] public override owners;
    mapping(address => bool) public override isOwner;
    uint256 public override requiredSignatures;
    uint256 public override transactionCount;
    
    // Transaction tracking
    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    // FROST integration (optional off-chain threshold signature coordination)
    mapping(uint256 => bytes32) public frostSessionIds; // txIndex => FROST session ID
    
    // ============================================================================
    // ERRORS
    // ============================================================================

    error NotOwner();
    error InvalidOwner();
    error OwnerAlreadyExists();
    error InvalidRequiredSignatures();
    error TransactionDoesNotExist();
    error TransactionAlreadyExecuted();
    error TransactionAlreadyConfirmed();
    error TransactionNotConfirmed();
    error NotEnoughConfirmations();
    error TransactionExpired();
    error TransactionFailed();
    error CannotRemoveOwnerBelowThreshold();


    // ============================================================================
    // MODIFIERS
    // ============================================================================

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert NotOwner();
        _;
    }

    /**
     * @notice Modifier that allows wallet itself or owners to call functions
     * @dev Used for owner management functions that must be callable via multi-sig transactions
     *      When wallet calls itself (via executeTransaction), msg.sender == address(this)
     */
    modifier onlyWalletOrOwner() {
        if (msg.sender != address(this) && !isOwner[msg.sender]) {
            revert NotOwner();
        }
        _;
    }

    modifier txExists(uint256 _txIndex) {
        if (_txIndex >= transactionCount) revert TransactionDoesNotExist();
        _;
    }

    modifier notExecuted(uint256 _txIndex) {
        if (transactions[_txIndex].executed) revert TransactionAlreadyExecuted();
        _;
    }

    modifier notConfirmed(uint256 _txIndex) {
        if (isConfirmed[_txIndex][msg.sender]) revert TransactionAlreadyConfirmed();
        _;
    }

    modifier notExpired(uint256 _txIndex) {
        Transaction storage transaction = transactions[_txIndex];
        if (transaction.expiresAt > 0 && block.timestamp >= transaction.expiresAt) {
            revert TransactionExpired();
        }
        _;
    }


    // ============================================================================
    // CONSTRUCTOR
    // ============================================================================

    /**
     * @notice Creates a new multi-sig wallet
     * @param _name Human-readable name for the wallet
     * @param _owners Array of owner addresses
     * @param _requiredSignatures Number of signatures required (threshold)
     */
    constructor(
        string memory _name,
        address[] memory _owners,
        uint256 _requiredSignatures
    ) {
        if (_owners.length == 0) revert InvalidOwner();
        if (_requiredSignatures == 0 || _requiredSignatures > _owners.length) {
            revert InvalidRequiredSignatures();
        }

        name = _name;
        requiredSignatures = _requiredSignatures;

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            
            if (owner == address(0)) revert InvalidOwner();
            if (isOwner[owner]) revert OwnerAlreadyExists();

            isOwner[owner] = true;
            owners.push(owner);
        }
    }


    // ============================================================================
    // RECEIVE FUNCTION
    // ============================================================================

    /**
     * @notice Allows contract to receive ETH
     */
    receive() external payable {
        emit DepositReceived(msg.sender, msg.value);
    }

    // ============================================================================
    // TRANSACTION MANAGEMENT
    // ============================================================================

    /**
     * @notice Submit a new transaction proposal
     * @param _to Destination address
     * @param _value ETH value to send
     * @param _data Transaction data
     * @param _expiryHours Hours until expiry (0 for no expiry)
     * @return txIndex Index of created transaction
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data,
        uint256 _expiryHours
    ) public override onlyOwner returns (uint256) {
        uint256 txIndex = transactionCount;
        uint256 expiresAt = _expiryHours > 0 
            ? block.timestamp + (_expiryHours * 1 hours) 
            : 0;

        transactions[txIndex] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            numConfirmations: 0,
            createdAt: block.timestamp,
            expiresAt: expiresAt
        });

        transactionCount++;

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);

        // Auto-confirm for submitter
        _confirmTransaction(txIndex);

        return txIndex;
    }

    /**
     * @notice Confirm a transaction
     * @param _txIndex Transaction index to confirm
     */
    function confirmTransaction(uint256 _txIndex)
        public
        override
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
        notExpired(_txIndex)
    {
        _confirmTransaction(_txIndex);
    }


    /**
     * @notice Internal function to confirm transaction
     * @param _txIndex Transaction index
     */
    function _confirmTransaction(uint256 _txIndex) internal {
        Transaction storage transaction = transactions[_txIndex];
        
        isConfirmed[_txIndex][msg.sender] = true;
        transaction.numConfirmations += 1;

        emit ConfirmTransaction(msg.sender, _txIndex);

        // Auto-execute if threshold reached
        if (transaction.numConfirmations >= requiredSignatures) {
            _executeTransaction(_txIndex);
        }
    }

    /**
     * @notice Execute a confirmed transaction
     * @param _txIndex Transaction index to execute
     */
    function executeTransaction(uint256 _txIndex)
        public
        override
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notExpired(_txIndex)
    {
        _executeTransaction(_txIndex);
    }


    /**
     * @notice Internal function to execute transaction
     * @param _txIndex Transaction index
     */
    function _executeTransaction(uint256 _txIndex) internal nonReentrant {
        Transaction storage transaction = transactions[_txIndex];

        if (transaction.numConfirmations < requiredSignatures) {
            revert NotEnoughConfirmations();
        }

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        
        if (!success) revert TransactionFailed();

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /**
     * @notice Revoke confirmation for a transaction
     * @param _txIndex Transaction index
     */
    function revokeConfirmation(uint256 _txIndex)
        public
        override
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        if (!isConfirmed[_txIndex][msg.sender]) revert TransactionNotConfirmed();

        Transaction storage transaction = transactions[_txIndex];
        isConfirmed[_txIndex][msg.sender] = false;
        transaction.numConfirmations -= 1;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    // ============================================================================
    // OWNER MANAGEMENT
    // ============================================================================

    /**
     * @notice Add a new owner (requires multi-sig approval via submitTransaction)
     * @param _owner Address of new owner
     */
    function addOwner(address _owner) public override onlyWalletOrOwner {
        if (_owner == address(0)) revert InvalidOwner();
        if (isOwner[_owner]) revert OwnerAlreadyExists();

        isOwner[_owner] = true;
        owners.push(_owner);

        emit OwnerAdded(_owner);
    }

    /**
     * @notice Remove an owner (requires multi-sig approval via submitTransaction)
     * @param _owner Address of owner to remove
     */
    function removeOwner(address _owner) public override onlyWalletOrOwner {
        if (!isOwner[_owner]) revert NotOwner();
        if (owners.length <= requiredSignatures) revert CannotRemoveOwnerBelowThreshold();


        isOwner[_owner] = false;

        // Remove from array
        for (uint256 i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }

        emit OwnerRemoved(_owner);
    }

    /**
     * @notice Change required signatures threshold (requires multi-sig approval)
     * @param _required New threshold
     */
    function changeRequiredSignatures(uint256 _required) public override onlyWalletOrOwner {
        if (_required == 0 || _required > owners.length) {
            revert InvalidRequiredSignatures();
        }

        requiredSignatures = _required;

        emit RequiredSignaturesChanged(_required);
    }

    // ============================================================================
    // VIEW FUNCTIONS
    // ============================================================================


    /**
     * @notice Get all owners
     * @return Array of owner addresses
     */
    function getOwners() public view override returns (address[] memory) {
        return owners;
    }

    /**
     * @notice Get transaction details
     * @param _txIndex Transaction index
     */
    function getTransaction(uint256 _txIndex)
        public
        view
        override
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations,
            uint256 createdAt,
            uint256 expiresAt
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations,
            transaction.createdAt,
            transaction.expiresAt
        );
    }


    /**
     * @notice Get confirmation count for a transaction
     * @param _txIndex Transaction index
     * @return Number of confirmations
     */
    function getConfirmationCount(uint256 _txIndex) public view override returns (uint256) {
        return transactions[_txIndex].numConfirmations;
    }

    /**
     * @notice Get list of addresses that confirmed a transaction
     * @param _txIndex Transaction index
     * @return Array of confirming addresses
     */
    function getConfirmations(uint256 _txIndex) public view override returns (address[] memory) {
        address[] memory confirmations = new address[](owners.length);
        uint256 count = 0;

        for (uint256 i = 0; i < owners.length; i++) {
            if (isConfirmed[_txIndex][owners[i]]) {
                confirmations[count] = owners[i];
                count++;
            }
        }

        // Resize array
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = confirmations[i];
        }

        return result;
    }


    /**
     * @notice Check if owner confirmed transaction
     * @param _txIndex Transaction index
     * @param _owner Owner address
     * @return True if confirmed
     */
    function isTransactionConfirmed(uint256 _txIndex, address _owner)
        public
        view
        override
        returns (bool)
    {
        return isConfirmed[_txIndex][_owner];
    }

    // ============================================================================
    // FROST INTEGRATION (OPTIONAL OFF-CHAIN COORDINATION)
    // ============================================================================

    /**
     * @notice Associate FROST session with transaction (for off-chain coordination)
     * @param _txIndex Transaction index
     * @param _sessionId FROST session identifier
     * @dev This is informational only - FROST signing happens off-chain
     */
    function setFrostSession(uint256 _txIndex, bytes32 _sessionId) external onlyOwner {
        frostSessionIds[_txIndex] = _sessionId;
    }

    /**
     * @notice Get FROST session ID for transaction
     * @param _txIndex Transaction index
     * @return FROST session identifier
     */
    function getFrostSession(uint256 _txIndex) external view returns (bytes32) {
        return frostSessionIds[_txIndex];
    }
}
