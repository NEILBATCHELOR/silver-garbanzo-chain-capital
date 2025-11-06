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
    
    // ============ Voting Units Tracking ============
    // account => voting units (token balance)
    mapping(address => uint256) internal _votingUnits;
    
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
    
    // ============ Governance Parameters ============
    /// @notice Delay (in blocks) between proposal creation and voting start
    uint256 internal _votingDelay;
    
    /// @notice Duration (in blocks) of the voting period
    uint256 internal _votingPeriod;
    
    /// @notice Minimum tokens required to create a proposal
    uint256 internal _proposalThreshold;
    
    /// @notice Quorum percentage (in basis points, 400 = 4%)
    uint256 internal _quorumPercentage;
    
    // ============ Storage Gap ============
    uint256[36] private __gap;
}
