// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title UniversalDocumentStorage
 * @notice Storage layout for Universal Document Module
 * @dev Follows ERC-7201 namespaced storage pattern for upgradeable contracts
 */
abstract contract UniversalDocumentStorage {
    // ============ Structs ============
    
    /**
     * @notice Document data structure
     * @param uri Document URI (IPFS, HTTP, etc.)
     * @param documentHash Hash of document contents for verification
     * @param timestamp When document was last modified
     * @param version Document version number (starts at 1)
     * @param exists Whether document exists
     */
    struct DocumentData {
        string uri;
        bytes32 documentHash;
        uint256 timestamp;
        uint256 version;
        bool exists;
    }
    
    /**
     * @notice Scope data structure
     * @param documents Mapping of document names to document data
     * @param documentNames Array of document names in this scope
     * @param documentIndexes Mapping of document names to array indexes
     * @param exists Whether scope exists
     */
    struct ScopeData {
        mapping(bytes32 => DocumentData) documents;
        bytes32[] documentNames;
        mapping(bytes32 => uint256) documentIndexes;
        bool exists;
    }
    
    // ============ Storage ============
    
    /// @custom:storage-location erc7201:chaincapital.storage.UniversalDocumentModule
    struct UniversalDocumentModuleStorage {
        // Scope => ScopeData
        mapping(bytes32 => ScopeData) scopes;
        
        // Array of all scope identifiers
        bytes32[] scopeNames;
        
        // Mapping of scope identifiers to array indexes
        mapping(bytes32 => uint256) scopeIndexes;
        
        // Default scope (keccak256("global"))
        bytes32 defaultScope;
    }
    
    // keccak256(abi.encode(uint256(keccak256("chaincapital.storage.UniversalDocumentModule")) - 1))
    bytes32 private constant STORAGE_LOCATION = 
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    
    function _getStorage() internal pure returns (UniversalDocumentModuleStorage storage $) {
        assembly {
            $.slot := STORAGE_LOCATION
        }
    }
    
    // ============ Errors ============
    
    error EmptyDocumentURI();
    error InvalidDocumentHash();
    error DocumentNotFound(bytes32 scope, bytes32 name);
    error ScopeNotFound(bytes32 scope);
    error EmptyScope();
}
