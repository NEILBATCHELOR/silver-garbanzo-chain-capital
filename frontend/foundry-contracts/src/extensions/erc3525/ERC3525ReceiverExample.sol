// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IERC3525Receiver.sol";

/**
 * @title ERC3525ReceiverExample
 * @notice Example implementation of IERC3525Receiver with validation and tracking
 * @dev This contract demonstrates how to implement IERC3525Receiver with additional logic
 * 
 * Features:
 * - Validates incoming transfers
 * - Tracks received values by token ID
 * - Supports blacklist/whitelist of senders
 * - Emits events for monitoring
 * - Can reject transfers based on custom rules
 * 
 * Use Cases:
 * - Smart contract wallets
 * - DeFi protocols accepting SFT deposits
 * - Escrow contracts
 * - Vaults and treasury contracts
 * - Gaming inventory systems
 * 
 * Usage:
 * - Inherit from this contract
 * - Override _validateTransfer() for custom validation
 * - Override _onERC3525Received() for custom logic
 */
contract ERC3525ReceiverExample is IERC3525Receiver {
    
    // ============ State Variables ============
    
    /// @notice Tracks total value received per token ID
    mapping(uint256 => uint256) public receivedValues;
    
    /// @notice Tracks total transfers received per token ID
    mapping(uint256 => uint256) public transferCounts;
    
    /// @notice Whitelist of allowed senders (empty = all allowed)
    mapping(address => bool) public allowedSenders;
    
    /// @notice Whether whitelist is enabled
    bool public whitelistEnabled;
    
    /// @notice Owner of this receiver contract
    address public owner;
    
    // ============ Events ============
    
    event ValueReceived(
        address indexed operator,
        address indexed from,
        uint256 indexed tokenId,
        uint256 value,
        bytes data
    );
    
    event TransferRejected(
        address indexed operator,
        address indexed from,
        uint256 indexed tokenId,
        uint256 value,
        string reason
    );
    
    event SenderWhitelisted(address indexed sender, bool allowed);
    event WhitelistToggled(bool enabled);
    
    // ============ Errors ============
    
    error Unauthorized();
    error TransferNotAllowed(string reason);
    error InvalidValue();
    
    // ============ Modifiers ============
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        owner = msg.sender;
    }
    
    // ============ IERC3525Receiver Implementation ============
    
    /**
     * @notice Handle the receipt of an ERC-3525 value transfer
     * @dev Validates transfer and updates state
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param value The amount of value being transferred
     * @param data Additional data with no specified format
     * @return The function selector to confirm receipt
     */
    function onERC3525Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        // Validate transfer
        _validateTransfer(operator, from, tokenId, value, data);
        
        // Update state
        receivedValues[tokenId] += value;
        transferCounts[tokenId] += 1;
        
        // Execute custom logic
        _onERC3525Received(operator, from, tokenId, value, data);
        
        // Emit event
        emit ValueReceived(operator, from, tokenId, value, data);
        
        // Return selector to confirm receipt
        return this.onERC3525Received.selector;
    }
    
    // ============ Validation Functions ============
    
    /**
     * @notice Validate incoming transfer
     * @dev Override this function to add custom validation logic
     *      Default checks: whitelist, non-zero value
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param value The amount of value being transferred
     * @param data Additional data
     */
    function _validateTransfer(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) internal virtual {
        // Check whitelist if enabled
        if (whitelistEnabled && !allowedSenders[from]) {
            emit TransferRejected(operator, from, tokenId, value, "Sender not whitelisted");
            revert TransferNotAllowed("Sender not whitelisted");
        }
        
        // Check value is non-zero
        if (value == 0) {
            emit TransferRejected(operator, from, tokenId, value, "Zero value transfer");
            revert InvalidValue();
        }
        
        // Additional validation can be added here
    }
    
    /**
     * @notice Internal hook called after validation passes
     * @dev Override this function to add custom logic after receiving value
     *      Default implementation does nothing
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param value The amount of value being transferred
     * @param data Additional data
     */
    function _onERC3525Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) internal virtual {
        // Override to add custom logic
        // Examples:
        // - Update internal accounting
        // - Trigger other contract calls
        // - Mint receipt tokens
        // - Update user balances
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Toggle whitelist enforcement
     * @param enabled True to enable whitelist, false to disable
     */
    function setWhitelistEnabled(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistToggled(enabled);
    }
    
    /**
     * @notice Add or remove sender from whitelist
     * @param sender Address to whitelist
     * @param allowed True to allow, false to deny
     */
    function setAllowedSender(address sender, bool allowed) external onlyOwner {
        allowedSenders[sender] = allowed;
        emit SenderWhitelisted(sender, allowed);
    }
    
    /**
     * @notice Batch update whitelist
     * @param senders Array of addresses
     * @param allowed Array of allowed statuses
     */
    function setAllowedSendersBatch(
        address[] calldata senders,
        bool[] calldata allowed
    ) external onlyOwner {
        require(senders.length == allowed.length, "Array length mismatch");
        
        for (uint256 i = 0; i < senders.length; i++) {
            allowedSenders[senders[i]] = allowed[i];
            emit SenderWhitelisted(senders[i], allowed[i]);
        }
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get total value received for a token ID
     * @param tokenId The token ID to query
     * @return Total value received
     */
    function getTotalReceivedValue(uint256 tokenId) external view returns (uint256) {
        return receivedValues[tokenId];
    }
    
    /**
     * @notice Get total transfer count for a token ID
     * @param tokenId The token ID to query
     * @return Total number of transfers received
     */
    function getTransferCount(uint256 tokenId) external view returns (uint256) {
        return transferCounts[tokenId];
    }
    
    /**
     * @notice Check if sender is whitelisted
     * @param sender Address to check
     * @return True if whitelisted or whitelist disabled
     */
    function isAllowedSender(address sender) external view returns (bool) {
        if (!whitelistEnabled) return true;
        return allowedSenders[sender];
    }
}
