// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC3525SlotApprovable
 * @notice ERC-3525 Semi-Fungible Token Standard, optional extension for slot-level approval
 * @dev Interface for contracts supporting slot-level approvals, allowing an operator to manage
 *      all of an owner's tokens with the same slot
 * 
 * See https://eips.ethereum.org/EIPS/eip-3525
 * ERC-165 identifier: 0xb688be58
 * 
 * Use Cases:
 * - Marketplace operators managing all bonds of same maturity date
 * - Fund managers controlling all assets in same investment category
 * - Game admins managing all items of same tier/category
 * - Batch operations on same slot without individual approvals
 */
interface IERC3525SlotApprovable {
    
    // ============ Events ============
    
    /**
     * @dev MUST emit when an operator is approved or disapproved to manage all of `owner`'s
     *      tokens with the same slot
     * @param owner The address whose tokens are approved
     * @param slot The slot to approve, all of `owner`'s tokens with this slot are approved
     * @param operator The operator being approved or disapproved
     * @param approved Identify if `operator` is approved or disapproved
     */
    event ApprovalForSlot(
        address indexed owner,
        uint256 indexed slot,
        address indexed operator,
        bool approved
    );
    
    // ============ Functions ============
    
    /**
     * @notice Approve or disapprove an operator to manage all of `msg.sender`'s tokens with
     *         the specified slot
     * @dev The operator can manage all tokens with the same slot owned by msg.sender
     *      MUST emit ApprovalForSlot event
     *      MUST revert if slot does not exist
     * @param slot The slot of tokens to approve
     * @param operator The address to approve as operator
     * @param approved True to approve, false to revoke approval
     */
    function setApprovalForSlot(
        uint256 slot,
        address operator,
        bool approved
    ) external;
    
    /**
     * @notice Query if `operator` is authorized to manage all of `owner`'s tokens with
     *         the specified slot
     * @dev Returns whether operator can manage owner's tokens in this slot
     * @param owner The address that owns the ERC-3525 tokens
     * @param slot The slot of tokens being queried
     * @param operator The address to query approval status
     * @return True if `operator` is approved to manage all `owner`'s tokens with `slot`
     */
    function isApprovedForSlot(
        address owner,
        uint256 slot,
        address operator
    ) external view returns (bool);
    
    /**
     * @notice Get all operators approved for a specific owner and slot
     * @dev Returns array of all approved operators for this owner+slot combination
     * @param owner The token owner address
     * @param slot The slot to query
     * @return Array of approved operator addresses
     */
    function getApprovedOperatorsForSlot(
        address owner,
        uint256 slot
    ) external view returns (address[] memory);
    
    /**
     * @notice Get all slots where operator is approved for an owner
     * @dev Returns array of all slots where operator can manage owner's tokens
     * @param owner The token owner address
     * @param operator The operator address
     * @return Array of slot IDs where operator is approved
     */
    function getApprovedSlotsForOperator(
        address owner,
        address operator
    ) external view returns (uint256[] memory);
}
