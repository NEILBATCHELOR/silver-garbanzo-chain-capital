// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../../src/extensions/erc1400/ERC1400DocumentModule.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract ERC1400DocumentModuleTest is Test {
    ERC1400DocumentModule public documents;
    
    address admin = address(1);
    
    bytes32 constant DOC_PROSPECTUS = keccak256("PROSPECTUS");
    bytes32 constant DOC_DISCLOSURE = keccak256("DISCLOSURE");
    
    function setUp() public {
        // Deploy implementation
        ERC1400DocumentModule implementation = new ERC1400DocumentModule();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            ERC1400DocumentModule.initialize.selector,
            admin
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        documents = ERC1400DocumentModule(address(proxy));
    }
    
    function testSetDocument() public {
        vm.prank(admin);
        string memory uri = "ipfs://QmExample";
        bytes32 docHash = keccak256("document content");
        
        documents.setDocument(DOC_PROSPECTUS, uri, docHash);
        
        assertTrue(documents.documentExists(DOC_PROSPECTUS));
        assertEq(documents.getDocumentVersion(DOC_PROSPECTUS), 1);
    }
    
    function testGetDocument() public {
        vm.prank(admin);
        string memory uri = "ipfs://QmExample";
        bytes32 docHash = keccak256("document content");
        
        documents.setDocument(DOC_PROSPECTUS, uri, docHash);
        
        (string memory returnedUri, bytes32 returnedHash, uint256 timestamp) = 
            documents.getDocument(DOC_PROSPECTUS);
        
        assertEq(returnedUri, uri);
        assertEq(returnedHash, docHash);
        assertGt(timestamp, 0);
    }
    
    function testUpdateDocument() public {
        vm.startPrank(admin);
        
        // Set initial document
        documents.setDocument(
            DOC_PROSPECTUS,
            "ipfs://QmV1",
            keccak256("v1")
        );
        assertEq(documents.getDocumentVersion(DOC_PROSPECTUS), 1);
        
        // Update document
        documents.setDocument(
            DOC_PROSPECTUS,
            "ipfs://QmV2",
            keccak256("v2")
        );
        assertEq(documents.getDocumentVersion(DOC_PROSPECTUS), 2);
        
        vm.stopPrank();
    }
    
    function testRemoveDocument() public {
        vm.startPrank(admin);
        
        documents.setDocument(
            DOC_PROSPECTUS,
            "ipfs://QmExample",
            keccak256("content")
        );
        assertTrue(documents.documentExists(DOC_PROSPECTUS));
        
        documents.removeDocument(DOC_PROSPECTUS);
        assertFalse(documents.documentExists(DOC_PROSPECTUS));
        
        vm.stopPrank();
    }
    
    function testGetAllDocuments() public {
        vm.startPrank(admin);
        
        documents.setDocument(DOC_PROSPECTUS, "uri1", keccak256("1"));
        documents.setDocument(DOC_DISCLOSURE, "uri2", keccak256("2"));
        
        bytes32[] memory allDocs = documents.getAllDocuments();
        assertEq(allDocs.length, 2);
        
        vm.stopPrank();
    }
    
    function testAccessControl() public {
        vm.expectRevert();
        documents.setDocument(DOC_PROSPECTUS, "uri", keccak256("content"));
    }
}
