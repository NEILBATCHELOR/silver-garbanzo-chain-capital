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
    address public nftContract = address(0x999);
    
    bytes32 public constant URI_MANAGER_ROLE = keccak256("URI_MANAGER_ROLE");
    string public constant BASE_URI = "https://api.example.com/metadata/";
    
    event BaseURISet(string baseURI);
    event TokenURISet(uint256 indexed tokenId, string tokenURI);
    event TokenURIFrozen(uint256 indexed tokenId);
    
    function setUp() public {
        implementation = new ERC1155URIModule();
        
        address clone = address(implementation).clone();
        module = ERC1155URIModule(clone);
        
        vm.prank(admin);
        module.initialize(admin, nftContract, BASE_URI);
        
        vm.prank(admin);
        module.grantRole(URI_MANAGER_ROLE, uriManager);
    }
    
    function testInitialization() public view {
        assertEq(module.nftContract(), nftContract);
        assertEq(module.getBaseURI(), BASE_URI);
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
        
        vm.expectEmit(true, false, false, true);
        emit TokenURISet(tokenId, customURI);
        
        vm.prank(uriManager);
        module.setTokenURI(tokenId, customURI);
        
        assertEq(module.uri(tokenId), customURI);
        assertTrue(module.hasCustomURI(tokenId));
    }
    
    function testSetBaseURI() public {
        string memory newBaseURI = "https://new.example.com/metadata/";
        
        vm.expectEmit(false, false, false, true);
        emit BaseURISet(newBaseURI);
        
        vm.prank(uriManager);
        module.setBaseURI(newBaseURI);
        
        assertEq(module.getBaseURI(), newBaseURI);
    }
}
