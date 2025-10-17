// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "../../../src/extensions/uri-management/ERC1155URIModule.sol";

contract ERC1155URIModuleTest is Test {
    using Clones for address;
    
    ERC1155URIModule public implementation;
    ERC1155URIModule public module;
    
    address public admin = address(1);
    address public uriManager = address(2);
    
    bytes32 public constant URI_MANAGER_ROLE = keccak256("URI_MANAGER_ROLE");
    string public constant BASE_URI = "https://api.example.com/metadata/";
    string public constant IPFS_GATEWAY = "https://ipfs.io/ipfs/";
    
    event BaseURISet(string baseURI, address indexed setter);
    event TokenURISet(uint256 indexed tokenId, string tokenURI, address indexed setter);
    event TokenURIFrozen(uint256 indexed tokenId);
    
    function setUp() public {
        implementation = new ERC1155URIModule();
        
        address clone = address(implementation).clone();
        module = ERC1155URIModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, BASE_URI, IPFS_GATEWAY);
        
        vm.prank(admin);
        module.grantRole(URI_MANAGER_ROLE, uriManager);
    }
    
    function testInitialization() public view {
        assertEq(module.getBaseURI(), BASE_URI);
        assertEq(module.getIPFSGateway(), IPFS_GATEWAY);
        assertTrue(module.hasRole(URI_MANAGER_ROLE, uriManager));
    }
    
    function testUriWithBaseURI() public view {
        uint256 tokenId = 1;
        string memory expectedURI = string(abi.encodePacked(BASE_URI, "1"));
        assertEq(module.uri(tokenId), expectedURI);
    }
    
    function testSetTokenURI() public {
        uint256 tokenId = 1;
        string memory customURI = "ipfs://QmCustomHash";
        
        vm.expectEmit(true, true, false, true);
        emit TokenURISet(tokenId, customURI, uriManager);
        
        vm.prank(uriManager);
        module.setTokenURI(tokenId, customURI);
        
        assertEq(module.uri(tokenId), customURI);
        assertTrue(module.hasCustomURI(tokenId));
    }
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://new.example.com/metadata/";
        
        vm.expectEmit(false, true, false, true);
        emit BaseURISet(newBaseURI, uriManager);
        
        vm.prank(uriManager);
        module.setBaseURI(newBaseURI);
        
        assertEq(module.getBaseURI(), newBaseURI);
    }
}
