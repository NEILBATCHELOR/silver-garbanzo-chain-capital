// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./interfaces/IERC1155URIModule.sol";
import "./storage/URIStorage.sol";

/**
 * @title ERC1155URIModule
 * @notice Advanced URI management system for ERC-1155 tokens
 * @dev Separate module to avoid stack depth in master contracts
 */
contract ERC1155URIModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC1155URIModule,
    URIStorage
{
    using Strings for uint256;
    
    // ============ Roles ============
    bytes32 public constant URI_MANAGER_ROLE = keccak256("URI_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize URI module
     * @param admin Admin address
     * @param baseURI_ Initial base URI
     * @param ipfsGateway_ IPFS gateway URL
     */
    function initialize(
        address admin,
        string memory baseURI_,
        string memory ipfsGateway_
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(URI_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _baseURI = baseURI_;
        _ipfsGateway = ipfsGateway_;
    }
    
    // ============ Base URI Management ============
    
    function setBaseURI(string memory newBaseURI) 
        external 
        onlyRole(URI_MANAGER_ROLE) 
    {
        if (bytes(newBaseURI).length == 0) revert EmptyURI();
        _baseURI = newBaseURI;
        emit BaseURISet(newBaseURI, msg.sender);
    }
    
    function getBaseURI() external view returns (string memory) {
        return _baseURI;
    }
    
    // ============ Per-Token URI Management ============
    
    function setTokenURI(uint256 tokenId, string memory tokenURI) 
        external 
        onlyRole(URI_MANAGER_ROLE) 
    {
        if (bytes(tokenURI).length == 0) revert EmptyURI();
        _tokenURIs[tokenId] = tokenURI;
        _hasCustomURI[tokenId] = true;
        emit TokenURISet(tokenId, tokenURI, msg.sender);
    }
    
    function removeTokenURI(uint256 tokenId) 
        external 
        onlyRole(URI_MANAGER_ROLE) 
    {
        delete _tokenURIs[tokenId];
        _hasCustomURI[tokenId] = false;
    }
    
    function hasCustomURI(uint256 tokenId) external view returns (bool) {
        return _hasCustomURI[tokenId];
    }
    
    function uri(uint256 tokenId) external view returns (string memory) {
        if (_hasCustomURI[tokenId]) {
            return _tokenURIs[tokenId];
        }
        
        string memory base = _baseURI;
        if (bytes(base).length == 0) {
            return "";
        }
        
        return string(abi.encodePacked(base, tokenId.toString()));
    }
    
    // ============ IPFS Support ============
    
    function setIPFSGateway(string memory gateway) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _ipfsGateway = gateway;
        emit IPFSGatewaySet(gateway);
    }
    
    function getIPFSGateway() external view returns (string memory) {
        return _ipfsGateway;
    }
    
    function toIPFSUrl(string memory ipfsHash) 
        external 
        view 
        returns (string memory) 
    {
        return string(abi.encodePacked(_ipfsGateway, ipfsHash));
    }
    
    // ============ Metadata Versioning ============
    
    function incrementURIVersion(uint256 tokenId) 
        external 
        onlyRole(URI_MANAGER_ROLE) 
    {
        _uriVersions[tokenId]++;
        emit URIVersionUpdated(tokenId, _uriVersions[tokenId]);
    }
    
    function getURIVersion(uint256 tokenId) 
        external 
        view 
        returns (uint256) 
    {
        return _uriVersions[tokenId];
    }
    
    // ============ Batch Operations ============
    
    function setBatchTokenURIs(
        uint256[] memory tokenIds,
        string[] memory tokenURIs
    ) external onlyRole(URI_MANAGER_ROLE) {
        require(tokenIds.length == tokenURIs.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (bytes(tokenURIs[i]).length == 0) revert EmptyURI();
            _tokenURIs[tokenIds[i]] = tokenURIs[i];
            _hasCustomURI[tokenIds[i]] = true;
            emit TokenURISet(tokenIds[i], tokenURIs[i], msg.sender);
        }
    }
    
    function getBatchURIs(uint256[] memory tokenIds) 
        external 
        view 
        returns (string[] memory) 
    {
        string[] memory uris = new string[](tokenIds.length);
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (_hasCustomURI[tokenIds[i]]) {
                uris[i] = _tokenURIs[tokenIds[i]];
            } else {
                string memory base = _baseURI;
                if (bytes(base).length == 0) {
                    uris[i] = "";
                } else {
                    uris[i] = string(abi.encodePacked(base, tokenIds[i].toString()));
                }
            }
        }
        
        return uris;
    }
    
    // ============ UUPS Upgrade ============
    
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
