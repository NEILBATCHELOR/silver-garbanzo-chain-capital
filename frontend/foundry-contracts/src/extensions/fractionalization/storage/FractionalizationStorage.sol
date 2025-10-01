// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract FractionalizationStorage {
    // tokenId => share token address
    mapping(uint256 => address) internal _shareTokens;
    
    // tokenId => total shares
    mapping(uint256 => uint256) internal _totalShares;
    
    uint256[48] private __gap;
}
