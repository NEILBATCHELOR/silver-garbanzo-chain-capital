// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PermitStorage
 * @notice Storage layout for permit module (upgradeable-safe)
 */
contract PermitStorage {
    // ============ EIP-712 Domain ============
    bytes32 internal _CACHED_DOMAIN_SEPARATOR;
    uint256 internal _CACHED_CHAIN_ID;
    address internal _CACHED_THIS;
    
    bytes32 internal _HASHED_NAME;
    bytes32 internal _HASHED_VERSION;
    bytes32 internal _TYPE_HASH;
    
    // ============ Nonces ============
    // owner => nonce
    mapping(address => uint256) internal _nonces;
    
    // ============ Storage Gap ============
    uint256[43] private __gap;
}
