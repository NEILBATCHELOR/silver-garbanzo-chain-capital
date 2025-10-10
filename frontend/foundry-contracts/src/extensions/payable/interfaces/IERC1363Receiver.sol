// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1363Receiver
 * @notice Interface for contracts that want to receive ERC-1363 tokens
 * @dev Implement this interface to accept transferAndCall() operations
 * 
 * Security: MUST validate the token contract and sender
 * 
 * Example Implementation:
 * ```solidity
 * function onTransferReceived(
 *     address operator,
 *     address from,
 *     uint256 value,
 *     bytes calldata data
 * ) external override returns (bytes4) {
 *     require(msg.sender == trustedToken, "Invalid token");
 *     // Your logic here
 *     return IERC1363Receiver.onTransferReceived.selector;
 * }
 * ```
 */
interface IERC1363Receiver {
    /**
     * @notice Handle receipt of ERC-1363 tokens
     * @dev MUST return the function selector to accept the transfer
     * @param operator Address that triggered the transfer
     * @param from Address tokens are transferred from
     * @param value Amount of tokens transferred
     * @param data Additional data with no specified format
     * @return bytes4 Function selector to confirm acceptance
     */
    function onTransferReceived(
        address operator,
        address from,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);
}
