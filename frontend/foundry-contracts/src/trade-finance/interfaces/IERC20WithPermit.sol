// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IERC20WithPermit
 * @author Chain Capital (adapted from Aave)
 * @notice Interface for ERC20 tokens that support EIP-2612 permit functionality
 * @dev Extends standard IERC20 with gasless approval capability
 */
interface IERC20WithPermit is IERC20 {
    /**
     * @notice Allow passing a signed message to approve spending
     * @dev Implements the permit function as specified in EIP-2612
     * https://github.com/ethereum/EIPs/blob/8a34d644aacf0f9f8f00815307fd7dd5da07655f/EIPS/eip-2612.md
     * @param owner The owner of the funds
     * @param spender The spender authorized to use the funds
     * @param value The amount of tokens to approve
     * @param deadline The deadline timestamp, type(uint256).max for max deadline
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}
