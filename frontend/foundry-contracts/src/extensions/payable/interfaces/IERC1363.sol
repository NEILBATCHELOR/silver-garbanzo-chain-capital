// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IPayableToken
 * @notice Interface for ERC-1363 Payable Token standard (renamed to avoid OpenZeppelin conflict)
 * @dev Extension of ERC-20 that allows executing code after transfers/approvals
 * 
 * EIP-1363 Standard: https://eips.ethereum.org/EIPS/eip-1363
 * 
 * Benefits over standard ERC-20:
 * - Single-transaction token payments with callback execution
 * - No need for separate approve + transferFrom transactions
 * - Enables payment processors, subscriptions, instant staking
 * - Better UX for end users (one click instead of two)
 * 
 * Gas Overhead: ~5-10K per operation vs standard transfer
 * 
 * Security: Receiver/spender contracts MUST implement validation
 */
interface IPayableToken {
    /**
     * @notice Transfer tokens and execute callback on receiver
     * @dev Calls onTransferReceived on receiver if it's a contract
     * @param to Address to receive tokens
     * @param value Amount of tokens
     * @return bool Success status
     */
    function transferAndCall(address to, uint256 value) external returns (bool);
    
    /**
     * @notice Transfer tokens with data and execute callback
     * @dev Allows passing custom data to receiver
     */
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool);
    
    /**
     * @notice Transfer from and execute callback on receiver
     * @dev Uses allowance, then calls onTransferReceived
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value
    ) external returns (bool);
    
    /**
     * @notice Transfer from with data and execute callback
     */
    function transferFromAndCall(
        address from,
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool);
    
    /**
     * @notice Approve and execute callback on spender
     * @dev Calls onApprovalReceived on spender if it's a contract
     */
    function approveAndCall(
        address spender,
        uint256 value
    ) external returns (bool);
    
    /**
     * @notice Approve with data and execute callback
     */
    function approveAndCall(
        address spender,
        uint256 value,
        bytes calldata data
    ) external returns (bool);
}
