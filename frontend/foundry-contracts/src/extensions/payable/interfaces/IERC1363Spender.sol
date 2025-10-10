// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1363Spender
 * @notice Interface for contracts that want to receive ERC-1363 approvals
 * @dev Implement this interface to accept approveAndCall() operations
 * 
 * Security: MUST validate the token contract and owner
 * 
 * Example Implementation:
 * ```solidity
 * function onApprovalReceived(
 *     address owner,
 *     uint256 value,
 *     bytes calldata data
 * ) external override returns (bytes4) {
 *     require(msg.sender == trustedToken, "Invalid token");
 *     // Your logic here (e.g., pull tokens and execute swap)
 *     return IERC1363Spender.onApprovalReceived.selector;
 * }
 * ```
 */
interface IERC1363Spender {
    /**
     * @notice Handle receipt of ERC-1363 approval
     * @dev MUST return the function selector to accept the approval
     * @param owner Address that approved tokens
     * @param value Amount of tokens approved
     * @param data Additional data with no specified format
     * @return bytes4 Function selector to confirm acceptance
     */
    function onApprovalReceived(
        address owner,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);
}
