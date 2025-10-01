// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC1400DocumentModule
 * @notice Interface for ERC-1400 security token document management
 * @dev Implements legal document requirements for security tokens
 */
interface IERC1400DocumentModule {
    // ============ Structs ============
    
    /// @notice Document information
    struct Document {
        string uri;           // Document URI (IPFS, HTTP, etc.)
        bytes32 documentHash; // SHA-256 hash for verification
        uint256 timestamp;    // When document was set
        uint256 version;      // Document version number
    }
    
    // ============ Events ============
    
    event DocumentSet(
        bytes32 indexed name,
        string uri,
        bytes32 documentHash,
        uint256 version
    );
    event DocumentRemoved(bytes32 indexed name);
    event DocumentUpdated(bytes32 indexed name, uint256 newVersion);
    
    // ============ Errors ============
    
    error DocumentNotFound(bytes32 name);
    error InvalidDocumentHash();
    error DocumentAlreadyExists(bytes32 name);
    error EmptyDocumentURI();
    
    // ============ Document Management ============
    
    /**
     * @notice Set or update a document
     * @param name Document identifier
     * @param uri Document URI (IPFS, HTTP, etc.)
     * @param documentHash SHA-256 hash of document content
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
     * @notice Get document information
     * @param name Document identifier
     * @return uri Document URI
     * @return documentHash SHA-256 hash
     * @return timestamp When document was set
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
     * @notice Get full document details including version
     * @param name Document identifier
     * @return document Complete document information
     */
    function getDocumentDetails(bytes32 name)
        external
        view
        returns (Document memory document);
    
    /**
     * @notice Get all document names
     * @return bytes32[] Array of document identifiers
     */
    function getAllDocuments() external view returns (bytes32[] memory);
    
    /**
     * @notice Check if document exists
     * @param name Document identifier
     * @return bool True if document exists
     */
    function documentExists(bytes32 name) external view returns (bool);
    
    /**
     * @notice Get document version
     * @param name Document identifier
     * @return uint256 Current version number
     */
    function getDocumentVersion(bytes32 name) external view returns (uint256);
    
    // ============ Batch Operations ============
    
    /**
     * @notice Set multiple documents at once
     * @param names Document identifiers
     * @param uris Document URIs
     * @param documentHashes SHA-256 hashes
     */
    function setDocumentBatch(
        bytes32[] calldata names,
        string[] calldata uris,
        bytes32[] calldata documentHashes
    ) external;
    
    /**
     * @notice Get multiple documents at once
     * @param names Document identifiers
     * @return documents Array of document information
     */
    function getDocumentBatch(bytes32[] calldata names)
        external
        view
        returns (Document[] memory documents);
}
