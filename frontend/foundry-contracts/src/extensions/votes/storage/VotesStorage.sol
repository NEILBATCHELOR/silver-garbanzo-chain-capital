// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title VotesStorage
 * @notice Storage layout for Votes module (upgradeable-safe)
 */
contract VotesStorage {
    // ============ Checkpoint Structure ============
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }
    
    // ============ Delegation Tracking ============
    // account => delegate
    mapping(address => address) internal _delegates;
    
    // ============ Checkpoint Storage ============
    // account => checkpoints array
    mapping(address => Checkpoint[]) internal _checkpoints;
    
    // total supply checkpoints
    Checkpoint[] internal _totalSupplyCheckpoints;
    
    // ============ Nonce Tracking (for delegateBySig) ============
    // account => nonce
    mapping(address => uint256) internal _nonces;
    
    // ============ EIP-712 Domain Separator ============
    bytes32 internal _cachedDomainSeparator;
    uint256 internal _cachedChainId;
    address internal _cachedThis;
    
    bytes32 internal _hashedName;
    bytes32 internal _hashedVersion;
    
    // ============ Storage Gap ============
    uint256[40] private __gap;
}
