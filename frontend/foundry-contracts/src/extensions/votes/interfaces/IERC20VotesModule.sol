// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20VotesModule
 * @notice Interface for token voting and delegation functionality
 * @dev Modular governance system for ERC20 tokens following ERC20Votes pattern
 */
interface IERC20VotesModule {
    // ============ Events ============
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    
    // ============ Errors ============
    error InvalidBlockNumber();
    error InvalidSignature();
    error SignatureExpired();
    
    // ============ Delegation ============
    
    /**
     * @notice Delegate voting power to another address
     * @param delegatee Address to delegate votes to
     */
    function delegate(address delegatee) external;
    
    /**
     * @notice Delegate voting power via signature (gasless)
     * @param delegatee Address to delegate votes to
     * @param nonce Nonce for replay protection
     * @param expiry Signature expiration timestamp
     * @param v Signature v component
     * @param r Signature r component
     * @param s Signature s component
     */
    function delegateBySig(
        address delegatee,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
    
    /**
     * @notice Get current delegate for an account
     * @param account Address to check
     * @return address Current delegate
     */
    function delegates(address account) external view returns (address);
    
    // ============ Voting Power ============
    
    /**
     * @notice Get current voting power of an account
     * @param account Address to check
     * @return uint256 Current voting power
     */
    function getVotes(address account) external view returns (uint256);
    
    /**
     * @notice Get past voting power at a specific block
     * @param account Address to check
     * @param blockNumber Historical block number
     * @return uint256 Past voting power
     */
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    
    /**
     * @notice Get past total supply at a specific block
     * @param blockNumber Historical block number
     * @return uint256 Past total supply
     */
    function getPastTotalSupply(uint256 blockNumber) external view returns (uint256);
    
    // ============ Checkpoints ============
    
    /**
     * @notice Get number of checkpoints for an account
     * @param account Address to check
     * @return uint32 Number of checkpoints
     */
    function numCheckpoints(address account) external view returns (uint32);
    
    /**
     * @notice Get checkpoint details for an account
     * @param account Address to check
     * @param pos Checkpoint position
     * @return uint32 Block number
     * @return uint224 Votes
     */
    function checkpoints(address account, uint32 pos) external view returns (uint32, uint224);
    
    // ============ Balance Tracking ============
    
    /**
     * @notice Update voting power after balance change
     * @param from Sender address
     * @param to Recipient address  
     * @param amount Transfer amount
     */
    function updateVotingPower(address from, address to, uint256 amount) external;
    
    // ============ Domain Separator (EIP-712) ============
    
    /**
     * @notice Get EIP-712 domain separator
     * @return bytes32 Domain separator
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    
    /**
     * @notice Get delegation typehash for EIP-712
     * @return bytes32 Delegation typehash
     */
    function DELEGATION_TYPEHASH() external pure returns (bytes32);
}
