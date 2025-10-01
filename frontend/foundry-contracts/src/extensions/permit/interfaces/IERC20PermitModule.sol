// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20PermitModule
 * @notice Interface for EIP-2612 permit functionality (gasless approvals)
 * @dev Enables gasless transactions - critical for account abstraction
 * 
 * Benefits:
 * - Users can approve token transfers without paying gas
 * - One-click DeFi interactions
 * - Better UX for mobile/new users
 * - Integrates with account abstraction (Stage 4)
 */
interface IERC20PermitModule {
    // ============ Events ============
    event NonceUsed(address indexed owner, uint256 nonce);
    
    // ============ Errors ============
    error ExpiredSignature();
    error InvalidSignature();
    error InvalidSigner();
    
    // ============ EIP-2612 Functions ============
    
    /**
     * @notice Approve token spending via signature
     * @param owner Token owner
     * @param spender Address allowed to spend
     * @param value Amount approved
     * @param deadline Signature expiry timestamp
     * @param v ECDSA signature parameter
     * @param r ECDSA signature parameter
     * @param s ECDSA signature parameter
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
    
    /**
     * @notice Get current nonce for address
     * @param owner Address to check
     * @return uint256 Current nonce
     */
    function nonces(address owner) external view returns (uint256);
    
    /**
     * @notice Get EIP-712 domain separator
     * @return bytes32 Domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    
    // ============ EIP-712 Helpers ============
    
    /**
     * @notice Get permit typehash
     * @return bytes32 Permit typehash
     */
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    
    /**
     * @notice Build domain separator
     * @return bytes32 Domain separator
     */
    function buildDomainSeparator() external view returns (bytes32);
    
    /**
     * @notice Hash permit data
     * @param owner Token owner
     * @param spender Address allowed to spend
     * @param value Amount approved
     * @param nonce Current nonce
     * @param deadline Expiry timestamp
     * @return bytes32 Permit hash
     */
    function hashPermit(
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) external view returns (bytes32);
}
