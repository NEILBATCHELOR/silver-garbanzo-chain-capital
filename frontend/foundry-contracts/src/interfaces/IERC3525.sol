// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";

/**
 * @title IERC3525
 * @dev Interface for ERC-3525 Semi-Fungible Token Standard
 * @notice The ERC-3525 standard is a more advanced way to define semi-fungible tokens
 */
interface IERC3525 is IERC165, IERC721 {
    
    // ========== EVENTS ==========
    
    /**
     * @dev Emitted when `value` tokens are transferred from `fromTokenId` to `toTokenId`.
     */
    event TransferValue(uint256 indexed fromTokenId, uint256 indexed toTokenId, uint256 value);

    /**
     * @dev Emitted when the approval of a `slot` tokens is granted to `operator` for `tokenId`.
     */
    event ApprovalValue(uint256 indexed tokenId, address indexed operator, uint256 value);
    
    // ========== CORE FUNCTIONS ==========

    /**
     * @dev Returns the number of decimals used for value - similar to ERC20
     * @return The number of decimals for value representation
     */
    function valueDecimals() external view returns (uint8);

    /**
     * @dev Returns the slot of a token
     * @param tokenId The identifier for a token
     * @return The slot identifier of the token
     */
    function slotOf(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Returns the value of a token
     * @param tokenId The identifier for a token  
     * @return The value of the token
     */
    function balanceOf(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Approve `operator` to transfer up to `value` amount of the token specified by `tokenId`
     * @param tokenId The token to approve
     * @param operator The account approved to transfer value
     * @param value The amount of value approved to transfer
     * 
     * Requirements:
     * - `operator` cannot be the owner
     * - If the caller is not `owner`, it must be approved for all tokens of `owner`
     */
    function approve(uint256 tokenId, address operator, uint256 value) external payable;

    /**
     * @dev Returns the amount of value approved for `operator` to transfer from `tokenId`
     * @param tokenId The token to query approval for
     * @param operator The account to query approval for
     * @return The amount of value approved for transfer
     */
    function allowance(uint256 tokenId, address operator) external view returns (uint256);

    /**
     * @dev Transfer `value` amount from token `fromTokenId` to token `toTokenId`
     * @param fromTokenId The token to transfer value from
     * @param toTokenId The token to transfer value to  
     * @param value The amount of value to transfer
     * 
     * Requirements:
     * - `fromTokenId` and `toTokenId` must exist
     * - `fromTokenId` and `toTokenId` must be in the same slot
     * - `fromTokenId` must have sufficient value
     * - caller must be owner of `fromTokenId` or approved for the value amount
     */
    function transferFrom(uint256 fromTokenId, uint256 toTokenId, uint256 value) external payable;

    /**
     * @dev Transfer `value` amount from token `fromTokenId` to address `to`, creating a new token
     * @param fromTokenId The token to transfer value from
     * @param to The address to receive the new token
     * @param value The amount of value to transfer
     * @return The identifier of the new token created for `to`
     * 
     * Requirements:
     * - `fromTokenId` must exist
     * - `fromTokenId` must have sufficient value
     * - `to` cannot be the zero address
     * - caller must be owner of `fromTokenId` or approved for the value amount
     */
    function transferFrom(uint256 fromTokenId, address to, uint256 value) external payable returns (uint256);
}
