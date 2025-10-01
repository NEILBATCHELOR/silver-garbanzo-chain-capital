// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title SoulboundStorage  
 * @notice Storage layout for soulbound NFT module (upgradeable-safe)
 */
contract SoulboundStorage {
    // ============ Storage Variables ============
    
    // tokenId => is soulbound (non-transferable)
    mapping(uint256 => bool) internal _soulbound;
    
    // tokenId => bound soul address (permanent binding)
    mapping(uint256 => address) internal _boundSouls;
    
    // ============ Storage Gap ============
    uint256[48] private __gap;
}
