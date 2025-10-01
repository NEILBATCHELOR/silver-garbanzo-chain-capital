// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC1400DocumentModule.sol";
import "./storage/DocumentStorage.sol";

/**
 * @title ERC1400DocumentModule
 * @notice Modular document management for ERC-1400 security tokens
 * @dev Implements legal document requirements
 */
contract ERC1400DocumentModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1400DocumentModule,
    DocumentStorage
{
    // ============ Roles ============
    bytes32 public constant DOCUMENT_MANAGER_ROLE = keccak256("DOCUMENT_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize document module
     * @param admin Admin address
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DOCUMENT_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    // ============ Document Management ============
    
    function setDocument(
        bytes32 name,
        string calldata uri,
        bytes32 documentHash
    ) external onlyRole(DOCUMENT_MANAGER_ROLE) {
        if (bytes(uri).length == 0) revert EmptyDocumentURI();
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();
        
        DocumentData storage doc = _documents[name];
        
        if (!doc.exists) {
            // New document
            _documentNames.push(name);
            _documentIndexes[name] = _documentNames.length - 1;
            doc.exists = true;
            doc.version = 1;
        } else {
            // Update existing document
            doc.version++;
            emit DocumentUpdated(name, doc.version);
        }
        
        doc.uri = uri;
        doc.documentHash = documentHash;
        doc.timestamp = block.timestamp;
        
        emit DocumentSet(name, uri, documentHash, doc.version);
    }
    
    function removeDocument(bytes32 name)
        external
        onlyRole(DOCUMENT_MANAGER_ROLE)
    {
        if (!_documents[name].exists) revert DocumentNotFound(name);
        
        // Remove from array
        uint256 index = _documentIndexes[name];
        uint256 lastIndex = _documentNames.length - 1;
        
        if (index != lastIndex) {
            bytes32 lastDoc = _documentNames[lastIndex];
            _documentNames[index] = lastDoc;
            _documentIndexes[lastDoc] = index;
        }
        
        _documentNames.pop();
        delete _documentIndexes[name];
        delete _documents[name];
        
        emit DocumentRemoved(name);
    }
    
    function getDocument(bytes32 name)
        external
        view
        returns (
            string memory uri,
            bytes32 documentHash,
            uint256 timestamp
        )
    {
        if (!_documents[name].exists) revert DocumentNotFound(name);
        
        DocumentData storage doc = _documents[name];
        return (doc.uri, doc.documentHash, doc.timestamp);
    }
    
    function getDocumentDetails(bytes32 name)
        external
        view
        returns (Document memory)
    {
        if (!_documents[name].exists) revert DocumentNotFound(name);
        
        DocumentData storage doc = _documents[name];
        return Document({
            uri: doc.uri,
            documentHash: doc.documentHash,
            timestamp: doc.timestamp,
            version: doc.version
        });
    }
    
    function getAllDocuments() external view returns (bytes32[] memory) {
        return _documentNames;
    }
    
    function documentExists(bytes32 name) external view returns (bool) {
        return _documents[name].exists;
    }
    
    function getDocumentVersion(bytes32 name) external view returns (uint256) {
        if (!_documents[name].exists) revert DocumentNotFound(name);
        return _documents[name].version;
    }
    
    // ============ Batch Operations ============
    
    function setDocumentBatch(
        bytes32[] calldata names,
        string[] calldata uris,
        bytes32[] calldata documentHashes
    ) external onlyRole(DOCUMENT_MANAGER_ROLE) {
        require(
            names.length == uris.length && names.length == documentHashes.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < names.length; i++) {
            this.setDocument(names[i], uris[i], documentHashes[i]);
        }
    }
    
    function getDocumentBatch(bytes32[] calldata names)
        external
        view
        returns (Document[] memory documents)
    {
        documents = new Document[](names.length);
        
        for (uint256 i = 0; i < names.length; i++) {
            if (_documents[names[i]].exists) {
                DocumentData storage doc = _documents[names[i]];
                documents[i] = Document({
                    uri: doc.uri,
                    documentHash: doc.documentHash,
                    timestamp: doc.timestamp,
                    version: doc.version
                });
            }
        }
        
        return documents;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
