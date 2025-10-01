// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title URIStorage
 * @notice Storage layout for URI management module (upgradeable-safe)
 */
contract URIStorage {
    // ============ URI Data ============
    
    // Base URI for all tokens
    string internal _baseURI;
    
    // Custom URIs per token ID
    mapping(uint256 => string) internal _tokenURIs;
    
    // Track which tokens have custom URIs
    mapping(uint256 => bool) internal _hasCustomURI;
    
    // ============ IPFS Support ============
    
    // IPFS gateway URL
    string internal _ipfsGateway;
    
    // ============ Versioning ============
    
    // URI version per token (for metadata updates)
    mapping(uint256 => uint256) internal _uriVersions;
    
    // ============ Storage Gap ============
    uint256[45] private __gap;
}
