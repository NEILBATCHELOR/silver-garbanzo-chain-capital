// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1643 Document Management Standard
 * @notice Standard interface for attaching documents to smart contracts
 * @dev Part of ERC-1400 Security Token Standards but applicable to any token standard
 * @dev See https://github.com/ethereum/EIPs/issues/1643
 */
interface IERC1643 {
    // ============ Events ============
    
    /**
     * @notice Emitted when a document is set or updated
     * @param name Document identifier
     * @param uri Document URI (IPFS, HTTP, etc.)
     * @param documentHash Hash of document contents
     */
    event DocumentRemoved(
        bytes32 indexed name,
        string uri,
        bytes32 documentHash
    );
    
    /**
     * @notice Emitted when a document is removed
     * @param name Document identifier
     * @param uri Document URI
     * @param documentHash Hash of document contents
     */
    event DocumentUpdated(
        bytes32 indexed name,
        string uri,
        bytes32 documentHash
    );
    
    // ============ Document Management ============
    
    /**
     * @notice Get document information
     * @param name Document identifier
     * @return uri Document URI
     * @return documentHash Hash of document contents
     * @return timestamp When document was last modified
     */
    function getDocument(bytes32 name)
        external
        view
        returns (
            string memory uri,
            bytes32 documentHash,
            uint256 timestamp
        );
    
    /**
     * @notice Set or update a document
     * @param name Document identifier
     * @param uri Document URI (IPFS, HTTP, etc.)
     * @param documentHash Hash of document contents for verification
     */
    function setDocument(
        bytes32 name,
        string calldata uri,
        bytes32 documentHash
    ) external;
    
    /**
     * @notice Remove a document
     * @param name Document identifier
     */
    function removeDocument(bytes32 name) external;
    
    /**
     * @notice Get all document names
     * @return Array of document identifiers
     */
    function getAllDocuments() external view returns (bytes32[] memory);
}
