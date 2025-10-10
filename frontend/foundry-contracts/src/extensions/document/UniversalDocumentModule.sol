// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IUniversalDocumentModule.sol";
import "./storage/UniversalDocumentStorage.sol";

contract UniversalDocumentModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IUniversalDocumentModule,
    UniversalDocumentStorage
{
    bytes32 public constant DOCUMENT_MANAGER_ROLE = keccak256("DOCUMENT_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    bytes32 private constant GLOBAL_SCOPE = keccak256("global");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(DOCUMENT_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        UniversalDocumentModuleStorage storage $ = _getStorage();
        $.defaultScope = GLOBAL_SCOPE;
    }
    
    // ============ ERC-1643 Implementation (Global Scope) ============
    
    function getDocument(bytes32 name)
        external
        view
        override
        returns (
            string memory uri,
            bytes32 documentHash,
            uint256 timestamp
        )
    {
        (uri, documentHash, timestamp,) = getScopedDocument(GLOBAL_SCOPE, name);
    }
    
    function setDocument(
        bytes32 name,
        string calldata uri,
        bytes32 documentHash
    ) external override onlyRole(DOCUMENT_MANAGER_ROLE) {
        setScopedDocument(GLOBAL_SCOPE, name, uri, documentHash);
    }
    
    function removeDocument(bytes32 name) 
        external 
        override 
        onlyRole(DOCUMENT_MANAGER_ROLE) 
    {
        removeScopedDocument(GLOBAL_SCOPE, name);
    }
    
    function getAllDocuments() external view override returns (bytes32[] memory) {
        return getAllScopedDocuments(GLOBAL_SCOPE);
    }
    
    // ============ Scoped Document Management ============
    
    function getScopedDocument(bytes32 scope, bytes32 name)
        public
        view
        override
        returns (
            string memory uri,
            bytes32 documentHash,
            uint256 timestamp,
            uint256 version
        )
    {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        DocumentData storage doc = $.scopes[scope].documents[name];
        
        if (!doc.exists) revert DocumentNotFound(scope, name);
        
        return (doc.uri, doc.documentHash, doc.timestamp, doc.version);
    }
    function setScopedDocument(
        bytes32 scope,
        bytes32 name,
        string calldata uri,
        bytes32 documentHash
    ) public override onlyRole(DOCUMENT_MANAGER_ROLE) {
        if (bytes(uri).length == 0) revert EmptyDocumentURI();
        if (documentHash == bytes32(0)) revert InvalidDocumentHash();
        if (scope == bytes32(0)) revert EmptyScope();
        
        UniversalDocumentModuleStorage storage $ = _getStorage();
        ScopeData storage scopeData = $.scopes[scope];
        
        // Initialize scope if new
        if (!scopeData.exists) {
            $.scopeNames.push(scope);
            $.scopeIndexes[scope] = $.scopeNames.length - 1;
            scopeData.exists = true;
        }
        
        DocumentData storage doc = scopeData.documents[name];
        uint256 oldVersion = doc.version;
        
        if (!doc.exists) {
            // New document
            scopeData.documentNames.push(name);
            scopeData.documentIndexes[name] = scopeData.documentNames.length - 1;
            doc.exists = true;
            doc.version = 1;
        } else {
            // Update existing document
            doc.version++;
            emit DocumentVersionUpdated(scope, name, oldVersion, doc.version);
        }
        
        doc.uri = uri;
        doc.documentHash = documentHash;
        doc.timestamp = block.timestamp;
        
        emit ScopedDocumentSet(scope, name, uri, documentHash, doc.version);
        
        // Also emit ERC-1643 events for global scope
        if (scope == GLOBAL_SCOPE) {
            emit DocumentUpdated(name, uri, documentHash);
        }
    }
    function removeScopedDocument(bytes32 scope, bytes32 name)
        public
        override
        onlyRole(DOCUMENT_MANAGER_ROLE)
    {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        ScopeData storage scopeData = $.scopes[scope];
        
        if (!scopeData.exists) revert ScopeNotFound(scope);
        if (!scopeData.documents[name].exists) revert DocumentNotFound(scope, name);
        
        // Remove from array
        uint256 index = scopeData.documentIndexes[name];
        uint256 lastIndex = scopeData.documentNames.length - 1;
        
        if (index != lastIndex) {
            bytes32 lastDoc = scopeData.documentNames[lastIndex];
            scopeData.documentNames[index] = lastDoc;
            scopeData.documentIndexes[lastDoc] = index;
        }
        
        scopeData.documentNames.pop();
        delete scopeData.documentIndexes[name];
        delete scopeData.documents[name];
        
        emit ScopedDocumentRemoved(scope, name);
        
        // Also emit ERC-1643 event for global scope
        if (scope == GLOBAL_SCOPE) {
            emit DocumentRemoved(name, "", bytes32(0));
        }
    }
    
    function getAllScopedDocuments(bytes32 scope)
        public
        view
        override
        returns (bytes32[] memory)
    {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        return $.scopes[scope].documentNames;
    }
    
    function getAllScopes() external view override returns (bytes32[] memory) {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        return $.scopeNames;
    }
    
    function getScopeDocumentCount(bytes32 scope)
        external
        view
        override
        returns (uint256)
    {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        return $.scopes[scope].documentNames.length;
    }
    
    // ============ Helper Functions ============
    
    function scopeExists(bytes32 scope) external view returns (bool) {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        return $.scopes[scope].exists;
    }
    
    function documentExists(bytes32 scope, bytes32 name) 
        external 
        view 
        returns (bool) 
    {
        UniversalDocumentModuleStorage storage $ = _getStorage();
        return $.scopes[scope].documents[name].exists;
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
    
    uint256[50] private __gap;
}
