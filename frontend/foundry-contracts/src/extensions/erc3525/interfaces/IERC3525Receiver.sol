// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC3525Receiver
 * @notice Interface for contracts that want to receive ERC-3525 value transfers safely
 * @dev Contracts implementing this interface can accept value transfers and perform
 *      validation or additional logic upon receipt
 * 
 * See https://eips.ethereum.org/EIPS/eip-3525
 * ERC-165 identifier: 0xb382cdcd
 * 
 * Use Cases:
 * - Smart contract wallets that need to validate incoming transfers
 * - DeFi protocols that accept SFT deposits
 * - Escrow contracts that hold SFT values
 * - Vaults that need to track incoming value transfers
 * - Contracts that need to execute logic upon receiving value
 * 
 * Similar to IERC721Receiver and IERC1155Receiver
 */
interface IERC3525Receiver {
    
    /**
     * @notice Handle the receipt of an ERC-3525 value transfer
     * @dev Whenever value is transferred to this contract via `transferFrom` or `safeTransferFrom`,
     *      this function is called. It must return its Solidity selector to confirm receipt.
     *      
     *      Return value MUST be:
     *      `bytes4(keccak256("onERC3525Received(address,address,uint256,uint256,bytes)"))`
     *      
     *      Return of any other value MUST result in the transaction being reverted by the caller.
     *      
     *      The function MAY throw to revert and reject the transfer.
     *      
     * @param operator The address which initiated the transfer (i.e. msg.sender)
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param value The amount of value being transferred
     * @param data Additional data with no specified format
     * @return `bytes4(keccak256("onERC3525Received(address,address,uint256,uint256,bytes)"))`
     *         unless throwing
     */
    function onERC3525Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);
}

/**
 * @title ERC3525ReceiverBase
 * @notice Base implementation of IERC3525Receiver that can be inherited
 * @dev Provides a default implementation that accepts all transfers
 *      Override `_onERC3525Received` to add custom logic
 */
abstract contract ERC3525ReceiverBase is IERC3525Receiver {
    
    /**
     * @notice Handle the receipt of an ERC-3525 value transfer
     * @dev Calls internal _onERC3525Received hook for custom logic
     * @return The function selector to confirm receipt
     */
    function onERC3525Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) external virtual override returns (bytes4) {
        _onERC3525Received(operator, from, tokenId, value, data);
        return this.onERC3525Received.selector;
    }
    
    /**
     * @notice Internal hook called when ERC-3525 value is received
     * @dev Override this function to add custom logic
     *      Default implementation does nothing (accepts all transfers)
     * @param operator The address which initiated the transfer
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param value The amount of value being transferred
     * @param data Additional data with no specified format
     */
    function _onERC3525Received(
        address operator,
        address from,
        uint256 tokenId,
        uint256 value,
        bytes calldata data
    ) internal virtual {
        // Override to add custom logic
        // Default: accept all transfers
    }
}
