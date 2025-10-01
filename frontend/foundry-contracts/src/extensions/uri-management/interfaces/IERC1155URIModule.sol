// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1155URIModule
 * @notice Interface for advanced URI management in ERC-1155 tokens
 * @dev Provides dynamic metadata updates, per-token URIs, and versioning
 */
interface IERC1155URIModule {
    // ============ Events ============
    event BaseURISet(string newBaseURI, address indexed setter);
    event TokenURISet(uint256 indexed tokenId, string tokenURI, address indexed setter);
    event URIVersionUpdated(uint256 indexed tokenId, uint256 version);
    event IPFSGatewaySet(string newGateway);
    
    // ============ Errors ============
    error TokenDoesNotExist(uint256 tokenId);
    error EmptyURI();
    error InvalidTokenId();
    
    // ============ Base URI Management ============
    
    /**
     * @notice Set the base URI for all tokens
     * @param newBaseURI New base URI (can be HTTP or IPFS)
     * @dev Emits BaseURISet event
     */
    function setBaseURI(string memory newBaseURI) external;
    
    /**
     * @notice Get the current base URI
     * @return string The base URI
     */
    function getBaseURI() external view returns (string memory);
    
    // ============ Per-Token URI Management ============
    
    /**
     * @notice Set custom URI for specific token ID
     * @param tokenId Token ID
     * @param tokenURI Custom URI (overrides base URI)
     * @dev Emits TokenURISet event
     */
    function setTokenURI(uint256 tokenId, string memory tokenURI) external;
    
    /**
     * @notice Remove custom URI for specific token (reverts to base URI)
     * @param tokenId Token ID
     */
    function removeTokenURI(uint256 tokenId) external;
    
    /**
     * @notice Check if token has custom URI
     * @param tokenId Token ID
     * @return bool True if custom URI exists
     */
    function hasCustomURI(uint256 tokenId) external view returns (bool);
    
    /**
     * @notice Get URI for specific token
     * @param tokenId Token ID
     * @return string Full URI (custom URI if set, otherwise base URI + tokenId)
     */
    function uri(uint256 tokenId) external view returns (string memory);
    
    // ============ IPFS Support ============
    
    /**
     * @notice Set IPFS gateway for IPFS URIs
     * @param gateway IPFS gateway URL (e.g., "https://ipfs.io/ipfs/")
     * @dev Emits IPFSGatewaySet event
     */
    function setIPFSGateway(string memory gateway) external;
    
    /**
     * @notice Get current IPFS gateway
     * @return string IPFS gateway URL
     */
    function getIPFSGateway() external view returns (string memory);
    
    /**
     * @notice Convert IPFS hash to full URL using gateway
     * @param ipfsHash IPFS hash (e.g., "QmX...")
     * @return string Full IPFS URL
     */
    function toIPFSUrl(string memory ipfsHash) external view returns (string memory);
    
    // ============ Metadata Versioning ============
    
    /**
     * @notice Update URI version for token (for metadata updates)
     * @param tokenId Token ID
     * @dev Increments version counter, emits URIVersionUpdated event
     */
    function incrementURIVersion(uint256 tokenId) external;
    
    /**
     * @notice Get URI version for token
     * @param tokenId Token ID
     * @return uint256 Current version number
     */
    function getURIVersion(uint256 tokenId) external view returns (uint256);
    
    // ============ Batch Operations ============
    
    /**
     * @notice Set custom URIs for multiple tokens
     * @param tokenIds Array of token IDs
     * @param tokenURIs Array of URIs
     */
    function setBatchTokenURIs(
        uint256[] memory tokenIds,
        string[] memory tokenURIs
    ) external;
    
    /**
     * @notice Get URIs for multiple tokens
     * @param tokenIds Array of token IDs
     * @return string[] Array of URIs
     */
    function getBatchURIs(uint256[] memory tokenIds) 
        external 
        view 
        returns (string[] memory);
}
