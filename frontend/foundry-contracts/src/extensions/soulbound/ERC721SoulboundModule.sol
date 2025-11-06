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
    
    /**
     * @notice Initialize soulbound module
     * @param admin Admin address
     * @param allowOneTimeTransfer Allow one transfer for account recovery
     * @param burnableByOwner Owner can burn their tokens
     * @param burnableByIssuer Issuer can revoke tokens
     * @param expirationEnabled Enable token expiration
     * @param expirationPeriod Expiration period in seconds
     */
    function initialize(
        address admin,
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SOULBOUND_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        
        _allowOneTimeTransfer = allowOneTimeTransfer;
        _burnableByOwner = burnableByOwner;
        _burnableByIssuer = burnableByIssuer;
        _expirationEnabled = expirationEnabled;
        _expirationPeriod = expirationPeriod;
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
        
        // Block transfers of soulbound tokens, unless one-time transfer is allowed
        if (_soulbound[tokenId]) {
            if (_allowOneTimeTransfer && _transferCounts[tokenId] == 0) {
                return true; // Allow first transfer for account recovery
            }
            return false;
        }
        
        // Check if token is expired
        if (_expirationEnabled && isExpired(tokenId)) {
            return false; // Cannot transfer expired tokens
        }
        
        return true;
    }
    
    // ============ Burn Functions ============
    
    /**
     * @notice Burn token (owner only, if allowed)
     * @param tokenId Token ID to burn
     */
    function burn(uint256 tokenId) external {
        if (!_burnableByOwner) {
            revert BurnNotAllowed(tokenId);
        }
        // Note: Ownership check should be done by NFT contract
        // NFT contract should call its internal _burn function
        emit TokenBurned(tokenId, msg.sender);
    }
    
    /**
     * @notice Revoke token (issuer only, if allowed)
     * @param tokenId Token ID to revoke
     */
    function revoke(uint256 tokenId) external onlyRole(SOULBOUND_MANAGER_ROLE) {
        if (!_burnableByIssuer) {
            revert RevokeNotAllowed(tokenId);
        }
        // NFT contract should call its internal _burn function
        emit TokenRevoked(tokenId, msg.sender);
    }
    
    // ============ Expiration Functions ============
    
    /**
     * @notice Check if token is expired
     * @param tokenId Token ID
     * @return bool True if expired
     */
    function isExpired(uint256 tokenId) public view returns (bool) {
        if (!_expirationEnabled || _expirationPeriod == 0) {
            return false;
        }
        uint256 mintTime = _mintTimestamps[tokenId];
        if (mintTime == 0) {
            return false; // Not minted yet
        }
        return block.timestamp > (mintTime + _expirationPeriod);
    }
    
    /**
     * @notice Get token expiration timestamp
     * @param tokenId Token ID
     * @return uint256 Expiration timestamp (0 if no expiration)
     */
    function getExpirationTime(uint256 tokenId) external view returns (uint256) {
        if (!_expirationEnabled || _expirationPeriod == 0) {
            return 0;
        }
        uint256 mintTime = _mintTimestamps[tokenId];
        if (mintTime == 0) {
            return 0;
        }
        return mintTime + _expirationPeriod;
    }
    
    /**
     * @notice Record token mint (called by NFT contract)
     * @param tokenId Token ID
     * @param to Recipient address
     */
    function recordMint(uint256 tokenId, address to) external onlyRole(SOULBOUND_MANAGER_ROLE) {
        _mintTimestamps[tokenId] = block.timestamp;
        emit TokenMinted(tokenId, to, block.timestamp);
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Get configuration
     */
    function getConfiguration() external view returns (
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    ) {
        return (
            _allowOneTimeTransfer,
            _burnableByOwner,
            _burnableByIssuer,
            _expirationEnabled,
            _expirationPeriod
        );
    }
    
    /**
     * @notice Set configuration (admin only)
     */
    function setConfiguration(
        bool allowOneTimeTransfer,
        bool burnableByOwner,
        bool burnableByIssuer,
        bool expirationEnabled,
        uint256 expirationPeriod
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _allowOneTimeTransfer = allowOneTimeTransfer;
        _burnableByOwner = burnableByOwner;
        _burnableByIssuer = burnableByIssuer;
        _expirationEnabled = expirationEnabled;
        _expirationPeriod = expirationPeriod;
        
        emit ConfigurationUpdated(
            allowOneTimeTransfer,
            burnableByOwner,
            burnableByIssuer,
            expirationEnabled,
            expirationPeriod
        );
    }
    
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
