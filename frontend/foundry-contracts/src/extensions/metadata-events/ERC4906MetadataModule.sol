// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IERC4906.sol";

/**
 * @title ERC4906MetadataModule
 * @notice Extension module for ERC-4906 metadata update events
 * @dev Provides standardized event emission for NFT metadata updates
 * 
 * This module can be attached to any NFT contract (ERC-721, ERC-1155) to enable
 * standardized metadata update notifications. It's designed to be called by the
 * parent token contract whenever metadata changes.
 * 
 * Gas costs: ~500 gas per event emission
 */
contract ERC4906MetadataModule is 
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IMetadataEvents
{
    /// @notice Role for addresses that can trigger metadata updates
    bytes32 public constant METADATA_UPDATER_ROLE = keccak256("METADATA_UPDATER_ROLE");

    /// @notice Role for contract upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Address of the parent token contract
    address public tokenContract;

    /// @notice Tracks if metadata updates are enabled
    bool public updatesEnabled;
    
    /// @notice Whether batch metadata updates are enabled
    bool public batchUpdatesEnabled;
    
    /// @notice Whether to emit metadata event on every transfer
    bool public emitOnTransfer;

    /**
     * @notice Emitted when the module is initialized
     * @param tokenContract The address of the parent token contract
     */
    event ModuleInitialized(address indexed tokenContract);

    /**
     * @notice Emitted when metadata updates are enabled/disabled
     * @param enabled The new enabled status
     */
    event UpdatesEnabledChanged(bool enabled);
    
    /**
     * @notice Emitted when configuration is updated
     */
    event ConfigurationUpdated(bool batchUpdatesEnabled, bool emitOnTransfer);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the module
     * @param tokenContract_ Address of the parent token contract
     * @param admin_ Address to receive admin role
     * @param batchUpdatesEnabled_ Whether batch updates are enabled
     * @param emitOnTransfer_ Whether to emit on transfers
     */
    function initialize(
        address tokenContract_,
        address admin_,
        bool batchUpdatesEnabled_,
        bool emitOnTransfer_
    ) public initializer {
        require(tokenContract_ != address(0), "Invalid token contract");
        require(admin_ != address(0), "Invalid admin");

        __AccessControl_init();
        __UUPSUpgradeable_init();

        tokenContract = tokenContract_;
        updatesEnabled = true;
        batchUpdatesEnabled = batchUpdatesEnabled_;
        emitOnTransfer = emitOnTransfer_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(METADATA_UPDATER_ROLE, tokenContract_);
        _grantRole(METADATA_UPDATER_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);

        emit ModuleInitialized(tokenContract_);
    }

    /**
     * @notice Emit metadata update event for a single token
     * @dev Can only be called by addresses with METADATA_UPDATER_ROLE
     * @param tokenId The token ID whose metadata was updated
     */
    function emitMetadataUpdate(uint256 tokenId) 
        external 
        onlyRole(METADATA_UPDATER_ROLE) 
    {
        require(updatesEnabled, "Updates disabled");
        emit MetadataUpdate(tokenId);
    }

    /**
     * @notice Emit metadata update event for a range of tokens
     * @dev Can only be called by addresses with METADATA_UPDATER_ROLE
     * @param fromTokenId The starting token ID (inclusive)
     * @param toTokenId The ending token ID (inclusive)
     */
    function emitBatchMetadataUpdate(
        uint256 fromTokenId,
        uint256 toTokenId
    ) 
        external 
        onlyRole(METADATA_UPDATER_ROLE) 
    {
        require(updatesEnabled, "Updates disabled");
        require(batchUpdatesEnabled, "Batch updates disabled");
        require(fromTokenId <= toTokenId, "Invalid range");
        emit BatchMetadataUpdate(fromTokenId, toTokenId);
    }

    /**
     * @notice Enable or disable metadata update events
     * @dev Can only be called by admin
     * @param enabled Whether to enable updates
     */
    function setUpdatesEnabled(bool enabled) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        updatesEnabled = enabled;
        emit UpdatesEnabledChanged(enabled);
    }
    
    /**
     * @notice Get configuration
     */
    function getConfiguration() external view returns (
        bool batchUpdates,
        bool onTransfer
    ) {
        return (batchUpdatesEnabled, emitOnTransfer);
    }
    
    /**
     * @notice Set configuration
     */
    function setConfiguration(
        bool batchUpdates,
        bool onTransfer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        batchUpdatesEnabled = batchUpdates;
        emitOnTransfer = onTransfer;
        emit ConfigurationUpdated(batchUpdates, onTransfer);
    }

    /**
     * @notice Check if this contract supports an interface
     * @param interfaceId The interface identifier
     * @return bool Whether the interface is supported
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControlUpgradeable, IERC165) 
        returns (bool) 
    {
        return 
            interfaceId == type(IMetadataEvents).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    /**
     * @notice Authorize contract upgrades
     * @dev Only UPGRADER_ROLE can upgrade
     */
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
