// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DocumentStorage
 * @notice Storage layout for document management module (upgradeable-safe)
 */
contract DocumentStorage {
    // ============ Document Data ============
    
    /// @notice Document information structure
    struct DocumentData {
        string uri;           // Document URI (IPFS, HTTP, etc.)
        bytes32 documentHash; // SHA-256 hash for verification
        uint256 timestamp;    // When document was set
        uint256 version;      // Document version number
        bool exists;          // Whether document exists
    }
    
    // document name => document data
    mapping(bytes32 => DocumentData) internal _documents;
    
    // Array of all document names
    bytes32[] internal _documentNames;
    
    // document name => index in array (for removal)
    mapping(bytes32 => uint256) internal _documentIndexes;
    
    // ============ Partition-Specific Documents ============
    
    // partition => document name => document data
    mapping(bytes32 => mapping(bytes32 => DocumentData)) internal _partitionDocuments;
    
    // partition => array of document names
    mapping(bytes32 => bytes32[]) internal _partitionDocumentNames;
    
    // partition => document name => index in array
    mapping(bytes32 => mapping(bytes32 => uint256)) internal _partitionDocumentIndexes;
    
    // ============ Storage Gap ============
    uint256[44] private __gap;
}
