// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ConsecutiveStorage {
    // Track next consecutive token ID
    uint256 internal _nextConsecutiveId;
    
    // Track consecutive mint batches
    mapping(uint256 => bool) internal _isConsecutiveBatch;
    
    uint256[48] private __gap;
}
