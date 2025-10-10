// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./IERC1643.sol";

/**
 * @title IUniversalDocumentModule
 * @notice Enhanced document management with scope support
 * @dev Extends ERC-1643 with scoping for multi-standard compatibility
 * 
 * Scope Examples:
 * - "global"           → ERC-20 (entire token), ERC-4626 (entire vault)
 * - "slot:123"         → ERC-3525 (slot-specific documents)
 * - "partition:0x..."  → ERC-1400 (partition-specific documents)
 */
interface IUniversalDocumentModule is IERC1643 {
    // ============ Extended Events ============
    
    event ScopedDocumentSet(
        bytes32 indexed scope,
        bytes32 indexed name,
        string uri,
        bytes32 documentHash,
        uint256 version
    );
    
    event ScopedDocumentRemoved(
        bytes32 indexed scope,
        bytes32 indexed name
    );
    
    event DocumentVersionUpdated(
        bytes32 indexed scope,
        bytes32 indexed name,
        uint256 oldVersion,
        uint256 newVersion
    );
    
    // ============ Scoped Document Management ============
    
    function getScopedDocument(bytes32 scope, bytes32 name)
        external
        view
        returns (
            string memory uri,
            bytes32 documentHash,
            uint256 timestamp,
            uint256 version
        );
    
    function setScopedDocument(
        bytes32 scope,
        bytes32 name,
        string calldata uri,
        bytes32 documentHash
    ) external;
    
    function removeScopedDocument(bytes32 scope, bytes32 name) external;
    
    function getAllScopedDocuments(bytes32 scope) 
        external 
        view 
        returns (bytes32[] memory);
    
    function getAllScopes() external view returns (bytes32[] memory);
    
    function getScopeDocumentCount(bytes32 scope) 
        external 
        view 
        returns (uint256);
}
