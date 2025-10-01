// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC721SoulboundModule.sol";
import "./storage/SoulboundStorage.sol";

/**
 * @title ERC721SoulboundModule
 * @notice Modular soulbound (non-transferable) NFT system
 * @dev Enables credentials, badges, and identity tokens
 * 
 * Use Cases:
 * - KYC verification NFTs (prove accredited investor status)
 * - Educational certificates
 * - Membership badges
 * - Reputation tokens
 * 
 * Gas Cost: Minimal (~1k per check)
 */
contract ERC721SoulboundModule is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IERC721SoulboundModule,
    SoulboundStorage
{
    bytes32 public constant SOULBOUND_MANAGER_ROLE = keccak256("SOULBOUND_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SOULBOUND_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }
    
    function markAsSoulbound(uint256 tokenId) external onlyRole(SOULBOUND_MANAGER_ROLE) {
        _soulbound[tokenId] = true;
        emit SoulboundStatusSet(tokenId, true);
    }
    
    function removeSoulbound(uint256 tokenId) external onlyRole(SOULBOUND_MANAGER_ROLE) {
        _soulbound[tokenId] = false;
        emit SoulboundStatusSet(tokenId, false);
    }
    
    function bindToSoul(uint256 tokenId) external {
        // Ownership check should be done by NFT contract
        if (_boundSouls[tokenId] != address(0)) revert AlreadyBound(tokenId);
        
        _boundSouls[tokenId] = msg.sender;
        _soulbound[tokenId] = true;
        emit TokenBound(tokenId, msg.sender);
    }
    
    function unbindToken(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_boundSouls[tokenId] == address(0)) revert NotBound(tokenId);
        
        delete _boundSouls[tokenId];
        delete _soulbound[tokenId];
        emit TokenUnbound(tokenId);
    }
    
    function isSoulbound(uint256 tokenId) external view returns (bool) {
        return _soulbound[tokenId];
    }
    
    function isBound(uint256 tokenId) external view returns (bool) {
        return _boundSouls[tokenId] != address(0);
    }
    
    function getSoul(uint256 tokenId) external view returns (address) {
        return _boundSouls[tokenId];
    }
    
    function canTransfer(uint256 tokenId, address from, address to)
        external
        view
        returns (bool)
    {
        // Allow minting (from == 0) and burning (to == 0)
        if (from == address(0) || to == address(0)) return true;
        
        // Block transfers of soulbound tokens
        if (_soulbound[tokenId]) return false;
        
        return true;
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
