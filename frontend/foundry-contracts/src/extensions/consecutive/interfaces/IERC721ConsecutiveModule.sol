// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC721ConsecutiveModule
 * @notice Interface for gas-optimized consecutive minting (EIP-2309)
 * @dev Reduces gas for large NFT drops
 * 
 * Use Cases:
 * - Large NFT collection launches
 * - Airdrops
 * - Batch minting operations
 * - Layer 2 optimizations
 */
interface IERC721ConsecutiveModule {
    event ConsecutiveTransfer(
        uint256 indexed fromTokenId,
        uint256 toTokenId,
        address indexed fromAddress,
        address indexed toAddress
    );
    
    /**
     * @notice Mint consecutive token IDs (gas-optimized)
     * @param to Recipient address
     * @param amount Number of tokens to mint
     * @return firstTokenId First token ID minted
     */
    function mintConsecutive(address to, uint96 amount)
        external
        returns (uint256 firstTokenId);
    
    /**
     * @notice Batch mint to multiple recipients
     * @param recipients Array of recipient addresses
     * @param amounts Array of token counts per recipient
     */
    function mintConsecutiveBatch(
        address[] memory recipients,
        uint96[] memory amounts
    ) external;
    
    /**
     * @notice Get maximum batch size
     * @return maxSize Maximum tokens per batch
     */
    function getMaxBatchSize() external view returns (uint256 maxSize);
}
