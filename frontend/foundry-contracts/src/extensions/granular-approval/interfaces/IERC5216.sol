// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC5216
 * @notice Interface for the ERC-5216 Granular Approval Extension for ERC-1155
 * @dev See https://eips.ethereum.org/EIPS/eip-5216
 * 
 * This interface adds granular approval mechanisms to ERC-1155 tokens,
 * allowing approvals for specific token IDs and amounts rather than
 * the all-or-nothing operator approval model.
 */
interface IERC5216 {
    /**
     * @notice Emitted when allowance is set for a specific token
     * @param owner The token owner granting approval
     * @param spender The address being approved
     * @param id The token ID being approved
     * @param amount The amount approved
     */
    event ApprovalValue(
        address indexed owner,
        address indexed spender,
        uint256 indexed id,
        uint256 amount
    );

    /**
     * @notice Approve specific amount of specific token ID
     * @dev The approved amount can be transferred by spender
     * @param spender Address to approve
     * @param id Token ID to approve
     * @param amount Amount to approve
     */
    function approve(
        address spender,
        uint256 id,
        uint256 amount
    ) external;

    /**
     * @notice Get approved amount for specific token ID
     * @param owner Token owner address
     * @param spender Approved spender address  
     * @param id Token ID
     * @return amount The approved amount
     */
    function allowance(
        address owner,
        address spender,
        uint256 id
    ) external view returns (uint256 amount);
}
