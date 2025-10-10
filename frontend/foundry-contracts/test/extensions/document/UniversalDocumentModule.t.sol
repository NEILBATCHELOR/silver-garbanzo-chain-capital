// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {UniversalDocumentModule} from "src/extensions/document/UniversalDocumentModule.sol";
import {IUniversalDocumentModule} from "src/extensions/document/interfaces/IUniversalDocumentModule.sol";
import {UniversalDocumentStorage} from "src/extensions/document/storage/UniversalDocumentStorage.sol";

contract UniversalDocumentModuleTest is Test {
    UniversalDocumentModule public module;
    
    // Test accounts
    address public owner = makeAddr("owner");
    address public documentManager = makeAddr("documentManager");
    address public user = makeAddr("user");
    address public unauthorized = makeAddr("unauthorized");
    
    // Test data
    bytes32 public constant GLOBAL_SCOPE = keccak256("global");
    bytes32 public constant TEST_SCOPE = keccak256("test_scope");
    bytes32 public constant EQUITY_SCOPE = keccak256("equity");
    
    bytes32 public constant DOC_PROSPECTUS = keccak256("prospectus");
    bytes32 public constant DOC_BYLAWS = keccak256("bylaws");
    bytes32 public constant DOC_AUDIT = keccak256("audit_report");
    
    string public constant TEST_URI = "ipfs://QmTest123";
    bytes32 public constant TEST_HASH = keccak256("test_document_content");
    
    // Events
    event DocumentUpdated(bytes32 indexed name, string uri, bytes32 documentHash);
    event DocumentRemoved(bytes32 indexed name, string uri, bytes32 documentHash);
    event ScopedDocumentSet(bytes32 indexed scope, bytes32 indexed name, string uri, bytes32 documentHash, uint256 version);
    event ScopedDocumentRemoved(bytes32 indexed scope, bytes32 indexed name);
    event DocumentVersionUpdated(bytes32 indexed scope, bytes32 indexed name, uint256 oldVersion, uint256 newVersion);
    
    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy and initialize module
        module = new UniversalDocumentModule();
        module.initialize(owner);
        
        // Grant document manager role
        module.grantRole(module.DOCUMENT_MANAGER_ROLE(), documentManager);
        
        vm.stopPrank();
    }
    
    // ===== INITIALIZATION TESTS =====
    
    function test_Initialize() public view {
        // Verify owner has all roles
        assertTrue(module.hasRole(module.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(module.hasRole(module.DOCUMENT_MANAGER_ROLE(), owner));
        assertTrue(module.hasRole(module.UPGRADER_ROLE(), owner));
        
        // Verify document manager has correct role
        assertTrue(module.hasRole(module.DOCUMENT_MANAGER_ROLE(), documentManager));
    }
    
    function test_RevertWhen_InitializeTwice() public {
        vm.expectRevert();
        module.initialize(owner);
    }
    
    // ===== ACCESS CONTROL TESTS =====
    
    function test_OnlyDocumentManager_CanSetDocument() public {
        vm.prank(documentManager);
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        (string memory uri, bytes32 hash, uint256 timestamp) = module.getDocument(DOC_PROSPECTUS);
        assertEq(uri, TEST_URI);
        assertEq(hash, TEST_HASH);
        assertGt(timestamp, 0);
    }
    
    function test_RevertWhen_UnauthorizedSetDocument() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
    }
    
    function test_OnlyDocumentManager_CanRemoveDocument() public {
        // First add a document
        vm.prank(documentManager);
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        // Then remove it
        vm.prank(documentManager);
        module.removeDocument(DOC_PROSPECTUS);
        
        // Verify it's removed
        bytes32[] memory docs = module.getAllDocuments();
        assertEq(docs.length, 0);
    }
    
    function test_RevertWhen_UnauthorizedRemoveDocument() public {
        vm.prank(documentManager);
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        vm.prank(unauthorized);
        vm.expectRevert();
        module.removeDocument(DOC_PROSPECTUS);
    }
    
    // ===== GLOBAL SCOPE DOCUMENT TESTS (ERC-1643) =====
    
    function test_SetDocument_Success() public {
        vm.prank(documentManager);
        
        vm.expectEmit(true, true, true, true);
        emit DocumentUpdated(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        (string memory uri, bytes32 hash, uint256 timestamp) = module.getDocument(DOC_PROSPECTUS);
        assertEq(uri, TEST_URI);
        assertEq(hash, TEST_HASH);
        assertEq(timestamp, block.timestamp);
    }
    
    function test_SetDocument_UpdateExisting() public {
        vm.startPrank(documentManager);
        
        // Set initial document
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        // Update with new URI and hash
        string memory newUri = "ipfs://QmUpdated456";
        bytes32 newHash = keccak256("updated_content");
        
        module.setDocument(DOC_PROSPECTUS, newUri, newHash);
        
        (string memory uri, bytes32 hash,) = module.getDocument(DOC_PROSPECTUS);
        assertEq(uri, newUri);
        assertEq(hash, newHash);
        
        vm.stopPrank();
    }
    
    function test_GetAllDocuments() public {
        vm.startPrank(documentManager);
        
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setDocument(DOC_BYLAWS, "ipfs://bylaws", keccak256("bylaws"));
        module.setDocument(DOC_AUDIT, "ipfs://audit", keccak256("audit"));
        
        bytes32[] memory docs = module.getAllDocuments();
        assertEq(docs.length, 3);
        assertEq(docs[0], DOC_PROSPECTUS);
        assertEq(docs[1], DOC_BYLAWS);
        assertEq(docs[2], DOC_AUDIT);
        
        vm.stopPrank();
    }
    
    function test_RemoveDocument_Success() public {
        vm.startPrank(documentManager);
        
        module.setDocument(DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        vm.expectEmit(true, true, true, true);
        emit DocumentRemoved(DOC_PROSPECTUS, "", bytes32(0));
        
        module.removeDocument(DOC_PROSPECTUS);
        
        bytes32[] memory docs = module.getAllDocuments();
        assertEq(docs.length, 0);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_SetDocument_EmptyURI() public {
        vm.prank(documentManager);
        vm.expectRevert(UniversalDocumentStorage.EmptyDocumentURI.selector);
        module.setScopedDocument(GLOBAL_SCOPE, DOC_PROSPECTUS, "", TEST_HASH);
    }
    
    function test_RevertWhen_SetDocument_InvalidHash() public {
        vm.prank(documentManager);
        vm.expectRevert(UniversalDocumentStorage.InvalidDocumentHash.selector);
        module.setScopedDocument(GLOBAL_SCOPE, DOC_PROSPECTUS, TEST_URI, bytes32(0));
    }
    
    // ===== SCOPED DOCUMENT TESTS =====
    
    function test_SetScopedDocument_Success() public {
        vm.prank(documentManager);
        
        vm.expectEmit(true, true, true, true);
        emit ScopedDocumentSet(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH, 1);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        (string memory uri, bytes32 hash, uint256 timestamp, uint256 version) = 
            module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        
        assertEq(uri, TEST_URI);
        assertEq(hash, TEST_HASH);
        assertEq(timestamp, block.timestamp);
        assertEq(version, 1);
    }
    
    function test_SetScopedDocument_MultipleScopes() public {
        vm.startPrank(documentManager);
        
        // Add document to TEST_SCOPE
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        // Add document to EQUITY_SCOPE
        string memory equityUri = "ipfs://equity";
        bytes32 equityHash = keccak256("equity_content");
        module.setScopedDocument(EQUITY_SCOPE, DOC_PROSPECTUS, equityUri, equityHash);
        
        // Verify both scopes have their documents
        (string memory uri1,,,) = module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        (string memory uri2,,,) = module.getScopedDocument(EQUITY_SCOPE, DOC_PROSPECTUS);
        
        assertEq(uri1, TEST_URI);
        assertEq(uri2, equityUri);
        
        vm.stopPrank();
    }
    
    function test_SetScopedDocument_VersionIncrement() public {
        vm.startPrank(documentManager);
        
        // Set initial document (version 1)
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        (,,,uint256 version1) = module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        assertEq(version1, 1);
        
        // Update document (version 2)
        vm.expectEmit(true, true, true, true);
        emit DocumentVersionUpdated(TEST_SCOPE, DOC_PROSPECTUS, 1, 2);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, "ipfs://v2", keccak256("v2"));
        (,,,uint256 version2) = module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        assertEq(version2, 2);
        
        // Update again (version 3)
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, "ipfs://v3", keccak256("v3"));
        (,,,uint256 version3) = module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        assertEq(version3, 3);
        
        vm.stopPrank();
    }
    
    function test_GetAllScopedDocuments() public {
        vm.startPrank(documentManager);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(TEST_SCOPE, DOC_BYLAWS, "ipfs://bylaws", keccak256("bylaws"));
        module.setScopedDocument(TEST_SCOPE, DOC_AUDIT, "ipfs://audit", keccak256("audit"));
        
        bytes32[] memory docs = module.getAllScopedDocuments(TEST_SCOPE);
        assertEq(docs.length, 3);
        
        vm.stopPrank();
    }
    
    function test_GetAllScopes() public {
        vm.startPrank(documentManager);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(EQUITY_SCOPE, DOC_BYLAWS, TEST_URI, TEST_HASH);
        module.setScopedDocument(GLOBAL_SCOPE, DOC_AUDIT, TEST_URI, TEST_HASH);
        
        bytes32[] memory scopes = module.getAllScopes();
        assertEq(scopes.length, 3);
        
        vm.stopPrank();
    }
    
    function test_GetScopeDocumentCount() public {
        vm.startPrank(documentManager);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(TEST_SCOPE, DOC_BYLAWS, TEST_URI, TEST_HASH);
        
        uint256 count = module.getScopeDocumentCount(TEST_SCOPE);
        assertEq(count, 2);
        
        vm.stopPrank();
    }
    
    function test_ScopeExists() public {
        vm.prank(documentManager);
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        assertTrue(module.scopeExists(TEST_SCOPE));
        assertFalse(module.scopeExists(keccak256("nonexistent")));
    }
    
    function test_DocumentExists() public {
        vm.prank(documentManager);
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        assertTrue(module.documentExists(TEST_SCOPE, DOC_PROSPECTUS));
        assertFalse(module.documentExists(TEST_SCOPE, keccak256("nonexistent")));
    }
    
    function test_RemoveScopedDocument_Success() public {
        vm.startPrank(documentManager);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(TEST_SCOPE, DOC_BYLAWS, "ipfs://bylaws", keccak256("bylaws"));
        
        vm.expectEmit(true, true, true, true);
        emit ScopedDocumentRemoved(TEST_SCOPE, DOC_PROSPECTUS);
        
        module.removeScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        
        // Verify document is removed
        assertFalse(module.documentExists(TEST_SCOPE, DOC_PROSPECTUS));
        
        // Verify other document still exists
        assertTrue(module.documentExists(TEST_SCOPE, DOC_BYLAWS));
        
        bytes32[] memory docs = module.getAllScopedDocuments(TEST_SCOPE);
        assertEq(docs.length, 1);
        assertEq(docs[0], DOC_BYLAWS);
        
        vm.stopPrank();
    }
    
    // ===== REVERT TESTS =====
    
    function test_RevertWhen_GetDocument_NotFound() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalDocumentStorage.DocumentNotFound.selector,
                GLOBAL_SCOPE,
                DOC_PROSPECTUS
            )
        );
        module.getDocument(DOC_PROSPECTUS);
    }
    
    function test_RevertWhen_GetScopedDocument_NotFound() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalDocumentStorage.DocumentNotFound.selector,
                TEST_SCOPE,
                DOC_PROSPECTUS
            )
        );
        module.getScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
    }
    
    function test_RevertWhen_RemoveScopedDocument_ScopeNotFound() public {
        vm.prank(documentManager);
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalDocumentStorage.ScopeNotFound.selector,
                keccak256("nonexistent")
            )
        );
        module.removeScopedDocument(keccak256("nonexistent"), DOC_PROSPECTUS);
    }
    
    function test_RevertWhen_RemoveScopedDocument_DocumentNotFound() public {
        vm.startPrank(documentManager);
        
        // Create scope
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        
        // Try to remove non-existent document
        vm.expectRevert(
            abi.encodeWithSelector(
                UniversalDocumentStorage.DocumentNotFound.selector,
                TEST_SCOPE,
                DOC_BYLAWS
            )
        );
        module.removeScopedDocument(TEST_SCOPE, DOC_BYLAWS);
        
        vm.stopPrank();
    }
    
    function test_RevertWhen_SetScopedDocument_EmptyScope() public {
        vm.prank(documentManager);
        vm.expectRevert(UniversalDocumentStorage.EmptyScope.selector);
        module.setScopedDocument(bytes32(0), DOC_PROSPECTUS, TEST_URI, TEST_HASH);
    }
    
    // ===== EDGE CASE TESTS =====
    
    function test_RemoveDocument_LastInArray() public {
        vm.startPrank(documentManager);
        
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.removeScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        
        bytes32[] memory docs = module.getAllScopedDocuments(TEST_SCOPE);
        assertEq(docs.length, 0);
        
        vm.stopPrank();
    }
    
    function test_RemoveDocument_MiddleOfArray() public {
        vm.startPrank(documentManager);
        
        // Add three documents
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(TEST_SCOPE, DOC_BYLAWS, "ipfs://bylaws", keccak256("bylaws"));
        module.setScopedDocument(TEST_SCOPE, DOC_AUDIT, "ipfs://audit", keccak256("audit"));
        
        // Remove middle document
        module.removeScopedDocument(TEST_SCOPE, DOC_BYLAWS);
        
        bytes32[] memory docs = module.getAllScopedDocuments(TEST_SCOPE);
        assertEq(docs.length, 2);
        
        // Verify remaining documents
        assertTrue(module.documentExists(TEST_SCOPE, DOC_PROSPECTUS));
        assertFalse(module.documentExists(TEST_SCOPE, DOC_BYLAWS));
        assertTrue(module.documentExists(TEST_SCOPE, DOC_AUDIT));
        
        vm.stopPrank();
    }
    
    function test_ScopeIsolation() public {
        vm.startPrank(documentManager);
        
        // Add same document name to different scopes
        module.setScopedDocument(TEST_SCOPE, DOC_PROSPECTUS, TEST_URI, TEST_HASH);
        module.setScopedDocument(EQUITY_SCOPE, DOC_PROSPECTUS, "ipfs://equity", keccak256("equity"));
        
        // Remove from one scope
        module.removeScopedDocument(TEST_SCOPE, DOC_PROSPECTUS);
        
        // Verify other scope unaffected
        assertTrue(module.documentExists(EQUITY_SCOPE, DOC_PROSPECTUS));
        assertFalse(module.documentExists(TEST_SCOPE, DOC_PROSPECTUS));
        
        vm.stopPrank();
    }
}
