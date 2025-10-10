// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/erc1400/ERC1400DocumentModule.sol";

contract ERC1400DocumentModuleTest is Test {
    using Clones for address;
    
    ERC1400DocumentModule public implementation;
    ERC1400DocumentModule public module;
    
    address public owner = address(1);
    address public user = address(2);
    
    bytes32 public docName1 = bytes32("agreement");
    bytes32 public docName2 = bytes32("prospectus");
    bytes32 public docHash1 = keccak256("document1content");
    bytes32 public docHash2 = keccak256("document2content");
    bytes32 public docHash1Updated = keccak256("document1contentv2");
    string public docUri1 = "ipfs://QmDoc1";
    string public docUri2 = "ipfs://QmDoc2";
    string public docUri1Updated = "ipfs://QmDoc1v2";
    
    event DocumentSet(bytes32 indexed name, string uri, bytes32 documentHash, uint256 version);
    event DocumentRemoved(bytes32 indexed name);
    
    function setUp() public {
        // Deploy implementation
        implementation = new ERC1400DocumentModule();
        
        // Clone and initialize
        address clone = address(implementation).clone();
        module = ERC1400DocumentModule(clone);
        
        vm.prank(owner);
        module.initialize(owner);
    }
    
    function testSetDocument() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, true);
        emit DocumentSet(docName1, docUri1, docHash1, 1);
        module.setDocument(docName1, docUri1, docHash1);
        
        (string memory uri, bytes32 documentHash, uint256 timestamp) = module.getDocument(docName1);
        assertEq(uri, docUri1);
        assertEq(documentHash, docHash1);
        assertGt(timestamp, 0);
    }
    
    function testUpdateDocument() public {
        vm.startPrank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        
        vm.expectEmit(true, false, false, true);
        emit DocumentSet(docName1, docUri1Updated, docHash1Updated, 2);
        module.setDocument(docName1, docUri1Updated, docHash1Updated);
        vm.stopPrank();
        
        (string memory uri, bytes32 documentHash,) = module.getDocument(docName1);
        assertEq(uri, docUri1Updated);
        assertEq(documentHash, docHash1Updated);
    }
    
    function testRemoveDocument() public {
        vm.startPrank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        
        vm.expectEmit(true, false, false, false);
        emit DocumentRemoved(docName1);
        module.removeDocument(docName1);
        vm.stopPrank();
        
        assertFalse(module.documentExists(docName1));
    }
    
    function testGetAllDocuments() public {
        vm.startPrank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        module.setDocument(docName2, docUri2, docHash2);
        vm.stopPrank();
        
        bytes32[] memory names = module.getAllDocuments();
        assertEq(names.length, 2);
        assertTrue(names[0] == docName1 || names[1] == docName1);
        assertTrue(names[0] == docName2 || names[1] == docName2);
    }
    
    function testCannotSetDocumentWithEmptyURI() public {
        vm.prank(owner);
        vm.expectRevert();
        module.setDocument(docName1, "", docHash1);
    }
    
    function testCannotSetDocumentWithInvalidHash() public {
        vm.prank(owner);
        vm.expectRevert();
        module.setDocument(docName1, docUri1, bytes32(0));
    }
    
    function testCannotRemoveNonExistentDocument() public {
        vm.prank(owner);
        vm.expectRevert();
        module.removeDocument(docName1);
    }
    
    function testOnlyOwnerCanSetDocument() public {
        vm.prank(user);
        vm.expectRevert();
        module.setDocument(docName1, docUri1, docHash1);
    }
    
    function testOnlyOwnerCanRemoveDocument() public {
        vm.prank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        
        vm.prank(user);
        vm.expectRevert();
        module.removeDocument(docName1);
    }
    
    function testDocumentExists() public {
        assertFalse(module.documentExists(docName1));
        
        vm.prank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        
        assertTrue(module.documentExists(docName1));
    }
    
    function testDocumentVersioning() public {
        vm.startPrank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        
        uint256 version1 = module.getDocumentVersion(docName1);
        assertEq(version1, 1);
        
        module.setDocument(docName1, docUri1Updated, docHash1Updated);
        
        uint256 version2 = module.getDocumentVersion(docName1);
        assertEq(version2, 2);
        vm.stopPrank();
        
        // Should return the latest version
        (string memory uri, bytes32 documentHash,) = module.getDocument(docName1);
        assertEq(uri, docUri1Updated);
        assertEq(documentHash, docHash1Updated);
    }
    
    function testMultipleDocuments() public {
        vm.startPrank(owner);
        module.setDocument(docName1, docUri1, docHash1);
        module.setDocument(docName2, docUri2, docHash2);
        vm.stopPrank();
        
        (string memory uri1, bytes32 hash1,) = module.getDocument(docName1);
        (string memory uri2, bytes32 hash2,) = module.getDocument(docName2);
        
        assertEq(uri1, docUri1);
        assertEq(hash1, docHash1);
        assertEq(uri2, docUri2);
        assertEq(hash2, docHash2);
    }
}
